// /js/main.js — Scarlett VR Poker (FINAL, CDN importmap build)
// Uses your index.html events:
// - scarlett-enter-vr
// - scarlett-recenter
// - scarlett-toggle-teleport/move/snap/hands
// - scarlett-touch
//
// Scorpion Room behavior:
// - spawn seated immediately
// - recenter returns to seat
//
// Requires:
// - importmap mapping "three" in index.html
// - /js/world.js (orchestrator below)

import * as THREE from "three";
import { World } from "./world.js";

const statusText = document.getElementById("statusText");
const setStatus = (t) => { if (statusText) statusText.textContent = " " + t; };
const log = (...a) => console.log("[main]", ...a);

// optional: forward messages into your on-screen log panel (index.html already logs window errors)
function uiLog(msg) {
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(msg) })); } catch {}
}

// Canvas
let canvas = document.querySelector("canvas");
if (!canvas) {
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
}

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

// Scene + Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 12, 90);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

// Player rig
const player = new THREE.Group();
player.name = "playerRig";
player.add(camera);
scene.add(player);

// Controllers
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  leftGrip: renderer.xr.getControllerGrip(0),
  rightGrip: renderer.xr.getControllerGrip(1),
};
scene.add(controllers.left, controllers.right, controllers.leftGrip, controllers.rightGrip);

// Flags from index.html (localStorage-backed)
const flags = () => (window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true });

// Android dock state
let touch = { f: 0, b: 0, l: 0, r: 0, turnL: 0, turnR: 0 };
window.addEventListener("scarlett-touch", (e) => { touch = e?.detail || touch; });

// Desktop fallback keys (optional)
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

// World init
const world = World.init({
  THREE, scene, renderer, camera, player, controllers,
  log: (...a) => console.log("[world]", ...a),
});

// Modes
let mode = "seated";
function setMode(m) { mode = m; world.setMode(m); }

// Apply initial flags
world.setFlag("teleport", !!flags().teleport);
world.setFlag("move", !!flags().move);
world.setFlag("snap", !!flags().snap);
world.setFlag("hands", !!flags().hands);

// Hook HUD toggle events
window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

// Scorpion Room seat index (0-7). You can change globally in console if desired:
// window.__SCARLETT_SEAT_INDEX__ = 3;
const seatIndex = Number.isFinite(+window.__SCARLETT_SEAT_INDEX__) ? (+window.__SCARLETT_SEAT_INDEX__) : 0;

// Spawn seated immediately
world.sitPlayerAtSeat(seatIndex);
setMode("seated");
setStatus("Ready ✅");
uiLog(`[main] Scorpion spawn seated seat=${seatIndex}`);

// Recenter -> return to seat (Scorpion behavior)
window.addEventListener("scarlett-recenter", () => {
  log("event: scarlett-recenter");
  world.sitPlayerAtSeat(seatIndex);
  setMode("seated");
});

// Enter VR (from HUD event)
async function enterVR() {
  if (!navigator.xr) { uiLog("❌ navigator.xr not found"); return; }
  try {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok) { uiLog("❌ immersive-vr not supported"); return; }

    const init = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] };
    init.optionalFeatures = Array.from(new Set([...(init.optionalFeatures || []), "local-floor"]));

    const session = await navigator.xr.requestSession("immersive-vr", init);
    await renderer.xr.setSession(session);

    // In VR keep rig at y=0 (local-floor)
    player.position.y = 0;

    session.addEventListener("end", () => {
      // Desktop fallback height
      player.position.y = 1.35;
      uiLog("[main] VR session ended");
    });

    uiLog("[main] VR session started ✅");
  } catch (e) {
    console.error(e);
    uiLog("❌ enterVR failed: " + (e?.message || e));
  }
}
window.addEventListener("scarlett-enter-vr", () => {
  log("event: scarlett-enter-vr");
  enterVR();
});

// Gamepad polling
const input = { axesL: [0, 0], axesR: [0, 0], snapCooldown: 0 };
function pollGamepads() {
  const session = renderer.xr.getSession();
  if (!session) return;

  let gpL = null, gpR = null;
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (!gpL) gpL = src.gamepad;
    else if (!gpR) gpR = src.gamepad;
  }

  if (gpL) {
    input.axesL[0] = gpL.axes?.[2] ?? gpL.axes?.[0] ?? 0;
    input.axesL[1] = gpL.axes?.[3] ?? gpL.axes?.[1] ?? 0;
  }
  if (gpR) {
    input.axesR[0] = gpR.axes?.[2] ?? gpR.axes?.[0] ?? 0;
    input.axesR[1] = gpR.axes?.[3] ?? gpR.axes?.[1] ?? 0;
  }
}

// Movement: disabled while seated (Scorpion)
function applyMove(dt) {
  if (!flags().move) return;
  if (mode === "seated") return;

  let x = 0, z = 0;

  // VR stick
  x += input.axesL[0] || 0;
  z += input.axesL[1] || 0;

  // Android dock
  x += (touch.r ? 1 : 0) - (touch.l ? 1 : 0);
  z += (touch.b ? 1 : 0) - (touch.f ? 1 : 0);

  // Desktop keys
  if (keys.has("KeyA")) x -= 1;
  if (keys.has("KeyD")) x += 1;
  if (keys.has("KeyW")) z -= 1;
  if (keys.has("KeyS")) z += 1;

  const dz = 0.12;
  if (Math.abs(x) < dz) x = 0;
  if (Math.abs(z) < dz) z = 0;
  if (!x && !z) return;

  const speed = 2.4;
  const yaw = world.getPlayerYaw();
  const cos = Math.cos(yaw), sin = Math.sin(yaw);

  const dx = (x * cos - z * sin) * speed * dt;
  const dz2 = (x * sin + z * cos) * speed * dt;

  const from = player.position.clone();
  const to = from.clone();
  to.x += dx;
  to.z += dz2;

  player.position.copy(world.resolvePlayerCollision(from, to));
}

function applySnapTurn(dt) {
  if (!flags().snap) return;

  input.snapCooldown = Math.max(0, input.snapCooldown - dt);

  let sx = input.axesR[0] || 0;
  if (touch.turnL) sx -= 1;
  if (touch.turnR) sx += 1;

  if (input.snapCooldown > 0) return;

  const thresh = 0.72;
  if (sx > thresh) {
    world.addPlayerYaw(-Math.PI / 6);
    input.snapCooldown = 0.22;
  } else if (sx < -thresh) {
    world.addPlayerYaw(+Math.PI / 6);
    input.snapCooldown = 0.22;
  }
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  pollGamepads();
  applySnapTurn(dt);
  applyMove(dt);

  world.update(dt);
  renderer.render(scene, camera);
});

log("boot ✅");
