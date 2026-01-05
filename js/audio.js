// ===============================
// Skylark Poker VR — js/audio.js (EXPORT SAFE)
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Audio = {
  listener: null,
  ambient: null,

  init(cameraOrScene) {
    try {
      this.listener = new THREE.AudioListener();
      if (cameraOrScene?.isCamera) cameraOrScene.add(this.listener);
      this.ambient = new THREE.Audio(this.listener);
      console.log("🔊 Audio ready");
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  },

  playUrl(url, { loop = true, volume = 0.35 } = {}) {
    try {
      if (!this.listener) return;
      const loader = new THREE.AudioLoader();
      loader.load(
        url,
        (buffer) => {
          if (!this.ambient) this.ambient = new THREE.Audio(this.listener);
          this.ambient.setBuffer(buffer);
          this.ambient.setLoop(loop);
          this.ambient.setVolume(volume);
          this.ambient.play();
        },
        undefined,
        (err) => console.warn("Audio load error:", err)
      );
    } catch (e) {
      console.warn("Audio playUrl failed:", e);
    }
  },

  stop() {
    try {
      if (this.ambient?.isPlaying) this.ambient.stop();
    } catch {}
  }
};
