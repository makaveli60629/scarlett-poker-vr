// /js/main.js — Scarlett Poker VR MAIN v11.3 (Stand by default + Action-to-Join)

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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 95);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);

player.add(camera);

// Always stand by default
player.position.set(0, 0, 3.6);
player.rotation.set(0, 0, 0);
camera.position.set(0, 1.65, 0);

// Baseline lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(10, 14, 8);
scene.add(dir);

// Controllers + grips parented to player rig
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(geo, mat);
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

// WORLD
const world = await initWorld({ THREE, scene, log, v: BUILD });
scene.userData.cameraRef = camera;

// DEALING (created before connect so world can call it)
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.setIncludePlayer(false);

// Connect refs
try { world?.connect?.({ camera, player, renderer, controllers, grips, dealing }); } catch {}

// Face table
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z);

// Systems
const controls = Controls.init({ THREE, renderer, camera, player, log, world });
const teleport = Teleport.init({ THREE, scene, renderer, player, controllers, log, world });
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ACTION: trigger (select) -> talk to guard / join pad
for (const c of controllers) {
  c.addEventListener("selectstart", () => {
    try { world?.onAction?.(); } catch {}
  });
}

// RECENTER (always standing reset)
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 0); // force standing
  world.playerSeated = false;
  dealing.setIncludePlayer(false);

  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.2, world.tableFocus.z);
  log("[main] recentered ✅ (standing)");
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// LOOP
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
