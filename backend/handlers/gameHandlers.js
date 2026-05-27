const roomManager = require("../classes/RoomManager");

function emitError(socket, message) {
  socket.emit("error_message", { message });
}

function registerGameHandlers(io, socket) {
  const emitToRoom = (room, event, payload, options = {}) => {
    if (options.playerId) {
      io.to(options.playerId).emit(event, payload);
      return;
    }

    if (options.except) {
      const targetSocket = io.sockets.sockets.get(options.except);

      if (targetSocket) {
        targetSocket.to(room.id).emit(event, payload);
      }
      return;
    }

    io.to(room.id).emit(event, payload);
  };

  socket.on("start_game", () => {
    const room = roomManager.getRoomByPlayer(socket.id);

    if (!room) {
      emitError(socket, "Join a room first");
      return;
    }

    if (!room.canStart(socket.id)) {
      emitError(socket, "Only the host can start with at least 2 players");
      return;
    }

    try {
      room.startGame((event, payload, options) => emitToRoom(room, event, payload, options));
    } catch (error) {
      emitError(socket, error.message);
    }
  });

  socket.on("word_chosen", (payload = {}) => {
    const room = roomManager.getRoomByPlayer(socket.id);

    if (!room) {
      emitError(socket, "Join a room first");
      return;
    }

    try {
      room.chooseWord(socket.id, payload.word, (event, data, options) => {
        emitToRoom(room, event, data, options);
      });
    } catch (error) {
      emitError(socket, error.message);
    }
  });
}

module.exports = registerGameHandlers;
