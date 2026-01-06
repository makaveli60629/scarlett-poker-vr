// /js/main.js — Skylark Poker VR — Stable Boot (No Cube)
// Goals:
// - No debug cube
// - Always clears "booting..." overlay once render starts
// - Minimal dependency chain (only world.js)
// - Works in Oculus Browser + GitHub Pages

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const APP = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,
  colliders: [],
  spawn: null,

  bootEl: null,
  bootMsgEl: null,
  _bootCleared: false,

  init() {
    // Boot UI hooks (safe even if missing)
    this.bootEl = document.getElementById("boot") || null;
    this.bootMsgEl = document.getElementById("bootlog") || null;

    this._boot("Starting renderer…");

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a0f);
    this.scene.fog = new THREE.Fog(0x070a0f, 5, 65);

    // Player rig (group you move around)
    this.player = new THREE.Group();
    this.scene.add(this.player);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      250
    );
    this.camera.position.set(0, 1.65, 0);
    this.player.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.clock = new THREE.Clock();

    // Guaranteed lighting (prevents black screens)
    this._addGuaranteedLighting();

    // Build world (safe)
    try {
      this._boot("Building world…");
      const result = World.build(this.scene, this.player) || {};
      this.colliders = Array.isArray(result.colliders) ? result.colliders : [];
      this.spawn = result.spawn || null;

      if (this.spawn && this.spawn.isVector3) {
        this.player.position.copy(this.spawn);
      } else {
        // Default spawn (safe)
        this.player.position.set(0, 0, 6);
      }
    } catch (e) {
      console.error("World build error:", e);
      this._bootError("World failed to build. Check console.");
      // Still place player somewhere sane
      this.player.position.set(0, 0, 6);
    }

    // Start render loop
    window.addEventListener("resize", () => this._onResize());
    this.renderer.setAnimationLoop(() => this.animate());

    // Clear boot once we confirm at least one frame ran
    // (Oculus sometimes needs a tick before DOM updates)
    requestAnimationFrame(() => this._clearBoot());
  },

  animate() {
    const dt = this.clock.getDelta();

    // Optional tiny idle bob so you can see it's alive (very subtle)
    // (does nothing in VR; only helps 2D mode confirm animation loop)
    if (!this.renderer.xr.isPresenting) {
      this.camera.position.y = 1.65 + Math.sin(performance.now() * 0.001) * 0.002;
    }

    // Render
    this.renderer.render(this.scene, this.camera);

    // If boot wasn’t cleared for any reason, clear after first real render
    if (!this._bootCleared) this._clearBoot();
  },

  _addGuaranteedLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.1);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x9bd7ff, 0.45);
    fill.position.set(-7, 4, -6);
    this.scene.add(fill);

    const warm = new THREE.PointLight(0xffd2a0, 0.6, 18);
    warm.position.set(0, 3.2, 0);
    this.scene.add(warm);
  },

  _onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  _boot(msg) {
    if (this.bootMsgEl) this.bootMsgEl.textContent = msg;
  },

  _bootError(msg) {
    if (this.bootMsgEl) this.bootMsgEl.textContent = "ERROR: " + msg;
    if (this.bootEl) this.bootEl.style.borderColor = "#ff4d4d";
  },

  _clearBoot() {
    if (this._bootCleared) return;
    this._bootCleared = true;

    // Hide overlay if present
    if (this.bootEl) this.bootEl.style.display = "none";
    // Also clear any leftover “booting…” text if you used a simple <pre>
    const legacy = document.getElementById("status");
    if (legacy) legacy.textContent = "";
  },
};

window.addEventListener("error", (e) => {
  console.error("Window error:", e?.error || e);
  const boot = document.getElementById("bootlog");
  if (boot) boot.textContent = "ERROR: " + (e?.message || "Unknown error");
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e?.reason || e);
  const boot = document.getElementById("bootlog");
  if (boot) boot.textContent = "ERROR: " + (e?.reason?.message || e?.reason || "Promise error");
});

// Start
APP.init();
