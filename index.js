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
    difficulty: "medium",
    question:
      "According to the BBPA, what is the most common pub name in the UK?",
    correct_answer: "Red Lion",
    incorrect_answers: ["Royal Oak", "White Hart", "King&#039;s Head"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "This field is sometimes known as &ldquo;The Dismal Science.&rdquo;",
    correct_answer: "Economics",
    incorrect_answers: ["Philosophy", "Politics", "Physics"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What does a milliner make and sell?",
    correct_answer: "Hats",
    incorrect_answers: ["Shoes", "Belts", "Shirts"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which river flows through the Scottish city of Glasgow?",
    correct_answer: "Clyde",
    incorrect_answers: ["Tay", "Dee", "Tweed"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What name represents the letter &quot;M&quot; in the NATO phonetic alphabet?",
    correct_answer: "Mike",
    incorrect_answers: ["Matthew", "Mark", "Max"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Rolex is a company that specializes in what type of product?",
    correct_answer: "Watches",
    incorrect_answers: ["Cars", "Computers", "Sports equipment"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "A doctor with a PhD is a doctor of what?",
    correct_answer: "Philosophy",
    incorrect_answers: ["Psychology", "Phrenology", "Physical Therapy"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Scotch whisky and Drambuie make up which cocktail?",
    correct_answer: "Rusty Nail",
    incorrect_answers: ["Screwdriver", "Sex on the Beach", "Manhattan"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What does the &quot;G&quot; mean in &quot;G-Man&quot;?",
    correct_answer: "Government",
    incorrect_answers: ["Going", "Ghost", "Geronimo"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which essential condiment is also known as Japanese horseradish?",
    correct_answer: "Wasabi ",
    incorrect_answers: ["Mentsuyu", "Karashi", "Ponzu"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the name of the very first video uploaded to YouTube?",
    correct_answer: "Me at the zoo",
    incorrect_answers: [
      "tribute",
      "carrie rides a truck",
      "Her new puppy from great grandpa vern."
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "In 2013 how much money was lost by Nigerian scams?",
    correct_answer: "$12.7 Billion",
    incorrect_answers: ["$95 Million", "$956 Million", "$2.7 Billion"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "After how many years would you celebrate your crystal anniversary?",
    correct_answer: "15",
    incorrect_answers: ["20", "10", "25"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Who is a co-founder of music streaming service Spotify?",
    correct_answer: "Daniel Ek",
    incorrect_answers: [
      "Sean Parker",
      "Felix Miller",
      "Michael Breidenbruecker"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which of the following buildings is example of a structure primarily built in the Art Deco architectural style?",
    correct_answer: "Niagara Mohawk Building",
    incorrect_answers: ["Taipei 101", "One Detroit Center", "Westendstrasse 1"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What alcoholic drink is mainly made from juniper berries?",
    correct_answer: "Gin",
    incorrect_answers: ["Vodka", "Rum", "Tequila"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which Italian automobile manufacturer gained majority control of U.S. automobile manufacturer Chrysler in 2011?",
    correct_answer: "Fiat",
    incorrect_answers: ["Maserati", "Alfa Romeo", "Ferrari"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What is the name given to Indian food cooked over charcoal in a clay oven?",
    correct_answer: "Tandoori",
    incorrect_answers: ["Biryani", "Pani puri", "Tiki masala"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the German word for &quot;spoon&quot;?",
    correct_answer: "L&ouml;ffel",
    incorrect_answers: ["Gabel", "Messer", "Essst&auml;bchen"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the Italian word for &quot;tomato&quot;?",
    correct_answer: "Pomodoro",
    incorrect_answers: ["Aglio", "Cipolla", "Peperoncino"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What country saw a world record 315 million voters turn out for elections on May 20, 1991?",
    correct_answer: "India",
    incorrect_answers: ["United States of America", "Soviet Union", "Poland"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "On average, Americans consume 100 pounds of what per second?",
    correct_answer: "Chocolate",
    incorrect_answers: ["Potatoes", "Donuts", "Cocaine"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "According to the United States&#039; CDC, one in how many Americans die annually due to smoking?",
    correct_answer: "Five",
    incorrect_answers: ["Twenty", "Ten", "One hundred"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Who is the founder of &quot;The Lego Group&quot;?",
    correct_answer: "Ole Kirk Christiansen",
    incorrect_answers: [
      " Jens Niels Christiansen",
      "Kirstine Christiansen",
      " Gerhardt Kirk Christiansen"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is a dead mall?",
    correct_answer:
      "A mall with high vacancy rates or low consumer foot traffic",
    incorrect_answers: [
      "A mall with no stores",
      "A mall that has been condemed",
      "A mall after business hours"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "When was Nintendo founded?",
    correct_answer: "September 23rd, 1889",
    incorrect_answers: [
      "October 19th, 1891",
      "March 4th, 1887",
      "December 27th, 1894"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "The new One World Trade Center in Manhattan, New York City was designed by which architect? ",
    correct_answer: "David Childs",
    incorrect_answers: ["Bjarke Ingels", "Michael Arad", "Fumihiko Maki"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Amsterdam Centraal station is twinned with what station?",
    correct_answer: "London Liverpool Street",
    incorrect_answers: [
      "Frankfurt (Main) Hauptbahnhof",
      "Paris Gare du Nord",
      "Brussels Midi"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which of the following carbonated soft drinks were introduced first?",
    correct_answer: "Dr. Pepper",
    incorrect_answers: ["Coca-Cola", "Sprite", "Mountain Dew"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What year was Apple Inc. founded?",
    correct_answer: "1976",
    incorrect_answers: ["1978", "1980", "1974"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "In what year was McDonald&#039;s founded?",
    correct_answer: "1955",
    incorrect_answers: ["1964", "1951", "1947"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which of the General Mills Corporation&#039;s monster cereals was the last to be released in the 1970&#039;s?",
    correct_answer: "Fruit Brute",
    incorrect_answers: ["Count Chocula", "Franken Berry", "Boo-Berry"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What was Mountain Dew&#039;s original slogan?",
    correct_answer: "Yahoo! Mountain Dew... It&#039;ll tickle your innards!",
    incorrect_answers: [
      "Give Me A Dew",
      "Do The Dew",
      "Get&#039; that barefoot feelin&#039; drinkin&#039; Mountain Dew"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which iconic Disneyland attraction was closed in 2017 to be remodeled as a &quot;Guardians of the Galaxy&quot; themed ride?",
    correct_answer: "Twilight Zone Tower of Terror",
    incorrect_answers: [
      "The Haunted Mansion",
      "Pirates of the Caribbean",
      "Peter Pan&#039;s Flight"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Where does water from Poland Spring water bottles come from?",
    correct_answer: "Maine, United States",
    incorrect_answers: ["Hesse, Germany", "Masovia, Poland", "Bavaria, Poland"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Who invented Pastafarianism?",
    correct_answer: "Bobby Henderson",
    incorrect_answers: ["Eric Tignor", "Bill Nye", "Zach Soldi"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "In a 1994 CBS interview, Microsoft co-founder Bill Gates performed what unusual trick on camera?",
    correct_answer: "Jumping over an office chair",
    incorrect_answers: [
      "Jumping backwards over a desk",
      "Standing on his head",
      "Typing on a keyboard during a handstand"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Apple co-founder Steve Jobs died from complications of which form of cancer?",
    correct_answer: "Pancreatic",
    incorrect_answers: ["Bone", "Liver", "Stomach"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which slogan did the fast food company, McDonald&#039;s, use before their &quot;I&#039;m Lovin&#039; It&quot; slogan?",
    correct_answer: "We Love to See You Smile",
    incorrect_answers: [
      "Why Pay More!?",
      "Have It Your Way",
      "Making People Happy Through Food"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is real haggis made of?",
    correct_answer: "Sheep&#039;s Heart, Liver and Lungs",
    incorrect_answers: [
      "Sheep&#039;s Heart, Kidneys and Lungs",
      "Sheep&#039;s Liver, Kidneys and Eyes",
      "Whole Sheep"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What was the original name of the search engine &quot;Google&quot;?",
    correct_answer: "BackRub",
    incorrect_answers: ["CatMassage", "SearchPro", "Netscape Navigator"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Earl Grey tea is black tea flavoured with what?",
    correct_answer: "Bergamot oil",
    incorrect_answers: ["Lavender", "Vanilla", "Honey"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Whose greyscale face is on the kappa emoticon on Twitch?",
    correct_answer: "Josh DeSeno",
    incorrect_answers: ["Justin DeSeno", "John DeSeno", "Jimmy DeSeno"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which item of clothing is usually worn by a Scotsman at a wedding?",
    correct_answer: "Kilt",
    incorrect_answers: ["Skirt", "Dress", "Rhobes"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which company&#039;s original slogan was &quot;Don&#039;t be evil&quot;?",
    correct_answer: "Google",
    incorrect_answers: ["Apple", "Yahoo", "Microsoft"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which country has the most Trappist breweries?",
    correct_answer: "Belgium",
    incorrect_answers: ["Netherlands", "France", "USA"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the star sign of someone born on Valentines day?",
    correct_answer: "Aquarius",
    incorrect_answers: ["Pisces", "Capricorn", "Scorpio"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "In ancient Greece, if your job were a &quot;hippeus&quot; which of these would you own?",
    correct_answer: "Horse",
    incorrect_answers: ["Weave", "Guitar", "Boat"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which American manufactured submachine gun was informally known by the American soldiers that used it as &quot;Grease Gun&quot;?",
    correct_answer: "M3",
    incorrect_answers: ["Colt 9mm", "Thompson", "MAC-10"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What is the highest number of Michelin stars a restaurant can receive?",
    correct_answer: "Three",
    incorrect_answers: ["Four", "Five", "Six"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "According to the BBPA, what is the most common pub name in the UK?",
    correct_answer: "Red Lion",
    incorrect_answers: ["Royal Oak", "White Hart", "King&#039;s Head"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the world&#039;s most expensive spice by weight?",
    correct_answer: "Saffron",
    incorrect_answers: ["Cinnamon", "Cardamom", "Vanilla"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which river flows through the Scottish city of Glasgow?",
    correct_answer: "Clyde",
    incorrect_answers: ["Tay", "Dee", "Tweed"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "When was the Declaration of Independence approved by the Second Continental Congress?",
    correct_answer: "July 2, 1776",
    incorrect_answers: ["May 4, 1776", "June 4, 1776", "July 4, 1776"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What name represents the letter &quot;M&quot; in the NATO phonetic alphabet?",
    correct_answer: "Mike",
    incorrect_answers: ["Matthew", "Mark", "Max"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Rolex is a company that specializes in what type of product?",
    correct_answer: "Watches",
    incorrect_answers: ["Cars", "Computers", "Sports equipment"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Scotch whisky and Drambuie make up which cocktail?",
    correct_answer: "Rusty Nail",
    incorrect_answers: ["Screwdriver", "Sex on the Beach", "Manhattan"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "In the Morse code, which letter is indicated by 3 dots? ",
    correct_answer: "S",
    incorrect_answers: ["O", "A", "C"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What does the &quot;G&quot; mean in &quot;G-Man&quot;?",
    correct_answer: "Government",
    incorrect_answers: ["Going", "Ghost", "Geronimo"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which language is NOT Indo-European?",
    correct_answer: "Hungarian",
    incorrect_answers: ["Russian", "Greek", "Latvian"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is a &quot;dakimakura&quot;?",
    correct_answer: "A body pillow",
    incorrect_answers: [
      "A Chinese meal, essentially composed of fish",
      "A yoga posture",
      "A word used to describe two people who truly love each other"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the name of the very first video uploaded to YouTube?",
    correct_answer: "Me at the zoo",
    incorrect_answers: [
      "tribute",
      "carrie rides a truck",
      "Her new puppy from great grandpa vern."
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "After how many years would you celebrate your crystal anniversary?",
    correct_answer: "15",
    incorrect_answers: ["20", "10", "25"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which of these companies does NOT manufacture automobiles?",
    correct_answer: "Ducati",
    incorrect_answers: ["Nissan", "GMC", "Fiat"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Who is a co-founder of music streaming service Spotify?",
    correct_answer: "Daniel Ek",
    incorrect_answers: [
      "Sean Parker",
      "Felix Miller",
      "Michael Breidenbruecker"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "A factiod is what?",
    correct_answer: "A falsehood",
    incorrect_answers: ["Useless trivia", "A tiny fact", "A scientific figure"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the unit of currency in Laos?",
    correct_answer: "Kip",
    incorrect_answers: ["Ruble", "Konra", "Dollar"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What alcoholic drink is mainly made from juniper berries?",
    correct_answer: "Gin",
    incorrect_answers: ["Vodka", "Rum", "Tequila"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which Italian automobile manufacturer gained majority control of U.S. automobile manufacturer Chrysler in 2011?",
    correct_answer: "Fiat",
    incorrect_answers: ["Maserati", "Alfa Romeo", "Ferrari"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the German word for &quot;spoon&quot;?",
    correct_answer: "L&ouml;ffel",
    incorrect_answers: ["Gabel", "Messer", "Essst&auml;bchen"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the romanized Japanese word for &quot;university&quot;?",
    correct_answer: "Daigaku",
    incorrect_answers: ["Toshokan", "Jimusho", "Shokudou"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the Swedish word for &quot;window&quot;?",
    correct_answer: "F&ouml;nster",
    incorrect_answers: ["H&aring;l", "Sk&auml;rm", "Ruta"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the Italian word for &quot;tomato&quot;?",
    correct_answer: "Pomodoro",
    incorrect_answers: ["Aglio", "Cipolla", "Peperoncino"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What is the name of the popular animatronic singing fish prop, singing such hits such as &quot;Don&#039;t Worry, Be Happy&quot;?",
    correct_answer: "Big Mouth Billy Bass",
    incorrect_answers: ["Big Billy Bass", "Singing Fish", "Sardeen"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the last letter of the Greek alphabet?",
    correct_answer: "Omega",
    incorrect_answers: ["Mu", "Epsilon", "Kappa"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What character was once considered to be the 27th letter of the alphabet?",
    correct_answer: "Ampersand",
    incorrect_answers: ["Interrobang", "Tilde", "Pilcrow"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "The new One World Trade Center in Manhattan, New York City was designed by which architect? ",
    correct_answer: "David Childs",
    incorrect_answers: ["Bjarke Ingels", "Michael Arad", "Fumihiko Maki"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Amsterdam Centraal station is twinned with what station?",
    correct_answer: "London Liverpool Street",
    incorrect_answers: [
      "Frankfurt (Main) Hauptbahnhof",
      "Paris Gare du Nord",
      "Brussels Midi"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which of the following carbonated soft drinks were introduced first?",
    correct_answer: "Dr. Pepper",
    incorrect_answers: ["Coca-Cola", "Sprite", "Mountain Dew"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What direction does the Statue of Liberty face?",
    correct_answer: "Southeast",
    incorrect_answers: ["Southwest", "Northwest", "Northeast"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What year was Apple Inc. founded?",
    correct_answer: "1976",
    incorrect_answers: ["1978", "1980", "1974"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which of the General Mills Corporation&#039;s monster cereals was the last to be released in the 1970&#039;s?",
    correct_answer: "Fruit Brute",
    incorrect_answers: ["Count Chocula", "Franken Berry", "Boo-Berry"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What was Mountain Dew&#039;s original slogan?",
    correct_answer: "Yahoo! Mountain Dew... It&#039;ll tickle your innards!",
    incorrect_answers: [
      "Give Me A Dew",
      "Do The Dew",
      "Get&#039; that barefoot feelin&#039; drinkin&#039; Mountain Dew"
    ]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the Portuguese word for &quot;Brazil&quot;?",
    correct_answer: "Brasil",
    incorrect_answers: ["Brazil", "Brasilia", "Bras&iacute;l"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is a Burgee?",
    correct_answer: "A flag",
    incorrect_answers: ["A rope", "A window", "A type of food"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "When did the website &quot;Facebook&quot; launch?",
    correct_answer: "2004",
    incorrect_answers: ["2005", "2003", "2006"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Who invented Pastafarianism?",
    correct_answer: "Bobby Henderson",
    incorrect_answers: ["Eric Tignor", "Bill Nye", "Zach Soldi"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Apple co-founder Steve Jobs died from complications of which form of cancer?",
    correct_answer: "Pancreatic",
    incorrect_answers: ["Bone", "Liver", "Stomach"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Computer manufacturer Compaq was acquired for $25 billion dollars in 2002 by which company?",
    correct_answer: "Hewlett-Packard",
    incorrect_answers: ["Toshiba", "Asus", "Dell"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What was the original name of the search engine &quot;Google&quot;?",
    correct_answer: "BackRub",
    incorrect_answers: ["CatMassage", "SearchPro", "Netscape Navigator"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Earl Grey tea is black tea flavoured with what?",
    correct_answer: "Bergamot oil",
    incorrect_answers: ["Lavender", "Vanilla", "Honey"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "The website &quot;Shut Up &amp; Sit Down&quot; reviews which form of media?",
    correct_answer: "Board Games",
    incorrect_answers: ["Television Shows", "Video Games", "Films"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which item of clothing is usually worn by a Scotsman at a wedding?",
    correct_answer: "Kilt",
    incorrect_answers: ["Skirt", "Dress", "Rhobes"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which of these words means &quot;idle spectator&quot;?",
    correct_answer: "Gongoozler",
    incorrect_answers: ["Gossypiboma", "Jentacular", "Meupareunia"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which country drives on the left side of the road?",
    correct_answer: "Japan",
    incorrect_answers: ["Germany", "Russia", "China"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which company&#039;s original slogan was &quot;Don&#039;t be evil&quot;?",
    correct_answer: "Google",
    incorrect_answers: ["Apple", "Yahoo", "Microsoft"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which country has the most Trappist breweries?",
    correct_answer: "Belgium",
    incorrect_answers: ["Netherlands", "France", "USA"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "What is the currency of Poland?",
    correct_answer: "Złoty",
    incorrect_answers: ["Ruble", "Euro", "Krone"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "Which American manufactured submachine gun was informally known by the American soldiers that used it as &quot;Grease Gun&quot;?",
    correct_answer: "M3",
    incorrect_answers: ["Colt 9mm", "Thompson", "MAC-10"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question:
      "What is the highest number of Michelin stars a restaurant can receive?",
    correct_answer: "Three",
    incorrect_answers: ["Four", "Five", "Six"]
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
}
