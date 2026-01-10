// /js/main.js — Scarlett VR Poker (FULL) — Quest/GitHub safe
// IMPORTANT: uses local ./three.js wrapper (and importmap also maps "three" -> "./three.js")

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
  clock: new THREE.Clock(),
  worldReady: false,
};

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
  state.player.position.set(0, 0, 0);
  state.player.add(state.camera);
  state.scene.add(state.player);

  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
    log: (...a) => console.log("[world]", ...a),
    BUILD
  });

  state.worldReady = true;
  log("world init ✅");

  window.addEventListener("resize", onResize);
  state.renderer.setAnimationLoop(tick);
}

function initControllers() {
  const r = state.renderer;

  for (let i = 0; i < 2; i++) {
    const c = r.xr.getController(i);
    c.userData.index = i;
    c.userData.buttons = [];
    c.userData.axes = [0, 0, 0, 0];
    state.player.add(c);
    state.controllers.push(c);

    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data?.gamepad || null;
      console.log("[main] controller connected", i, e.data);
    });

    c.addEventListener("disconnected", () => {
      c.userData.gamepad = null;
      console.log("[main] controller disconnected", i);
    });
  }

  log("controllers ready ✅");
}

function tick() {
  const dt = Math.min(0.05, state.clock.getDelta());

  for (const c of state.controllers) {
    const gp = c.userData.gamepad;
    if (gp) {
      c.userData.axes = gp.axes ? gp.axes.slice(0) : [0, 0, 0, 0];
      c.userData.buttons = gp.buttons || [];
    }
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
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; inset:0; background:#05060a; color:#e8ecff;
    font-family:system-ui; padding:20px; z-index:9999; overflow:auto;
  `;
  el.innerHTML = `
    <h2 style="margin:0 0 10px 0;">Scarlett VR Poker — Fatal Error</h2>
    <p style="color:#98a0c7;">Open Quest Browser DevTools Console and paste the first red error.</p>
    <pre style="white-space:pre-wrap; background:#0b0d14; padding:12px; border-radius:12px;">${escapeHtml(String(err?.stack || err))}</pre>
  `;
  document.body.appendChild(el);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}
