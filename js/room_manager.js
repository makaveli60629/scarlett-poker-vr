// /js/room_manager.js — decides which room to run
// Default: Scorpion (spawn seated)
// You can override via URL: ?room=lobby

import { safeImport } from "./safe_import.js";

export const RoomManager = {
  getRoom() {
    const url = new URL(location.href);
    const r = (url.searchParams.get("room") || "").toLowerCase();

    // Allow forcing lobby for testing:
    if (r === "lobby" || r === "vip") return r;

    // Default = scorpion
    return "scorpion";
  },

  async boot() {
    const room = this.getRoom();
    window.__SCARLETT_ROOM__ = room;

    // Load room config (sets spawn rules etc)
    if (room === "scorpion") {
      await safeImport("./js/scorpion_room.js");
    } else {
      // If you later add vip_room.js etc, you can load here.
      // For now, lobby just uses the same main, different spawn mode.
    }

    // Load main last
    await safeImport("./js/main.js");
  }
};
