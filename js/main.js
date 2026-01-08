// /js/main.js — Scarlett VR Poker MAIN v11.1 (CONTROLLERS FIXED + SINGLE GAME)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

const BUILD = window.__BUILD_V || Date.now().toString();
const log = (...a) => console.log(...a);

// ---------------- SCENE ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 85);

// ---------------- CAMERA ----------------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------------- RENDERER ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------------- PLAYER RIG ----------------
// IMPORTANT: Controllers/grips MUST be children of this rig,
// so they move/teleport with you (fixes "controller stuck in front of face").
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);

player.add(camera);
camera.position.set(0, 1.65, 0);

// Spawn (on teleport circle)
player.position.set(0, 0, 3.6);
player.rotation.set(0, 0, 0);

// ---------------- BASE LIGHTS ----------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(10, 14, 8);
scene.add(dir);

// ---------------- XR CONTROLLERS (PARENTED TO PLAYER) ----------------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  line.name = "Laser";
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());
  // ✅ parent to player rig
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  // ✅ parent to player rig
  player.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------------- WORLD ----------------
const world = await initWorld({ THREE, scene, log, v: BUILD });
try { world?.connect?.({ camera, player, renderer, controllers, grips }); } catch {}

// Look at table on load (flat)
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.1, world.tableFocus.z);

log("[main] world ready ✅");

// ---------------- SYSTEMS ----------------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, world, log });
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, world, log });
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// DealingMix = the ONLY poker dealing now (no duplicates)
const dealing = DealingMix.init({ THREE, scene, world, log });
dealing.startHand?.();

// HUD toggles from index.html (optional)
window.addEventListener("scarlett-toggle-teleport", (e) => { teleport?.setEnabled?.(!!e.detail); });
window.addEventListener("scarlett-toggle-hands", (e) => { hands?.setEnabled?.(!!e.detail); });
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.1, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------------- RESIZE ----------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- LOOP ----------------
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

log("[main] ready ✅ v=" + BUILD);
