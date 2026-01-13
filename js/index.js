// /js/index.js — FULL FIX: no 3-dots load screen (Quest) + Locomotion Patch (sticks fixed)
// ✅ starts render loop immediately
// ✅ loads world async AFTER loop is running
// ✅ avoids top-level await
// ✅ catches render errors + prints to HUD
// ✅ adds locomotion in index.js (NO core touch, NO extensions)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const BUILD = `INDEX_${Date.now()}`;
const $ = (sel) => document.querySelector(sel);

const hud = $("#hud");
const hudToggle = $("#hudToggle");
const hudlog = $("#hudlog");

function log(...args) {
  const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  if (hudlog) {
    hudlog.textContent += msg + "\n";
    hudlog.scrollTop = hudlog.scrollHeight;
  }
}

function setHUDVisible(on) {
  if (!hud || !hudToggle) return;
  hud.style.display = on ? "block" : "none";
  hudToggle.style.display = on ? "none" : "block";
}

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
camera.position.set(0, 1.65, 3.5);

// Controllers
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

// Auto-hide DOM HUD in VR (prevents that floating “highlight thing”)
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  log("[xr] sessionstart ✅ HUD hidden");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  log("[xr] sessionend ✅ HUD shown");
});

// Recenter
$("#btnRecenter")?.addEventListener("click", () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
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

// =======================================================
// ✅ LOCOMOTION PATCH (INDEX-LEVEL, NO CORE, NO EXTENSIONS)
// =======================================================

const MOVE_SPEED = 2.9;                 // meters/sec
const DEADZONE = 0.14;
const DIAGONAL_45 = true;
const DIAGONAL_AMOUNT = 0.85;
const SNAP_TURN_DEG = 30;
const SNAP_TURN_RAD = THREE.MathUtils.degToRad(SNAP_TURN_DEG);
let turnCooldown = 0;

// ✅ Your exact stick fixes:
// - Left controller: everything reversed (x and y)
// - Right controller: forward/back reversed (y)
function patchAxes(handedness, x, y) {
  if (handedness === "left") { x = -x; y = -y; }
  if (handedness === "right") { y = -y; }
  return { x, y };
}

function getHeadYaw(cam) {
  const q = cam.quaternion;
  // yaw from quaternion (stable)
  return Math.atan2(
    2 * (q.w * q.y + q.z * q.x),
    1 - 2 * (q.y * q.y + q.x * q.x)
  );
}

function readBestStick(gamepad) {
  if (!gamepad) return { active: false, x: 0, y: 0, pair: "none" };
  const a = gamepad.axes || [];

  // choose the most active of (0,1) or (2,3)
  let x = 0, y = 0;
  if (a.length >= 4) {
    const mag01 = Math.abs(a[0] || 0) + Math.abs(a[1] || 0);
    const mag23 = Math.abs(a[2] || 0) + Math.abs(a[3] || 0);
    if (mag23 > mag01) { x = a[2] || 0; y = a[3] || 0; return { active: true, x, y, pair: "23" }; }
  }
  if (a.length >= 2) { x = a[0] || 0; y = a[1] || 0; return { active: true, x, y, pair: "01" }; }
  return { active: false, x: 0, y: 0, pair: "none" };
}

function readTurnAxis(gamepad) {
  if (!gamepad) return 0;
  const a = gamepad.axes || [];
  // common: right stick X at axes[2] (or axes[0] fallback)
  return (a.length >= 3 ? (a[2] || 0) : (a[0] || 0));
}

// This runs every frame during XR
function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const session = renderer.xr.getSession?.();
  if (!session) return;

  const sources = Array.from(session.inputSources || []).filter(s => s?.gamepad);
  if (!sources.length) return;

  const right = sources.find(s => s.handedness === "right") || sources[0];
  const left  = sources.find(s => s.handedness === "left")  || sources[0];

  // Movement: prefer right stick; fallback left stick
  let src = right;
  let stick = readBestStick(right.gamepad);

  if (!stick.active || (Math.abs(stick.x) < DEADZONE && Math.abs(stick.y) < DEADZONE)) {
    src = left;
    stick = readBestStick(left.gamepad);
  }

  let x = stick.x || 0;
  let y = stick.y || 0;

  // deadzone
  if (Math.abs(x) < DEADZONE) x = 0;
  if (Math.abs(y) < DEADZONE) y = 0;

  // apply your inversion fixes
  ({ x, y } = patchAxes(src.handedness, x, y));

  // diagonal shaping (optional)
  if (DIAGONAL_45 && x !== 0) {
    const sign = y !== 0 ? Math.sign(y) : 1;
    y += sign * Math.abs(x) * DIAGONAL_AMOUNT;
    x *= 0.65;
    const len = Math.hypot(x, y);
    if (len > 1e-4) { x /= len; y /= len; }
  }

  // head-relative movement
  if (x !== 0 || y !== 0) {
    const yaw = getHeadYaw(camera);
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    // y is forward/back
    const mx = x * cos - y * sin;
    const mz = x * sin + y * cos;

    player.position.x += mx * MOVE_SPEED * dt;
    player.position.z += mz * MOVE_SPEED * dt;
  }

  // Snap turn: prefer right controller turn axis
  turnCooldown = Math.max(0, turnCooldown - dt);
  let tx = readTurnAxis(right.gamepad || left.gamepad);
  if (Math.abs(tx) < DEADZONE) tx = 0;

  if (turnCooldown === 0 && tx !== 0) {
    // tx>0 => turn right; tx<0 => turn left
    player.rotation.y += (tx > 0 ? -1 : 1) * SNAP_TURN_RAD;
    turnCooldown = 0.22;
  }
}

// --- IMPORTANT: START THE RENDER LOOP IMMEDIATELY ---
// This prevents Quest from getting stuck on the Oculus loader.
let worldApi = null;
let worldReady = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  try {
    // ✅ locomotion always works, even if world fails to load
    applyLocomotion(dt);

    // world update (if loaded)
    if (worldReady && worldApi?.update) worldApi.update(dt, t);

    renderer.render(scene, camera);
  } catch (e) {
    log("[FATAL] render loop crashed:", String(e?.stack || e));
    // If loop crashes, Quest will show 3 dots forever — keep loop alive:
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

    // Room buttons
    $("#btnRoomLobby")?.addEventListener("click", () => worldApi?.setRoom?.("lobby"));
    $("#btnRoomStore")?.addEventListener("click", () => worldApi?.setRoom?.("store"));
    $("#btnRoomScorpion")?.addEventListener("click", () => worldApi?.setRoom?.("scorpion"));
    $("#btnRoomSpectate")?.addEventListener("click", () => worldApi?.setRoom?.("spectate"));

  } catch (e) {
    log("[world] init ❌", String(e?.stack || e));
  }
})();
