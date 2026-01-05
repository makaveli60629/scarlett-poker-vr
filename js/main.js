// js/main.js — VIP Room Core Boot (8.0)
// - WebXR ready (Quest)
// - Bright lighting support
// - Safe world build (await)
// - Basic locomotion: Left stick move/strafe, Right stick snap turn 45°
// - Fixes reversed strafe: right is right

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";

let renderer, scene, camera, rig;
let controller0, controller1;
let clock;

let lastTurnTime = 0;
let snapCooldown = 0.28; // seconds
let snapAngle = THREE.MathUtils.degToRad(45);

// Locomotion settings (Quest-friendly)
const MOVE_SPEED = 2.1; // meters/second
const STRAFE_INVERT_FIX = 1; // keep 1 (right is right). If it ever flips, set to -1

function $(id) { return document.getElementById(id); }
function logLine(s) {
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

function ensureAppContainer() {
  const app = document.getElementById("app") || document.body;
  return app;
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

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Extra safety light (Quest can look dark without this)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.85);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(3, 8, 2);
  scene.add(dir);
}

function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0);
  scene.add(controller1);

  // Visible ray lines (laser)
  const rayGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const rayMat = new THREE.LineBasicMaterial();
  const line0 = new THREE.Line(rayGeom, rayMat);
  line0.name = "ray";
  line0.scale.z = 10;
  controller0.add(line0);

  const line1 = new THREE.Line(rayGeom, rayMat);
  line1.name = "ray";
  line1.scale.z = 10;
  controller1.add(line1);
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

function getGamepadAxes(handedness) {
  // Returns { x, y } axes for that hand if available
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp || !gp.axes || gp.axes.length < 2) continue;
    // Most Quest controllers: axes[2], axes[3] sometimes for thumbstick, but many browsers map to [2,3] or [0,1]
    // We prefer the last pair if present.
    const ax = gp.axes;
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

function applyLocomotion(dt) {
  // Only move when XR is presenting
  if (!renderer.xr.isPresenting) return;

  const left = getGamepadAxes("left");
  const right = getGamepadAxes("right");

  // Deadzone
  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // Forward is typically -Y on Quest stick
  const forward = -ly;
  const strafe = lx * STRAFE_INVERT_FIX;

  // Move relative to headset yaw
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;

  // Snap turn (45°) using right stick X
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

function applyDesktopFallback(dt) {
  // Optional: keep minimal desktop movement later (not required for Quest)
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();

  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);
  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    World.update(dt, camera);

    renderer.render(scene, camera);
  });

  // XR status line (your HUD will show this)
  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));
}
