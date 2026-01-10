// /js/main.js — Scarlett VR Poker — FULL MASTER (Move/Turn/Collision/Bots Tick) v9.4
// Uses importmap: "three" + "three/addons/" from index.html

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { World } from "./world.js";

// ---------------- helpers ----------------
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz=0.12){ return Math.abs(v) < dz ? 0 : v; }

function getXRGamepad(renderer, handIndex){
  const src = renderer.xr.getSession()?.inputSources;
  if (!src) return null;
  // XRInputSourceArray is iterable but not Array
  let i = 0;
  for (const s of src){
    if (s?.gamepad){
      // most runtimes: left is first, right is second
      if (i === handIndex) return s.gamepad;
      i++;
    }
  }
  return null;
}

function readStick(gamepad, stick="left"){
  // WebXR gamepad mapping is usually:
  // left stick: axes[0], axes[1]
  // right stick: axes[2], axes[3] (sometimes 0/1 on right controller)
  if (!gamepad) return { x:0, y:0 };
  const a = gamepad.axes || [];
  if (stick === "left") {
    return { x: deadzone(a[0] ?? 0), y: deadzone(a[1] ?? 0) };
  }
  // right stick best-effort
  return { x: deadzone(a[2] ?? a[0] ?? 0), y: deadzone(a[3] ?? a[1] ?? 0) };
}

// ---------------- boot ----------------
const BOOT = (window.__BOOT ||= { v: Date.now() });
console.log(`[main] boot ✅ v=${BOOT.v}`);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(1, window.innerHeight), 0.05, 250);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// VR button
try{
  const init = window.__XR_SESSION_INIT || { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] };
  const btn = VRButton.createButton(renderer, init);
  const slot = document.getElementById("vrButtonSlot");
  (slot || document.body).appendChild(btn);
  console.log("[main] VRButton appended ✅");
}catch(e){
  console.warn("[main] VRButton failed:", e);
}

// resize (XR-safe)
function onResize(){
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  if (!renderer.xr.isPresenting) renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener("resize", onResize);

// player rig
const player = new THREE.Group();
player.name = "playerRig";
player.position.set(0, 0, 0);
scene.add(player);

camera.position.set(0, 1.6, 3);
player.add(camera);

// controllers
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  gripL: renderer.xr.getControllerGrip(0),
  gripR: renderer.xr.getControllerGrip(1),
  handL: renderer.xr.getHand(0),
  handR: renderer.xr.getHand(1),
};
scene.add(controllers.left, controllers.right, controllers.gripL, controllers.gripR, controllers.handL, controllers.handR);

// flags from index
const FLAGS = (window.__SCARLETT_FLAGS ||= { teleport:true, move:true, snap:true, hands:true });

// mobile touch state (from your dock)
let touchState = { f:0,b:0,l:0,r:0,turnL:0,turnR:0 };
window.addEventListener("scarlett-touch", (e)=>{ if (e?.detail) touchState = e.detail; });

// toggles from HUD
window.addEventListener("scarlett-toggle-move", (e)=>{ FLAGS.move = !!e.detail; });
window.addEventListener("scarlett-toggle-snap", (e)=>{ FLAGS.snap = !!e.detail; });
window.addEventListener("scarlett-toggle-teleport", (e)=>{ FLAGS.teleport = !!e.detail; });

// recenter
window.addEventListener("scarlett-recenter", ()=>{
  // keep Y, recenter XZ, face forward
  player.position.x = 0;
  player.position.z = 0;
  player.rotation.y = 0;
});

// enter vr (optional manual)
window.addEventListener("scarlett-enter-vr", async ()=>{
  try{
    if (renderer.xr.getSession()) return;
    const init = window.__XR_SESSION_INIT || { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] };
    const sess = await navigator.xr.requestSession("immersive-vr", init);
    await renderer.xr.setSession(sess);
  }catch(e){
    console.warn("[main] enter-vr failed:", e);
  }
});

// ---------------- world init ----------------
let world = null;
let ctx = null;

(async ()=>{
  try{
    world = await World.init({
      THREE, scene, renderer, camera, player, controllers,
      log: (...a)=>console.log(...a),
      _v: window.__BUILD_V || Date.now()
    });
    ctx = world.ctx;
    console.log("[main] world init ✅");
  }catch(e){
    console.warn("[main] world init failed:", e);
  }
  console.log("[main] ready ✅");
})();

// ---------------- locomotion (Quest + Android) ----------------
let lastSnapT = 0;
function doSnapTurn(dir, t){
  // dir: -1 left, +1 right
  const SNAP_DEG = 30;
  const COOLDOWN = 0.22;
  if (t - lastSnapT < COOLDOWN) return;
  lastSnapT = t;
  player.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG) * dir;
}

// collision against ctx.solids (simple sphere vs box)
const tmpBox = new THREE.Box3();
const tmpVec = new THREE.Vector3();
function collides(nextPos){
  if (!ctx?.solids?.length) return false;
  // sphere at chest height
  const center = tmpVec.set(nextPos.x, 1.2, nextPos.z);
  const radius = 0.28;
  for (const o of ctx.solids){
    if (!o?.isObject3D) continue;
    tmpBox.setFromObject(o);
    // intersectsSphere manual
    const clamped = center.clone().clamp(tmpBox.min, tmpBox.max);
    if (clamped.distanceToSquared(center) <= radius*radius) return true;
  }
  return false;
}

function locomotion(dt){
  if (!FLAGS.move) return;

  const isXR = !!renderer.xr.getSession();
  let moveX = 0, moveY = 0, turnX = 0;

  if (isXR){
    const gpL = getXRGamepad(renderer, 0);
    const gpR = getXRGamepad(renderer, 1);
    const l = readStick(gpL, "left");
    const r = readStick(gpR, "right");
    moveX = l.x; moveY = l.y;
    turnX = r.x;
  } else {
    // Android dock
    moveY = (touchState.f ? -1 : 0) + (touchState.b ?  1 : 0);
    moveX = (touchState.r ?  1 : 0) + (touchState.l ? -1 : 0);
    turnX = (touchState.turnR ? 1 : 0) + (touchState.turnL ? -1 : 0);
  }

  // turning
  const t = performance.now() / 1000;
  if (FLAGS.snap){
    if (turnX > 0.7) doSnapTurn(-1, t);
    if (turnX < -0.7) doSnapTurn(+1, t);
  } else {
    player.rotation.y -= turnX * dt * 1.8;
  }

  // movement relative to facing
  const speed = isXR ? 2.0 : 1.6;
  const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
  const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);

  const step = new THREE.Vector3()
    .addScaledVector(forward, -moveY)
    .addScaledVector(right, moveX);

  if (step.lengthSq() < 1e-6) return;
  step.normalize().multiplyScalar(speed * dt);

  const next = player.position.clone().add(step);

  // keep inside walls if solids exist
  if (!collides(next)){
    player.position.copy(next);
  }
}

// ---------------- loop ----------------
let last = performance.now();
renderer.setAnimationLoop(()=>{
  const now = performance.now();
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;

  locomotion(dt);

  try{ world?.tick?.(dt); } catch(e){ /* ignore */ }

  renderer.render(scene, camera);
});
