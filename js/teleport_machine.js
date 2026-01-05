// js/teleport_machine.js
// SAFE Teleport Machine — no TypeScript, no illegal syntax

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  pads: [],

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";

    // Create 4 teleport pads (green spheres you are seeing)
    const positions = [
      new THREE.Vector3(6, 0.25, 6),
      new THREE.Vector3(-6, 0.25, 6),
      new THREE.Vector3(6, 0.25, -6),
      new THREE.Vector3(-6, 0.25, -6),
    ];

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 1.2,
      roughness: 0.35,
    });

    positions.forEach((pos, i) => {
      const pad = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 20, 20),
        mat
      );
      pad.position.copy(pos);
      pad.userData.teleportIndex = i;
      this.group.add(pad);
      this.pads.push(pad);
    });

    scene.add(this.group);
  },

  update() {
    // future teleport logic hook
  },
};
