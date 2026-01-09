// /js/main.js — Scarlett Poker VR Boot v11.2 (FULL MASTER)
// Goals (your requests):
// ✅ Stable full boot + VRButton + HUD log
// ✅ Left stick = move + strafe (handled in controls.js v2.0)
// ✅ Right stick = snap (controls.js)
// ✅ Y button = left wrist menu (controls.js + hands.js)
// ✅ Hands + watch (hands.js receives XR frame)
// ✅ Teleport + recenter (teleport.js + HUD events)
// ✅ Controllers hidden when hands are active (auto)
// ✅ World tick + bots seated + dealing real hands (world.js + bots.js + dealingMix.js)
//
// NOTE: This file assumes you have these modules:
//   ./world.js, ./controls.js, ./teleport.js, ./dealingMix.js, ./hands.js
// If any are missing or named differently, update the import lines.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

// -------------------- HUD LOG --------------------
const logEl = document.getElementById("log");
const statusText = document.getElementById("statusText");

const log = (m, ...rest) => {
  try { console.log(m, ...rest); } catch {}
  if (logEl) {
    logEl.textContent += "\n" + String(m);
    logEl.scrollTop = logEl.scrollHeight;
  }
};
const setStatus = (t) => { if (statusText) statusText.textContent = " " + t; };

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// -------------------- BASIC SAFETY --------------------
window.addEventListener("unhandledrejection", (e) => {
  console.error(e);
  log("❌ unhandledrejection: " + (e?.reason?.message || e?.reason || e));
});
window.addEventListener("error", (e) => {
  log("❌ window.error: " + (e?.message || e));
});

// -------------------- RENDERER / SCENE --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 7, 140);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 350);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

// Quest friendly, stable reference space
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// -------------------- PLAYER RIG --------------------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// default spawn (world may override)
player.position.set(0, 0, 3.6);
player.rotation.set(0, 0, 0);
camera.position.set(0, 1.65, 0);

// -------------------- LIGHTING (GLOBAL) --------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(8, 12, 6);
scene.add(sun);

// Accent lights (you like aqua/pink vibe)
const pink = new THREE.PointLight(0xff2d7a, 0.65, 22);
pink.position.set(0, 3.0, -5.5);
scene.add(pink);

const aqua = new THREE.PointLight(0x7fe7ff, 0.55, 22);
aqua.position.set(0, 3.0, -7.5);
scene.add(aqua);

// -------------------- XR CONTROLLERS (OPTIONAL) --------------------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0xb200ff, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

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

log("[main] controllers ready ✅");

// -------------------- FEATURE FLAGS / HUD EVENTS --------------------
const FLAGS = window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true };

window.addEventListener("scarlett-toggle-teleport", (e) => {
  FLAGS.teleport = !!e.detail;
  log("[main] teleport=" + FLAGS.teleport);
});
window.addEventListener("scarlett-toggle-move", (e) => {
  FLAGS.move = !!e.detail;
  log("[main] move=" + FLAGS.move);
});
window.addEventListener("scarlett-toggle-snap", (e) => {
  FLAGS.snap = !!e.detail;
  log("[main] snap=" + FLAGS.snap);
});
window.addEventListener("scarlett-toggle-hands", (e) => {
  FLAGS.hands = !!e.detail;
  log("[main] hands=" + FLAGS.hands);
});

// -------------------- WORLD INIT --------------------
setStatus("Loading world…");
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

// spawn exactly where world wants
if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);
}

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}
log("[main] world loaded ✅");

// -------------------- SYSTEMS --------------------
setStatus("Init systems…");

// Controls (strafe + snap + Y menu)
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });

// Hands (watch + wrist menu). We pass XR frame each tick.
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// Teleport (respects FLAGS.teleport inside teleport.js if you implemented it that way)
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// Dealing / HUD (real deck + winner)
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// -------------------- CONTROLLER VISIBILITY LOGIC --------------------
// You want: Hands visible when hand tracking is present.
// Controllers should disappear automatically when hands are active (and reappear if no hands).
let handsActive = false;

function setControllerVisible(on) {
  for (const c of controllers) c.visible = on;
  for (const g of grips) g.visible = on;
}

// default: only show in XR
function updateControllerVisibility() {
  const inXR = !!renderer.xr?.isPresenting;
  if (!inXR) { setControllerVisible(false); return; }

  // If hands are active and hands flag is on => hide controllers.
  const showControllers = !(handsActive && (FLAGS.hands ?? true));
  setControllerVisible(showControllers);
}

renderer.xr.addEventListener?.("sessionstart", () => {
  log("[main] XR session start ✅");
  updateControllerVisibility();
});
renderer.xr.addEventListener?.("sessionend", () => {
  log("[main] XR session end ✅");
  handsActive = false;
  updateControllerVisibility();
});

// -------------------- RECENTER --------------------
window.addEventListener("scarlett-recenter", () => {
  if (world?.spawn) player.position.set(world.spawn.x, 0, world.spawn.z);
  else player.position.set(0, 0, 3.6);

  player.rotation.set(0, world?.spawnYaw || 0, 0);

  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);
  log("[main] recentered ✅");
});

// -------------------- RESIZE --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------- EXTRA FEATURES (SAFE, WORKING) --------------------
// 1) Soft “anti-stuck” nudge: if you spawn inside table/rail, push you outward gently.
//    (Does NOT require colliders.)
function antiStuck(dt) {
  const tf = world?.tableFocus;
  if (!tf) return;

  const p = player.position;
  const dx = p.x - tf.x;
  const dz = p.z - tf.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  // if inside rail radius, push out
  const railR = 3.2; // slightly inside your torus ~3.85, safe
  if (dist < railR) {
    const nx = (dx / (dist || 1));
    const nz = (dz / (dist || 1));
    const push = (railR - dist) * 0.8 * dt;
    p.x += nx * push;
    p.z += nz * push;
  }
}

// 2) Simple XR heartbeat log once (helps debugging on Quest/Android)
let didXRInfo = false;
function logXRInfo(session) {
  if (didXRInfo || !session) return;
  didXRInfo = true;
  log("[xr] mode=" + session.environmentBlendMode);
  log("[xr] visibility=" + session.visibilityState);
  log("[xr] inputsources=" + (session.inputSources?.length ?? 0));
}

// -------------------- MAIN LOOP --------------------
setStatus("Ready ✅");
log("[main] ready ✅");

let last = performance.now();

renderer.setAnimationLoop((t, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // XR info + detect hand tracking
  const session = renderer.xr.getSession?.();
  if (session) logXRInfo(session);

  // Detect if any hand-tracking input exists this frame
  if (frame && session) {
    handsActive = false;
    for (const src of session.inputSources) {
      if (src?.hand) { handsActive = true; break; }
    }
    updateControllerVisibility();
  }

  // Run world + systems
  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  // Hands need XR frame + refSpace (for wrist pose)
  try {
    if (frame && renderer.xr.isPresenting) {
      const refSpace = renderer.xr.getReferenceSpace();
      hands?.update?.(frame, refSpace);
    }
  } catch (e) { console.error(e); }

  // Anti-stuck
  try { antiStuck(dt); } catch {}

  renderer.render(scene, camera);
});
