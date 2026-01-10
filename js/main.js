// /js/main.js — SCARLETT VR POKER — MASTER MAIN v13 (FULL, HARDENED)
// ✅ Quest + GitHub Pages safe
// ✅ Uses REAL Three.js (no wrapper dependency)
// ✅ VRButton is "locked" + auto-repaired if any UI overwrites DOM
// ✅ Controllers + gamepads wired
// ✅ Injects ctx.THREE into World (world.js should NOT import three)
// ✅ Safe delta time (no THREE.Clock)

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
  worldReady: false,
  lastTime: performance.now(),
  vrBtn: null,
  vrRepairTimer: null,
};

boot().catch((err) => fatal(err));

async function boot() {
  log("boot ✅ v=" + BUILD);

  // --- Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x05060a);

  // --- Camera
  state.camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    250
  );
  state.camera.position.set(0, 1.6, 3);

  // --- Player rig
  state.player = new THREE.Group();
  state.player.position.set(0, 0, 0);
  state.player.add(state.camera);
  state.scene.add(state.player);

  // --- Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  state.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.xr.enabled = true;
  document.body.appendChild(state.renderer.domElement);

  // --- VRButton (LOCK + AUTO-REPAIR)
  mountVRButton();

  // --- Controllers
  initControllers();

  // --- World
  await World.init({
    THREE,
    scene: state.scene,
    renderer: state.renderer,
    camera: state.camera,
    player: state.player,
    controllers: state.controllers,
    log: (...a) => console.log("[world]", ...a),
    BUILD,
  });

  state.worldReady = true;
  log("world init ✅");

  // --- Events
  window.addEventListener("resize", onResize, { passive: true });

  // --- Loop
  state.renderer.setAnimationLoop(tick);

  // Give your debug overlay time; if it overwrites DOM later, we auto-repair VR button
  startVRButtonRepairLoop();
}

function mountVRButton() {
  try {
    // Create button
    const btn = VRButton.createButton(state.renderer);

    // Force id/class for your debug panel checks
    btn.id = btn.id || "VRButton";
    btn.classList.add("vr-button");

    // HARD force visible (some overlays/cssex can hide it)
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "12px";
    btn.style.zIndex = "999999";
    btn.style.display = "block";
    btn.style.visibility = "visible";
    btn.style.pointerEvents = "auto";

    // Append
    document.body.appendChild(btn);

    // Lock reference globally so nothing can "lose" it
    state.vrBtn = btn;
    Object.defineProperty(window, "__VR_BUTTON__", {
      value: btn,
      writable: false,
      configurable: false,
      enumerable: false,
    });

    log("VRButton appended & locked ✅");
  } catch (e) {
    console.error("[main] VRButton mount failed ❌", e);
  }
}

function startVRButtonRepairLoop() {
  if (state.vrRepairTimer) return;

  // If any UI code replaces body.innerHTML or removes the button, we put it back.
  state.vrRepairTimer = window.setInterval(() => {
    try {
      const btn = state.vrBtn || window.__VR_BUTTON__;
      if (!btn) return;

      const inDom = document.getElementById("VRButton") || document.querySelector(".vr-button");
      if (!inDom) {
        document.body.appendChild(btn);
        // re-force visibility
        btn.style.display = "block";
        btn.style.visibility = "visible";
        btn.style.pointerEvents = "auto";
        btn.style.zIndex = "999999";
        log("VRButton repaired ✅ (re-appended)");
      }
    } catch (e) {
      // do nothing—repair loop should never crash main
    }
  }, 800);
}

function initControllers() {
  const r = state.renderer;

  // Two controllers (Quest)
  for (let i = 0; i < 2; i++) {
    const c = r.xr.getController(i);

    c.userData.index = i;
    c.userData.gamepad = null;
    c.userData.axes = [0, 0, 0, 0];
    c.userData.buttons = [];

    state.player.add(c);
    state.controllers.push(c);

    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data?.gamepad || null;
      log("controller connected", i);
    });

    c.addEventListener("disconnected", () => {
      c.userData.gamepad = null;
      log("controller disconnected", i);
    });
  }

  log("controllers ready ✅");
}

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;

  // Update gamepad snapshots
  for (const c of state.controllers) {
    const gp = c.userData.gamepad;
    if (!gp) continue;

    c.userData.axes = gp.axes ? gp.axes.slice(0) : [0, 0, 0, 0];
    c.userData.buttons = gp.buttons || [];
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

function fatal(err) {
  console.error("[main] FATAL ❌", err);

  // IMPORTANT: do NOT replace body.innerHTML (it can kill VRButton on Quest).
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    background:#05060a; color:#e8ecff;
    font-family:system-ui; padding:18px;
    overflow:auto;
  `;
  wrap.innerHTML = `
    <h2 style="margin:0 0 10px 0;">Scarlett VR Poker — Fatal Error</h2>
    <div style="color:#98a0c7; margin-bottom:10px;">
      main.js failed before VR could start. Open Quest DevTools Console and paste the first red error.
    </div>
    <pre style="white-space:pre-wrap; background:#0b0d14; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,.1);">${escapeHtml(
      String(err?.stack || err)
    )}</pre>
  `;

  document.body.appendChild(wrap);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}
