// js/main.js — Skylark Poker VR Boot (8.2.0)
// FIXES (from your report):
// - Left stick forward/back inverted -> fixed
// - Adds floor teleport ray + circle reticle
// - Right-hand trigger teleports to reticle
// - Keeps right stick 45° snap turn
// - Keeps controller rays attached and pointing DOWN

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

let renderer, scene, camera, rig, clock;
let controller0, controller1, grip0, grip1;
let ray0, ray1;

const MOVE_SPEED = 2.25;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.28;
let lastTurnT = 0;

// ✅ Your report: pushing forward goes backward.
// Fix: flip forward/back.
const FORWARD_FIX = -1; // <-- CHANGED (was +1)

// Strafe is correct for you
const STRAFE_FIX = +1;

let floor;               // teleport target surface
let reticle;             // circle on floor
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

// Right-hand trigger only (you asked right hand)
let teleportArmed = false;

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
  scene.fog = new THREE.Fog(0x05060a, 2, 70);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Lighting baseline
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.3));

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 14, 8);
  scene.add(dir);

  const fillA = new THREE.PointLight(0x66aaff, 0.6, 40);
  fillA.position.set(-8, 3.5, 4);
  scene.add(fillA);

  const fillB = new THREE.PointLight(0x00ffaa, 0.45, 40);
  fillB.position.set(8, 3.0, -4);
  scene.add(fillB);
}

function makeDownRay() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const line = new THREE.Line(geom, mat);
  line.name = "downRay";
  line.scale.z = 9;
  line.visible = false;
  // Rotate so -Z becomes -Y
  line.rotation.x = -Math.PI / 2;
  return line;
}

function buildTeleportReticle() {
  // Thin ring + faint fill
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 40),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;

  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  );
  fill.rotation.x = -Math.PI / 2;

  reticle = new THREE.Group();
  reticle.name = "TeleportReticle";
  reticle.add(fill, ring);
  reticle.visible = false;
  scene.add(reticle);
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

  ray0 = makeDownRay();
  ray1 = makeDownRay();
  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });

  // Right-hand trigger teleport:
  // On Quest, controller index for "right hand" can be 0 or 1 depending on session.
  // We use inputSource handedness via session polling (see updateTeleport()).
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getSession() {
  return renderer?.xr?.getSession?.() || null;
}

// Quest axis mapping varies; pick the stick with bigger movement.
function getStick(handedness) {
  const session = getSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (!src || src.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;

    const a0 = { x: ax[0] || 0, y: ax[1] || 0 };
    const a1 = ax.length >= 4 ? { x: ax[2] || 0, y: ax[3] || 0 } : { x: 0, y: 0 };

    const mag0 = Math.abs(a0.x) + Math.abs(a0.y);
    const mag1 = Math.abs(a1.x) + Math.abs(a1.y);

    return (mag1 > mag0) ? a1 : a0;
  }
  return { x: 0, y: 0 };
}

function isRightTriggerPressed() {
  const session = getSession();
  if (!session) return false;

  for (const src of session.inputSources) {
    if (!src || src.handedness !== "right") continue;
    const gp = src.gamepad;
    if (!gp?.buttons?.length) continue;

    // index 0 is usually trigger on XR gamepads
    return !!gp.buttons[0]?.pressed;
  }
  return false;
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // ✅ Forward fix applied here:
  const forward = (-ly * FORWARD_FIX);
  const strafe = (lx * STRAFE_FIX);

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.y = 0;

  const t = clock.getElapsedTime();
  if (rx > 0.72 && (t - lastTurnT) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnT = t;
  } else if (rx < -0.72 && (t - lastTurnT) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnT = t;
  }
}

function updateTeleport() {
  if (!renderer.xr.isPresenting || !floor || !reticle) return;

  // Use the RIGHT grip if available, else fallback to camera forward ray.
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();

  // Right grip world position/direction
  if (grip1) {
    grip1.getWorldPosition(origin);
    dir.set(0, -1, 0);
    // aim down, but align with grip orientation a bit:
    const q = new THREE.Quaternion();
    grip1.getWorldQuaternion(q);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q).normalize();
    dir.copy(down);
  } else {
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);
  }

  raycaster.set(origin, dir);

  const hit = raycaster.intersectObject(floor, true)[0];
  if (hit) {
    reticle.position.copy(hit.point);
    reticle.position.y += 0.01;
    reticle.visible = true;
  } else {
    reticle.visible = false;
  }

  // Teleport on right trigger press (edge triggered)
  const pressed = isRightTriggerPressed();
  if (pressed && reticle.visible && !teleportArmed) {
    teleportArmed = true;

    // Move rig so your headset lands at reticle
    // Keep Y at 0 (floor)
    rig.position.x = reticle.position.x;
    rig.position.z = reticle.position.z;
    rig.position.y = 0;
  }
  if (!pressed) teleportArmed = false;
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  buildTeleportReticle();

  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  // Build world
  await World.build(scene, rig, camera);

  // Find the floor from world: it is the first CircleGeometry we added there
  // But we’ll also create a safe invisible floor collider here if we can’t find it.
  floor = scene.getObjectByName("WorldFloor") || null;
  if (!floor) {
    // fallback invisible floor collider
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    f.rotation.x = -Math.PI / 2;
    f.position.y = 0;
    f.name = "WorldFloor";
    scene.add(f);
    floor = f;
  }

  rig.position.y = 0;

  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleport();

    World.update(dt, camera, rig);

    renderer.render(scene, camera);
  });
}
