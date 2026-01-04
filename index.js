const env = require("dotenv").config();
const express = require("express");
const path = require("path");

const GameState = require("./models/GameState");
const Game = require("./models/Game");
const Player = require("./models/Player");


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
    console.log('game-started event received from', socket.id, 'payload:', data);
    startGame(socket, data);
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


function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g, 'ü');
}

async function fetchQuestionsFromAPI(amount) {
  const maxAttempts = 3;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`https://tryvia.ptr.red/api.php?amount=${amount}&type=multiple`);
      console.log(`OpenTDB fetch attempt ${attempt} status:`, res.status);
      if (!res.ok) throw new Error('OpenTDB fetch failed: ' + res.status);
      const json = await res.json();
      console.log('OpenTDB response:', json);
      if (!json || typeof json.response_code === 'undefined') throw new Error('Invalid OpenTDB response');
      if (json.response_code !== 0) throw new Error('OpenTDB returned response_code ' + json.response_code);
      if (!json.results) return [];

      const decoded = json.results.map(item => ({
        question: decodeEntities(item.question),
        correct_answer: decodeEntities(item.correct_answer),
        incorrect_answers: item.incorrect_answers.map(a => decodeEntities(a))
      }));

      return decoded;
    } catch (err) {
      console.error(`OpenTDB attempt ${attempt} failed:`, err.message || err);
      if (attempt < maxAttempts) await sleep(1000 * attempt);
      else return [];
    }
  }
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

async function startGame(socket, data) {
  var game = getGameByHostId(socket.id);
  if (!game) return;
  console.log(`startGame: host ${socket.id} starting game for pin ${game.pin} with payload:`, data);
  game.players.forEach(p => {
    p.score = 0;
    p.correctAnswers = 0;
    p.currentAnswer = null;
  });
  // reset previous questions so restart uses same pin
  game.previousQuestions = [];
  game.currentQuestion = {};
  // determine amount
  const amount = (data && data.amount) ? Number(data.amount) : game.totalOfQuestions || 10;
  game.totalOfQuestions = amount;
  // determine timeToAnswer (data.timeToAnswer expected in seconds)
  if (data && typeof data.timeToAnswer !== 'undefined') {
    const secs = Number(data.timeToAnswer);
    if (!isNaN(secs) && secs > 0) {
      game.timeToAnswer = secs * 1000;
    }
  }
  // fetch questions from OpenTDB and translate
  game.questionPool = await fetchQuestionsFromAPI(amount);
  if (!game.questionPool || game.questionPool.length === 0) {
    io.to(game.pin).emit('load-error', { message: 'Failed to load questions from OpenTDB. Please try again.' });
    return;
  }
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
  // pull next question from the game's question pool
  game.currentQuestion = (game.questionPool && game.questionPool.length) ? game.questionPool.shift() : null;
  if (!game.currentQuestion) {
    // no more questions available in pool
    // If we've already shown as many as requested, end the game, otherwise notify and end gracefully
    if (game.previousQuestions.length >= game.totalOfQuestions) {
      advanceToNextQuestion(game);
      return;
    }
    io.to(game.pin).emit('load-error', { message: 'No more questions available. Ending game.' });
    // send results and end
    const sorted = game.players.slice().sort((a, b) => b.score - a.score);
    io.to(game.pin).emit('results', { players: sorted, pin: game.pin });
    game.setState(GameState.GAME_OVER);
    return;
  }

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
  console.log(`emitNextQuestion: pin=${game.pin} timeToAnswer=${game.timeToAnswer}ms questionIndex=${game.previousQuestions.length + 1}`);
  game.setState(GameState.WAITING_ANSWERS);

  // set the timeout for answers
  game._answerTimer = setTimeout(() => {
    // reveal answers when time expires
    revealAnswers(game);
  }, game.timeToAnswer);
}
