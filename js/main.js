// /js/main.js — Scarlett Poker VR Boot v11.0 (FULL STABLE, FIXED XR RIG)
// Uses your importmap (three + addons from CDN)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

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
scene.fog = new THREE.Fog(0x05060a, 4, 90);

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

// ---------- PLAYER RIG (authoritative) ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- GLOBAL LIGHT BASELINE ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// ---------- XR CONTROLLERS (PARENTED TO PLAYER) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  line.name = "Laser";
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());
  // KEY FIX: parent under player so it stays with you
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  player.add(g);
  grips.push(g);
}
log("[main] controllers ready ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });
world.cameraRef = camera;

// Face table on load
if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z);
}
log("[main] world loaded ✅");

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

// Force your requested snap angle (45)
try {
  if (controls?.setSnapDeg) controls.setSnapDeg(45);
} catch {}

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING (ONE GAME ONLY, CENTERED ON TABLE) ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing?.setCameraRef?.(camera);

// ---------- HUD TOGGLES (from index.html) ----------
function getFlags() {
  return window.__SCARLETT_FLAGS || { teleport:true, move:true, snap:true, hands:true };
}

window.addEventListener("scarlett-toggle-teleport", (e) => {
  const on = !!e.detail;
  teleport?.setEnabled?.(on);
  log("[main] teleport=" + on);
});

window.addEventListener("scarlett-toggle-move", (e) => {
  const on = !!e.detail;
  controls?.setMoveEnabled?.(on);
  log("[main] move=" + on);
});

window.addEventListener("scarlett-toggle-snap", (e) => {
  const on = !!e.detail;
  controls?.setSnapEnabled?.(on);
  log("[main] snap=" + on);
});

window.addEventListener("scarlett-toggle-hands", (e) => {
  const on = !!e.detail;
  hands?.setEnabled?.(on);
  log("[main] hands=" + on);
});

// Apply initial flags
{
  const f = getFlags();
  teleport?.setEnabled?.(!!f.teleport);
  controls?.setMoveEnabled?.(!!f.move);
  controls?.setSnapEnabled?.(!!f.snap);
  hands?.setEnabled?.(!!f.hands);
}

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  const spawn = world?.spawnPos || new THREE.Vector3(0, 0, 3.6);
  player.position.set(spawn.x, spawn.y, spawn.z);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z);
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
