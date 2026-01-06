// /js/main.js — Skylark VR Core Boot (8.2.1 HOTFIX)
// Fixes:
// - Stuck/half-in-floor (height lock + remove y-fighting)
// - Always-standing height (fixed virtual head height)
// - Seat snap at table (toggle with Right Grip/Squeeze)
// - Reliable axes reading (store gamepads on connect)
// - Smooth locomotion + 45° snap turn
// - Reticle-only teleport (hold RIGHT trigger; nudge with left stick; release -> teleport)

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

// controllers
let controller0, controller1;
let grip0, grip1;

// cached gamepads by handedness
const pads = {
  left: null,
  right: null,
};

// teleport
let isAimingTeleport = false;
let teleportTarget = new THREE.Vector3(0, 0, 0);
let reticle;

// turning
let lastTurnTime = 0;
const SNAP_COOLDOWN = 0.25;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);

// movement tuning
const MOVE_SPEED = 2.6;
const STRAFE_SPEED = 2.3;
const DEADZONE = 0.16;
const NUDGE_SPEED = 3.4;

// HEIGHT LOCK (always standing)
const DESIRED_HEAD_HEIGHT = 1.70;     // meters (adjust anytime)
let heightLockEnabled = true;
let _heightVel = 0;

// SEATING
let seated = false;
let seatedYaw = 0;
const TABLE_CENTER = new THREE.Vector3(0, 0, -4.5);     // must match poker_simulation.js / world.js
const SEAT_POINT = new THREE.Vector3(0, 0, -1.05);      // relative to table center
const SEAT_YAW = Math.PI;                               // face table center
const SEAT_TOGGLE_COOLDOWN = 0.35;
let lastSeatToggle = 0;

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

  // IMPORTANT: local-floor gives consistent floor tracking when available
  renderer.xr.setReferenceSpaceType("local-floor");

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

  // Lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x203040, 1.25));

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

function makeNeonReticle() {
  const g = new THREE.Group();
  g.name = "TeleportReticle";

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

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI / 2;
  g.add(glow);

  g.visible = false;
  return g;
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

  // Trigger: teleport aim (RIGHT hand)
  controller0.addEventListener("selectstart", (e) => onSelectStart(e, 0));
  controller1.addEventListener("selectstart", (e) => onSelectStart(e, 1));
  controller0.addEventListener("selectend", (e) => onSelectEnd(e, 0));
  controller1.addEventListener("selectend", (e) => onSelectEnd(e, 1));

  // Grip/Squeeze: seat toggle (RIGHT hand)
  controller0.addEventListener("squeezestart", (e) => onSqueezeStart(e, 0));
  controller1.addEventListener("squeezestart", (e) => onSqueezeStart(e, 1));

  // Cache gamepads reliably
  controller0.addEventListener("connected", (e) => onControllerConnected(e, 0));
  controller1.addEventListener("connected", (e) => onControllerConnected(e, 1));

  controller0.addEventListener("disconnected", () => logLine("⚠️ controller0 disconnected"));
  controller1.addEventListener("disconnected", () => logLine("⚠️ controller1 disconnected"));
}

function onControllerConnected(e, idx) {
  const data = e?.data || {};
  const hand = data.handedness || (idx === 0 ? "left" : "right");
  if (data.gamepad) {
    pads[hand] = data.gamepad;
    logLine(`✅ controller${idx} connected (${hand})`);
  } else {
    logLine(`✅ controller${idx} connected (${hand}) — no gamepad?`);
  }
}

function isRightHand(e, idx) {
  const hand = e?.data?.handedness;
  if (hand) return hand === "right";
  return idx === 1; // fallback
}

function onSelectStart(e, idx) {
  // Right trigger = aim teleport
  if (!isRightHand(e, idx)) return;

  isAimingTeleport = true;
  reticle.visible = true;

  teleportTarget.copy(rig.position);
  teleportTarget.y = 0;
}

function onSelectEnd(e, idx) {
  if (!isRightHand(e, idx)) return;

  if (isAimingTeleport && !seated) {
    rig.position.set(teleportTarget.x, rig.position.y, teleportTarget.z);
  }

  isAimingTeleport = false;
  reticle.visible = false;
}

function onSqueezeStart(e, idx) {
  // Right grip toggles seat
  if (!isRightHand(e, idx)) return;

  const now = clock.getElapsedTime();
  if (now - lastSeatToggle < SEAT_TOGGLE_COOLDOWN) return;
  lastSeatToggle = now;

  if (!seated) {
    // Only seat if near table
    const worldSeat = TABLE_CENTER.clone().add(SEAT_POINT);
    const d = rig.position.distanceTo(worldSeat);
    if (d > 3.5) {
      logLine("🪑 Move closer to table to seat.");
      return;
    }

    seated = true;
    seatedYaw = SEAT_YAW;

    rig.position.x = worldSeat.x;
    rig.position.z = worldSeat.z;
    rig.rotation.y = seatedYaw;

    logLine("🪑 Seated (height locked)");
  } else {
    seated = false;
    logLine("✅ Standing (height locked)");
  }
}

function getAxes(handedness) {
  const gp = pads[handedness];
  if (!gp || !gp.axes) return { x: 0, y: 0 };

  // Quest Touch: axes[0]=x, axes[1]=y
  const x = gp.axes[0] || 0;
  const y = gp.axes[1] || 0;
  return { x, y };
}

function deadzone(v) {
  return Math.abs(v) > DEADZONE ? v : 0;
}

function applyHeightLock(dt) {
  if (!heightLockEnabled) return;

  // Compute camera world position
  const camWorld = new THREE.Vector3();
  camera.getWorldPosition(camWorld);

  // We want camera's world Y to be DESIRED_HEAD_HEIGHT
  const err = DESIRED_HEAD_HEIGHT - camWorld.y;

  // Smooth correction (critically damped-ish)
  const cdt = THREE.MathUtils.clamp(dt, 0, 0.05);
  _heightVel = _heightVel * 0.85 + err * 18.0 * cdt;  // responsiveness
  rig.position.y += _heightVel;

  // Prevent extreme drift
  rig.position.y = THREE.MathUtils.clamp(rig.position.y, -0.2, 2.2);
}

function applyMovement(dt) {
  if (!renderer.xr.isPresenting) return;

  // If seated, no walking/teleport nudging. Only head look + snap turn.
  const left = getAxes("left");
  const right = getAxes("right");

  const lx = deadzone(left.x);
  const ly = deadzone(left.y);

  const rx = deadzone(right.x);

  const cdt = THREE.MathUtils.clamp(dt, 0, 0.05);

  // Snap turn always allowed
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnTime = now;
  }

  if (seated) return;

  // Smooth locomotion
  const forward = -ly;  // pushing forward => negative y
  const strafe = lx;

  const yaw = rig.rotation.y; // use rig yaw, not camera yaw (camera is XR-controlled)
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * STRAFE_SPEED * cdt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * cdt;

  // Reticle nudge while holding trigger (no ray needed)
  if (isAimingTeleport) {
    teleportTarget.x += (strafe * cos + forward * sin) * NUDGE_SPEED * cdt;
    teleportTarget.z += (forward * cos - strafe * sin) * NUDGE_SPEED * cdt;

    // clamp inside room bounds
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

  // Safe spawn (x,z only). Height lock will place you correctly.
  rig.position.set(0, 0, 4);
  rig.rotation.set(0, 0, 0);

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // 1) Height lock FIRST (fixes floor-sinking)
    applyHeightLock(dt);

    // 2) Movement
    applyMovement(dt);

    // 3) World update (clamps x/z only; no y override)
    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
