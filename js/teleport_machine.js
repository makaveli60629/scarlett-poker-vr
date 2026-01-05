import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { RoomManager } from "./room_manager.js";

export const TeleportMachine = {
  pads: [],
  playerRig: null,

  init(scene, playerRig) {
    this.playerRig = playerRig;
    this.pads = RoomManager.getSpawnPads?.() || [];

    // Fallback: scan scene if needed
    if (!this.pads.length) {
      scene.traverse((o) => { if (o?.userData?.spawn) this.pads.push(o); });
    }
  },

  getSafeSpawn() {
    const lobby = this.pads.find(p => (p.name || "").toLowerCase().includes("lobby"));
    const pad = lobby || this.pads[0];
    if (!pad?.userData?.spawn) return null;

    const s = pad.userData.spawn;
    // small forward offset so you’re not centered on geometry
    const pos = s.position.clone();
    pos.z += 0.25;

    return { position: pos, rotationY: s.rotationY || 0 };
  }
};
