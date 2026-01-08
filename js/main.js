// /js/main.js — Scarlett Poker VR Boot v10 (FIXED for class-based Controls)
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

// Your modules (keep these file names EXACT)
import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";

const logEl = document.getElementById("log");
const log = (m) => { if (logEl) logEl.textContent += "\n" + m; console.log(m); };

log("[main] loaded ✅");
log("[main] url=" + import.meta.url);

// ---------- THREE CORE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 1, 55);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig (camera lives inside rig)
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Lighting (always visible)
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// Spawn facing table (world will tell us tableFocus)
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- XR CONTROLLERS (FIXED ATTACHMENT) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
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
  scene.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  scene.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- BUILD WORLD (your modular world.js) ----------
const v = (window.__BUILD_V || Date.now().toString());
const world = await initWorld({ THREE, scene, log, v });

// Face table if world exposes focus
if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}
log("[main] world loaded ✅");

// ---------- MOVEMENT + TELEPORT ----------
// Controls MUST be init-style (NOT "new Controls()")
const controls = Controls.init({
  THREE,
  renderer,
  camera,
  player,
  controllers,
  log,
  world
});

// Teleport stays as-is
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

  // IMPORTANT: your class-based Controls creates its own rig by default.
  // We want it to move YOUR existing player rig, so we attach camera back to player
  // and then tell Controls to use your player rig as its rig.
});

// Force Controls to use your existing player rig (no guessing)
controls.rig = player;         // use your rig
controls.scene = scene;        // ensure marker goes to correct scene
controls.camera = camera;      // ensure camera references match

// Provide floor + colliders from world if present
// (These are OPTIONAL; if missing, teleport/movement still runs but without collision/teleport hits)
controls.setFloorMeshes?.(world?.floorMeshes || world?.floors || world?.floor ? [world.floor] : []);
controls.setColliders?.(world?.colliders || world?.worldColliders || []);

// If your world exposes teleport machine, wire it
if (world?.teleportMachine) controls.setTeleportMachine?.(world.teleportMachine);

// Teleport system (your existing teleport.js stays the same)
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

// ---------- DEALING MIX ----------
const dealing = DealingMix.init({
  THREE,
  scene,
  log,
  world
});
dealing.startHand?.();

// Hook hub recenter if you want
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch {}
  try { controls?.update?.(dt); } catch {}
  try { teleport?.update?.(dt); } catch {}
  try { dealing?.update?.(dt); } catch {}

  renderer.render(scene, camera);
});
