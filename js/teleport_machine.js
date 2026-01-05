// js/teleport_machine.js
// Browser-safe Teleport Machine (NO TypeScript)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  pads: [],

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";

    const positions = [
      new THREE.Vector3(6, 0.25, 6),
      new THREE.Vector3(-6, 0.25, 6),
      new THREE.Vector3(6, 0.25, -6),
      new THREE.Vector3(-6, 0.25, -6),
    ];

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 1.2,
      roughness: 0.35,
    });

    for (let i = 0; i < positions.length; i++) {
      const pad = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 20, 20),
        material
      );
      pad.position.copy(positions[i]);
      pad.userData.index = i;
      this.group.add(pad);
      this.pads.push(pad);
    }

    scene.add(this.group);
  },

  update() {}
};
