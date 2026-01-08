// /js/main.js — Scarlett Poker VR Boot (9.2 STABILITY PATCH)
// Fixes: controller rig attach, locomotion fallback, brighter lighting, glove hands.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m) => {
  console.log(m);
  if (logEl) logEl.textContent += "\n" + m;
};

log("[main] booting…");

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 1, 70);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  250
);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try {
  renderer.xr.setReferenceSpaceType("local-floor");
} catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG (IMPORTANT) ----------
// player = locomotion + teleport root
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);

// head = holds camera + controllers so they move with player
const head = new THREE.Group();
head.name = "HeadRig";
player.add(head);

// camera sits on head rig
head.add(camera);

// spawn
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (BRIGHTER) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.35));

const key = new THREE.DirectionalLight(0xffffff, 1.25);
key.position.set(7, 12, 6);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.55);
fill.position.set(-7, 7, -6);
scene.add(fill);

scene.add(new THREE.AmbientLight(0xffffff, 0.22));

// ---------- XR CONTROLLERS ----------
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

// Simple glove hands (texture you already have)
function addGloveHand(targetObj, textureUrl) {
  const tex = new THREE.TextureLoader().load(textureUrl);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0
  });

  // quick glove placeholder (we can replace with real hand mesh later)
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.13), mat);
  hand.name = "GloveHand";
  hand.position.set(0, -0.02, -0.06);
  hand.rotation.set(0, 0, 0);
  targetObj.add(hand);
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.userData.index = i;
  c.add(makeLaser());

  // ✅ THIS IS THE IMPORTANT FIX:
  // parent controllers to HEAD (which is parented to PLAYER)
  head.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.userData.index = i;
  g.add(controllerModelFactory.createControllerModel(g));

  // ✅ also parent grips to HEAD
  head.add(g);
  grips.push(g);
}

// Add glove hands to controllers (uses your existing file)
addGloveHand(controllers[0], "./assets/textures/avatars/Hands.jpg");
addGloveHand(controllers[1], "./assets/textures/avatars/Hands.jpg");

log("[main] controllers ready ✅");

// ---------- WORLD ----------
const buildV = window.__BUILD_V || Date.now().toString();
const world = await initWorld({ THREE, scene, log, v: buildV });

if (world?.tableFocus) {
  // don't force rotate player here; just aim camera
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}

log("[main] world loaded ✅");

// ---------- CONTROLS ----------
const controls = Controls.init({
  THREE,
  renderer,
  camera,
  player,
  controllers,
  log,
  world
});

// ---------- TELEPORT ----------
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

// ---------- DEALING ----------
const dealing = DealingMix.init({
  THREE,
  scene,
  log,
  world
});
dealing.startHand?.();

// ---------- FALLBACK LOCOMOTION (LEFT STICK ALWAYS WORKS) ----------
// If your Controls module already handles movement, this will still be gentle.
// If you ever want to disable it: set window.__NO_FALLBACK_LOCO = true in console.
const loco = {
  x: 0,
  y: 0,
  deadzone: 0.15,
  speed: 2.2 // m/s
};

function bindAxes(ctrl, handednessDefault) {
  ctrl.userData.handedness = handednessDefault;

  ctrl.addEventListener("connected", (e) => {
    const h = e.data?.handedness;
    if (h) ctrl.userData.handedness = h;
  });

  ctrl.addEventListener("axeschanged", (e) => {
    // Different runtimes map axes differently; try both.
    const axes = e.data?.axes || [];
    const ax = axes[2] ?? axes[0] ?? 0;
    const ay = axes[3] ?? axes[1] ?? 0;

    // Prefer LEFT controller for locomotion
    if ((ctrl.userData.handedness || handednessDefault) === "left") {
      loco.x = ax;
      loco.y = ay;
    }
  });
}

bindAxes(controllers[0], "left");
bindAxes(controllers[1], "right");

function updateFallbackLocomotion(dt) {
  if (window.__NO_FALLBACK_LOCO) return;

  let x = loco.x;
  let y = loco.y;

  if (Math.abs(x) < loco.deadzone) x = 0;
  if (Math.abs(y) < loco.deadzone) y = 0;
  if (!x && !y) return;

  // Move relative to head yaw (forward = where you face)
  const yaw = head.rotation.y;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-y);
  const strafe = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(x);

  const v = forward.add(strafe).multiplyScalar(loco.speed * dt);
  player.position.add(v);
}

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);

  if (world?.tableFocus) {
    camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  }
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

  // ✅ Left stick fallback (won't break teleport)
  try { updateFallbackLocomotion(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
