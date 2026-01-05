// js/teleport_machine.js — Premium pads + GitHub-safe
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { RoomManager } from "./room_manager.js";
import { registerInteractable } from "./state.js";

export const TeleportMachine = {
  pads: [],
  playerRig: null,

  init(scene, playerRig) {
    this.playerRig = playerRig;
    this.pads = [];

    const spawns = RoomManager.getSpawnPads?.() || [];
    for (const s of spawns) {
      const pad = this._makePad(s);
      scene.add(pad);
      this.pads.push(pad);

      // Optional click teleport support later
      try {
        registerInteractable(pad, () => {
          const spawn = pad.userData.spawn;
          if (!spawn) return;
          this.playerRig.position.copy(spawn.position);
          this.playerRig.rotation.y = spawn.rotationY || 0;
        });
      } catch {}
    }
  },

  _makePad(spawnObj) {
    const s = spawnObj.userData.spawn;
    const g = new THREE.Group();
    g.name = `TeleportPad_${spawnObj.name || "Pad"}`;
    g.position.copy(s.position);
    g.userData.spawn = { position: s.position.clone(), rotationY: s.rotationY || 0 };

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.06, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.95 })
    );
    base.position.y = 0.03;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.08, 14, 44),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.5,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.085;

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0c1014,
        emissive: 0x004d40,
        emissiveIntensity: 0.8,
        roughness: 0.85
      })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.061;

    const beacon = new THREE.PointLight(0x00ffaa, 0.7, 7);
    beacon.position.set(0, 1.6, 0);

    g.add(base, ring, center, beacon);
    return g;
  },

  getSafeSpawn() {
    const lobby = this.pads.find(p => (p.name || "").toLowerCase().includes("lobby"));
    const pad = lobby || this.pads[0];
    if (!pad?.userData?.spawn) return null;

    const s = pad.userData.spawn;
    const pos = s.position.clone();
    pos.z += 0.25;
    return { position: pos, rotationY: s.rotationY || 0 };
  }
};
