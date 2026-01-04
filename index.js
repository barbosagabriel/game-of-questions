const env = require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const GameState = require("./models/GameState");
const Game = require("./models/Game");
const Player = require("./models/Player");

const filePath = "./questions.json";
const questionsFile = fs.readFileSync(filePath);

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));
app.set("views", publicPath);
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.use("/", (req, res) => {
  res.render("index.html");
});

app.use("/create", (req, res) => {
  res.render("create-room.html");
});

var allPlayers = [];
var games = [];
var questions = JSON.parse(questionsFile);

io.on("connection", socket => {
  socket.on("room-created", data => {
    createRoom(socket);
  });

  socket.on("player-join", ({ pin, username }) => {
    addPlayerToRoom(pin, socket, username);
  });

  socket.on('leave-room', ({ pin }) => {
    // allow graceful leave without full disconnect
    removePlayerFromRoom(pin, socket);
  });

  socket.on("game-started", data => {
    startGame(socket);
  });

  socket.on("play-next", () => {
    sendNextQuestion(socket);
  });

  socket.on("question-answered", data => {
    receiveAnswer(socket, data);
  });

  socket.on("disconnect", () => {
    disconnectPlayer(socket);
  });
});

server.listen(process.env.PORT || 3000);

function getRandomQuestion(invalidQuestions) {
  var question = questions[Math.floor(Math.random() * questions.length)];
  while (invalidQuestions.find(q => q.question == question.question)) {
    question = questions[Math.floor(Math.random() * questions.length)];
  }
  return question;
}

function getGameByPlayerId(playerId) {
  var player = allPlayers.find(p => p.id == playerId);
  if (player) {
    var pin = player.room;
    return getGameByPin(pin);
  }
  return null;
}

function getGameByPin(pin) {
  return games.find(g => g.pin == pin);
}

function getGameByHostId(hostId) {
  return games.find(g => g.hostId == hostId);
}

function clearGameTimers(game) {
  if (!game) return;
  if (game._answerTimer) {
    clearTimeout(game._answerTimer);
    game._answerTimer = null;
  }
  if (game._autoNextTimer) {
    clearTimeout(game._autoNextTimer);
    game._autoNextTimer = null;
  }
}

function disconnectPlayer(socket) {
  var game = getGameByHostId(socket.id);
  if (game) {
    clearGameTimers(game);
    io.to(game.pin).emit("host-disconnected");
  } else {
    var game = getGameByPlayerId(socket.id);
    if (game) {
      game.players = game.players.filter(p => p.id != socket.id);
      allPlayers = allPlayers.filter(p => p.id != socket.id);
      io.to(game.pin).emit("player-left", { players: game.players });
    }
  }
}

function receiveAnswer(socket, data) {
  var game = getGameByPlayerId(socket.id);
  if (!game || game.state != GameState.WAITING_ANSWERS) return;
  var player = game.players.find(p => p.id == socket.id);
  if (!player || player.currentAnswer) return; // ignore multiple answers

  var correctAnswer = game.currentQuestion.correct_answer;
  var answer = data.answer;
  player.currentAnswer = answer;
  if (answer == correctAnswer) {
    player.score += 1;
    player.correctAnswers += 1;
  }

  // if all players answered, reveal immediately
  const allAnswered = game.players.length > 0 && game.players.every(p => p.currentAnswer !== null);
  if (allAnswered) {
    revealAnswers(game);
  }
}

function revealAnswers(game) {
  if (!game) return;
  // stop answer timer
  if (game._answerTimer) {
    clearTimeout(game._answerTimer);
    game._answerTimer = null;
  }
  // emit reveal with correct answer
  io.to(game.pin).emit('reveal-answer', { correctAnswer: game.currentQuestion.correct_answer });
  io.to(game.pin).emit('partial-results', { players: game.players });
  game.setState(GameState.PROCESSING_NEXT_QUESTION);
  // schedule auto-advance after short delay
  if (game._autoNextTimer) clearTimeout(game._autoNextTimer);
  game._autoNextTimer = setTimeout(() => {
    advanceToNextQuestion(game);
  }, 3000);
}

function advanceToNextQuestion(game) {
  clearGameTimers(game);
  if (game.currentQuestion && Object.keys(game.currentQuestion).length) {
    game.previousQuestions.push(game.currentQuestion);
  }
  if (game.previousQuestions.length < game.totalOfQuestions) {
    emitNextQuestion(game);
  } else {
    io.to(game.pin).emit("game-over");
    // send sorted results
    const sorted = game.players.slice().sort((a, b) => b.score - a.score);
    io.to(game.pin).emit("results", { players: sorted, pin: game.pin });
    game.setState(GameState.GAME_OVER);
  }
}

function sendNextQuestion(socket) {
  var game = getGameByHostId(socket.id);
  if (!game) return;
  advanceToNextQuestion(game);
}

function startGame(socket) {
  var game = getGameByHostId(socket.id);
  if (!game) return;
  game.players.forEach(p => {
    p.score = 0;
    p.correctAnswers = 0;
    p.currentAnswer = null;
  });
  // reset previous questions so restart uses same pin
  game.previousQuestions = [];
  game.currentQuestion = {};
  game.setState(GameState.PROCESSING_NEXT_QUESTION);
  // Immediately send the first question
  emitNextQuestion(game);
}

function addPlayerToRoom(pin, socket, username) {
  var game = getGameByPin(pin);
  if (!game) {
    socket.emit("error", { message: "Room not found" });
    return;
  }
  socket.join(pin);
  var player = new Player(socket.id, username, pin);
  game.players.push(player);
  allPlayers.push(player);
  io.to(game.pin).emit("player-joined", { player: player, players: game.players });
}

function removePlayerFromRoom(pin, socket) {
  var game = getGameByPin(pin);
  if (!game) return;
  game.players = game.players.filter(p => p.id != socket.id);
  allPlayers = allPlayers.filter(p => p.id != socket.id);
  socket.leave(pin);
  io.to(game.pin).emit('player-left', { players: game.players });
}

function createRoom(socket) {
  var game = new Game(socket.id, process.env.TIME_TO_ANSWER);
  games.push(game);
  socket.join(game.pin);
  io.to(game.pin).emit("room-pin", { pin: game.pin });
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emitNextQuestion(game) {
  game.currentQuestion = getRandomQuestion(game.previousQuestions);

  var answers = game.currentQuestion.incorrect_answers.slice();
  answers.push(game.currentQuestion.correct_answer);
  answers = shuffle(answers);

  // reset player current answers
  game.players.forEach(p => (p.currentAnswer = null));

  io.to(game.pin).emit("next-question", {
    question: game.currentQuestion.question,
    answers: answers,
    questionIndex: game.previousQuestions.length + 1,
    total: game.totalOfQuestions,
    timeToAnswer: game.timeToAnswer
  });
  game.setState(GameState.WAITING_ANSWERS);

  // set the timeout for answers
  game._answerTimer = setTimeout(() => {
    // reveal answers when time expires
    revealAnswers(game);
  }, game.timeToAnswer);
}
