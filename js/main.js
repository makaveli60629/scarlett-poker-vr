// /js/main.js — Scarlett VR Poker — MAIN v10.7 (FULL)
// FIX: main owns animation loop + calls Controls.update(dt)
// FIX: renderer.xr reference space type local-floor
// FIX: recenter uses world.spawns (via SpawnPoints)

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

// Player rig — in local-floor we keep rig.y = 0 always
const player = new THREE.Group();
player.name = "PLAYER_RIG";
player.position.set(0, 0, 0);
scene.add(player);
player.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

// IMPORTANT: this is the correct way to prefer local-floor in Three/WebXR
renderer.xr.setReferenceSpaceType("local-floor");

document.body.appendChild(renderer.domElement);

// VR Button
const btn = VRButton.createButton(renderer);
btn.style.zIndex = "9999";
document.body.appendChild(btn);
log("[main] VRButton appended ✅");

// Small ambient (world adds real lighting)
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

// Clock for dt
const clock = new THREE.Clock();

// World ctx
let worldCtx = null;

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

  // Init controls (no animation loop inside controls)
  Controls.init({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: { controller1, controller2 },
    world: worldCtx,
    log,
  });

  log("[main] world init ✅");
  log("[main] ready ✅");

  // Main render loop
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);

    // In XR local-floor, keep rig on floor (prevents “giant/standing on something”)
    if (renderer.xr.isPresenting) player.position.y = 0;

    // Update controls (movement/turn)
    Controls.update?.(dt);

    // Render
    renderer.render(scene, camera);
  });
})().catch((e) => {
  console.error(e);
  log("❌ [main] boot failed:", e?.message || e);
});

// XR session start/end hooks
renderer.xr.addEventListener("sessionstart", () => {
  log("[main] XR session start ✅");

  // Always keep rig on floor
  player.position.y = 0;

  // Recenter to lobby spawn (if available)
  try {
    Controls.teleportToSpawn("lobby_spawn");
  } catch {}
});

renderer.xr.addEventListener("sessionend", () => {
  log("[main] XR session end ✅");
});

// UI bridge buttons
window.addEventListener("scarlett-recenter", () => {
  log("[main] recenter requested");
  Controls.teleportToSpawn("lobby_spawn");
});
window.addEventListener("scarlett-enter-vr", async () => {
  log("[main] enter vr requested");
});
