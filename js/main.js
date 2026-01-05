// js/main.js — Controller + Movement + Teleport FIX CORE (8.2)
// Goal: Never lose controllers, never have rays stuck, locomotion stable on Quest.
// - Left stick: move/strafe (axes 0/1)
// - Right stick: snap turn 45° (axes 2/3)
// - Rays: attached to targetRay controllers (stable pointing), with downward comfort tilt
// - Teleport: reticle on floor + trigger/select to hop
// - Boot guard: prevents "called more than once" / invalid state crashes

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

// OPTIONAL: if you have poker_simulation.js, we’ll try to load it safely.
let PokerSim = null;

let renderer, scene, camera, rig;
let clock;

let c0, c1;           // targetRay controllers (best for lasers)
let g0, g1;           // grips (best for hands/models)
let ray0, ray1;       // laser lines
let reticle;          // teleport reticle
let teleportValid = false;
let teleportPoint = new THREE.Vector3();

let lastTurnTime = 0;
const SNAP_COOLDOWN = 0.28;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.2;
const DEADZONE = 0.18;

// If anything is reversed on your device, only change these:
const INVERT_FORWARD = 1;  // set -1 if forward/back ever flips
const INVERT_STRAFE = 1;   // set -1 if left/right ever flips
const RAY_TILT_DOWN = THREE.MathUtils.degToRad(-35); // comfort tilt downward

// ---------- HUD helpers (works with your debug HTML) ----------
function $(id) { return document.getElementById(id); }
function logLine(s) {
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

// ---------- Boot guard (prevents double-call crashes) ----------
const BOOT_KEY = "__SKYLARK_BOOTED__";
function alreadyBooted() {
  return !!globalThis[BOOT_KEY];
}
function markBooted() {
  globalThis[BOOT_KEY] = true;
}

// ---------- Core build ----------
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
  scene.fog = new THREE.Fog(0x05060a, 2, 65);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Bright but classy lighting pack (Quest-friendly)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.65, 40);
  fill1.position.set(-7, 3.4, 5);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.45, 36);
  fill2.position.set(7, 2.8, -3);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.25, 22);
  up.position.set(0, 1.3, 0);
  scene.add(up);
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const line = new THREE.Line(geom, mat);
  line.name = "laser_ray";
  line.scale.z = 12;
  line.visible = false;
  // Force a stable downward tilt so it never points into the sky:
  line.rotation.x = RAY_TILT_DOWN;
  return line;
}

function buildTeleportReticle() {
  const geo = new THREE.RingGeometry(0.12, 0.16, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9 });
  reticle = new THREE.Mesh(geo, mat);
  reticle.name = "teleport_reticle";
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);
}

function buildControllers() {
  const modelFactory = new XRControllerModelFactory();

  // targetRay controllers (laser + select events)
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  // grips (models/hands pose)
  g0 = renderer.xr.getControllerGrip(0);
  g1 = renderer.xr.getControllerGrip(1);
  g0.add(modelFactory.createControllerModel(g0));
  g1.add(modelFactory.createControllerModel(g1));
  scene.add(g0, g1);

  // Rays attach to targetRay controllers (stable aiming)
  ray0 = makeRayLine();
  ray1 = makeRayLine();
  c0.add(ray0);
  c1.add(ray1);

  // Connection events
  c0.addEventListener("connected", (e) => {
    ray0.visible = true;
    logLine("✅ controller 0 connected (" + (e.data?.handedness || "unknown") + ")");
  });
  c1.addEventListener("connected", (e) => {
    ray1.visible = true;
    logLine("✅ controller 1 connected (" + (e.data?.handedness || "unknown") + ")");
  });
  c0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  c1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });

  // Teleport on trigger/select (both hands)
  c0.addEventListener("selectstart", () => tryTeleport());
  c1.addEventListener("selectstart", () => tryTeleport());
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- Input helpers ----------
function getXRSession() {
  return renderer?.xr?.getSession?.() || null;
}

