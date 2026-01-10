// /js/main.js — Scarlett VR Poker (FINAL — GUARANTEED)
// Uses REAL Three.js directly (no wrapper, no importmap)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const BUILD = Date.now();
const log = (...a) => console.log("[main]", ...a);

const state = {
  renderer: null,
  scene: null,
  camera: null,
  player: null,
  controllers: [],
  worldReady: false
};

let lastTime = performance.now();

boot().catch(err => {
  console.error("[main] BOOT FATAL:", err);
  showFatal(err);
});

async function boot() {
  log("boot ✅ v=" + BUILD);

  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x05060a);

  state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  state.camera.position.set(0, 1.6, 3);

  state.player = new THREE.Group();
  state.player.add(state.camera);
  state.scene.add(state.player);

  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.xr.enabled = true;
  document.body.appendChild(state.renderer.domElement);

  document.body.appendChild(VRButton.createButton(state.renderer));
  log("VRButton appended ✅");

  initControllers();

  await World.init({
    THREE,
    scene: state.scene,
    renderer: state.renderer,
    camera: state.camera,
    player: state.player,
    controllers: state.controllers,
    log: (...a) => console.log("[world]", ...a)
  });

  state.worldReady = true;
  window.addEventListener("resize", onResize);
  state.renderer.setAnimationLoop(tick);
}

function initControllers() {
  for (let i = 0; i < 2; i++) {
    const c = state.renderer.xr.getController(i);
    c.userData.axes = [0, 0, 0, 0];
    c.userData.gamepad = null;
    state.player.add(c);
    state.controllers.push(c);

    c.addEventListener("connected", e => {
      c.userData.gamepad = e.data.gamepad;
    });

    c.addEventListener("disconnected", () => {
      c.userData.gamepad = null;
    });
  }
}

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  for (const c of state.controllers) {
    const gp = c.userData.gamepad;
    if (gp) c.userData.axes = gp.axes.slice(0);
  }

  if (state.worldReady) World.update(dt);
  state.renderer.render(state.scene, state.camera);
}

function onResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function showFatal(err) {
  document.body.innerHTML = `
    <div style="padding:20px;font-family:system-ui;background:#05060a;color:#e8ecff">
      <h2>Scarlett VR Poker — Fatal Error</h2>
      <pre>${err.stack || err}</pre>
    </div>`;
}
