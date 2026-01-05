import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { RoomManager } from "./room_manager.js";
import { registerInteractable } from "./state.js";

export const TeleportMachine = {
  pads: [],
  playerRig: null,

  init(scene, playerRig) {
    this.playerRig = playerRig;
    this.pads = [];

    // Use spawn pads created by RoomManager
    const spawns = RoomManager.getSpawnPads?.() || [];
    for (const s of spawns) {
      const pad = this._makeTeleportPadVisual(s, s.name || "TeleportPad");
      scene.add(pad);
      this.pads.push(pad);

      // Optional click teleport (grip-ray) support
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

  _makeTeleportPadVisual(spawnPadObj, label) {
    const group = new THREE.Group();
    group.name = `Teleport_${label}`;

    const s = spawnPadObj.userData.spawn;
    group.position.copy(s.position);
    group.userData.spawn = { position: s.position.clone(), rotationY: s.rotationY || 0 };

    // Base disk
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.06, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0b0f12,
        roughness: 0.95,
        metalness: 0.05
      })
    );
    base.position.y = 0.03;
    group.add(base);

    // Neon ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.08, 14, 40),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.4,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    // Center glow
    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0c1014,
        emissive: 0x007a66,
        emissiveIntensity: 0.7,
        roughness: 0.8
      })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.061;
    group.add(center);

    // Floating label billboard (always faces camera later; for now static)
    // (Simple and cheap: no canvas required)
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    pillar.position.set(0.0, 0.33, 0.0);
    group.add(pillar);

    const beacon = new THREE.PointLight(0x00ffaa, 0.7, 6);
    beacon.position.set(0, 0.65, 0);
    group.add(beacon);

    return group;
  },

  getSafeSpawn() {
    // Always prefer the lobby spawn pad
    const lobby = this.pads.find(p => (p.name || "").toLowerCase().includes("lobby"));
    const pad = lobby || this.pads[0];
    if (!pad?.userData?.spawn) return null;

    const s = pad.userData.spawn;
    const pos = s.position.clone();
    pos.z += 0.25; // little offset so you're not centered on the disk
    return { position: pos, rotationY: s.rotationY || 0 };
  }
};
