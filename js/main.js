// /js/main.js — Scarlett Poker VR Boot v10.8 (FULL CONSOLIDATED)
// Fixes:
// - controllers/grips parented to player rig (no floating in front)
// - DealingMix anchored to table (no behind-table game)
// - right-stick movement + 45° snap turn (left stick)
// - hooks bots + dealing + hands toggles safely

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
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 90);

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

// spawn
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (baseline) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(7, 12, 6);
scene.add(dir);

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
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

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));

  // ✅ IMPORTANT: parent to player so they move with rig (fixes “floating in front”)
  player.add(c);
  player.add(g);

  controllers.push(c);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

// give world refs so other modules can face player properly
world.playerRef = player;
world.cameraRef = camera;

if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);

log("[main] world loaded ✅");

// optional world connect
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

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- TOGGLES FROM HUD ----------
window.addEventListener("scarlett-toggle-teleport", (e) => {
  const on = !!e?.detail;
  if (teleport?.setEnabled) teleport.setEnabled(on);
});
window.addEventListener("scarlett-toggle-hands", (e) => {
  const on = !!e?.detail;
  hands?.setEnabled?.(on);
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
