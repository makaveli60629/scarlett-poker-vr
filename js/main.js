// /js/main.js — Scarlett Poker VR 1.0 (CDN-only, Oculus-safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

// Local modules (these MUST exist)
import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

// --- Boot overlay ---
const overlay = document.getElementById("overlay");
const setText = (t) => overlay && (overlay.textContent = t);

setText("Scarlett Poker VR — booting…");

// --- App ---
const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 60);

    this.player = new THREE.Group();
    this.scene.add(this.player);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      200
    );
    this.camera.position.set(0, 1.65, 3);
    this.player.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.addLights();
    this.addFloor();

    // --- World ---
    try {
      World?.build?.(this.scene, this.player);
    } catch (e) {
      console.warn("World build skipped:", e);
    }

    // --- Controls ---
    try {
      Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        player: this.player,
      });
    } catch (e) {
      console.warn("Controls skipped:", e);
    }

    // --- UI ---
    try {
      UI?.init?.(this.scene, this.camera);
    } catch (e) {
      console.warn("UI skipped:", e);
    }

    // --- Poker ---
    try {
      PokerSimulation?.build?.({});
    } catch (e) {
      console.warn("PokerSimulation skipped:", e);
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());

    setText("✅ Loaded — press Enter VR");
  },

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 10, 6);
    this.scene.add(key);
  },

  addFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x111217 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();
    Controls?.update?.(dt);
    UI?.update?.(dt);
    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
