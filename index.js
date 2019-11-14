const express = require("express");
const path = require("path");

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

app.use("/host", (req, res) => {
  res.render("host.html");
});

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
var game = {
  pin: 123,
  players: []
};
var questionCounter = 0;

io.on("connection", socket => {
  console.log(`Socket connected: ${socket.id}`);
  socket.join(game.pin);
  game.players.push({
    id: socket.id,
    name: `Player ${game.players.length + 1}`,
    score: 0
  });

  socket.on("game-started", data => {
    console.log("Game was started by the organizer");
    game.host = socket.id;
    io.to(game.pin).emit("next-question", questions[questionCounter]);
    questionCounter++;
    game.players.filter(p => (p.score = 0));
  });

  socket.on("play-next", data => {
    console.log("Next question was triggered by the organizer");

    if (questionCounter <= questions.length - 1) {
      console.log("Next question was sent to the players");
      io.to(game.pin).emit("next-question", questions[questionCounter]);
      questionCounter++;
    } else {
      console.log("Game over was sent to the players");
      io.to(game.pin).emit("game-over");
      questionCounter = 0;
    }

    console.log(game.players);
  });

  socket.on("question-answered", data => {
    console.log("Question was answered by the player");
    var correctAnswer = questions[questionCounter - 1].correct;
    var answer = data.answer;
    var player = game.players.find(p => p.id == socket.id);

    if (answer == correctAnswer) {
      console.log(`${player.name} (${player.id}) has answered correctly`);
      player.score += 1;
    } else {
      console.log(
        `${player.name} (${player.id}) has answered incorrectly. Answer: ${answer}. Correct: ${correctAnswer}`
      );
    }
  });
});

server.listen(3000);
