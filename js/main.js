// js/main.js — Skylark Poker VR (SAFE BOOT v1.0)
// Oculus / GitHub Pages compatible
// No dynamic imports, no absolute paths, no local three.js

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

// 🔴 HARD ERROR DISPLAY (shows real error on Quest)
window.addEventListener("error", (e) => {
  document.body.innerHTML = `
    <pre style="color:red;white-space:pre-wrap;padding:12px">
MAIN.JS ERROR

${e.error?.stack || e.message}
    </pre>
  `;
});

// 🟢 APP CORE
const APP = {
  scene: null,
  camera: null,
  renderer: null,
  playerGroup: null,
  clock: null,
  colliders: [],

  init() {
    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.Fog(0x050505, 3, 80);

    // --- Camera ---
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      250
    );

    // --- Player Rig ---
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, 0, 5);
    this.playerGroup.add(this.camera);
    this.scene.add(this.playerGroup);

    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    // --- Clock ---
    this.clock = new THREE.Clock();

    // --- Lighting (GUARANTEED VISIBLE) ---
    this._addLighting();

    // --- World (SAFE) ---
    try {
      const result = World.build(this.scene, this.playerGroup) || {};
      this.colliders = Array.isArray(result.colliders) ? result.colliders : [];

      if (result.spawn && result.spawn.isVector3) {
        this.playerGroup.position.copy(result.spawn);
      }
    } catch (e) {
      console.warn("World build failed:", e);
    }

    // --- Controls (SAFE) ---
    try {
      Controls.init({
        renderer: this.renderer,
        camera: this.camera,
        player: this.playerGroup,
        colliders: this.colliders
      });
    } catch (e) {
      console.warn("Controls init failed:", e);
    }

    window.addEventListener("resize", () => this._onResize());
    this.renderer.setAnimationLoop(() => this._animate());
  },

  _addLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.1);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(6, 10, 4);
    this.scene.add(dir);
  },

  _animate() {
    const dt = this.clock.getDelta();
    try {
      Controls.update?.(dt);
    } catch {}
    this.renderer.render(this.scene, this.camera);
  },

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

// 🚀 START
APP.init();
