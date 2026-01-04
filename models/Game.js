const GameState = require("./GameState");

class Game {
  constructor(hostId, timeToAnswer) {
    this.pin = Math.floor(Math.random() * 8999 + 1000);
    this.hostId = hostId;
    this.state = GameState.WAITING_PLAYERS;
    this.currentQuestion = {};
    this.previousQuestions = [];
    this.timeToAnswer = Number(timeToAnswer) || 10000;
    this.players = [];
    this.totalOfQuestions = 10;
    this._answerTimer = null;
    this._autoNextTimer = null;
    this.questionPool = [];
  }

  setState(newState) {
    this.state = newState;
  }
}

module.exports = Game;
