// /js/main.js — Scarlett Poker VR Boot v10.7 (FULL WIRED)
// CDN import-map compatible (three + addons).
// Wires HUD toggles to Controls / Teleport / Hands systems.

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
  if (logEl) logEl.textContent += "\n" + String(m);
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 90);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);

// VR button (Three)
const vrBtn = VRButton.createButton(renderer);
document.body.appendChild(vrBtn);

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Spawn
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// ---------- XR CONTROLLERS ----------
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

if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}

log("[main] world loaded ✅");

// Connect optional world features (teleporter machine, etc.)
try { world?.connect?.({ playerRig: player, controllers }); } catch {}

// ---------- SYSTEMS ----------
const controls = Controls.init({ THREE, renderer, camera, player, log, world });
const hands = HandsSystem.init({ THREE, scene, renderer, log });
const teleport = Teleport.init({ THREE, scene, renderer, player, controllers, log, world });

const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- APPLY INITIAL HUD FLAGS ----------
function applyFlags() {
  const f = window.__SCARLETT_FLAGS || {};
  try { controls?.setMoveEnabled?.(!!f.move); } catch {}
  try { controls?.setSnapEnabled?.(!!f.snap); } catch {}
  try { teleport?.setEnabled?.(!!f.teleport); } catch {}
  try { hands?.setEnabled?.(!!f.hands); } catch {}
}
applyFlags();

// Also react if flags are changed programmatically
window.addEventListener("scarlett-toggle-teleport", (e) => teleport?.setEnabled?.(!!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => hands?.setEnabled?.(!!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => controls?.setMoveEnabled?.(!!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => controls?.setSnapEnabled?.(!!e.detail));

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
