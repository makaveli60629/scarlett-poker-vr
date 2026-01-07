// /js/main.js — Scarlett Poker VR — MAIN v11 (Full Extension Wiring, GitHub Safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";
import { init as initBots } from "./bots.js";

// Your controls.js stays separate (we won't overwrite here).
// If controls.js is missing, we fail gracefully.
let Controls = null;

const overlay = document.getElementById("overlay");
const hub = {
  lines: [],
  ok(label) { pushLine(`✅ ${label}`); },
  warn(label) { pushLine(`⚠️ ${label}`); },
  err(label) { pushLine(`❌ ${label}`); }
};

function pushLine(s){
  hub.lines.push(s);
  hub.lines = hub.lines.slice(-22);
  if (overlay) overlay.textContent = hub.lines.join("\n");
}

pushLine("Scarlett Poker VR — booting…");

async function safeImport(path, label){
  try{
    const mod = await import(path);
    hub.ok(label);
    return mod;
  }catch(e){
    hub.warn(`${label} (skipped)`);
    console.warn("Import failed:", path, e);
    return null;
  }
}

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,
  worldData: null,
  bots: null,

  async init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.player = new THREE.Group();
    this.scene.add(this.player);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
    this.camera.position.set(0, 1.65, 3);
    this.player.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);

    // ✅ ALWAYS VR BUTTON
    document.body.appendChild(VRButton.createButton(this.renderer));
    hub.ok("VRButton ready");

    // Controls (optional but expected)
    const cmod = await safeImport("./controls.js", "controls.js");
    Controls = cmod?.Controls || null;

    // Build world (full extension)
    try {
      this.worldData = World.build(this.scene);
      hub.ok("world.js loaded (v11)");
    } catch (e) {
      hub.err("world.js failed");
      console.error(e);
      this.worldData = null;
    }

    // Spawn safely on lobby pad
    if (this.worldData?.spawn) {
      this.player.position.set(this.worldData.spawn.x, 0, this.worldData.spawn.z);
      hub.ok("Spawn on telepad (lobby)");
    } else {
      this.player.position.set(0, 0, 10);
      hub.warn("Spawn fallback (0,0,10)");
    }

    // Init UI
    try {
      UI.init({ scene: this.scene, camera: this.camera, renderer: this.renderer, overlay });
      hub.ok("ui.js loaded");
    } catch (e) {
      hub.warn("ui.js failed");
      console.warn(e);
    }

    // Init Poker visuals (cards + chips)
    try {
      PokerSimulation.init({ scene: this.scene, world: this.worldData });
      hub.ok("poker_simulation.js loaded (cards+chips)");
    } catch (e) {
      hub.warn("poker_simulation.js failed");
      console.warn(e);
    }

    // Init Bots (seats to world chairs)
    try {
      this.bots = initBots({ scene: this.scene, world: this.worldData });
      hub.ok("bots.js loaded (seated tournament flow)");
    } catch (e) {
      hub.warn("bots.js failed");
      console.warn(e);
    }

    // Init Controls
    if (Controls?.init) {
      try {
        Controls.init({
          renderer: this.renderer,
          camera: this.camera,
          player: this.player,
          colliders: this.worldData?.colliders || [],
          bounds: this.worldData?.bounds || null,
          spawn: { position: this.worldData?.spawn || new THREE.Vector3(0,0,10), yaw: 0 }
        });
        hub.ok("Controls init OK");
      } catch (e) {
        hub.warn("Controls init failed");
        console.warn(e);
      }
    } else {
      hub.warn("Controls missing — movement may not work");
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());

    pushLine("✅ Loaded — press Enter VR");
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();

    try { Controls?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}
    try { this.bots?.update?.(dt); } catch {}
    try { PokerSimulation?.update?.(dt); } catch {}

    this.renderer.render(this.scene, this.camera);
  }
};

App.init();
