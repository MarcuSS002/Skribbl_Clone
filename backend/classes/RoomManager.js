const Room = require("./Room");
const { generateRoomId } = require("../utils/helpers");

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(settings) {
    let roomId = generateRoomId();

    while (this.rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = new Room(roomId, settings);
    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId) {
    if (typeof roomId !== "string") {
      return null;
    }

    return this.rooms.get(roomId.trim().toUpperCase()) || null;
  }

  deleteRoom(roomId) {
    const room = this.getRoom(roomId);

    if (room) {
      room.endAllTimers();
      this.rooms.delete(room.id);
    }
  }

  getRoomByPlayer(playerId) {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(playerId)) {
        return room;
      }
    }

    return null;
  }

  listRooms() {
    return Array.from(this.rooms.values()).map((room) => room.toListItem());
  }
}

module.exports = new RoomManager();
