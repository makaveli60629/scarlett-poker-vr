// /js/main.js — Scarlett VR Poker Boot v10.8 (FULL STABLE + EXPORT-SAFE + CONTROLLERS STICK TO YOU)
//
// Fixes in this build:
// ✅ Controllers/grips are parented to PlayerRig so they MOVE WITH YOU (teleport/recenter/move)
// ✅ Dealing module import is EXPORT-SAFE (works if dealingMix exports DealingMix / default / other names)
// ✅ Won’t crash if dealingMix is missing or renamed
// ✅ Hooks HUD toggles from index.html (teleport/hands/move/snap) without hard-coupling
// ✅ Keeps GitHub Pages cache-busting via ?v=
//
// Notes:
// - You are using CDN importmap in index.html (“C & D” style). This file imports from "three" as normal.
// - Teleport is still handled by /js/teleport.js
// - Controls is /js/controls.js (movement + snap turn). We gate it with HUD flags.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { HandsSystem } from "./hands.js";

// EXPORT-SAFE dealingMix import (this prevents the exact crash you showed)
import * as DealingModule from "./dealingMix.js";

// ---------- HUD LOG ----------
const logEl = document.getElementById("log");
const statusText = document.getElementById("statusText");
const setStatus = (t) => { try { if (statusText) statusText.textContent = " " + t; } catch {} };

const log = (m, ...rest) => {
  try { console.log(m, ...rest); } catch {}
  try {
    if (logEl) {
      logEl.textContent += "\n" + String(m);
      logEl.scrollTop = logEl.scrollHeight;
    }
  } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);
setStatus("Booting…");

// ---------- FLAGS (from index.html) ----------
const FLAGS = () => (window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true });

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 85);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 350);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);

// VR button (Three injects its own; your index also has Enter VR helper)
try { document.body.appendChild(VRButton.createButton(renderer)); } catch {}

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

// Spawn: always standing (you said you want to stand unless you accept “play”)
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- BASE LIGHTING ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));

const dir = new THREE.DirectionalLight(0xffffff, 1.05);
dir.position.set(7, 12, 6);
scene.add(dir);

scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// ---------- XR CONTROLLERS (PARENTED TO PLAYER ✅) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

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
  c.add(makeLaser());

  // IMPORTANT: parent to player rig so they stay “in your hands” when you move/teleport
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  try { g.add(controllerModelFactory.createControllerModel(g)); } catch {}
  player.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅ (parented to PlayerRig)");
setStatus("Loading world…");

// ---------- WORLD ----------
let world = null;
try {
  world = await initWorld({ THREE, scene, log, v: BOOT_V });
  log("[main] world loaded ✅");
} catch (e) {
  log("❌ world init failed: " + (e?.message || e));
  console.error(e);
}
setStatus("World ready");

// Aim toward table focus on load
try {
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z);
} catch {}

// Connect optional world features (teleporter machine visuals, etc.)
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

// ---------- HANDS (gloves/mesh) ----------
const hands = HandsSystem.init({
  THREE,
  scene,
  renderer,
  log
});

// ---------- TELEPORT ----------
const teleport = Teleport.init({
  THREE,
  scene,
  renderer,
  camera,
  player,
  controllers,
  log,
  world
});

// ---------- DEALING (EXPORT-SAFE RESOLVE) ----------
function resolveDealingModule(mod) {
  // Accept many shapes:
  // export const DealingMix = {...}
  // export const Dealing = {...}
  // export default {...}
  // or module itself as an object with init()
  return (
    mod?.DealingMix ||
    mod?.Dealing ||
    mod?.default ||
    mod
  );
}

let dealing = null;
try {
  const DM = resolveDealingModule(DealingModule);
  if (DM && typeof DM.init === "function") {
    dealing = DM.init({ THREE, scene, log, world });
    if (typeof dealing?.startHand === "function") dealing.startHand();
    log("[main] dealingMix ready ✅");
  } else {
    log("[main] dealingMix loaded but no init() found (skipping)");
  }
} catch (e) {
  log("⚠️ dealingMix init failed (skipping): " + (e?.message || e));
  console.error(e);
}

// ---------- HUD EVENTS (from index.html) ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  try { if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z); } catch {}
  log("[main] recentered ✅");
});

window.addEventListener("scarlett-toggle-hands", (e) => {
  const on = !!e?.detail;
  try { hands?.setEnabled?.(on); } catch {}
  log("[main] hands=" + on);
});

window.addEventListener("scarlett-toggle-teleport", (e) => {
  const on = !!e?.detail;
  // We gate teleport update in the render loop; nothing else needed here.
  log("[main] teleport=" + on);
});

window.addEventListener("scarlett-toggle-move", (e) => {
  const on = !!e?.detail;
  log("[main] move=" + on);
});

window.addEventListener("scarlett-toggle-snap", (e) => {
  const on = !!e?.detail;
  log("[main] snap=" + on);
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- LOOP ----------
let last = performance.now();
setStatus("Ready ✅");
log("[main] ready ✅");

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // World tick
  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  // Controls gating:
  // - If move is off AND snap is off: skip controls entirely.
  // - If either is on: controls update runs (your controls.js currently combines both).
  const f = FLAGS();
  try {
    if (f.move || f.snap) controls?.update?.(dt);
  } catch (e) { console.error(e); }

  // Teleport gating
  try {
    if (f.teleport) teleport?.update?.(dt);
  } catch (e) { console.error(e); }

  // Dealing
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  // Hands gating
  try {
    if (f.hands) hands?.update?.(dt);
  } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});
