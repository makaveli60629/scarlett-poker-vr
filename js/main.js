// /js/main.js — Scarlett VR Poker (CDN importmap / Quest / Android safe)
// Uses your index.html HUD events:
// - "scarlett-enter-vr" (button)
// - "scarlett-recenter"
// - "scarlett-toggle-teleport" / "scarlett-toggle-move" / "scarlett-toggle-snap" / "scarlett-toggle-hands"
// - "scarlett-touch" (Android dock)
//
// Requires: /js/world.js
// CDN three is provided by importmap:  import * as THREE from "three";

import * as THREE from "three";
import { World } from "./world.js";

const $ = (id) => document.getElementById(id);
const statusText = $("statusText");
const setStatus = (t) => { if (statusText) statusText.textContent = " " + t; };

const log = (...a) => console.log("[main]", ...a);

// Use the existing page canvas (if any) or create one.
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

// Scene + camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 12, 90);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

// Player rig (camera is inside this). In VR: rig y should be 0 (local-floor).
const player = new THREE.Group();
player.name = "playerRig";
player.position.set(0, 1.7, 6); // desktop standing spawn
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

// Flags (from index.html)
const flags = () => (window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true });

// Touch state (Android dock)
let touch = { f:0, b:0, l:0, r:0, turnL:0, turnR:0 };

// Gamepad polling
const input = {
  axesL: [0, 0],
  axesR: [0, 0],
  snapCooldown: 0,
};

function pollGamepads() {
  const session = renderer.xr.getSession();
  if (!session) return;

  // Find up to 2 gamepads from inputSources
  let gpL = null, gpR = null;
  for (const src of session.inputSources) {
    if (!src || !src.gamepad) continue;
    if (!gpL) gpL = src.gamepad;
    else if (!gpR) gpR = src.gamepad;
  }

  if (gpL) {
    // Quest sometimes reports left stick on axes 2/3
    input.axesL[0] = gpL.axes?.[2] ?? gpL.axes?.[0] ?? 0;
    input.axesL[1] = gpL.axes?.[3] ?? gpL.axes?.[1] ?? 0;
  }
  if (gpR) {
    input.axesR[0] = gpR.axes?.[2] ?? gpR.axes?.[0] ?? 0;
    input.axesR[1] = gpR.axes?.[3] ?? gpR.axes?.[1] ?? 0;
  }
}

// Modes
let mode = "lobby"; // "lobby" | "seated" | "spectate"
function setMode(m) {
  mode = m;
  world.setMode(m);
}

// World init
const world = World.init({
  THREE, scene, renderer, camera, player, controllers, log: (...a) => console.log("[world]", ...a),
});

// Start in lobby standing
setMode("lobby");
setStatus("Ready ✅");

// --------------------
// WebXR session control (your HUD button triggers this)
// --------------------
async function enterVR() {
  if (!navigator.xr) {
    log("navigator.xr not found");
    return;
  }
  try {
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      log("immersive-vr not supported");
      return;
    }

    // Use your global config if present
    const init = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] };
    // Ensure local-floor is present for stable height
    init.optionalFeatures = Array.from(new Set([...(init.optionalFeatures || []), "local-floor"]));

    const session = await navigator.xr.requestSession("immersive-vr", init);
    await renderer.xr.setSession(session);

    // In VR: rig y must be 0 (local-floor)
    player.position.y = 0;

    session.addEventListener("end", () => {
      // Desktop fallback height
      player.position.y = 1.7;
      log("VR session ended");
    });

    log("VR session started ✅");
  } catch (e) {
    console.error(e);
    log("enterVR failed:", e?.message || e);
  }
}

// Hook your HUD event
window.addEventListener("scarlett-enter-vr", () => {
  log("event: scarlett-enter-vr");
  enterVR();
});

// Recenter hook (your HUD button)
window.addEventListener("scarlett-recenter", () => {
  log("event: scarlett-recenter");
  world.recenter();
  setMode("lobby");
});

// Toggle hooks (we store in world too)
window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

// Android touch dock hook
window.addEventListener("scarlett-touch", (e) => {
  touch = e?.detail || touch;
});

// Desktop keyboard fallback (optional)
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

// Movement helpers
function getYaw() { return world.getPlayerYaw(); }

function getMoveIntent() {
  // If move is disabled, no movement (except spectate still respects move flag)
  if (!flags().move) return { x: 0, z: 0 };

  let x = 0, z = 0;

  // VR left stick
  x += input.axesL[0] || 0;
  z += input.axesL[1] || 0;

  // Android dock
  x += (touch.r ? 1 : 0) - (touch.l ? 1 : 0);
  z += (touch.b ? 1 : 0) - (touch.f ? 1 : 0);

  // Desktop WASD
  if (keys.has("KeyA")) x -= 1;
  if (keys.has("KeyD")) x += 1;
  if (keys.has("KeyW")) z -= 1;
  if (keys.has("KeyS")) z += 1;

  // Deadzone
  const dz = 0.12;
  if (Math.abs(x) < dz) x = 0;
  if (Math.abs(z) < dz) z = 0;

  return { x, z };
}

function applyMove(dt) {
  // Seated = no walking
  if (mode === "seated") return;

  const intent = getMoveIntent();
  if (!intent.x && !intent.z) return;

  const speed = (mode === "spectate") ? 2.8 : 2.4;
  const yaw = getYaw();
  const cos = Math.cos(yaw), sin = Math.sin(yaw);

  // Move relative to yaw
  const dx = (intent.x * cos - intent.z * sin) * speed * dt;
  const dz = (intent.x * sin + intent.z * cos) * speed * dt;

  const from = player.position.clone();
  const to = from.clone();
  to.x += dx;
  to.z += dz;

  const resolved = world.resolvePlayerCollision(from, to);
  player.position.copy(resolved);
}

function applySnapTurn(dt) {
  if (!flags().snap) return;

  input.snapCooldown = Math.max(0, input.snapCooldown - dt);

  // VR right stick
  let sx = input.axesR[0] || 0;

  // Android dock turning
  if (touch.turnL) sx -= 1;
  if (touch.turnR) sx += 1;

  if (input.snapCooldown > 0) return;

  const thresh = 0.72;
  if (sx > thresh) {
    world.addPlayerYaw(-Math.PI / 6); // 30°
    input.snapCooldown = 0.22;
  } else if (sx < -thresh) {
    world.addPlayerYaw(+Math.PI / 6);
    input.snapCooldown = 0.22;
  }
}

// Auto-seat / spectate zones
function updateZones() {
  const z = world.getZoneAt(player.position);

  // Spectate zone overrides lobby (but not seated)
  if (mode !== "seated") {
    if (z === "spectate" && mode !== "spectate") setMode("spectate");
    if (z !== "spectate" && mode === "spectate") setMode("lobby");
  }

  // Auto-seat when you enter table zone (only if not already seated)
  if (z === "table" && mode !== "seated") {
    const seat = world.getNearestSeat(player.position);
    if (seat) {
      world.sitPlayerAtSeat(seat.index);
      setMode("seated");
    }
  }

  // Stand up when you leave table zone
  if (mode === "seated" && z !== "table") {
    world.standPlayerInLobby();
    setMode("lobby");
  }
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main loop
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  pollGamepads();
  applySnapTurn(dt);
  applyMove(dt);

  world.update(dt);
  updateZones();

  renderer.render(scene, camera);
});

log("main boot ✅");
