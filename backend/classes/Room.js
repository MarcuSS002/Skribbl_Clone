const Player = require("./Player");
const { getRandomWords } = require("../utils/words");
const { clampNumber, cleanText, isNormalizedPoint } = require("../utils/helpers");

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
};

class Room {
  constructor(id, settings) {
    this.id = id;
    this.settings = Room.normalizeSettings(settings);
    this.players = new Map();
    this.hostId = null;
    this.phase = "lobby";
    this.round = 0;
    this.totalRounds = this.settings.rounds;
    this.drawerIndex = -1;
    this.currentDrawerId = null;
    this.currentWord = "";
    this.wordOptions = [];
    this.guessedPlayerIds = new Set();
    this.correctGuessCount = 0;
    this.strokes = [];
    this.activeStroke = null;
    this.pickTimer = null;
    this.drawTimer = null;
    this.roundEndTimer = null;
    this.hintTimer = null;
    this.revealedIndexes = new Set();
    this.lastActivity = Date.now();
  }

  static normalizeSettings(settings) {
    return {
      maxPlayers: clampNumber(settings && settings.maxPlayers, 2, 20, DEFAULT_SETTINGS.maxPlayers),
      rounds: clampNumber(settings && settings.rounds, 2, 10, DEFAULT_SETTINGS.rounds),
      drawTime: clampNumber(settings && settings.drawTime, 15, 240, DEFAULT_SETTINGS.drawTime),
      wordCount: clampNumber(settings && settings.wordCount, 1, 5, DEFAULT_SETTINGS.wordCount),
      hints: clampNumber(settings && settings.hints, 0, 5, DEFAULT_SETTINGS.hints),
    };
  }

  addPlayer(socketId, name) {
    if (this.players.size >= this.settings.maxPlayers) {
      throw new Error("Room is full");
    }

    if (this.phase !== "lobby") {
      throw new Error("Game already started");
    }

    const isHost = this.players.size === 0;
    const player = new Player(socketId, name, isHost);

    this.players.set(socketId, player);
    if (isHost) {
      this.hostId = socketId;
    }

    this.touch();
    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return { player: null, newHostId: this.hostId };
    }

    this.players.delete(playerId);

    if (playerId === this.hostId) {
      const nextHost = this.players.values().next().value || null;
      this.hostId = nextHost ? nextHost.id : null;
      if (nextHost) {
        nextHost.isHost = true;
      }
    }

    if (playerId === this.currentDrawerId) {
      this.currentDrawerId = null;
      this.endAllTimers();
      this.phase = this.players.size > 1 ? "roundEnd" : "lobby";
    }

