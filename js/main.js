// /js/main.js — Scarlett VR Poker (CDN importmap build)
// - Works with your index.html HUD events
// - Quest WebXR: Enter VR via "scarlett-enter-vr"
// - Android dock: "scarlett-touch"
// - Scorpion Room: spawn directly seated at table
//
// IMPORTANT:
// This file is self-contained and only requires:
//   - importmap in index.html mapping "three"
//   - /js/world.js (below)

import * as THREE from "three";
import { World } from "./world.js";

const $ = (id) => document.getElementById(id);
const statusText = $("statusText");
const setStatus = (t) => { if (statusText) statusText.textContent = " " + t; };

const log = (...a) => console.log("[main]", ...a);

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

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 12, 90);

// Camera
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

// Flags supplied by index.html (localStorage backed)
const flags = () => (window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true });

// Android dock state
let touch = { f:0, b:0, l:0, r:0, turnL:0, turnR:0 };
window.addEventListener("scarlett-touch", (e) => { touch = e?.detail || touch; });

// Desktop keys fallback
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

// Input polling
const input = {
  axesL: [0, 0],
  axesR: [0, 0],
  snapCooldown: 0,
};

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

// World init
const world = World.init({
  THREE, scene, renderer, camera, player, controllers,
  log: (...a) => console.log("[world]", ...a),
});

// Modes
let mode = "seated"; // Scorpion Room default
function setMode(m) { mode = m; world.setMode(m); }

// Apply initial flags from index.html
world.setFlag("teleport", !!flags().teleport);
world.setFlag("move", !!flags().move);
world.setFlag("snap", !!flags().snap);
world.setFlag("hands", !!flags().hands);

// Hook HUD toggle events
window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

// Scorpion Room spawn: seat immediately
world.sitPlayerAtSeat(0);
setMode("seated");
setStatus("Ready ✅");

// Recenter: return to seat (Scorpion Room behavior)
window.addEventListener("scarlett-recenter", () => {
  log("event: scarlett-recenter");
  world.sitPlayerAtSeat(0);
  setMode("seated");
});

// Enter VR: request session (triggered by your HUD button event)
async function enterVR() {
  if (!navigator.xr) { log("navigator.xr not found"); return; }

  try {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok) { log("immersive-vr not supported"); return; }

    const init = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] };
    init.optionalFeatures = Array.from(new Set([...(init.optionalFeatures || []), "local-floor"]));

    const session = await navigator.xr.requestSession("immersive-vr", init);
    await renderer.xr.setSession(session);

    // In VR: rig y should be 0 (local-floor)
    player.position.y = 0;

    session.addEventListener("end", () => {
      // Desktop seating height fallback
      player.position.y = 1.35;
      log("VR session ended");
    });

    log("VR session started ✅");
  } catch (e) {
    console.error(e);
    log("enterVR failed:", e?.message || e);
  }
}
window.addEventListener("scarlett-enter-vr", () => {
  log("event: scarlett-enter-vr");
  enterVR();
});

// Movement
function applyMove(dt) {
  if (!flags().move) return;
  if (mode === "seated") return; // no walking while seated in Scorpion Room

  let x = 0, z = 0;

  // VR sticks
  x += input.axesL[0] || 0;
  z += input.axesL[1] || 0;

  // Android dock
  x += (touch.r ? 1 : 0) - (touch.l ? 1 : 0);
  z += (touch.b ? 1 : 0) - (touch.f ? 1 : 0);

  // Desktop
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

  const resolved = world.resolvePlayerCollision(from, to);
  player.position.copy(resolved);
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

log("main boot ✅");
