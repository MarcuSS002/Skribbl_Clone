const roomManager = require("../classes/RoomManager");

function registerChatHandlers(io, socket) {
  socket.on("guess", (payload = {}) => {
    const room = roomManager.getRoomByPlayer(socket.id);

    if (!room) {
      return;
    }

    const result = room.handleGuess(socket.id, payload.text, (event, data) => {
      io.to(room.id).emit(event, data);
    });

    if (!result) {
      return;
    }

    if (result.guessResult) {
      io.to(room.id).emit("guess_result", result.guessResult);
      socket.emit("correct_word", result.correctWord);
      return;
    }

    if (result.closeGuess) {
      socket.emit("close_guess", result.closeGuess);
    }

    if (result.chatMessage) {
      io.to(room.id).emit("chat_message", result.chatMessage);
    }
  });

  socket.on("chat", (payload = {}) => {
    const room = roomManager.getRoomByPlayer(socket.id);

    if (!room) {
      return;
    }

    const message = room.handleChat(socket.id, payload.text);

    if (message) {
      io.to(room.id).emit("chat_message", message);
    }
  });
}

module.exports = registerChatHandlers;