    this.touch();
    return { player, newHostId: this.hostId };
  }

  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  getPlayers() {
    return Array.from(this.players.values()).map((player) => player.toJSON());
  }

  canStart(playerId) {
    return this.phase === "lobby" && this.hostId === playerId && this.players.size >= 2;
  }

  startGame(emit) {
    if (this.phase !== "lobby") {
      throw new Error("Game already started");
    }

    if (this.players.size < 2) {
      throw new Error("At least 2 players are required");
    }

    for (const player of this.players.values()) {
      player.score = 0;
      player.isDrawing = false;
    }

    this.round = 1;
    this.drawerIndex = -1;
    this.startPicking(emit);
  }

  startPicking(emit) {
    this.clearRoundTimers();

    if (this.round > this.totalRounds || this.players.size < 2) {
      this.finishGame(emit);
      return;
    }

    const players = Array.from(this.players.values());
    this.drawerIndex = (this.drawerIndex + 1) % players.length;
    const drawer = players[this.drawerIndex];

    for (const player of this.players.values()) {
      player.isDrawing = player.id === drawer.id;
    }

    this.phase = "picking";
    this.currentDrawerId = drawer.id;
    this.currentWord = "";
    this.wordOptions = getRandomWords(this.settings.wordCount);
    this.guessedPlayerIds.clear();
    this.correctGuessCount = 0;
    this.strokes = [];
    this.activeStroke = null;
    this.revealedIndexes.clear();

    emit("game_state", this.getGameState());
    emit("round_start", {
      drawerId: drawer.id,
      drawerName: drawer.name,
      wordOptions: this.wordOptions,
      round: this.round,
      totalRounds: this.totalRounds,
    });

    this.pickTimer = setTimeout(() => {
      this.chooseWord(drawer.id, this.wordOptions[0], emit);
    }, 15000);
  }

  chooseWord(playerId, word, emit) {
    if (this.phase !== "picking") {
      throw new Error("No word is being picked");
    }

    if (playerId !== this.currentDrawerId) {
      throw new Error("Only the drawer can choose a word");
    }

    const pickedWord = cleanText(word, 40).toLowerCase();
    if (!this.wordOptions.includes(pickedWord)) {
      throw new Error("Invalid word choice");
    }

    this.clearTimer("pickTimer");
    this.phase = "drawing";
    this.currentWord = pickedWord;
    this.revealedIndexes.clear();
    this.touch();

    const publicPayload = {
      drawerId: this.currentDrawerId,
      hint: this.getHint(),
      wordLength: this.currentWord.length,
    };

    emit("game_state", this.getGameState());
    emit("your_word", { word: this.currentWord }, { playerId });
    emit("word_chosen", publicPayload, { except: playerId });
    this.startHintTimer(emit);

    this.drawTimer = setTimeout(() => {
      this.endRound("time_up", emit);
    }, this.settings.drawTime * 1000);

    return Object.assign({ word: this.currentWord }, publicPayload);
  }

  handleGuess(playerId, text, emit) {
    const player = this.getPlayer(playerId);
    const guess = cleanText(text, 120);

    if (!player || !guess) {
      return null;
    }

    if (this.phase !== "drawing" || playerId === this.currentDrawerId) {
      return {
        chatMessage: this.buildChatMessage(player, guess, "chat"),
      };
    }

    if (this.guessedPlayerIds.has(playerId)) {
      return {
        chatMessage: this.buildChatMessage(player, guess, "chat"),
      };
    }

    if (guess.toLowerCase() !== this.currentWord.toLowerCase()) {
      return {
        closeGuess: this.isCloseGuess(guess) ? { message: "Close!" } : null,
        chatMessage: this.buildChatMessage(player, guess, "guess"),
      };
    }

    this.guessedPlayerIds.add(playerId);
    this.correctGuessCount += 1;

    const points = Math.max(25, 100 - (this.correctGuessCount - 1) * 10);
    player.score += points;
    this.touch();

    const result = {
      correct: true,
      playerId: player.id,
      playerName: player.name,
      points,
      scores: this.getScores(),
    };

    if (this.allGuessersCorrect()) {
      setTimeout(() => this.endRound("all_guessed", emit), 0);
    }

    return { guessResult: result, correctWord: { word: this.currentWord } };
  }

  buildChatMessage(player, text, type) {
    return {
      playerId: player.id,
      playerName: player.name,
      text,
      type,
    };
  }

  handleChat(playerId, text) {
    const player = this.getPlayer(playerId);
    const message = cleanText(text, 200);

    if (!player || !message) {
      return null;
    }

    return this.buildChatMessage(player, message, "chat");
  }

  addDrawData(playerId, type, payload) {
    if (this.phase !== "drawing" || playerId !== this.currentDrawerId) {
      return null;
    }

    if (type === "end") {
      this.activeStroke = null;
      return { type: "end", drawerId: playerId };
    }

    if (!isNormalizedPoint(payload)) {
      return null;
    }

    if (type === "start") {
      const stroke = {
        drawerId: playerId,
        color: cleanText(payload.color, 32) || "#111111",
        size: clampNumber(payload.size, 1, 60, 6),
        points: [{ x: Number(payload.x), y: Number(payload.y) }],
      };

      this.strokes.push(stroke);
      this.activeStroke = stroke;

      return {
        type: "start",
        x: stroke.points[0].x,
        y: stroke.points[0].y,
        color: stroke.color,
        size: stroke.size,
        drawerId: playerId,
      };
    }

    if (type === "move" && this.activeStroke) {
      const point = { x: Number(payload.x), y: Number(payload.y) };
      this.activeStroke.points.push(point);

      return {
        type: "move",
        x: point.x,
        y: point.y,
        drawerId: playerId,
      };
    }

    return null;
  }

  clearCanvas(playerId) {
    if (this.phase !== "drawing" || playerId !== this.currentDrawerId) {
      return false;
    }

    this.strokes = [];
    this.activeStroke = null;
    return true;
  }

  undoStroke(playerId) {
    if (this.phase !== "drawing" || playerId !== this.currentDrawerId || this.strokes.length === 0) {
      return false;
    }

    this.strokes.pop();
    this.activeStroke = null;
    return true;
  }

  getCanvasReplay() {
    return {
      strokes: this.strokes,
    };
  }

  endRound(reason, emit) {
    if (this.phase === "roundEnd" || this.phase === "gameOver" || !this.currentWord) {
      return;
    }

    this.clearTimer("drawTimer");
    this.clearTimer("pickTimer");
    this.clearTimer("hintTimer");
    this.awardDrawerPoints();
    this.phase = "roundEnd";

    emit("round_end", {
      word: this.currentWord,
      reason,
      scores: this.getScores(),
    });

    this.roundEndTimer = setTimeout(() => {
      const playersPerRound = Math.max(this.players.size, 1);
      const turnsCompleted = (this.round - 1) * playersPerRound + this.drawerIndex + 1;
      const totalTurns = this.totalRounds * playersPerRound;

      if (turnsCompleted >= totalTurns || this.players.size < 2) {
        this.finishGame(emit);
        return;
      }

      if (this.drawerIndex >= playersPerRound - 1) {
        this.round += 1;
      }

      this.startPicking(emit);
    }, 5000);
  }

  awardDrawerPoints() {
    const drawer = this.getPlayer(this.currentDrawerId);
    const totalGuessers = Math.max(this.players.size - 1, 1);

    if (!drawer) {
      return;
    }

    drawer.score += Math.round((this.guessedPlayerIds.size / totalGuessers) * 50);
  }

  finishGame(emit) {
    this.endAllTimers();
    this.phase = "gameOver";

    for (const player of this.players.values()) {
      player.isDrawing = false;
    }

    const leaderboard = this.getScores();

    emit("game_over", {
      winner: leaderboard[0] || null,
      leaderboard,
    });
    emit("game_state", this.getGameState());
  }

  startHintTimer(emit) {
    const revealableIndexes = [];

    for (let index = 0; index < this.currentWord.length; index += 1) {
      if (this.currentWord[index] !== " ") {
        revealableIndexes.push(index);
      }
    }

    const revealCount = Math.min(this.settings.hints, revealableIndexes.length);
    if (revealCount === 0) {
      return;
    }

    let revealed = 0;
    const interval = Math.max(5000, Math.floor((this.settings.drawTime * 1000) / (revealCount + 1)));

    this.hintTimer = setInterval(() => {
      if (this.phase !== "drawing" || revealed >= revealCount) {
        this.clearTimer("hintTimer");
        return;
      }

      const remaining = revealableIndexes.filter((index) => !this.revealedIndexes.has(index));
      const index = remaining[Math.floor(Math.random() * remaining.length)];
      this.revealedIndexes.add(index);
      revealed += 1;

      emit("hint_update", { hint: this.getHint() });
    }, interval);
  }

  getHint() {
    return this.currentWord
      .split("")
      .map((letter, index) => {
        if (letter === " ") {
          return " ";
        }

        return this.revealedIndexes.has(index) ? letter : "_";
      })
      .join("");
  }

  isCloseGuess(guess) {
    const normalized = guess.toLowerCase();
    const target = this.currentWord.toLowerCase();

    if (Math.abs(normalized.length - target.length) > 1) {
      return false;
    }

    let differences = Math.abs(normalized.length - target.length);
    const length = Math.min(normalized.length, target.length);

    for (let index = 0; index < length; index += 1) {
      if (normalized[index] !== target[index]) {
        differences += 1;
      }
    }

    return differences === 1;
  }

  allGuessersCorrect() {
    return this.guessedPlayerIds.size >= Math.max(this.players.size - 1, 1);
  }

  getScores() {
    return this.getPlayers().sort((a, b) => b.score - a.score);
  }

  getGameState() {
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      players: this.getPlayers(),
    };
  }

  toJSON() {
    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      hostId: this.hostId,
      players: this.getPlayers(),
      settings: this.settings,
    };
  }

  toListItem() {
    return {
      id: this.id,
      phase: this.phase,
      playerCount: this.players.size,
      maxPlayers: this.settings.maxPlayers,
      hostId: this.hostId,
    };
  }

  clearTimer(timerName) {
    if (!this[timerName]) {
      return;
    }

    if (timerName === "hintTimer") {
      clearInterval(this[timerName]);
    } else {
      clearTimeout(this[timerName]);
    }

    this[timerName] = null;
  }

  clearRoundTimers() {
    this.clearTimer("pickTimer");
    this.clearTimer("drawTimer");
    this.clearTimer("roundEndTimer");
    this.clearTimer("hintTimer");
  }

  endAllTimers() {
    this.clearRoundTimers();
  }

  touch() {
    this.lastActivity = Date.now();
  }
}

module.exports = Room;
