// js/main.js — VIP Room Core Boot (8.0.4)
// FIXES:
// - Laser rays point DOWN/FORWARD (not upward)
// - Left stick forward/back corrected
// - Menu toggle (VR panel) on left controller button
// - 45° snap turn preserved

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";
import { VRMenu } from "./vr_ui_panel.js";

let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.15;

// If your stick is reversed again later, flip these (-1 or +1)
const FORWARD_FIX = 1;   // keep 1 (if forward/back reversed, set -1)
const STRAFE_FIX  = 1;   // keep 1 (if right/left reversed, set -1)

function $(id) { return document.getElementById(id); }
function logLine(s) {
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

function ensureAppContainer() {
  return document.getElementById("app") || document.body;
}

function buildRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  ensureAppContainer().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 2, 55);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Brighter Quest lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.65, 30);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.45, 26);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.35, 18);
  up.position.set(0, 1.3, 0);
  scene.add(up);
}

// Laser that points DOWN/FORWARD from the grip
function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.25, -1.0)  // DOWN + FORWARD
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.set(1, 1, 10);
  line.visible = false;
  return line;
}

function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0, controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();

  // IMPORTANT: rotate ray a bit to match Quest grip orientation
  // (helps if line still appears angled weird)
  ray0.rotation.x = -0.35;
  ray1.rotation.x = -0.35;

  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });

  // Menu toggle (Quest browsers differ; this catches common buttons)
  controller0.addEventListener("selectstart", () => {
    // trigger pressed — optional hook later
  });
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getXRSession() {
  return renderer?.xr?.getSession?.() || null;
}

// Get thumbstick axes for the handedness
function getAxes(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    // On Quest, left stick often at axes[2],[3] but sometimes [0],[1]
    const ax = gp.axes;
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

// Detect a “menu” press (best-effort across Quest browser mappings)
function menuPressed() {
  const session = getXRSession();
  if (!session) return false;

  for (const src of session.inputSources) {
    if (src?.handedness !== "left") continue;
    const gp = src.gamepad;
    if (!gp?.buttons) continue;

    // Common candidates:
    // - button[3] (Y)
    // - button[4] (sometimes reserved/menu-ish)
    // - button[5] (sometimes)
    const b = gp.buttons;
    const hit =
      (b[3] && b[3].pressed) ||
      (b[4] && b[4].pressed) ||
      (b[5] && b[5].pressed);

    if (hit) return true;
  }
  return false;
}

let menuLatch = false;

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // Forward is normally -ly (thumb up = negative)
  // You said forward/back is reversed — so we apply FORWARD_FIX
  const forward = (-ly) * FORWARD_FIX;
  const strafe  = (lx) * STRAFE_FIX;

  // headset yaw (use camera quaternion for stability)
  const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ").y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;
  rig.position.y = 0;

  // 45° snap turn on right stick X
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }

  // Menu toggle
  const mp = menuPressed();
  if (mp && !menuLatch) {
    VRMenu.toggle();
    menuLatch = true;
  } else if (!mp) {
    menuLatch = false;
  }
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();

  VRMenu.build(scene, camera);

  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  rig.position.y = 0;
  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyLocomotion(dt);

    World.update(dt, camera);
    VRMenu.update(dt);

    renderer.render(scene, camera);
  });
    }
