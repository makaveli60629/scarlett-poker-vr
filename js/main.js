// /js/main.js — Scarlett Poker VR Boot v10.7 (FULL STABLE + PERMA FIXES)
// Fixes / upgrades:
// - Controllers + grips parented to PlayerRig (prevents "controller got away from me")
// - Bots get player rig + camera refs for billboarding (tags/cards always face you)
// - Hands import is resilient (won't crash if hands.js export name changes)
// - Rebind on XR session start/end (Quest can change inputSources)
// - dt passed everywhere

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";

// IMPORTANT: we load hands in a safe way (prevents "export mismatch" crash)
async function safeLoadHands() {
  try {
    const mod = await import("./hands.js");
    // Accept either HandsSystem (preferred) or Hands (older)
    return mod.HandsSystem || mod.Hands || null;
  } catch (e) {
    console.warn("[main] hands import failed:", e?.message || e);
    return null;
  }
}

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  if (logEl) logEl.textContent += "\n" + String(m);
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);
log("location.href=" + location.href);
log("navigator.xr=" + !!navigator.xr);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 85);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  300
);

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

// spawn position (X/Z); keep Y at 0 for local-floor
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (global baseline) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(7, 12, 6);
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

// ---------- XR CONTROLLERS (parent to rig) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 12;
  return line;
}

// NOTE: Parent controllers/grips to player rig (NOT scene).
// This stabilizes “where my controller is” across ref-space/session changes.
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  player.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅ (parented to rig)");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}
log("[main] world loaded ✅");

// Connect optional world features (teleporter machine etc.)
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

// ---------- BOTS: give them player rig/camera refs for billboarding ----------
function bindBots() {
  try {
    // world.bots is assigned in world.js after loading bots.js
    if (world?.bots?.setPlayerRig) {
      world.bots.setPlayerRig(player, camera);
      log("[main] bots bound to playerRig ✅");
    }
  } catch (e) {
    console.warn("[main] bots bind failed:", e?.message || e);
  }
}
bindBots();

// ---------- HANDS (safe) ----------
let hands = null;
const HandsModule = await safeLoadHands();
if (HandsModule?.init) {
  try {
    hands = HandsModule.init({ THREE, scene, renderer, log });
    log("[main] hands ready ✅");
  } catch (e) {
    console.warn("[main] hands init failed:", e?.message || e);
  }
} else {
  log("[main] hands skipped (module missing or wrong export)");
}

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

// ---------- DEALING ----------
const dealing = DealingMix.init({
  THREE,
  scene,
  log,
  world
});
dealing.startHand?.();

// ---------- XR SESSION REBIND (Quest can swap inputSources) ----------
renderer.xr.addEventListener("sessionstart", () => {
  log("[main] XR sessionstart ✅");
  // re-bind bots (billboarding ref)
  bindBots();
  // hands module may need to rebind XR hands/grips internally; we just keep update loop running
});

renderer.xr.addEventListener("sessionend", () => {
  log("[main] XR sessionend ✅");
  // desktop mode continues; no special handling required
});

// ---------- ACTION EVENT (sit/join later) ----------
window.addEventListener("scarlett-action", () => {
  try { world?.onAction?.({ player, camera }); } catch {}
});

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- LOOP ----------
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
