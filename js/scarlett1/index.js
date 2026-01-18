// /js/scarlett1/index.js
// SCARLETT PERMA DEMO — MONOLITH ANDROID SAFE + QUEST VR
const BUILD = "SCARLETT_PERMA_DEMO_FIX_v9_VR_ANDROID_SAFE";

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { buildWorld } from "./world.js";

const $ = (sel) => document.querySelector(sel);

const btnEnterVR = $("#btnEnterVR");
const btnTeleport = $("#btnTeleport");
const btnReset = $("#btnReset");
const btnHideHUD = $("#btnHideHUD");
const btnDiag = $("#btnDiag");
const diagPanel = $("#diagPanel");
const diagText = $("#diagText");
const hud = $("#hud");
const app = $("#app");

const t0 = performance.now();
const stamp = () => ((performance.now() - t0) / 1000).toFixed(3);
const logLines = [];
function dwrite(line) {
  const s = `[${stamp()}] ${line}`;
  logLines.push(s);
  if (logLines.length > 200) logLines.shift();
  if (diagText) diagText.textContent = logLines.join("\n");
  console.log(s);
}

// Public hook (other modules can call)
window.__scarlettDiagWrite = (m) => dwrite(String(m));

function envReport() {
  dwrite(`booting… BUILD=${BUILD}`);
  dwrite(`href=${location.href}`);
  dwrite(`secureContext=${String(window.isSecureContext)}`);
  dwrite(`ua=${navigator.userAgent}`);
  dwrite(`touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints || 0}`);
  dwrite(`xr=${String(!!navigator.xr)}`);
}
envReport();

// ---- THREE setup ----
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
camera.position.set(0, 1.6, 3.2);

const clock = new THREE.Clock();

// Light
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 0.85);
dir.position.set(4, 8, 3);
scene.add(dir);

// Player rig
const rig = new THREE.Group();
rig.position.set(0, 0, 0);
rig.add(camera);
scene.add(rig);

// Spawn
const SPAWN = new THREE.Vector3(0, 0, 3.2);

// Flags / state
const state = {
  teleport: false,
  session: null,
  refSpace: null,
  baseSpace: null,
  touchLook: { active: false, id: null, x: 0, y: 0 },
  twoMove: { active: false, ax: 0, ay: 0, bx: 0, by: 0, startX: 0, startZ: 0 },
  yaw: 0,
  pitch: 0,
};

// World
dwrite("[world] buildWorld()");
const world = buildWorld(scene, dwrite);
dwrite("[world] ready ✅");

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive: true });

// HUD buttons
btnDiag?.addEventListener("click", () => {
  const on = diagPanel.style.display !== "block";
  diagPanel.style.display = on ? "block" : "none";
});

btnHideHUD?.addEventListener("click", () => {
  const hidden = hud.style.display === "none";
  hud.style.display = hidden ? "flex" : "none";
});

btnReset?.addEventListener("click", () => {
  rig.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
  state.yaw = 0;
  state.pitch = 0;
  rig.rotation.set(0, 0, 0);
  dwrite("[player] reset to spawn ✅");
});

btnTeleport?.addEventListener("click", () => {
  state.teleport = !state.teleport;
  btnTeleport.dataset.on = state.teleport ? "1" : "0";
  btnTeleport.textContent = `Teleport: ${state.teleport ? "ON" : "OFF"}`;
  dwrite(`[teleport] ${state.teleport ? "ON" : "OFF"}`);
});

// ---- ANDROID TOUCH CONTROLS ----
// 1 finger drag: look
// 2 finger drag: move (relative to rig yaw)
const el = renderer.domElement;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

el.addEventListener("touchstart", (e) => {
  if (!e.touches || e.touches.length === 0) return;

  // One finger look
  if (e.touches.length === 1) {
    const t = e.touches[0];
    state.touchLook.active = true;
    state.touchLook.id = t.identifier;
    state.touchLook.x = t.clientX;
    state.touchLook.y = t.clientY;
    return;
  }

  // Two finger move
  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    state.twoMove.active = true;
    state.twoMove.ax = a.clientX; state.twoMove.ay = a.clientY;
    state.twoMove.bx = b.clientX; state.twoMove.by = b.clientY;
    state.twoMove.startX = rig.position.x;
    state.twoMove.startZ = rig.position.z;
  }
}, { passive: true });

