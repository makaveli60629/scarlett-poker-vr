// js/controls.js
// Unified VR Controls (safe stub — expands later)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  player: null,
  enabled: true,

  init(playerGroup, renderer) {
    this.player = playerGroup;

    // Placeholder: real XR controls can hook here later
    console.log("Controls initialized");
  },

  update() {
    if (!this.enabled || !this.player) return;
    // Movement logic will go here later
  },

  setEnabled(value) {
    this.enabled = value;
  }
};
