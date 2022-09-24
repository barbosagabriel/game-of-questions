# Game of Questions

The game is a 'fastest finger' trivia game for multi-players, for which players use their smart devices as game controllers.

Live demo available [here](https://game-of-questions.herokuapp.com/).

## Built with
- [Node.js](https://nodejs.org/)
- [Socket.io](https://socket.io/)
- [Open Trivia Database](https://opentdb.com/)

## Installation

Requirements 
- [Node.js](https://nodejs.org/)

1. Rename the `.envexample` file to `.env`
2. Install the dependencies and start the server

```sh
$ cd game-of-questions
$ npm install
$ npm start
```

3. Navigate to `http://localhost:3000/`.

**Temporary**

In the HTML files, replace the URL to your proper host. Example: `var socket = io("http://localhost:3000");`.

