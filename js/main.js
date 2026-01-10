// /js/main.js — SCARLETT VR POKER — MASTER MAIN v14 (ULTIMATE BASELINE)
// ✅ Quest + GitHub Pages safe
// ✅ Uses REAL Three.js from CDN
// ✅ VRButton locked + auto-repaired if DOM overlays try to remove it
// ✅ VR controllers wired (gamepads)
// ✅ Android/2D Debug Mode: touch sticks move/turn + tap-to-click (no headset needed)
// ✅ Never replaces body.innerHTML (prevents killing VR button)

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
  vrRepairTimer: null
};

// Android/mobile helper (2D debug mode)
const Mobile = {
  enabled: false,
  move: { x: 0, y: 0 },
  turn: 0,
  tap: false
};

boot().catch((err) => fatal(err));

async function boot() {
  log("boot ✅ v=" + BUILD);

  // Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x05060a);

  // Camera
  state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  state.camera.position.set(0, 1.6, 3);

  // Player rig
  state.player = new THREE.Group();
  state.player.add(state.camera);
  state.scene.add(state.player);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  state.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.xr.enabled = true;
  document.body.appendChild(state.renderer.domElement);

  // VR Button (locked + repaired)
  mountVRButton();

  // Controllers
  initControllers();

  // Android 2D HUD (only shows on Android when not in VR)
  mountMobileHUD();

  // World init
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

  window.addEventListener("resize", onResize, { passive: true });

  // Animation loop
  state.renderer.setAnimationLoop(tick);

  // Keep VR button alive if any overlay wipes DOM later
  startVRButtonRepairLoop();
}

