import * as THREE from "three";
import { RoomManager } from "./room_manager.js";

export const TeleportMachine = {
  pads: [],
  playerRig: null,

  init(scene, playerRig) {
    this.playerRig = playerRig;
    this.pads = RoomManager.getSpawnPads?.() || [];

    // If pads were not built yet, try to find them by name pattern
    if (!this.pads.length) {
      scene.traverse((o) => {
        if (o?.userData?.spawn) this.pads.push(o);
      });
    }
  },

  getSafeSpawn() {
    // Always pick Lobby pad first if it exists
    const lobby = this.pads.find(p => (p.name || "").toLowerCase().includes("lobby"));
    const pad = lobby || this.pads[0];

    if (!pad?.userData?.spawn) return null;
    const s = pad.userData.spawn;

    return {
      position: s.position.clone(),
      rotationY: s.rotationY || 0
    };
  },

  teleportToPad(index = 0) {
    if (!this.playerRig) return false;
    const pad = this.pads[index];
    if (!pad?.userData?.spawn) return false;

    const s = pad.userData.spawn;
    this.playerRig.position.copy(s.position);
    this.playerRig.rotation.y = s.rotationY || 0;
    return true;
  }
};