// Correct mapping:
// - left stick uses axes[0,1]
// - right stick uses axes[2,3] (when present)
function getStick(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0, has: false };

  for (const src of session.inputSources) {
    if (!src || src.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp || !gp.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    if (ax.length >= 4) {
      if (handedness === "left") return { x: ax[0] || 0, y: ax[1] || 0, has: true };
      if (handedness === "right") return { x: ax[2] || 0, y: ax[3] || 0, has: true };
    }
    // fallback
    return { x: ax[0] || 0, y: ax[1] || 0, has: true };
  }
  return { x: 0, y: 0, has: false };
}

function dz(v) {
  return Math.abs(v) > DEADZONE ? v : 0;
}

// ---------- Teleport + Laser intersection ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 floor
const tmpMat = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpRay = new THREE.Ray();

function updateTeleportFromController(ctrl) {
  teleportValid = false;
  reticle.visible = false;

  if (!renderer.xr.isPresenting || !ctrl) return;

  // Get ray origin/direction from controller world matrix
  tmpMat.identity().extractRotation(ctrl.matrixWorld);
  tmpPos.setFromMatrixPosition(ctrl.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

  tmpRay.origin.copy(tmpPos);
  tmpRay.direction.copy(tmpDir);

  // Intersect with floor plane
  const hit = new THREE.Vector3();
  const ok = tmpRay.intersectPlane(floorPlane, hit);
  if (!ok) return;

  // Keep reticle reasonably close (prevents wild hits)
  const dist = hit.distanceTo(tmpPos);
  if (dist < 0.35 || dist > 18) return;

  teleportValid = true;
  teleportPoint.copy(hit);
  reticle.position.copy(hit);
  reticle.position.y = 0.01;
  reticle.visible = true;
}

function tryTeleport() {
  if (!teleportValid) return;

  // Move rig to the hit point (keep y=0)
  rig.position.x = teleportPoint.x;
  rig.position.z = teleportPoint.z;
  rig.position.y = 0;

  // Tiny visual pulse
  reticle.scale.setScalar(1.2);
  setTimeout(() => reticle && reticle.scale.setScalar(1.0), 80);
}

// ---------- Locomotion + Snap Turn ----------
function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const lx = dz(left.x) * INVERT_STRAFE;
  const ly = dz(left.y) * INVERT_FORWARD;

  // Forward should be forward: on most devices pushing forward gives negative Y
  // so we invert it here:
  const forward = -ly;
  const strafe = lx;

  // Headset yaw for movement direction
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;
  rig.position.y = 0;

  // Snap turn (right stick X)
  const rx = dz(right.x);
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnTime = now;
  }
}

// ---------- Safe optional import ----------
async function tryLoadPokerSim() {
  try {
    const mod = await import("./poker_simulation.js");
    if (mod && (mod.PokerSimulation || mod.PokerSim)) {
      PokerSim = mod.PokerSimulation || mod.PokerSim;
      logLine("✅ poker_simulation.js loaded");
    } else {
      logLine("ℹ️ poker_simulation.js found but no PokerSimulation export");
    }
  } catch (e) {
    logLine("ℹ️ poker_simulation.js not loaded (ok for now)");
  }
}

// ---------- MAIN BOOT ----------
export async function boot() {
  if (alreadyBooted()) {
    // Prevent double-call invalid state issues
    logLine("ℹ️ boot() already ran — ignoring second call");
    return;
  }
  markBooted();

  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildTeleportReticle();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  // World build (must not crash if textures missing)
  await World.build(scene, rig);

  // Always clamp rig to floor
  rig.position.y = 0;

  // Optional sim load
  await tryLoadPokerSim();

  // Start XR events
  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // Prefer right-hand laser for teleport aiming if available, else left
    // (you can switch this preference later)
    updateTeleportFromController(c1 || c0);

    applyLocomotion(dt);

    // Update world and sim safely
    if (World.update) World.update(dt, camera);

    if (PokerSim?.update) PokerSim.update(dt, { scene, camera, rig });

    renderer.render(scene, camera);
  });
}
