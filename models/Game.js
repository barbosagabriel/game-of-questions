const GameState = require("./GameState");

class Game {
  constructor(hostId, timeToAnswer) {
    this.pin = Math.floor(Math.random() * 8999 + 1000);
    this.hostId = hostId;
    this.state = GameState.WAITING_PLAYERS;
    this.currentQuestion = null;
    this.timeToAnswer = timeToAnswer;
    this.players = [];
  }

  setState(newState) {
    this.state = newState;
  }
}

module.exports = Game;
