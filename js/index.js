// /js/index.js — ScarlettVR INDEX v11 (XR-safe + Android controls fixed + HUD hide/show)
// ✅ Keeps Oculus/XR controls unchanged
// ✅ Adds stable Android (2D) touch controls: move joystick + look drag
// ✅ HUD hide/show always available (and auto-hides in XR)
// ✅ Render loop starts immediately (prevents Quest 3-dots)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const BUILD = `INDEX_${Date.now()}`;
const $ = (sel) => document.querySelector(sel);

const hud = $("#hud");
const hudToggle = $("#hudToggle");
const hudlog = $("#hudlog");

function log(...args) {
  const msg = args.map(a => (typeof a === "string" ? a : safeJson(a))).join(" ");
  console.log(msg);
  if (hudlog) {
    hudlog.textContent += msg + "\n";
    hudlog.scrollTop = hudlog.scrollHeight;
  }
}

function safeJson(x) {
  try { return JSON.stringify(x); } catch { return String(x); }
}

function setHUDVisible(on) {
  if (!hud || !hudToggle) return;
  hud.style.display = on ? "block" : "none";
  hudToggle.style.display = on ? "none" : "block";
}

// Ensure these exist even if HTML changes
$("#btnToggleHUD")?.addEventListener("click", () => setHUDVisible(false));
hudToggle?.addEventListener("click", () => setHUDVisible(true));

log(`[index] boot ✅ build=${BUILD}`);
log(`[env] secureContext=${window.isSecureContext}`);
log(`[env] ua=${navigator.userAgent}`);
log(`[env] navigator.xr=${!!navigator.xr}`);

const app = document.getElementById("app");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
app.appendChild(renderer.domElement);

// Scene + Camera + Rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);

const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

// For 2D (non-XR) camera control
const cameraPitch = new THREE.Group();
cameraPitch.name = "CameraPitch";
cameraPitch.add(camera);
player.add(cameraPitch);

// Default spawn
player.position.set(0, 0, 0);
player.rotation.set(0, 0, 0);
camera.position.set(0, 1.65, 3.5);

// Controllers (XR only)
const controllers = {
  c0: renderer.xr.getController(0),
  c1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
player.add(controllers.c0, controllers.c1, controllers.g0, controllers.g1);

// VR Button
document.body.appendChild(VRButton.createButton(renderer));
log("[index] VRButton appended ✅");

// Auto-hide DOM HUD in VR (prevents floating overlay)
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  androidControls.setEnabled(false); // IMPORTANT: don't fight XR
  log("[xr] sessionstart ✅ HUD hidden, android controls disabled");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  androidControls.setEnabled(true);
  log("[xr] sessionend ✅ HUD shown, android controls enabled");
});

