// ===============================
// Skylark Poker VR — audio.js (6.2 SAFE)
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Audio = {
  listener: null,
  ambient: null,

  init(scene) {
    try {
      this.listener = new THREE.AudioListener();

      // Attach listener safely later (camera may not exist yet)
      setTimeout(() => {
        const cam = scene.children.find(o => o.isCamera);
        if (cam) cam.add(this.listener);
      }, 100);

      this.ambient = new THREE.Audio(this.listener);

      console.log("🔊 Audio system initialized");
    } catch (e) {
      console.warn("Audio init skipped:", e);
    }
  },

  playAmbient(buffer) {
    if (!this.ambient || !buffer) return;
    this.ambient.setBuffer(buffer);
    this.ambient.setLoop(true);
    this.ambient.setVolume(0.4);
    this.ambient.play();
  },

  stopAmbient() {
    if (this.ambient?.isPlaying) this.ambient.stop();
  }
};
