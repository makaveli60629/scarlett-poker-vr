// /js/main.js — Scarlett VR Poker — MAIN v10.6 (FULL)
// Fixes: guaranteed render loop, correct local-floor ref space, movement updates,
// safer spawn recenter timing, controller visibility.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

const BUILD = Date.now().toString();

function log(...a) {
  console.log(...a);
  try {
    window.dispatchEvent(new CustomEvent("scarlett-log", { detail: a.map(String).join(" ") }));
  } catch {}
}
log(`[main] boot ✅ v=${BUILD}`);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
camera.position.set(0, 1.6, 2.6);

// Player rig
const player = new THREE.Group();
player.name = "PLAYER_RIG";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// IMPORTANT: set reference space type BEFORE entering VR
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

document.body.appendChild(renderer.domElement);

// VR Button
const btn = VRButton.createButton(renderer);
btn.style.zIndex = "9999";
document.body.appendChild(btn);
log("[main] VRButton appended ✅");

// Ambient (real lights from world)
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// Controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);
scene.add(controllerGrip1);
scene.add(controllerGrip2);

const controllerModelFactory = new XRControllerModelFactory();
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));

function makeRay() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(geom, mat);
  line.name = "XR_RAY";
  line.scale.z = 6;
  return line;
}
controller1.add(makeRay());
controller2.add(makeRay());

// Resize
window.addEventListener("resize", () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Init =====
let worldCtx = null;
let controlsApi = null;

// Small helper: safe spawn after XR starts (timing matters on Quest)
function spawnSafe(name = "lobby_spawn") {
  try {
    // In XR local-floor, keep rig y=0 (headset provides height)
    if (renderer.xr.isPresenting) player.position.y = 0;

    if (controlsApi?.teleportToSpawn) controlsApi.teleportToSpawn(name);
    else if (Controls?.teleportToSpawn) Controls.teleportToSpawn(name);
  } catch (e) {
    log("⚠️ spawnSafe failed:", e?.message || e);
  }
}

(async function boot() {
  worldCtx = await World.init({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: { controller1, controller2, controllerGrip1, controllerGrip2 },
    log,
    BUILD,
  });

  // Controls init should return an API (if yours doesn't, we still handle it)
  controlsApi = Controls.init({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: { controller1, controller2 },
    world: worldCtx,
    log,
  }) || null;

  log("[main] world init ✅");
  log("[main] ready ✅");
})().catch((e) => {
  console.error(e);
  log("❌ [main] boot failed:", e?.message || e);
});

// ===== XR session hooks =====
renderer.xr.addEventListener("sessionstart", () => {
  log("[main] XR session start ✅");

  // Prevent “giant” feeling: rig stays at floor; headset provides the height
  player.position.y = 0;

  // Delay a tick so reference space is stable, then spawn
  setTimeout(() => spawnSafe("lobby_spawn"), 150);
});

renderer.xr.addEventListener("sessionend", () => {
  log("[main] XR session end ✅");
});

// HUD bridge
window.addEventListener("scarlett-recenter", () => {
  log("[main] recenter requested");
  spawnSafe("lobby_spawn");
});
window.addEventListener("scarlett-enter-vr", async () => {
  log("[main] enter vr requested");
  // VRButton handles actual session creation.
});

// ===== GUARANTEED animation loop =====
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Ensure controls update happens every frame
  try {
    if (controlsApi?.update) controlsApi.update(dt);
    else if (Controls?.update) Controls.update(dt);
  } catch (e) {
    // don't spam
  }

  // Keep rig y locked when in XR
  if (renderer.xr.isPresenting) player.position.y = 0;

  renderer.render(scene, camera);
});
