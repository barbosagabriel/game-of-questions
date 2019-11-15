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

const timeToAnswer = 10000;
const questions = [
  {
    question: "Lorem Ipsum 1",
    choice1: "1",
    choice2: "2",
    choice3: "3",
    choice4: "4",
    correct: "1"
  },
  {
    question: "Lorem Ipsum 2",
    choice1: "1",
    choice2: "2",
    choice3: "3",
    choice4: "4",
    correct: "1"
  },
  {
    question: "Lorem Ipsum 3",
    choice1: "1",
    choice2: "2",
    choice3: "3",
    choice4: "4",
    correct: "1"
  }
];
var questionCounter = 0;

var allPlayers = [];
var games = [];

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

io.on("connection", socket => {
  //console.log(`Socket connected: ${socket.id}`);

  socket.on("room-created", data => {
    var game = new Game(socket.id, timeToAnswer);
    games.push(game);

    socket.join(game.pin);

    io.to(game.pin).emit("room-pin", { pin: game.pin });
    console.log(`Room ${game.pin} created by the organizer ${game.hostId}`);
  });

  socket.on("player-join", ({ pin, username }) => {
    var a = 1;

    var game = getGameByPin(pin);
    socket.join(pin);

    var player = new Player(socket.id, username, pin);
    game.players.push(player);
    allPlayers.push(player);

    socket.to(game.pin).emit("player-joined", { player: player });

    console.log(`A new player joined in the room ${pin}`);
  });

  socket.on("game-started", data => {
    console.log("Game was started by the organizer");
    var game = getGameByHostId(socket.id);
    game.players.filter(p => (p.score = 0));
    game.setState(GameState.PROCESSING_NEXT_QUESTION);
  });

  socket.on("play-next", () => {
    console.log("Next question was triggered by the organizer");

    var game = getGameByHostId(socket.id);
    if (questionCounter <= questions.length - 1) {
      console.log("Next question was sent to the players");
      sendNextQuestion(socket, game);
    } else {
      console.log("Game over was sent to the players");
      io.to(game.pin).emit("game-over");
      io.to(game.pin).emit("results", { players: game.players });
      questionCounter = 0;
    }

    console.log(game.players);
  });

  socket.on("question-answered", data => {
    var game = getGameByPlayerId(socket.id);
    if (game.state == GameState.WAITING_ANSWERS) {
      console.log("Question was answered by the player");
      var correctAnswer = questions[questionCounter - 1].correct;
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
  });

  socket.on("disconnect", () => {
    var game = getGameByHostId(socket.id);
    if (game) {
      io.to(game.pin).emit("host-disconnected");
    } else {
      var game = getGameByPlayerId(socket.id);
      if (game) {
        game.players = game.players.filter(p => p.id != socket.id);
      }
    }
  });
});

//When a host or player leaves the site

server.listen(3000);

function sendNextQuestion(socket, game) {
  io.to(game.pin).emit("next-question", questions[questionCounter]);
  game.setState(GameState.WAITING_ANSWERS);
  console.log(game.timeToAnswer);
  setTimeout(() => {
    io.to(game.pin).emit("time-up");
    game.setState(GameState.PROCESSING_NEXT_QUESTION);
    console.log("Time is up sent");
  }, game.timeToAnswer);

  questionCounter++;
}