function mountVRButton() {
  try {
    const btn = VRButton.createButton(state.renderer);
    btn.id = btn.id || "VRButton";
    btn.classList.add("vr-button");

    // force visibility
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "12px";
    btn.style.zIndex = "999999";
    btn.style.display = "block";
    btn.style.visibility = "visible";
    btn.style.pointerEvents = "auto";

    document.body.appendChild(btn);

    state.vrBtn = btn;
    try {
      Object.defineProperty(window, "__VR_BUTTON__", {
        value: btn,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch (_) {
      window.__VR_BUTTON__ = btn;
    }

    log("VRButton appended & locked ✅");
  } catch (e) {
    console.error("[main] VRButton mount failed ❌", e);
  }
}

function startVRButtonRepairLoop() {
  if (state.vrRepairTimer) return;

  state.vrRepairTimer = window.setInterval(() => {
    try {
      const btn = state.vrBtn || window.__VR_BUTTON__;
      if (!btn) return;

      const found = document.getElementById("VRButton") || document.querySelector(".vr-button");
      if (!found) {
        document.body.appendChild(btn);
        btn.style.display = "block";
        btn.style.visibility = "visible";
        btn.style.pointerEvents = "auto";
        btn.style.zIndex = "999999";
        log("VRButton repaired ✅");
      }
    } catch (_) {}
  }, 900);
}

function initControllers() {
  const r = state.renderer;
  state.controllers.length = 0;

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

  // Update XR gamepads
  for (const c of state.controllers) {
    const gp = c.userData.gamepad;
    if (!gp) continue;
    c.userData.axes = gp.axes ? gp.axes.slice(0) : [0, 0, 0, 0];
    c.userData.buttons = gp.buttons || [];
  }

  // Android 2D touch locomotion (only when NOT presenting XR)
  if (Mobile.enabled && state.renderer.xr.isPresenting !== true) {
    const yaw = state.player.rotation.y;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1);
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const speed = 2.0;
    const mx = Mobile.move.x;
    const my = Mobile.move.y;

    const v = new THREE.Vector3();
    v.addScaledVector(right, mx);
    v.addScaledVector(forward, my);

    if (v.lengthSq() > 0.0001) {
      v.normalize();
      state.player.position.addScaledVector(v, dt * speed);
    }

    state.player.rotation.y -= Mobile.turn * dt * 2.2;

    if (Mobile.tap) {
      Mobile.tap = false;
      if (World?.clickFromCamera) World.clickFromCamera();
    }
  }

  if (state.worldReady) {
    try {
      World.update(dt);
    } catch (e) {
      console.error("[main] World.update crashed ❌", e);
    }
  }

  state.renderer.render(state.scene, state.camera);
}

function onResize() {
  if (!state.camera || !state.renderer) return;
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------
// ANDROID / 2D DEBUG HUD
// ----------------------
function isAndroid2D() {
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const inVR = state.renderer?.xr?.isPresenting === true;
  return isAndroid && !inVR;
}

function mountMobileHUD() {
  if (!isAndroid2D()) return;

  Mobile.enabled = true;

  const hud = document.createElement("div");
  hud.id = "mobileHUD";
  hud.style.cssText = `
    position:fixed; inset:0; z-index:999998;
    pointer-events:none;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
  `;
  document.body.appendChild(hud);

  const dbg = document.createElement("div");
  dbg.style.cssText = `
    position:fixed; left:10px; top:10px;
    padding:10px 12px;
    border-radius:14px;
    background:rgba(11,13,20,.82);
    color:#e8ecff;
    border:1px solid rgba(127,231,255,.25);
    pointer-events:auto;
    max-width:86vw;
    font-size:12px;
    line-height:1.25;
  `;
  dbg.innerHTML = `
    <div style="font-weight:900; letter-spacing:.3px;">SCARLETT — ANDROID DEBUG</div>
    <div style="color:#98a0c7; margin-top:4px;">
      MOVE (left stick) • TURN (right stick) • TAP anywhere to click pads/buttons
    </div>
  `;
  hud.appendChild(dbg);

  const left = makeTouchStick({ side: "left", label: "MOVE" });
  const right = makeTouchStick({ side: "right", label: "TURN" });

  left.onMove = (x, y) => { Mobile.move.x = x; Mobile.move.y = y; };
  right.onMove = (x) => { Mobile.turn = x; };

  hud.appendChild(left.el);
  hud.appendChild(right.el);

  window.addEventListener("pointerdown", (e) => {
    if (e.target?.closest?.(".touchStick")) return;
    Mobile.tap = true;
  }, { passive: true });

  console.log("[mobile] HUD mounted ✅");
}

function makeTouchStick({ side = "left", label = "" }) {
  const el = document.createElement("div");
  el.className = "touchStick";
  el.style.cssText = `
    position:fixed;
    bottom:18px;
    ${side === "left" ? "left:18px" : "right:18px"};
    width:140px; height:140px;
    border-radius:999px;
    background:rgba(11,13,20,.55);
    border:1px solid rgba(127,231,255,.22);
    pointer-events:auto;
    touch-action:none;
  `;

  const cap = document.createElement("div");
  cap.style.cssText = `
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    color:rgba(232,236,255,.65);
    font-weight:900; letter-spacing:.4px;
    font-size:12px;
    user-select:none;
  `;
  cap.textContent = label;
  el.appendChild(cap);

  const nub = document.createElement("div");
  nub.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:52px; height:52px;
    transform:translate(-50%,-50%);
    border-radius:999px;
    background:rgba(127,231,255,.18);
    border:1px solid rgba(127,231,255,.35);
  `;
  el.appendChild(nub);

  let active = false;
  let cx = 0, cy = 0;
  const max = 46;

  const api = { el, onMove: (_x, _y) => {} };

  function setNub(dx, dy) {
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    nub.style.transform = `translate(${dx - 26}px, ${dy - 26}px)`;
    api.onMove(dx / max, dy / max);
  }

  el.addEventListener("pointerdown", (e) => {
    active = true;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    setNub(e.clientX - cx, e.clientY - cy);
  });

  el.addEventListener("pointermove", (e) => {
    if (!active) return;
    setNub(e.clientX - cx, e.clientY - cy);
  });

  el.addEventListener("pointerup", () => {
    active = false;
    nub.style.transform = `translate(-26px,-26px)`;
    api.onMove(0, 0);
  });

  return api;
}

// ----------------------
// FATAL (never wipe body)
// ----------------------
function fatal(err) {
  console.error("[main] FATAL ❌", err);

  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    background:#05060a; color:#e8ecff;
    font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;
    padding:18px; overflow:auto;
  `;

  wrap.innerHTML = `
    <h2 style="margin:0 0 10px 0;">Scarlett VR Poker — Fatal Error</h2>
    <div style="color:#98a0c7; margin-bottom:10px;">
      main.js failed before VR could start. Open DevTools Console and paste the first red error.
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
