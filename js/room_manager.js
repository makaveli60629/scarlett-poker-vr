// js/room_manager.js — Scarlett Poker VR (6.2)
// Rooms + per-room spawn pads (clear, safe areas)

export const RoomManager = {
  rooms: {},

  init() {
    // Lobby center stays around the main table area
    // Spawns are OFFSET away from the table so you never land inside it.
    this.rooms = {
      lobby: {
        id: "lobby",
        name: "Lobby",
        center: { x: 0, z: 0 },
        // ✅ SAFE spawn away from table
        spawn: { x: 0, z: 10, yaw: Math.PI },
        aggression: 1.0
      },

      penthouse: {
        id: "penthouse",
        name: "Penthouse",
        center: { x: 28, z: 0 },
        spawn: { x: 28, z: 10, yaw: Math.PI },
        aggression: 1.15
      },

      casino: {
        id: "casino",
        name: "Casino",
        center: { x: -28, z: 0 },
        spawn: { x: -28, z: 10, yaw: Math.PI },
        aggression: 1.05
      },

      nightclub: {
        id: "nightclub",
        name: "Nightclub",
        center: { x: 0, z: 28 },
        spawn: { x: 0, z: 38, yaw: Math.PI },
        aggression: 1.25
      },

      vip: {
        id: "vip",
        name: "VIP Room",
        center: { x: 0, z: -28 },
        spawn: { x: 0, z: -18, yaw: 0 },
        aggression: 1.35
      }
    };
  },

  getRoom(id) {
    return this.rooms[id] || this.rooms.lobby;
  },

  getRooms() {
    return Object.values(this.rooms);
  },

  randomAggroRoom() {
    const list = this.getRooms();
    // Prefer non-lobby so you see roam behavior
    const candidates = list.filter(r => r.id !== "lobby");
    return (candidates.length ? candidates : list)[Math.floor(Math.random() * (candidates.length ? candidates : list).length)].id;
  }
};
