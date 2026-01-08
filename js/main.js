// /js/main.js — Scarlett Poker VR Boot v11.0 (FULL CONSOLIDATED)
// - Fixes "controller stuck in front" by auto-hiding controller models/lasers when hand-tracking is present
// - Spawns exactly on world.spawnPads[0] (teleport circle)
// - Hooks HUD toggles from index.html (teleport/move/snap/hands)
// - Passes rig/camera to Bots for billboarding

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  if (logEl) {
    logEl.textContent += "\n" + String(m);
    logEl.scrollTop = logEl.scrollHeight;
  }
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 110);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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

// Default spawn (world will override)
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- GLOBAL LIGHTING BASELINE ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.05));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(7, 12, 6);
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.10));

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];
const controllerVisuals = []; // { controller, grip, laser, modelRoot }

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  const laser = makeLaser();
  c.add(laser);
  scene.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  const modelRoot = controllerModelFactory.createControllerModel(g);
  g.add(modelRoot);
  scene.add(g);
  grips.push(g);

  controllerVisuals.push({ controller: c, grip: g, laser, modelRoot });
}

log("[main] controllers ready ✅");

// Hide/show controller visuals depending on hand-tracking presence
function hasHandTracking(session) {
  try {
    const src = session?.inputSources || [];
    return src.some(s => s && s.hand);
  } catch { return false; }
}
function setControllerVisualsVisible(visible) {
  for (const v of controllerVisuals) {
    v.controller.visible = !!visible;
    v.grip.visible = !!visible;
  }
}

// Session events
renderer.xr.addEventListener("sessionstart", () => {
  const s = renderer.xr.getSession?.();
  const hands = hasHandTracking(s);
  // If hands exist, hide controller models/lasers (they can appear stuck in front)
  setControllerVisualsVisible(!hands);
  log("[main] sessionstart hands=" + hands + " controllersVisible=" + (!hands));
});
renderer.xr.addEventListener("sessionend", () => {
  setControllerVisualsVisible(true);
  log("[main] sessionend");
});

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

// Spawn EXACTLY on world spawn pad (teleport circle)
if (world?.spawnPads?.[0]) {
  player.position.set(world.spawnPads[0].x, 0, world.spawnPads[0].z);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);

log("[main] world loaded ✅");

// Connect optional world features (teleport machine module etc.)
try { world?.connect?.({ playerRig: player, controllers }); } catch {}

// ---------- CONTROLS ----------
const controls = Controls.init({
  THREE,
  renderer,
  camera,
  player,
  controllers,
  grips,
  log,
  world
});

// ---------- HANDS (visible gloves) ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING (ONE TRUE GAME) ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- HUD TOGGLES (from index.html) ----------
window.__SCARLETT_FLAGS = window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true };

window.addEventListener("scarlett-toggle-teleport", (e) => {
  window.__SCARLETT_FLAGS.teleport = !!e.detail;
  log("[main] teleport=" + window.__SCARLETT_FLAGS.teleport);
});
window.addEventListener("scarlett-toggle-move", (e) => {
  window.__SCARLETT_FLAGS.move = !!e.detail;
  log("[main] move=" + window.__SCARLETT_FLAGS.move);
});
window.addEventListener("scarlett-toggle-snap", (e) => {
  window.__SCARLETT_FLAGS.snap = !!e.detail;
  log("[main] snap=" + window.__SCARLETT_FLAGS.snap);
});
window.addEventListener("scarlett-toggle-hands", (e) => {
  window.__SCARLETT_FLAGS.hands = !!e.detail;
  try { hands?.setEnabled?.(window.__SCARLETT_FLAGS.hands); } catch {}
  log("[main] hands=" + window.__SCARLETT_FLAGS.hands);
});

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  if (world?.spawnPads?.[0]) player.position.set(world.spawnPads[0].x, 0, world.spawnPads[0].z);
  else player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// If Bots exists, give them a player reference for billboards
try { world?.bots?.setPlayerRig?.(player, camera); } catch {}

// ---------- LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Apply HUD flags
  const flags = window.__SCARLETT_FLAGS || {};
  const canMove = flags.move !== false;
  const canTeleport = flags.teleport !== false;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  try { if (canMove) controls?.update?.(dt); } catch (e) { console.error(e); }
  try { if (canTeleport) teleport?.update?.(dt); } catch (e) { console.error(e); }

  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅ v11.0");
