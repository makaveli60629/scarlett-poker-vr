export const RoomManager = {
  rooms: new Map(),

  init() {
    // Center points for logic only (pads exist already in world)
    this.rooms.set("lobby",      { id: "lobby",      name: "Lobby",      center: { x: 0,  z: 0  }, aggression: 1.0 });
    this.rooms.set("vip",        { id: "vip",        name: "VIP Room",   center: { x: 40, z: 10 }, aggression: 1.25 });
    this.rooms.set("penthouse",  { id: "penthouse",  name: "Penthouse",  center: { x: 0,  z: 50 }, aggression: 1.15 });
    this.rooms.set("nightclub",  { id: "nightclub",  name: "Nightclub",  center: { x: -40,z: -10}, aggression: 1.6 });
  },

  getRoom(id) {
    return this.rooms.get(id) || this.rooms.get("lobby");
  },

  randomAggroRoom() {
    const ids = ["vip", "nightclub", "penthouse"];
    return ids[Math.floor(Math.random() * ids.length)];
  }
};
