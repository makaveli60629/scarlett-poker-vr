// /js/ui.js — Scarlett Poker VR — UI v3 (Menu + Music + Hub Messages)
// GitHub-safe

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const UI = {
  scene: null,
  camera: null,
  renderer: null,
  overlay: null,

  panel: null,
  panelVisible: true,

  audio: null,
  musicOn: false,

  init({ scene, camera, renderer, overlay }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.overlay = overlay || null;

    this._buildPanel();
    this._setupAudio();

    this.log("UI ready: M toggles menu (desktop). VR: press A/X to toggle menu, B/Y to toggle music.");
  },

  _buildPanel() {
    // Simple “safe” panel: boxes + glowing bars (no text rendering dependencies)
    this.panel = new THREE.Group();
    this.panel.name = "UI_Panel";

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.28, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.9, metalness: 0.05 })
    );
    base.position.set(0, 0, -1.15);
    this.panel.add(base);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.03, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.2 })
    );
    glow.position.set(0, 0.12, -1.139);
    this.panel.add(glow);

    const musicBtn = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x12151c, roughness: 0.85 })
    );
    musicBtn.position.set(-0.13, -0.02, -1.139);
    musicBtn.name = "btn_music";
    this.panel.add(musicBtn);

    const menuBtn = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x12151c, roughness: 0.85 })
    );
    menuBtn.position.set(0.13, -0.02, -1.139);
    menuBtn.name = "btn_menu";
    this.panel.add(menuBtn);

    // attach to camera so it stays visible
    this.camera.add(this.panel);
    this.panel.visible = true;

    // Desktop toggle
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "m") this.togglePanel();
    });
  },

  _setupAudio() {
    // HTMLAudioElement is simplest + GitHub safe
    try {
      this.audio = new Audio("assets/audio/lobby_ambience.mp3");
      this.audio.loop = true;
      this.audio.volume = 0.55;
    } catch (e) {
      this.audio = null;
      this.log("Audio init failed (ok): " + e);
    }
  },

  togglePanel() {
    this.panelVisible = !this.panelVisible;
    if (this.panel) this.panel.visible = this.panelVisible;
    this.log(`Menu: ${this.panelVisible ? "ON" : "OFF"}`);
  },

  toggleMusic() {
    if (!this.audio) {
      this.log("Music file missing or blocked (assets/audio/lobby_ambience.mp3).");
      return;
    }
    this.musicOn = !this.musicOn;
    if (this.musicOn) {
      this.audio.play().catch(() => this.log("Music play blocked until user gesture."));
      this.log("Music: ON");
    } else {
      this.audio.pause();
      this.log("Music: OFF");
    }
  },

  update(dt) {
    // VR controller buttons (A/X menu, B/Y music)
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      const gp = src.gamepad;

      // common mapping:
      // buttons[4] = X (left) / A (right)
      // buttons[5] = Y (left) / B (right)
      const btnMenu = gp.buttons?.[4]?.pressed;
      const btnMusic = gp.buttons?.[5]?.pressed;

      // edge detect
      if (btnMenu && !src._uiMenuHeld) {
        this.togglePanel();
        src._uiMenuHeld = true;
      }
      if (!btnMenu) src._uiMenuHeld = false;

      if (btnMusic && !src._uiMusicHeld) {
        this.toggleMusic();
        src._uiMusicHeld = true;
      }
      if (!btnMusic) src._uiMusicHeld = false;
    }
  },

  log(msg) {
    if (this.overlay) {
      // Append to overlay without spamming infinite text
      const t = (this.overlay.textContent || "");
      const lines = (t + "\n" + msg).split("\n").slice(-18);
      this.overlay.textContent = lines.join("\n");
    } else {
      console.log("[UI]", msg);
    }
  }
};