// Recenter button (HUD)
$("#btnRecenter")?.addEventListener("click", () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  cameraPitch.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 3.5);
  camera.rotation.set(0, 0, 0);
  log("[hud] recenter ✅");
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------
// ANDROID / 2D TOUCH CONTROLS
// ------------------------------
// ✅ Move joystick (left) + Look drag (right half screen)
// ✅ Only active when NOT presenting XR
// ✅ Will not break Oculus
const androidControls = (() => {
  const state = {
    enabled: true,
    ui: null,
    joyBase: null,
    joyStick: null,
    joyActive: false,
    joyId: null,
    joyCenter: { x: 0, y: 0 },
    joyVec: { x: 0, y: 0 }, // -1..1

    lookActive: false,
    lookId: null,
    lookLast: { x: 0, y: 0 },
    yaw: 0,
    pitch: 0,

    moveSpeed: 2.4,
    lookSpeed: 0.0032,
    pitchClamp: 1.15, // ~66 deg

    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  };

  function setEnabled(v) {
    state.enabled = !!v;
    if (state.ui) state.ui.style.display = (state.enabled && state.isMobile) ? "block" : "none";
    if (!state.enabled) {
      state.joyActive = false;
      state.lookActive = false;
      state.joyVec.x = 0; state.joyVec.y = 0;
    }
  }

  function ensureUI() {
    if (!state.isMobile) return;
    if (state.ui) return;

    const ui = document.createElement("div");
    ui.id = "androidControls";
    ui.style.position = "fixed";
    ui.style.left = "0";
    ui.style.top = "0";
    ui.style.width = "100vw";
    ui.style.height = "100vh";
    ui.style.pointerEvents = "none";
    ui.style.zIndex = "9998"; // below HUD but above canvas
    ui.style.touchAction = "none";
    document.body.appendChild(ui);

    // Left joystick base
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.left = "6vw";
    base.style.bottom = "10vh";
    base.style.width = "22vmin";
    base.style.height = "22vmin";
    base.style.borderRadius = "999px";
    base.style.background = "rgba(20,30,50,0.22)";
    base.style.border = "1px solid rgba(102,204,255,0.25)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";
    ui.appendChild(base);

    const stick = document.createElement("div");
    stick.style.position = "absolute";
    stick.style.left = "50%";
    stick.style.top = "50%";
    stick.style.transform = "translate(-50%,-50%)";
    stick.style.width = "10vmin";
    stick.style.height = "10vmin";
    stick.style.borderRadius = "999px";
    stick.style.background = "rgba(102,204,255,0.25)";
    stick.style.border = "1px solid rgba(102,204,255,0.35)";
    stick.style.pointerEvents = "none";
    base.appendChild(stick);

    // Right side “look area” hint (invisible, just for input)
    const look = document.createElement("div");
    look.style.position = "absolute";
    look.style.right = "0";
    look.style.top = "0";
    look.style.width = "55vw";
    look.style.height = "100vh";
    look.style.pointerEvents = "auto";
    look.style.touchAction = "none";
    look.style.background = "rgba(0,0,0,0)"; // invisible
    ui.appendChild(look);

    // Quick buttons (always accessible)
    const btnBar = document.createElement("div");
    btnBar.style.position = "absolute";
    btnBar.style.right = "2vw";
    btnBar.style.bottom = "10vh";
    btnBar.style.display = "flex";
    btnBar.style.flexDirection = "column";
    btnBar.style.gap = "10px";
    btnBar.style.pointerEvents = "auto";
    ui.appendChild(btnBar);

    const mkBtn = (label, onClick) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(102,204,255,0.35)";
      b.style.background = "rgba(10,16,32,0.55)";
      b.style.color = "rgba(230,245,255,0.95)";
      b.style.fontWeight = "700";
      b.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
      b.style.backdropFilter = "blur(6px)";
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); });
      return b;
    };

    btnBar.appendChild(mkBtn("HUD OFF", () => setHUDVisible(false)));
    btnBar.appendChild(mkBtn("HUD ON",  () => setHUDVisible(true)));
    btnBar.appendChild(mkBtn("RECENTER", () => {
      player.position.set(0, 0, 0);
      state.yaw = 0; state.pitch = 0;
      player.rotation.y = 0;
      cameraPitch.rotation.x = 0;
      log("[android] recenter ✅");
    }));

    // Joystick pointer logic
    base.addEventListener("pointerdown", (e) => {
      if (!state.enabled || renderer.xr.isPresenting) return;
      state.joyActive = true;
      state.joyId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      const r = base.getBoundingClientRect();
      state.joyCenter.x = r.left + r.width / 2;
      state.joyCenter.y = r.top + r.height / 2;
      updateJoyFromPointer(e.clientX, e.clientY, r.width * 0.38);
    });

    base.addEventListener("pointermove", (e) => {
      if (!state.joyActive || e.pointerId !== state.joyId) return;
      const r = base.getBoundingClientRect();
      updateJoyFromPointer(e.clientX, e.clientY, r.width * 0.38);
    });

    base.addEventListener("pointerup", (e) => {
      if (e.pointerId !== state.joyId) return;
      state.joyActive = false;
      state.joyId = null;
      state.joyVec.x = 0; state.joyVec.y = 0;
      stick.style.left = "50%";
      stick.style.top = "50%";
    });

    base.addEventListener("pointercancel", () => {
      state.joyActive = false;
      state.joyId = null;
      state.joyVec.x = 0; state.joyVec.y = 0;
      stick.style.left = "50%";
      stick.style.top = "50%";
    });

    function updateJoyFromPointer(px, py, maxR) {
      const dx = px - state.joyCenter.x;
      const dy = py - state.joyCenter.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const mag = Math.min(1, d / maxR);
      state.joyVec.x = nx * mag;
      state.joyVec.y = ny * mag; // up is negative dy, we keep raw for now

      // Move stick UI
      stick.style.left = `${50 + (state.joyVec.x * 35)}%`;
      stick.style.top = `${50 + (state.joyVec.y * 35)}%`;
    }

    // Look drag (right side)
    look.addEventListener("pointerdown", (e) => {
      if (!state.enabled || renderer.xr.isPresenting) return;
      state.lookActive = true;
      state.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      state.lookLast.x = e.clientX;
      state.lookLast.y = e.clientY;
    });

    look.addEventListener("pointermove", (e) => {
      if (!state.lookActive || e.pointerId !== state.lookId) return;
      const dx = e.clientX - state.lookLast.x;
      const dy = e.clientY - state.lookLast.y;
      state.lookLast.x = e.clientX;
      state.lookLast.y = e.clientY;

      state.yaw -= dx * state.lookSpeed;
      state.pitch -= dy * state.lookSpeed;
      state.pitch = Math.max(-state.pitchClamp, Math.min(state.pitchClamp, state.pitch));

      player.rotation.y = state.yaw;
      cameraPitch.rotation.x = state.pitch;
    });

    look.addEventListener("pointerup", (e) => {
      if (e.pointerId !== state.lookId) return;
      state.lookActive = false;
      state.lookId = null;
    });

    look.addEventListener("pointercancel", () => {
      state.lookActive = false;
      state.lookId = null;
    });

    state.ui = ui;
    state.joyBase = base;
    state.joyStick = stick;

    // show now
    setEnabled(true);
    log("[android] touch controls UI ready ✅");
  }

  function update(dt) {
    if (!state.enabled || renderer.xr.isPresenting) return;
    if (!state.isMobile) return;

    // joyVec: x=strafe, y=forward/back (dy positive means down)
    let x = state.joyVec.x;
    let y = state.joyVec.y;

    // Convert to forward/back: pushing up gives negative y; we want forward positive
    const forward = -y;
    const strafe = x;

    const dead = 0.08;
    const f = Math.abs(forward) < dead ? 0 : forward;
    const s2 = Math.abs(strafe) < dead ? 0 : strafe;
    if (f === 0 && s2 === 0) return;

    const yaw = player.rotation.y;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);

    const speed = state.moveSpeed;
    player.position.x += (s2 * cos + f * sin) * speed * dt;
    player.position.z += (f * cos - s2 * sin) * speed * dt;
  }

  return { ensureUI, update, setEnabled };
})();

