// /js/main.js — Scarlett Poker VR Boot v10.5 (Hands + World HUD + Billboards)
import { Hands } from "./hands.js";
// ...
const hands = Hands.init({ THREE, renderer, xrPivot, controllers, log });
// ...
try { hands?.update?.(dt); } catch {}
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { Hands } from "./hands.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m) => {
  console.log(m);
  if (logEl) logEl.textContent += "\n" + m;
};

log("[main] booting…");

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 1, 55);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

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
scene.add(player);

// pivot for XR nodes (so moving player moves controllers/hands)
const xrPivot = new THREE.Group();
xrPivot.name = "XRPivot";
player.add(xrPivot);

player.add(camera);

// spawn
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- GLOBAL LIGHT SAFETY ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(7, 12, 6);
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
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
  xrPivot.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  xrPivot.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- XR HANDS (VISIBLE GLOVES / HANDS) ----------
const hands = Hands.init({
  THREE,
  renderer,
  xrPivot,
  controllers,
  log
});
log("[main] hands init ✅");

// ---------- WORLD ----------
const buildV = window.__BUILD_V || Date.now().toString();
const world = await initWorld({ THREE, scene, log, v: buildV });

if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);

log("[main] world loaded ✅");

// connect world to player/controllers so world can billboard cards/screens to you
try { world?.connect?.({ playerRig: player, controllers, camera }); } catch {}

// ---------- CONTROLS ----------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, log, world });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- MENU TOGGLE (world panels) ----------
window.addEventListener("keydown", (e) => {
  if (e.key?.toLowerCase() === "m") {
    world?.togglePanels?.();
    log("[main] toggle panels (M)");
  }
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
