// js/spectator_rail.js
// Stable spectator rail (safe fallback)
// Prevents syntax errors and white screens

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SpectatorRail = {
  group: null,
  enabled: true,

  build(scene) {
    if (!scene) return;

    this.group = new THREE.Group();
    this.group.name = "spectator_rail";

    // Simple invisible boundary rail (placeholder)
    const railMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      visible: false, // keep invisible in production
    });

    const railGeo = new THREE.RingGeometry(4.5, 5.0, 48);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.x = -Math.PI / 2;
    rail.position.y = 0.01;

    this.group.add(rail);
    scene.add(this.group);
  },

  update(dt, camera) {
    if (!this.enabled || !camera || !this.group) return;

    // Optional future: keep spectators within bounds
    // Currently passive (safe)
  },

  setEnabled(v) {
    this.enabled = !!v;
    if (this.group) this.group.visible = this.enabled;
  },

  dispose(scene) {
    if (!this.group) return;
    if (scene) scene.remove(this.group);
    this.group = null;
  },
};
