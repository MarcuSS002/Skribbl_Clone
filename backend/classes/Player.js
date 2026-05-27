class Player {
  constructor(id, name, isHost) {
    this.id = id;
    this.name = Player.cleanName(name);
    this.score = 0;
    this.isDrawing = false;
    this.isHost = Boolean(isHost);
  }

  static cleanName(name) {
    const fallback = "Player"; //If name becomes empty then automatically filled.
    if (typeof name !== "string") {
      return fallback;
    }

    const cleaned = name.trim().slice(0, 24);
    return cleaned || fallback;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isDrawing: this.isDrawing,
      isHost: this.isHost,
    };
  }
}

module.exports = Player;
