// /js/main.js — Scarlett Poker VR — GitHub Pages Safe (CDN Three.js)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

const overlay = document.getElementById("overlay");
const log = (msg) => { if (overlay) overlay.textContent += `\n${msg}`; };

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
    this.scene.fog = new THREE.Fog(0x05060a, 2, 70);

    this.player = new THREE.Group();
    this.scene.add(this.player);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.65, 0);
    this.player.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);

    // ✅ VR Button MUST be appended AFTER renderer exists
    document.body.appendChild(VRButton.createButton(this.renderer));
    log("✅ Renderer + VRButton ready");

    this.addLights();
    this.addFloorSafety();

    // --- Build World and capture return payload ---
    let worldData = null;
    try {
      worldData = World.build(this.scene, this.player);
      log("✅ World built");
    } catch (e) {
      console.warn(e);
      log("⚠️ World build failed (see console)");
    }

    // --- Controls: IMPORTANT: pass colliders + bounds + spawn ---
    try {
      Controls.init({
        renderer: this.renderer,
        camera: this.camera,
        player: this.player,
        colliders: worldData?.colliders || [],
        bounds: worldData?.bounds || null,
        spawn: worldData?.spawn ? { position: worldData.spawn, yaw: 0 } : null
      });
      log("✅ Controls.init OK");
    } catch (e) {
      console.warn(e);
      log("❌ Controls.init failed (see console)");
    }

    // --- UI ---
    try {
      UI.init(this.scene, this.camera);
      log("✅ UI.init OK");
    } catch (e) {
      console.warn(e);
      log("⚠️ UI skipped");
    }

    // --- Poker sim (safe) ---
    try {
      PokerSimulation.build({ bots: [] });
      log("✅ PokerSimulation built");
    } catch (e) {
      console.warn(e);
      log("⚠️ PokerSimulation skipped");
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());
    log("✅ Boot complete. Enter VR.");
  },

  addLights() {
    // Bright mode to avoid “dark table” problem
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x333355, 1.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 6);
    this.scene.add(key);

    const fill = new THREE.PointLight(0xffffff, 0.75, 60);
    fill.position.set(-6, 5, -6);
    this.scene.add(fill);
  },

  addFloorSafety() {
    // Invisible "safety floor" so you never fall into void if World fails
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();
    try { Controls.update(dt); } catch {}
    try { UI.update(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  }
};

App.init();