// Build touch UI ASAP (but won’t show on desktop)
androidControls.ensureUI();

// ------------------------------
// Render loop starts immediately
// ------------------------------
let worldApi = null;
let worldReady = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  try {
    // Update Android controls only in non-XR
    androidControls.update(dt);

    if (worldReady && worldApi?.update) worldApi.update(dt, t);
    renderer.render(scene, camera);
  } catch (e) {
    log("[FATAL] render loop crashed:", String(e?.stack || e));
    try { renderer.render(scene, camera); } catch {}
  }
});

log("[index] render loop started ✅");

// Load world async AFTER loop is running
(async () => {
  try {
    log("[world] importing…");
    const mod = await import(`./world.js?v=${BUILD}`);
    log("[world] import ✅");

    log("[world] init…");
    worldApi = await mod.World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD });
    worldReady = true;
    log("[world] init ✅");

    // Room buttons (HUD)
    $("#btnRoomLobby")?.addEventListener("click", () => worldApi?.setRoom?.("lobby"));
    $("#btnRoomStore")?.addEventListener("click", () => worldApi?.setRoom?.("store"));
    $("#btnRoomScorpion")?.addEventListener("click", () => worldApi?.setRoom?.("scorpion"));
    $("#btnRoomSpectate")?.addEventListener("click", () => worldApi?.setRoom?.("spectate"));
  } catch (e) {
    log("[world] init ❌", String(e?.stack || e));
  }
})();
