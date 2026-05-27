const roomManager = require("../classes/RoomManager");
const { cleanText } = require("../utils/helpers");

function emitError(socket, message) {
  socket.emit("error_message", { message });
}

function leaveCurrentRoom(io, socket) {
  const room = roomManager.getRoomByPlayer(socket.id);

  if (!room) {
    return;
  }

  const { player, newHostId } = room.removePlayer(socket.id);
  socket.leave(room.id);
  socket.data.roomId = null;

  if (room.players.size === 0) {
    roomManager.deleteRoom(room.id);
    return;
  }

  io.to(room.id).emit("player_left", {
    playerId: player ? player.id : socket.id,
    players: room.getPlayers(),
    newHostId,
  });
  io.to(room.id).emit("game_state", room.getGameState());
}

function registerRoomHandlers(io, socket) {
  socket.on("create_room", (payload = {}) => {
    try {
      leaveCurrentRoom(io, socket);

      const room = roomManager.createRoom(payload.settings || {});
      const player = room.addPlayer(socket.id, payload.playerName);

      socket.join(room.id);
      socket.data.roomId = room.id;

      socket.emit("room_created", {
        roomId: room.id,
        player: player.toJSON(),
        room: room.toJSON(),
      });
    } catch (error) {
      emitError(socket, error.message);
    }
  });

  socket.on("join_room", (payload = {}) => {
    try {
      leaveCurrentRoom(io, socket);

      const roomId = cleanText(payload.roomId, 12).toUpperCase();
      const room = roomManager.getRoom(roomId);

      if (!room) {
        throw new Error("Room not found");
      }

      const player = room.addPlayer(socket.id, payload.playerName);

      socket.join(room.id);
      socket.data.roomId = room.id;

      socket.emit("room_joined", {
        roomId: room.id,
        player: player.toJSON(),
        room: room.toJSON(),
      });

      socket.to(room.id).emit("player_joined", {
        player: player.toJSON(),
        players: room.getPlayers(),
      });
    } catch (error) {
      emitError(socket, error.message);
    }
  });

  socket.on("leave_room", () => {
    leaveCurrentRoom(io, socket);
  });

  socket.on("get_rooms", () => {
    socket.emit("rooms_list", { rooms: roomManager.listRooms() });
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(io, socket);
  });
}

module.exports = registerRoomHandlers;
