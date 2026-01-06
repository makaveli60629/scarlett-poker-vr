// /js/main.js — Skylark VR Core Boot (8.2)
// Goals:
// - Permanent controller/rig stability
// - NO rays/lasers (reticle-only teleport)
// - Hold RIGHT trigger -> show reticle; nudge with left stick; release -> teleport
// - Smooth locomotion (left stick) + 45° snap turn (right stick)
// - Never crash if something is missing

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

let controller0, controller1;
let grip0, grip1;

let isAimingTeleport = false;
let teleportTarget = new THREE.Vector3(0, 0, 0);
let reticle;

let lastTurnTime = 0;
const SNAP_COOLDOWN = 0.25;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.4;       // smooth walk
const STRAFE_SPEED = 2.1;
const NUDGE_SPEED = 3.2;      // reticle nudge while holding trigger
const DEADZONE = 0.16;

function $(id) { return document.getElementById(id); }
function logLine(s) {
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

function buildRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Bright but classy Quest lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x203040, 1.25);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.05);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill = new THREE.PointLight(0x66aaff, 0.35, 30);
  fill.position.set(-6, 3.5, 4);
  scene.add(fill);

  const fill2 = new THREE.PointLight(0xffd27a, 0.25, 28);
  fill2.position.set(6, 2.8, -3);
  scene.add(fill2);
}

function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0);
  scene.add(controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  // Teleport uses RIGHT controller (commonly index 1, but we’ll detect right-handedness too)
  controller0.addEventListener("connected", () => logLine("✅ controller0 connected"));
  controller1.addEventListener("connected", () => logLine("✅ controller1 connected"));

  // “selectstart/selectend” is the XR-friendly trigger mapping
  controller0.addEventListener("selectstart", (e) => onSelectStart(e, 0));
  controller1.addEventListener("selectstart", (e) => onSelectStart(e, 1));
  controller0.addEventListener("selectend",   (e) => onSelectEnd(e, 0));
  controller1.addEventListener("selectend",   (e) => onSelectEnd(e, 1));
}

function makeNeonReticle() {
  const g = new THREE.Group();
  g.name = "TeleportReticle";

  // 3-ring neon, very visible
  const ringGeom1 = new THREE.RingGeometry(0.18, 0.22, 64);
  const ringGeom2 = new THREE.RingGeometry(0.26, 0.30, 64);
  const ringGeom3 = new THREE.RingGeometry(0.34, 0.38, 64);

  const mat1 = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const mat3 = new THREE.MeshBasicMaterial({ color: 0x2bd7ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });

  const r1 = new THREE.Mesh(ringGeom1, mat1);
  const r2 = new THREE.Mesh(ringGeom2, mat2);
  const r3 = new THREE.Mesh(ringGeom3, mat3);

  r1.rotation.x = r2.rotation.x = r3.rotation.x = -Math.PI / 2;

  g.add(r1, r2, r3);

  // soft glow billboard
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI / 2;
  g.add(glow);

  g.visible = false;
  return g;
}

function onSelectStart(e, controllerIndex) {
  // Only RIGHT trigger should aim teleport.
  // If indices swap, user still gets teleport with whichever hand is right-handed.
  const handedness = e?.data?.handedness || null;
  const isRightHand = (handedness === "right") || (controllerIndex === 1);

  if (!isRightHand) return;

  isAimingTeleport = true;
  reticle.visible = true;

  // Start target at current rig position (forward a bit)
  teleportTarget.copy(rig.position);
  teleportTarget.y = 0;

  logLine("🎯 Teleport aim ON");
}

function onSelectEnd(e, controllerIndex) {
  const handedness = e?.data?.handedness || null;
  const isRightHand = (handedness === "right") || (controllerIndex === 1);

  if (!isRightHand) return;

  if (isAimingTeleport) {
    // teleport to target
    rig.position.set(teleportTarget.x, 0, teleportTarget.z);
  }

  isAimingTeleport = false;
  reticle.visible = false;

  logLine("✅ Teleport");
}

function getSession() {
  return renderer?.xr?.getSession?.() || null;
}

function getGamepadAxes(handedness) {
  const session = getSession();
  if (!session) return { x: 0, y: 0, rx: 0 };

  // Find source by handedness
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (handedness && src.handedness !== handedness) continue;

    const ax = src.gamepad.axes || [];
    // Quest Touch: axes[0]=x, axes[1]=y thumbstick
    // We will always read 0/1. It fixes the bad mapping and missing snap-turn.
    return { x: ax[0] || 0, y: ax[1] || 0, rx: ax[0] || 0 };
  }
  return { x: 0, y: 0, rx: 0 };
}

function applyMovement(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getGamepadAxes("left");
  const right = getGamepadAxes("right");

  // deadzone
  const lx = Math.abs(left.x) > DEADZONE ? left.x : 0;
  const ly = Math.abs(left.y) > DEADZONE ? left.y : 0;
  const rx = Math.abs(right.x) > DEADZONE ? right.x : 0;

  // Smooth locomotion with left stick
  // IMPORTANT: forward should be forward -> invert sign as needed
  const forward = -ly; // pushing forward gives negative Y on most controllers
  const strafe = lx;

  // Use headset yaw
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  // Movement feels “stuck” if dt spikes, clamp dt
  const cdt = THREE.MathUtils.clamp(dt, 0, 0.05);

  rig.position.x += (strafe * cos + forward * sin) * STRAFE_SPEED * cdt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * cdt;

  rig.position.y = 0;

  // Snap turn on right stick
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnTime = now;
  }

  // Teleport target nudge while aiming (so you don’t need a ray)
  if (isAimingTeleport) {
    teleportTarget.x += (strafe * cos + forward * sin) * NUDGE_SPEED * cdt;
    teleportTarget.z += (forward * cos - strafe * sin) * NUDGE_SPEED * cdt;

    // Keep target inside room bounds (prevents you from teleporting into walls)
    teleportTarget.x = THREE.MathUtils.clamp(teleportTarget.x, -10.5, 10.5);
    teleportTarget.z = THREE.MathUtils.clamp(teleportTarget.z, -14.5, 8.5);

    reticle.position.set(teleportTarget.x, 0.01, teleportTarget.z);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();

  reticle = makeNeonReticle();
  scene.add(reticle);

  window.addEventListener("resize", onResize);

  logLine("VIP boot running...");
  await World.build(scene, rig, camera);

  // Safe spawn
  rig.position.set(0, 0, 4);

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // Movement + teleport aiming
    applyMovement(dt);

    // Update world + sim
    World.update(dt, camera);

    renderer.render(scene, camera);
  });
    }
