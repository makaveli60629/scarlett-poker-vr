// js/teleport_machine.js
// STABLE TELEPORT + SAFE SPAWN SYSTEM (NO CRASH GUARANTEE)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  pads: [],
  fallbackSpawn: new THREE.Vector3(0, 0, 3),

  build(scene) {
    this.pads = [];

    const positions = [
      new THREE.Vector3(0, 0, 3),
      new THREE.Vector3(6, 0, 0),
      new THREE.Vector3(-6, 0, 0),
      new THREE.Vector3(0, 0, -6),
    ];

    positions.forEach((pos, i) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24),
        new THREE.MeshStandardMaterial({
          color: 0x00ffaa,
          emissive: 0x00ffaa,
          emissiveIntensity: 0.9,
          roughness: 0.35
        })
      );

      pad.position.copy(pos);
      pad.position.y = 0.04;
      pad.name = `TeleportPad_${i}`;

      scene.add(pad);
      this.pads.push(pad);
    });
  },

  // 🔒 SAFE SPAWN — this is what was missing before
  getSafeSpawn() {
    if (this.pads.length > 0) {
      return this.pads[0].position.clone().add(new THREE.Vector3(0, 0, 0.8));
    }
    return this.fallbackSpawn.clone();
  }
};
