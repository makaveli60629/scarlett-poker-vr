// /js/main.js — Scarlett VR Poker (FINAL FIX)
// - Always allows movement when world is fallback (even if seated)
// - Smooth turn available when Snap is OFF
// - If real world fails to load, auto-stand in lobby so you're not stuck
// - Keeps Scorpion "spawn seated" but won't trap you

import * as THREE from "three";
import { World } from "./world.js";

const statusText = document.getElementById("statusText");
const setStatus = (t) => { if (statusText) statusText.textContent = " " + t; };
const log = (...a) => console.log("[main]", ...a);

// Canvas
let canvas = document.querySelector("canvas");
if (!canvas) { canvas = document.createElement("canvas"); document.body.appendChild(canvas); }

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

// Flags from index.html
const flags = () => (window.__SCARLETT_FLAGS || { teleport:true, move:true, snap:true, hands:true });

// Android dock state
let touch = { f:0, b:0, l:0, r:0, turnL:0, turnR:0 };
window.addEventListener("scarlett-touch", (e) => { touch = e?.detail || touch; });

// Desktop fallback keys
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

// World init
const world = World.init({
  THREE, scene, renderer, camera, player, controllers,
  log: (...a)=>console.log("[world]", ...a),
});

let mode = "seated"; // scorpion default
function setMode(m){ mode = m; world.setMode(m); }

// Apply toggles
world.setFlag("teleport", !!flags().teleport);
world.setFlag("move", !!flags().move);
world.setFlag("snap", !!flags().snap);
world.setFlag("hands", !!flags().hands);

window.addEventListener("scarlett-toggle-teleport", (e)=>world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e)=>world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e)=>world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e)=>world.setFlag("hands", !!e.detail));

// Scorpion seat index
const seatIndex = Number.isFinite(+window.__SCARLETT_SEAT_INDEX__) ? (+window.__SCARLETT_SEAT_INDEX__) : 0;

// Spawn seated, BUT don’t trap movement if world is fallback
world.sitPlayerAtSeat(seatIndex);
setMode("seated");
setStatus("Loading world…");

// Recenter: seat if real world, otherwise stand (so you can move)
window.addEventListener("scarlett-recenter", () => {
  if (world.isRealWorldLoaded()) {
    world.sitPlayerAtSeat(seatIndex);
    setMode("seated");
    setStatus("Recentered ✅");
  } else {
    world.standPlayerInLobby();
    setMode("lobby");
    setStatus("Fallback: standing ✅");
  }
});

// World load signals
window.addEventListener("scarlett-world-loaded", (e) => {
  setStatus("World loaded ✅");
  // In scorpion, keep seated. If you want: uncomment next 2 lines to start standing after load.
  // world.standPlayerInLobby();
  // setMode("lobby");
  log("world loaded:", e?.detail || "");
});

window.addEventListener("scarlett-world-failed", () => {
  // If your real world didn’t mount, we auto-stand so you can move.
  world.standPlayerInLobby();
  setMode("lobby");
  setStatus("Fallback world (stand + move) ⚠️");
  log("world failed -> fallback standing");
});

// Safety timer: if no real modules mounted after ~3 seconds, declare fallback
setTimeout(() => {
  if (!world.isRealWorldLoaded()) {
    window.dispatchEvent(new Event("scarlett-world-failed"));
  }
}, 3000);

// Enter VR
async function enterVR(){
  if (!navigator.xr) { setStatus("No XR ❌"); return; }
  try {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok) { setStatus("VR not supported ❌"); return; }

    const init = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor","bounded-floor","hand-tracking"] };
    init.optionalFeatures = Array.from(new Set([...(init.optionalFeatures||[]), "local-floor"]));

    const session = await navigator.xr.requestSession("immersive-vr", init);
    await renderer.xr.setSession(session);

    // local-floor: rig y=0
    player.position.y = 0;

    session.addEventListener("end", () => {
      player.position.y = (mode === "seated") ? 1.35 : 1.7;
    });

    setStatus("VR ✅");
  } catch (e) {
    console.error(e);
    setStatus("Enter VR failed ❌");
  }
}
window.addEventListener("scarlett-enter-vr", enterVR);

// Gamepad polling
const input = { axesL:[0,0], axesR:[0,0], snapCooldown:0 };
function pollGamepads(){
  const session = renderer.xr.getSession();
  if (!session) return;

  let gpL=null, gpR=null;
  for (const src of session.inputSources){
    if (!src?.gamepad) continue;
    if (!gpL) gpL = src.gamepad;
    else if (!gpR) gpR = src.gamepad;
  }
  if (gpL){
    input.axesL[0] = gpL.axes?.[2] ?? gpL.axes?.[0] ?? 0;
    input.axesL[1] = gpL.axes?.[3] ?? gpL.axes?.[1] ?? 0;
  }
  if (gpR){
    input.axesR[0] = gpR.axes?.[2] ?? gpR.axes?.[0] ?? 0;
    input.axesR[1] = gpR.axes?.[3] ?? gpR.axes?.[1] ?? 0;
  }
}

// Movement: allow moving when fallback (even if seated)
function applyMove(dt){
  if (!flags().move) return;

  const realLoaded = world.isRealWorldLoaded();
  const allowWhileSeated = !realLoaded; // ← key fix

  if (mode === "seated" && !allowWhileSeated) return;

  let x=0, z=0;

  x += input.axesL[0] || 0;
  z += input.axesL[1] || 0;

  x += (touch.r?1:0) - (touch.l?1:0);
  z += (touch.b?1:0) - (touch.f?1:0);

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

  const dx = (x*cos - z*sin) * speed * dt;
  const dz2 = (x*sin + z*cos) * speed * dt;

  const from = player.position.clone();
  const to = from.clone();
  to.x += dx; to.z += dz2;

  player.position.copy(world.resolvePlayerCollision(from, to));
}

// Turning: Snap when Snap ON, Smooth when Snap OFF
function applyTurn(dt){
  let sx = input.axesR[0] || 0;
  if (touch.turnL) sx -= 1;
  if (touch.turnR) sx += 1;

  // Smooth turn if snap is OFF
  if (!flags().snap) {
    const dead = 0.12;
    if (Math.abs(sx) < dead) return;
    const turnSpeed = 2.2; // radians/sec
    world.addPlayerYaw(-sx * turnSpeed * dt);
    return;
  }

  // Snap turn if snap is ON
  input.snapCooldown = Math.max(0, input.snapCooldown - dt);
  if (input.snapCooldown > 0) return;

  const thresh = 0.72;
  const step = Math.PI / 6; // 30° (not 45)
  if (sx > thresh) {
    world.addPlayerYaw(-step);
    input.snapCooldown = 0.22;
  } else if (sx < -thresh) {
    world.addPlayerYaw(+step);
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
  const dt = Math.min(0.05, (now-lastT)/1000);
  lastT = now;

  pollGamepads();
  applyTurn(dt);
  applyMove(dt);

  world.update(dt);
  renderer.render(scene, camera);
});

log("boot ✅");
