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
  //console.log(`Socket connected: ${socket.id}`);

  socket.on("room-created", data => {
    createRoom(socket);
  });

  socket.on("player-join", ({ pin, username }) => {
    addPlayerToRoom(pin, socket, username);
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

function disconnectPlayer(socket) {
  var game = getGameByHostId(socket.id);
  if (game) {
    io.to(game.pin).emit("host-disconnected");
  } else {
    var game = getGameByPlayerId(socket.id);
    if (game) {
      game.players = game.players.filter(p => p.id != socket.id);
    }
  }
}

function receiveAnswer(socket, data) {
  var game = getGameByPlayerId(socket.id);
  if (game.state == GameState.WAITING_ANSWERS) {
    console.log("Question was answered by the player");
    var correctAnswer = game.currentQuestion.correct_answer;
    var answer = data.answer;
    var player = game.players.find(p => p.id == socket.id);
    if (answer == correctAnswer) {
      console.log(`${player.username} (${player.id}) has answered correctly`);
      player.score += 1;
    } else {
      console.log(
        `${player.username} (${player.id}) has answered incorrectly. Answer: ${answer}. Correct: ${correctAnswer}`
      );
    }
  }
}

function sendNextQuestion(socket) {
  console.log("Next question was triggered by the organizer");
  var game = getGameByHostId(socket.id);
  if (game.previousQuestions.length + 1 <= game.totalOfQuestions) {
    console.log("Next question was sent to the players");
    if (game.currentQuestion) {
      game.previousQuestions.push(game.currentQuestion);
    }
    emitNextQuestion(game);
  } else {
    console.log("Game over was sent to the players");
    io.to(game.pin).emit("game-over");
    io.to(game.pin).emit("results", { players: game.players });
  }
  console.log(game.players);
}

function startGame(socket) {
  console.log("Game was started by the organizer");
  var game = getGameByHostId(socket.id);
  game.players.filter(p => (p.score = 0));
  game.setState(GameState.PROCESSING_NEXT_QUESTION);
}

function addPlayerToRoom(pin, socket, username) {
  var game = getGameByPin(pin);
  socket.join(pin);
  var player = new Player(socket.id, username, pin);
  game.players.push(player);
  allPlayers.push(player);
  socket.to(game.pin).emit("player-joined", { player: player });
  console.log(`A new player joined in the room ${pin}`);
}

function createRoom(socket) {
  var game = new Game(socket.id, process.env.TIME_TO_ANSWER);
  games.push(game);
  socket.join(game.pin);
  io.to(game.pin).emit("room-pin", { pin: game.pin });
  console.log(`Room ${game.pin} created by the organizer ${game.hostId}`);
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

  var answers = game.currentQuestion.incorrect_answers;
  answers.push(game.currentQuestion.correct_answer);
  answers = shuffle(answers);

  io.to(game.pin).emit("next-question", {
    question: game.currentQuestion.question,
    answers: answers
  });
  game.setState(GameState.WAITING_ANSWERS);

  setTimeout(() => {
    io.to(game.pin).emit("time-up");
    io.to(game.pin).emit("partial-results", { players: game.players });
    game.setState(GameState.PROCESSING_NEXT_QUESTION);
    console.log("Time is up sent");
  }, game.timeToAnswer);
}
