// /js/main.js — Scarlett Poker VR Boot v11.2 (FULL STABLE + INTERACT + CLAMP)
// Uses CDN import-map from index.html (three + addons).
// Requires: world.js, controls.js, teleport.js, hands.js, bots.js, dealingMix.js

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { HandsSystem } from "./hands.js";
import { Bots } from "./bots.js";
import { DealingMix } from "./dealingMix.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  try { if (logEl) logEl.textContent += "\n" + String(m); } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn position (stand up always)
const SPAWN = new THREE.Vector3(0, 0, 3.6);
player.position.copy(SPAWN);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (baseline) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 18, 10);
scene.add(dir);

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());
  scene.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  scene.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
log("[main] world loaded ✅");

// ---------- CONTROLS ----------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, log, world });

// ---------- HANDS (gloves) ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT (marker + select teleport) ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- BOTS ----------
try {
  Bots.init({
    THREE,
    scene: world.group,
    getSeats: () => world.seats,
    tableFocus: world.tableFocus,
    metrics: world.metrics
  });
  Bots.setPlayerRig(player, camera);
  log("[main] bots loaded ✅");
} catch (e) {
  log("[main] bots failed:", e?.message || e);
}

// ---------- DEALING MIX (real deck) ----------
const dealing = DealingMix.init({ THREE, scene, world, log, camera });
dealing.startHand?.();

// ---------- INTERACTION (pads/doors) ----------
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

function controllerRay(controller) {
  tmpMat.identity().extractRotation(controller.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
  tmpPos.setFromMatrixPosition(controller.matrixWorld);
  raycaster.set(tmpPos, tmpDir);
  raycaster.far = 25;
  return raycaster;
}

function tryInteract() {
  const interactables = world?.interactables || [];
  if (!interactables.length) return false;

  // right hand preferred
  const c = controllers[1] || controllers[0];
  if (!c) return false;

  const rc = controllerRay(c);
  const hits = rc.intersectObjects(interactables, true);
  if (!hits?.length) return false;

  const hit = hits[0].object;
  const action = hit?.userData?.action;
  if (!action) return false;

  if (action.type === "teleport" && action.target) {
    // Stand up always (player rig y stays 0)
    player.position.set(action.target.x, 0, action.target.z);
    log("[interact] teleport -> " + (action.label || "target"));
    return true;
  }

  return false;
}

for (const c of controllers) {
  c.addEventListener("selectstart", () => {
    // First: try interact pads/doors. If none hit, Teleport.js will handle its own teleport.
    tryInteract();
  });
}

// ---------- HUD FEED (optional) ----------
function setStatusText(s) {
  const el = document.getElementById("statusText");
  if (el) el.textContent = " " + s;
}
setStatusText("Ready ✅");

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.copy(SPAWN);
  player.rotation.set(0,0,0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- MAIN LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // World update
  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  // Controls (movement + snap)
  try { controls?.update?.(dt); } catch (e) { console.error(e); }

  // Clamp player inside the room so you can’t walk through walls
  if (world?.roomClamp) {
    const c = world.roomClamp;
    player.position.x = Math.max(c.minX, Math.min(c.maxX, player.position.x));
    player.position.z = Math.max(c.minZ, Math.min(c.maxZ, player.position.z));
  }

  // Bots
  try { Bots.update?.(dt); } catch {}

  // Teleport visuals (marker)
  try { teleport?.update?.(dt); } catch {}

  // Dealing (cards hover + unique deck)
  try { dealing?.update?.(dt); } catch {}

  // Hands
  try { hands?.update?.(dt); } catch {}

  renderer.render(scene, camera);
});

log("[main] ready ✅");
