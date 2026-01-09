// /js/hub_loader.js — main boot loader (CDN-safe)
// Responsible for: loading RoomManager once, and nothing else.

import { safeImport } from "./safe_import.js";

export async function boot() {
  // If something tries to boot twice, stop it.
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const rm = await safeImport("./js/room_manager.js");
  if (!rm?.RoomManager?.boot) {
    throw new Error("RoomManager.boot missing");
  }
  await rm.RoomManager.boot();
}
