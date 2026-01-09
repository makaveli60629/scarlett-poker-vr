// /js/main.js — Scarlett VR Poker Boot v11.2 (STABLE + Controller-on-Rig Fix)
// Works with your permanent index.html importmap (CDN).
// Key fixes:
// - Controllers + grips parented to PlayerRig so they follow locomotion/teleport.
// - Purple glow lasers.
// - Safe fallbacks for world.tableFocus to prevent undefined.x errors.
// - Listens to __SCARLETT_FLAGS and HUD toggle events.
// - DealingMix loaded safely (won't crash if missing).

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { HandsSystem } from "./hands.js";

// ------------------------------------------------------------
// LOG (index.html expects #log)
// ------------------------------------------------------------
const logEl = document.getElementById("log");
function LOG(...a) {
  try { console.log(...a); } catch {}
  try {
    if (logEl) {
      logEl.textContent += "\n" + a.map(x => String(x)).join(" ");
      logEl.scrollTop = logEl.scrollHeight;
    }
  } catch {}
}
window.addEventListener("unhandledrejection", (e) => {
  LOG("❌ unhandledrejection:", e?.reason?.message || e?.reason || e);
});
window.addEventListener("error", (e) => {
  LOG("❌ error:", e?.message || e);
});

const BOOT_V = window.__BUILD_V || Date.now().toString();
LOG("BOOT v=" + BOOT_V);

// ------------------------------------------------------------
// SCENE
// ------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 90);

// ------------------------------------------------------------
// CAMERA + PLAYER RIG
// ------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 350);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn (world will align this too)
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ------------------------------------------------------------
// RENDERER
// ------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ------------------------------------------------------------
// LIGHTING (baseline; world adds more)
// ------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// ------------------------------------------------------------
// FLAGS FROM INDEX HUD
// ------------------------------------------------------------
const Flags = (window.__SCARLETT_FLAGS = window.__SCARLETT_FLAGS || {
  teleport: true,
  move: true,
  snap: true,
  hands: true
});

// toggle events from index.html
window.addEventListener("scarlett-toggle-teleport", (e) => { Flags.teleport = !!e.detail; LOG("[hud] teleport=" + Flags.teleport); });
window.addEventListener("scarlett-toggle-move", (e) => { Flags.move = !!e.detail; LOG("[hud] move=" + Flags.move); });
window.addEventListener("scarlett-toggle-snap", (e) => { Flags.snap = !!e.detail; LOG("[hud] snap=" + Flags.snap); });
window.addEventListener("scarlett-toggle-hands", (e) => { Flags.hands = !!e.detail; LOG("[hud] hands=" + Flags.hands); });

// ------------------------------------------------------------
// XR CONTROLLERS (IMPORTANT: parent to PlayerRig so they follow movement)
// ------------------------------------------------------------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

// purple glow laser
function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  line.name = "LaserLine";

  // little glowing tip
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.010, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.95 })
  );
  tip.position.z = -1.0;
  tip.name = "LaserTip";
  line.add(tip);

  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());

  // ✅ Parent to player rig (fixes “controllers floating in front of me”)
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));

  // ✅ Parent to player rig also
  player.add(g);
  grips.push(g);
}

LOG("[main] controllers ready ✅");

// ------------------------------------------------------------
// WORLD
// ------------------------------------------------------------
let world = null;
try {
  world = await initWorld({ THREE, scene, log: LOG, v: BOOT_V });
  LOG("[world] ready ✅");
} catch (e) {
  LOG("❌ world init failed:", e?.message || e);
  world = null;
}

// safe tableFocus fallback
const tableFocus = world?.tableFocus && Number.isFinite(world.tableFocus.x)
  ? world.tableFocus
  : new THREE.Vector3(0, 0, -6.5);

// point camera at table by default (non-VR)
try { camera.lookAt(tableFocus.x, 1.0, tableFocus.z); } catch {}

LOG("[main] world loaded ✅");

// Connect world features
try {
  world?.connect?.({ playerRig: player, camera, controllers, grips });
} catch (e) {
  LOG("[main] world.connect failed:", e?.message || e);
}

