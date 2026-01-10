// /js/main.js — Scarlett VR Poker (FULL FINAL)
// Quest + GitHub Pages safe
// IMPORTANT:
// ❌ DOES NOT use THREE.Clock (your wrapper does not export it)
// ✅ Uses performance.now() instead
// ✅ VRButton + Controllers + World init

import * as THREE from "./three.js";
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
  worldReady: false,
};

// ✅ Quest-safe timing (NO THREE.Clock)
let lastTime = performance.now();

boot().catch(err => {
  console.error("[main] BOOT FATAL:", err);
  showFatal(err);
});

async function boot() {
  log("boot ✅ v=" + BUILD);

  // Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x05060a);

  // Camera
  state.camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    200
  );
  state.camera.position.set(0, 1.6, 3);

  // Player rig
  state.player = new THREE.Group();
  state.player.position.set(0, 0, 0);
  state.player.add(state.camera);
  state.scene.add(state.player);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  state.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.xr.enabled = true;
  document.body.appendChild(state.renderer.domElement);

  // VR Button
  document.body.appendChild(VRButton.createButton(state.renderer));
  log("VRButton appended ✅");

  // Controllers
  initControllers();

  // World
  await World.init({
    THREE,
    scene: state.scene,
    renderer: state.renderer,
    camera: state.camera,
    player: state.player,
    controllers: state.controllers,
    log: (...a) => console.log("[world]", ...a),
    BUILD
  });

  state.worldReady = true;
  log("world init ✅");

  // Resize
  window.addEventListener("resize", onResize);

  // Render loop
  state.renderer.setAnimationLoop(tick);
}

function initControllers() {
  const r = state.renderer;

  for (let i = 0; i < 2; i++) {
    const c = r.xr.getController(i);
    c.userData.index = i;
    c.userData.axes = [0, 0, 0, 0];
    c.userData.buttons = [];
    c.userData.gamepad = null;

    state.player.add(c);
    state.controllers.push(c);

    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data?.gamepad || null;
      log("controller connected", i, e.data);
    });

    c.addEventListener("disconnected", () => {
      c.userData.gamepad = null;
      log("controller disconnected", i);
    });
  }

  log("controllers ready ✅");
}

function tick() {
  // ✅ Quest-safe delta time
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Update gamepads
  for (const c of state.controllers) {
    const gp = c.userData.gamepad;
    if (gp) {
      c.userData.axes = gp.axes ? gp.axes.slice(0) : [0, 0, 0, 0];
      c.userData.buttons = gp.buttons || [];
    }
  }

  if (state.worldReady) {
    World.update(dt);
  }

  state.renderer.render(state.scene, state.camera);
}

function onResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function showFatal(err) {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;
    inset:0;
    background:#05060a;
    color:#e8ecff;
    font-family:system-ui;
    padding:20px;
    z-index:9999;
    overflow:auto;
  `;
  el.innerHTML = `
    <h2>Scarlett VR Poker — Fatal Error</h2>
    <p style="color:#98a0c7;">
      main.js failed before VR could start.
      Open Quest Browser DevTools Console and paste the first red error.
    </p>
    <pre style="white-space:pre-wrap;
                background:#0b0d14;
                padding:12px;
                border-radius:12px;">${escapeHtml(String(err?.stack || err))}</pre>
  `;
  document.body.appendChild(el);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}
