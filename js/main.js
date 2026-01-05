// js/main.js — VIP Room Core Boot (8.0.1)
// FIXES:
// - Laser rays now attach to controller GRIPS (tracked correctly on Quest)
// - Rays only show when controllers connect
// - Brighter lighting for Quest
// - Safer spawn Y (no “floating” feel)
// - Left stick move/strafe (right is right), right stick 45° snap turn

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { Controls } from "./controls.js";
import { World } from "./world.js";

let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.1;
const STRAFE_INVERT_FIX = 1; // keep 1 = right is right (if ever reversed, set -1)

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

  // QUEST BRIGHTNESS PACK (strong but not washed out)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.25);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.55, 30);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.35, 26);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.25, 18);
  up.position.set(0, 1.2, 0);
  scene.add(up);
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 10;
  line.visible = false; // only show after controller connects
  return line;
}

function buildControllers() {
  // Controller objects (buttons, events)
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0);
  scene.add(controller1);

  // Grips (tracked pose) — THIS fixes the “laser stuck in the middle”
  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  // Rays attach to GRIPS so they move with your hands on Quest
  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  // Show/hide rays based on connection
  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ Left/Right controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ Left/Right controller 1 connected"); });

  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });
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

function getAxes(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  const forward = -ly;
  const strafe = lx * STRAFE_INVERT_FIX;

  // headset yaw
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;

  // keep rig on floor plane
  rig.position.y = 0;

  // snap turn
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  // Safety: if World put you somewhere weird, clamp Y
  rig.position.y = 0;

  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyLocomotion(dt);

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
