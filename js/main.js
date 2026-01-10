// /js/main.js — Scarlett VR Poker — MAIN v10.5 (FULL)
// Fixes: movement, spawn pads, player height, controller visibility (when available),
// Android touch dock movement, and robust XR session handling.

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

// Player rig (IMPORTANT: we do NOT add extra Y offsets in XR local-floor mode)
const player = new THREE.Group();
player.name = "PLAYER_RIG";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// VR Button
const btn = VRButton.createButton(renderer);
btn.style.zIndex = "9999";
document.body.appendChild(btn);
log("[main] VRButton appended ✅");

// Basic ambient (real lights come from world)
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// Controllers (only show in VR sessions where inputSources exist)
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
  if (renderer.xr.isPresenting) return; // avoid “Can't change size while presenting”
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== World Init =====
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

  // ===== Controls Init =====
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
})().catch((e) => {
  console.error(e);
  log("❌ [main] boot failed:", e?.message || e);
});

// XR session start/end hooks (for height + recenter)
renderer.xr.addEventListener("sessionstart", async () => {
  log("[main] XR session start ✅");

  // When in XR local-floor, the headset provides height already.
  // Ensure player rig stays on floor (y=0) so you are not “giant”.
  player.position.y = 0;

  // Try to set reference space to local-floor if possible
  try {
    const session = renderer.xr.getSession();
    if (session?.requestReferenceSpace) {
      await session.requestReferenceSpace("local-floor");
    }
  } catch {}

  // Recenter onto lobby spawn by default (or table seat if room says so)
  try {
    Controls.teleportToSpawn("lobby_spawn");
  } catch {}
});

renderer.xr.addEventListener("sessionend", () => {
  log("[main] XR session end ✅");
});

// UI bridge
window.addEventListener("scarlett-recenter", () => {
  log("[main] recenter requested");
  Controls.teleportToSpawn("lobby_spawn");
});
window.addEventListener("scarlett-enter-vr", async () => {
  log("[main] enter vr requested");
  // VRButton handles; this is here for your HUD button.
});