el.addEventListener("touchmove", (e) => {
  if (!e.touches) return;

  // One finger look
  if (state.touchLook.active && e.touches.length === 1) {
    const t = e.touches[0];
    const dx = t.clientX - state.touchLook.x;
    const dy = t.clientY - state.touchLook.y;
    state.touchLook.x = t.clientX;
    state.touchLook.y = t.clientY;

    const S = 0.0022;
    state.yaw -= dx * S;
    state.pitch -= dy * S;
    state.pitch = clamp(state.pitch, -1.1, 1.1);

    rig.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    return;
  }

  // Two finger move
  if (state.twoMove.active && e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    const mx0 = (state.twoMove.ax + state.twoMove.bx) * 0.5;
    const my0 = (state.twoMove.ay + state.twoMove.by) * 0.5;
    const mx1 = (a.clientX + b.clientX) * 0.5;
    const my1 = (a.clientY + b.clientY) * 0.5;

    const dx = (mx1 - mx0);
    const dy = (my1 - my0);

    // dy forward/back, dx strafe
    const moveScale = 0.008;
    const fwd = -dy * moveScale;
    const str = dx * moveScale;

    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    const vx = (str * cos) + (fwd * sin);
    const vz = (fwd * cos) - (str * sin);

    rig.position.x = state.twoMove.startX + vx;
    rig.position.z = state.twoMove.startZ + vz;
  }
}, { passive: true });

el.addEventListener("touchend", (e) => {
  if (!e.touches) return;
  if (e.touches.length === 0) {
    state.touchLook.active = false;
    state.touchLook.id = null;
    state.twoMove.active = false;
  }
  if (e.touches.length === 1) {
    state.twoMove.active = false;
  }
}, { passive: true });

// ---- DESKTOP WASD (fallback) ----
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function applyWASD(dt) {
  const speed = 2.2;
  let f = 0, s = 0;
  if (keys.has("w")) f += 1;
  if (keys.has("s")) f -= 1;
  if (keys.has("a")) s -= 1;
  if (keys.has("d")) s += 1;
  if (!f && !s) return;

  const yaw = rig.rotation.y;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const vx = (s * cos) + (f * sin);
  const vz = (f * cos) - (s * sin);

  rig.position.x += vx * speed * dt;
  rig.position.z += -vz * speed * dt;
}

// ---- VR ENTRY (HARD USER-GESTURE SAFE) ----
async function canEnterVR() {
  if (!navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported("immersive-vr");
  } catch (_) {
    return false;
  }
}

btnEnterVR?.addEventListener("click", async () => {
  dwrite("ENTER VR CLICK REGISTERED ✅");

  if (!navigator.xr) {
    alert("WebXR not supported on this browser.");
    return;
  }

  const supported = await canEnterVR();
  if (!supported) {
    alert("immersive-vr not supported on this device/browser.");
    dwrite("XR: immersive-vr NOT supported ❌");
    return;
  }

  try {
    // MUST be directly in the click handler for Android Chrome
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });
    state.session = session;

    session.addEventListener("end", () => {
      dwrite("XR session ended.");
      state.session = null;
    });

    renderer.xr.setSession(session);

    dwrite("XR SESSION STARTED ✅");
  } catch (e) {
    console.error(e);
    dwrite(`XR SESSION FAILED ❌ ${e?.message || e}`);
    alert("VR blocked by browser or permission.");
  }
});

// ---- SIMPLE TELEPORT (Quest controllers) ----
// If teleport ON, thumbstick forward moves you forward a step.
// This is “good enough” until your full ray teleport module is back.
function readXRGamepadMove(dt) {
  const session = renderer.xr.getSession?.();
  if (!session) return;

  for (const src of session.inputSources) {
    if (!src || !src.gamepad) continue;
    const gp = src.gamepad;

    // Common layout: axes[2]/[3] or [0]/[1] depending controller
    const axX = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const axY = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    // Move when teleport OFF (smooth move)
    if (!state.teleport) {
      const dead = 0.14;
      const sx = Math.abs(axX) > dead ? axX : 0;
      const sy = Math.abs(axY) > dead ? axY : 0;
      if (sx || sy) {
        const speed = 2.0;
        const yaw = rig.rotation.y;
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const fwd = -sy;
        const str = sx;
        const vx = (str * cos) + (fwd * sin);
        const vz = (fwd * cos) - (str * sin);
        rig.position.x += vx * speed * dt;
        rig.position.z += vz * speed * dt;
      }
      continue;
    }

    // Teleport ON (step)
    if (state.teleport) {
      const forward = (-axY) > 0.85;
      if (forward) {
        const step = 0.6;
        const yaw = rig.rotation.y;
        rig.position.x += Math.sin(yaw) * step;
        rig.position.z += Math.cos(yaw) * step;
      }
    }
  }
}

// ---- Render loop ----
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // Desktop move
  applyWASD(dt);

  // XR controllers move
  readXRGamepadMove(dt);

  // World tick
  world?.tick?.(dt, { rig, camera });

  renderer.render(scene, camera);
});