// ------------------------------------------------------------
// CONTROLS
// ------------------------------------------------------------
const controls = Controls.init({
  THREE,
  renderer,
  camera,
  player,
  controllers,
  grips,
  log: LOG,
  world
});

// Optional: HUD touch movement (Android) — if your controls.js supports it
let touchVec = { f: 0, b: 0, l: 0, r: 0, turnL: 0, turnR: 0 };
window.addEventListener("scarlett-touch", (e) => {
  if (!e?.detail) return;
  touchVec = { ...touchVec, ...e.detail };
});

// ------------------------------------------------------------
// HANDS
// ------------------------------------------------------------
const hands = HandsSystem.init({
  THREE,
  scene,
  renderer,
  log: LOG
});

// ------------------------------------------------------------
// TELEPORT
// ------------------------------------------------------------
const teleport = Teleport.init({
  THREE,
  scene,
  renderer,
  camera,
  player,
  controllers,
  log: LOG,
  world
});

// ------------------------------------------------------------
// DEALING MIX (SAFE LOAD)
// ------------------------------------------------------------
let dealing = null;
async function loadDealingMix() {
  const tryPaths = [
    "./dealingMix.js",
    "./DealingMix.js",
    "./dealerMix.js",
    "./DealerMix.js"
  ];

  for (const p of tryPaths) {
    try {
      const mod = await import(`${p}?v=${encodeURIComponent(BOOT_V)}`);
      if (mod?.DealingMix?.init) return mod.DealingMix;
    } catch {}
  }
  return null;
}

try {
  const DealingMix = await loadDealingMix();
  if (DealingMix) {
    dealing = DealingMix.init({
      THREE,
      scene,
      log: LOG,
      world
    });
    dealing.startHand?.();
    LOG("[DealingMix] init ✅");
  } else {
    LOG("[DealingMix] missing ⚠️ (no module found)");
  }
} catch (e) {
  LOG("[DealingMix] init failed ⚠️", e?.message || e);
  dealing = null;
}

// ------------------------------------------------------------
// RECENTER (from HUD)
// ------------------------------------------------------------
window.addEventListener("scarlett-recenter", () => {
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 3.6);
  player.position.set(spawn.x, 0, spawn.z);
  player.rotation.set(0, 0, 0);
  try { camera.lookAt(tableFocus.x, 1.0, tableFocus.z); } catch {}
  LOG("[main] recentered ✅");
});

// ------------------------------------------------------------
// RESIZE
// ------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------
// SMALL HELPERS
// ------------------------------------------------------------
function clampPosToRoom() {
  const c = world?.roomClamp;
  if (!c) return;
  player.position.x = clamp(player.position.x, c.minX, c.maxX);
  player.position.z = clamp(player.position.z, c.minZ, c.maxZ);
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ------------------------------------------------------------
// LOOP
// ------------------------------------------------------------
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // respect HUD flags
  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  try {
    // If controls.js supports internal flags, let it read window.__SCARLETT_FLAGS
    if (Flags.move || Flags.snap) controls?.update?.(dt);
  } catch (e) { console.error(e); }

  try {
    if (Flags.teleport) teleport?.update?.(dt);
  } catch (e) { console.error(e); }

  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  try {
    hands?.setEnabled?.(!!Flags.hands);
    if (Flags.hands) hands?.update?.(dt);
  } catch (e) { console.error(e); }

  // keep inside room bounds (simple safety)
  try { clampPosToRoom(); } catch {}

  // laser pulse
  try {
    const t = now * 0.001;
    for (const c of controllers) {
      const line = c.getObjectByName("LaserLine");
      if (line?.material) line.material.opacity = 0.70 + Math.sin(t * 4.0) * 0.18;
      const tip = c.getObjectByName("LaserTip");
      if (tip?.material) tip.material.opacity = 0.75 + Math.sin(t * 6.0) * 0.22;
    }
  } catch {}

  renderer.render(scene, camera);
});

LOG("[main] ready ✅");
