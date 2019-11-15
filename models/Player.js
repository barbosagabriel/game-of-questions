class Player {
  constructor(id, username, room) {
    this.id = id;
    this.username = username;
    this.correctAnswers = 0;
    this.score = 0;
    this.currentAnswer = null;
    this.room = room;
  }
}

module.exports = Player;
