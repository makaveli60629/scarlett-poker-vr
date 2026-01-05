// js/main.js — VIP Room Core Boot (8.1.3)
// Controller FIX PRIORITY:
// - Rays ATTACHED to GRIPS (Quest-correct) and angled DOWN to floor
// - Teleport target ring at ray hit point
// - Trigger teleports to ring
// - Left stick locomotion (forward is forward, right is right)
// - Right stick 45° snap turn
// - Safe boot, no double-calls, no crashing if XR not started

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

// controllers
let controller0, controller1;
let grip0, grip1;

// rays
let rayLine0, rayLine1;
let raycaster;

// teleport
let teleportRing;
let teleportTarget = new THREE.Vector3();
let teleportValid = false;

// movement tuning
const MOVE_SPEED = 2.2;          // meters/sec
const DEADZONE = 0.18;

const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.28;
let lastSnapTime = 0;

// IMPORTANT: ensure strafe and forward are not reversed
const STRAFE_INVERT = 1;         // if right/left ever flips, set -1
const FORWARD_INVERT = 1;        // if forward/back ever flips, set -1

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

/* -------------------------
   Renderer / Scene / Rig
-------------------------- */
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
  scene.fog = new THREE.Fog(0x05060a, 2, 75);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Lighting (Quest-friendly, bright)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(6, 14, 6);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.55, 45);
  fill1.position.set(-10, 5, 10);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.45, 45);
  fill2.position.set(10, 4.5, -10);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.25, 25);
  up.position.set(0, 4, 0);
  scene.add(up);

  raycaster = new THREE.Raycaster();

  // teleport ring (shows on floor where ray hits)
  const ringGeo = new THREE.RingGeometry(0.18, 0.24, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  teleportRing = new THREE.Mesh(ringGeo, ringMat);
  teleportRing.rotation.x = -Math.PI / 2;
  teleportRing.position.set(0, 0.01, 0);
  teleportRing.visible = false;
  teleportRing.name = "TeleportRing";
  scene.add(teleportRing);
}

/* -------------------------
   Rays (controller lasers)
   Fix: attach to GRIP pose
   Fix: point DOWN not UP
-------------------------- */
function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 12;
  line.visible = false;
  return line;
}

function tiltRayDown(grip) {
  // Quest “laser pointing up” fix:
  // rotate the grip-child ray slightly downward so it hits the floor.
  // This is intentionally modest; teleport math still uses ray direction.
  grip.rotation.x = -0.35; // ~ -20 degrees
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

  rayLine0 = makeRayLine();
  rayLine1 = makeRayLine();

  grip0.add(rayLine0);
  grip1.add(rayLine1);

  // tilt rays down
  tiltRayDown(grip0);
  tiltRayDown(grip1);

  // show/hide rays on connect
  controller0.addEventListener("connected", () => { rayLine0.visible = true; logLine("✅ Controller 0 connected"); });
  controller1.addEventListener("connected", () => { rayLine1.visible = true; logLine("✅ Controller 1 connected"); });

  controller0.addEventListener("disconnected", () => { rayLine0.visible = false; logLine("ℹ️ Controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { rayLine1.visible = false; logLine("ℹ️ Controller 1 disconnected"); });

  // teleport on trigger
  controller0.addEventListener("selectstart", () => tryTeleport());
  controller1.addEventListener("selectstart", () => tryTeleport());
}

/* -------------------------
   XR Input helpers
-------------------------- */
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

    // Many Quest controllers: left stick at axes[2,3] sometimes, but not always.
    const ax = gp.axes;
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

function dz(v) {
  return Math.abs(v) > DEADZONE ? v : 0;
}

/* -------------------------
   Locomotion
-------------------------- */
function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const lx = dz(left.x);
  const ly = dz(left.y);
  const rx = dz(right.x);

  // forward/back: Quest reports up as negative sometimes; we normalize with FORWARD_INVERT.
  const forward = (-ly) * FORWARD_INVERT;
  const strafe = (lx) * STRAFE_INVERT;

  // Move relative to HMD yaw
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;
  rig.position.y = 0; // keep grounded

  // snap turn
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastSnapTime) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastSnapTime = now;
  } else if (rx < -0.72 && (now - lastSnapTime) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastSnapTime = now;
  }
}

/* -------------------------
   Teleport Raycast
-------------------------- */
function rayFromGrip(grip, outOrigin, outDir) {
  grip.getWorldPosition(outOrigin);

  // Ray direction uses grip quaternion
  const q = new THREE.Quaternion();
  grip.getWorldQuaternion(q);

  // -Z forward in controller space
  outDir.set(0, 0, -1).applyQuaternion(q).normalize();

  // Force slight downward bias to guarantee floor hit (fixes “laser sky”)
  outDir.y -= 0.18;
  outDir.normalize();
}

function updateTeleport() {
  teleportValid = false;
  teleportRing.visible = false;

  if (!renderer.xr.isPresenting) return;

  // Prefer right-hand grip if connected, else left
  const grip = (rayLine1?.visible ? grip1 : (rayLine0?.visible ? grip0 : null));
  if (!grip) return;

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  rayFromGrip(grip, origin, dir);

  // Intersect with floor plane y=0
  if (Math.abs(dir.y) < 1e-4) return;
  const t = (0 - origin.y) / dir.y;
  if (t <= 0) return;

  teleportTarget.copy(origin).add(dir.multiplyScalar(t));

  // Keep within a safe radius around the room center (optional clamp)
  const maxR = 24;
  const dx = teleportTarget.x;
  const dzv = teleportTarget.z;
  const r = Math.sqrt(dx * dx + dzv * dzv);
  if (r > maxR) {
    teleportTarget.x *= (maxR / r);
    teleportTarget.z *= (maxR / r);
  }

  teleportRing.position.set(teleportTarget.x, 0.01, teleportTarget.z);
  teleportRing.visible = true;
  teleportValid = true;
}

function tryTeleport() {
  if (!teleportValid) return;
  rig.position.x = teleportTarget.x;
  rig.position.z = teleportTarget.z;
  rig.position.y = 0;
}

/* -------------------------
   Resize
-------------------------- */
function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* -------------------------
   Boot
-------------------------- */
let _booted = false;

export async function boot() {
  if (_booted) return; // prevents “called more than once”
  _booted = true;

  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  await World.build(scene, rig);

  // safe clamp
  rig.position.y = 0;

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleport();

    World.update(dt, camera);
    renderer.render(scene, camera);
  });
}
