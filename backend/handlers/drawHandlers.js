const roomManager = require("../classes/RoomManager");

function getRoom(socket) {
  return roomManager.getRoomByPlayer(socket.id);
}

function registerDrawHandlers(io, socket) {
  function relayDraw(type, payload) {
    const room = getRoom(socket);

    if (!room) {
      return;
    }

    const drawData = room.addDrawData(socket.id, type, payload || {});
    if (drawData) {
      socket.to(room.id).emit("draw_data", drawData);
    }
  }

  socket.on("draw_start", (payload) => relayDraw("start", payload));
  socket.on("draw_move", (payload) => relayDraw("move", payload));
  socket.on("draw_end", () => relayDraw("end", {}));

  socket.on("canvas_clear", () => {
    const room = getRoom(socket);

    if (room && room.clearCanvas(socket.id)) {
      io.to(room.id).emit("canvas_cleared", {});
    }
  });

  socket.on("draw_undo", () => {
    const room = getRoom(socket);

    if (room && room.undoStroke(socket.id)) {
      io.to(room.id).emit("canvas_replay", room.getCanvasReplay());
    }
  });

  socket.on("request_canvas", () => {
    const room = getRoom(socket);

    if (room) {
      socket.emit("canvas_replay", room.getCanvasReplay());
    }
  });
}

module.exports = registerDrawHandlers;
