// /js/main.js — Scarlett Poker VR Boot v11.1 (No BufferGeometryUtils import)
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";
import { PokerSim } from "./poker.js";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

import { PokerSim } from "./poker.js";

const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  try {
    if (logEl) {
      logEl.textContent += "\n" + String(m);
      logEl.scrollTop = logEl.scrollHeight;
    }
  } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + !!navigator.xr);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// Camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(7, 12, 6);
scene.add(dir);

// Controllers
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0xb200ff, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.add(makeLaser());
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.add(controllerModelFactory.createControllerModel(g));
  player.add(g);
  grips.push(g);
}

function updateControllerVisibility() {
  const on = !!renderer.xr?.isPresenting;
  for (const c of controllers) c.visible = on;
  for (const g of grips) g.visible = on;
}
renderer.xr.addEventListener?.("sessionstart", updateControllerVisibility);
renderer.xr.addEventListener?.("sessionend", updateControllerVisibility);
updateControllerVisibility();

// World
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);

log("[main] world loaded ✅");

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}

// Controls / Teleport / Hands / Dealing
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });
const hands = HandsSystem.init({ THREE, scene, renderer, log });
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// Poker
const poker = PokerSim.create({ seats: 6, log, toyBetting: true });
poker.startHand();

// Loop
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { poker?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
