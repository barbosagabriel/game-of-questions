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
var questions = [
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Where is the train station &quot;Llanfair&shy;pwllgwyngyll&shy;gogery&shy;chwyrn&shy;drobwll&shy;llan&shy;tysilio&shy;gogo&shy;goch&quot;?",
    correct_answer: "Wales",
    incorrect_answers: ["Moldova", "Czech Republic", "Denmark"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Which company did Valve cooperate with in the creation of the Vive?",
    correct_answer: "HTC",
    incorrect_answers: ["Oculus", "Google", "Razer"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the most common surname Wales?",
    correct_answer: "Jones",
    incorrect_answers: ["Williams", "Davies", "Evans"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What was the name of the WWF professional wrestling tag team made up of the wrestlers Ax and Smash?",
    correct_answer: "Demolition",
    incorrect_answers: [
      "The Dream Team",
      "The Bushwhackers",
      "The British Bulldogs"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "In the video-game franchise Kingdom Hearts, the main protagonist, carries a weapon with what shape?",
    correct_answer: "Key",
    incorrect_answers: ["Sword", "Pen", "Cellphone"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Which best selling toy of 1983 caused hysteria, resulting in riots breaking out in stores?",
    correct_answer: "Cabbage Patch Kids",
    incorrect_answers: ["Transformers", "Care Bears", "Rubik&rsquo;s Cube"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What does a funambulist walk on?",
    correct_answer: "A Tight Rope",
    incorrect_answers: ["Broken Glass", "Balls", "The Moon"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "In past times, what would a gentleman keep in his fob pocket?",
    correct_answer: "Watch",
    incorrect_answers: ["Money", "Keys", "Notebook"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Area 51 is located in which US state?",
    correct_answer: "Nevada",
    incorrect_answers: ["Arizona", "New Mexico", "Utah"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the largest organ of the human body?",
    correct_answer: "Skin",
    incorrect_answers: ["Heart", "large Intestine", "Liver"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which sign of the zodiac is represented by the Crab?",
    correct_answer: "Cancer",
    incorrect_answers: ["Libra", "Virgo", "Sagittarius"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "On a dartboard, what number is directly opposite No. 1?",
    correct_answer: "19",
    incorrect_answers: ["20", "12", "15"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What does the &#039;S&#039; stand for in the abbreviation SIM, as in SIM card? ",
    correct_answer: "Subscriber",
    incorrect_answers: ["Single", "Secure", "Solid"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What word represents the letter &#039;T&#039; in the NATO phonetic alphabet?",
    correct_answer: "Tango",
    incorrect_answers: ["Target", "Taxi", "Turkey"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What alcoholic drink is made from molasses?",
    correct_answer: "Rum",
    incorrect_answers: ["Gin", "Vodka", "Whisky"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which American president appears on a one dollar bill?",
    correct_answer: "George Washington",
    incorrect_answers: [
      "Thomas Jefferson",
      "Abraham Lincoln",
      "Benjamin Franklin"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What geometric shape is generally used for stop signs?",
    correct_answer: "Octagon",
    incorrect_answers: ["Hexagon", "Circle", "Triangle"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is &quot;dabbing&quot;?",
    correct_answer: "A dance",
    incorrect_answers: ["A medical procedure", "A sport", "A language"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which one of the following rhythm games was made by Harmonix?",
    correct_answer: "Rock Band",
    incorrect_answers: [
      "Meat Beat Mania",
      "Guitar Hero Live",
      "Dance Dance Revolution"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What type of animal was Harambe, who was shot after a child fell into it&#039;s enclosure at the Cincinnati Zoo?",
    correct_answer: "Gorilla",
    incorrect_answers: ["Tiger", "Panda", "Crocodile"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Red Vines is a brand of what type of candy?",
    correct_answer: "Licorice",
    incorrect_answers: ["Lollipop", "Chocolate", "Bubblegum"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the nickname of the US state of California?",
    correct_answer: "Golden State",
    incorrect_answers: ["Sunshine State", "Bay State", "Treasure State"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What is on display in the Madame Tussaud&#039;s museum in London?",
    correct_answer: "Wax sculptures",
    incorrect_answers: [
      "Designer clothing",
      "Unreleased film reels",
      "Vintage cars"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What was the nickname given to the Hughes H-4 Hercules, a heavy transport flying boat which achieved flight in 1947?",
    correct_answer: "Spruce Goose",
    incorrect_answers: ["Noah&#039;s Ark", "Fat Man", "Trojan Horse"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which of these colours is NOT featured in the logo for Google?",
    correct_answer: "Pink",
    incorrect_answers: ["Yellow", "Blue", "Green"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Who is depicted on the US hundred dollar bill?",
    correct_answer: "Benjamin Franklin",
    incorrect_answers: [
      "George Washington",
      "Abraham Lincoln",
      "Thomas Jefferson"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What do the letters in the GMT time zone stand for?",
    correct_answer: "Greenwich Mean Time",
    incorrect_answers: [
      "Global Meridian Time",
      "General Median Time",
      "Glasgow Man Time"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which one of these is not a typical European sword design?",
    correct_answer: "Scimitar",
    incorrect_answers: ["Falchion", "Ulfberht", "Flamberge"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "According to Sherlock Holmes, &quot;If you eliminate the impossible, whatever remains, however improbable, must be the...&quot;",
    correct_answer: "Truth",
    incorrect_answers: ["Answer", "Cause", "Source"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the name of Poland in Polish?",
    correct_answer: "Polska",
    incorrect_answers: ["Pupcia", "Polszka", "P&oacute;land"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which restaurant&#039;s mascot is a clown?",
    correct_answer: "McDonald&#039;s",
    incorrect_answers: ["Whataburger", "Burger King", "Sonic"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What color is the &quot;Ex&quot; in FedEx Ground?",
    correct_answer: "Green",
    incorrect_answers: ["Red", "Light Blue", "Orange"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What was the first ever London Underground line to be built?",
    correct_answer: "Metropolitan Line",
    incorrect_answers: ["Circle Line", "Bakerloo Line", "Victoria Line"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "How tall is the Burj Khalifa?",
    correct_answer: "2,722 ft",
    incorrect_answers: ["2,717 ft", "2,546 ft", "3,024 ft"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Which of the following card games revolves around numbers and basic math?",
    correct_answer: "Uno",
    incorrect_answers: ["Go Fish", "Twister", "Munchkin"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "What machine element is located in the center of fidget spinners?",
    correct_answer: "Bearings",
    incorrect_answers: ["Axles", "Gears", "Belts"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which of the following presidents is not on Mount Rushmore?",
    correct_answer: "John F. Kennedy",
    incorrect_answers: [
      "Theodore Roosevelt",
      "Abraham Lincoln",
      "Thomas Jefferson"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is Tasmania?",
    correct_answer: "An Australian State",
    incorrect_answers: [
      "A flavor of Ben and Jerry&#039;s ice-cream",
      "A Psychological Disorder",
      "The Name of a Warner Brothers Cartoon Character"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What company developed the vocaloid Hatsune Miku?",
    correct_answer: "Crypton Future Media",
    incorrect_answers: ["Sega", "Sony", "Yamaha Corporation"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Which country, not including Japan, has the most people of japanese decent?",
    correct_answer: "Brazil",
    incorrect_answers: ["China", "South Korea", "United States of America"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "Which candy is NOT made by Mars?",
    correct_answer: "Almond Joy",
    incorrect_answers: ["M&amp;M&#039;s", "Twix", "Snickers"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the Zodiac symbol for Gemini?",
    correct_answer: "Twins",
    incorrect_answers: ["Fish", "Scales", "Maiden"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What nuts are used in the production of marzipan?",
    correct_answer: "Almonds",
    incorrect_answers: ["Peanuts", "Walnuts", "Pistachios"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is Cynophobia the fear of?",
    correct_answer: "Dogs",
    incorrect_answers: ["Birds", "Flying", "Germs"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "According to the nursery rhyme, what fruit did Little Jack Horner pull out of his Christmas pie?",
    correct_answer: "Plum",
    incorrect_answers: ["Apple", "Peach", "Pear"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "Terry Gilliam was an animator that worked with which British comedy group?",
    correct_answer: "Monty Python",
    incorrect_answers: [
      "The Goodies&lrm;",
      "The League of Gentlemen&lrm;",
      "The Penny Dreadfuls"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "When someone is inexperienced they are said to be what color?",
    correct_answer: "Green",
    incorrect_answers: ["Red", "Blue", "Yellow"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "The Flag of the European Union has how many stars on it?",
    correct_answer: "12",
    incorrect_answers: ["10", "14", "16"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "When one is &quot;envious&quot;, they are said to be what color?",
    correct_answer: "Green",
    incorrect_answers: ["Red", "Blue", "Yellow"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question:
      "When someone is cowardly, they are said to have what color belly?",
    correct_answer: "Yellow",
    incorrect_answers: ["Green", "Red", "Blue"]
  }
];

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

io.on("connection", socket => {
  //console.log(`Socket connected: ${socket.id}`);

  socket.on("room-created", data => {
    var game = new Game(socket.id, process.env.TIME_TO_ANSWER);
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
    if (game.previousQuestions.length + 1 <= game.totalOfQuestions) {
      console.log("Next question was sent to the players");
      if (game.currentQuestion) {
        game.previousQuestions.push(game.currentQuestion);
      }
      sendNextQuestion(game);
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

server.listen(process.env.PORT);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sendNextQuestion(game) {
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

  questionCounter++;
}
