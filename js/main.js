// /js/main.js — Scarlett VR Poker MAIN v11.0 (STABLE BASELINE)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

const log = (...a) => console.log(...a);
const BUILD = window.__BUILD_V || Date.now().toString();

/* ------------------------------------------------------------------ */
/* SCENE / CAMERA / RENDERER                                          */
/* ------------------------------------------------------------------ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ------------------------------------------------------------------ */
/* PLAYER RIG (XR correct)                                             */
/* ------------------------------------------------------------------ */
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn on teleport pad
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

/* ------------------------------------------------------------------ */
/* XR CONTROLLERS (FIXED ATTACHMENT)                                   */
/* ------------------------------------------------------------------ */
const controllerFactory = new XRControllerModelFactory();
const controllers = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.add(makeLaser());
  scene.add(c);
  controllers.push(c);

  const grip = renderer.xr.getControllerGrip(i);
  grip.add(controllerFactory.createControllerModel(grip));
  scene.add(grip);
}

/* ------------------------------------------------------------------ */
/* WORLD                                                              */
/* ------------------------------------------------------------------ */
const world = await initWorld({ THREE, scene, log, v: BUILD });
world.connect({ camera });

/* ------------------------------------------------------------------ */
/* SYSTEMS                                                            */
/* ------------------------------------------------------------------ */
const controls = Controls.init({ THREE, renderer, camera, player, controllers, world, log });
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, world, log });
const hands = HandsSystem.init({ THREE, scene, renderer, log });

const dealing = DealingMix.init({
  THREE,
  scene,
  world,
  log
});
dealing.startHand();

/* ------------------------------------------------------------------ */
/* LOOP                                                               */
/* ------------------------------------------------------------------ */
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  world.tick(dt);
  controls.update(dt);
  teleport.update(dt);
  hands.update(dt);
  dealing.update(dt);

  renderer.render(scene, camera);
});
