// /js/main.js — Skylark VR Core Boot (8.2.2)
// FIXES:
// - Movement works on Quest reliably (reads XRSession inputSources every frame)
// - Teleport: hold RIGHT trigger -> neon reticle appears; release -> teleport (no laser shown)
// - Smooth left-stick locomotion + right-stick 45° snap turn
// - Height lock (always standing) without fighting world.js

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

// controllers + grips
let controller0, controller1;
let grip0, grip1;

let reticle;
let aimingTeleport = false;

// tuning
const MOVE_SPEED = 2.8;
const STRAFE_SPEED = 2.5;
const DEADZONE = 0.16;

const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.26;
let lastTurnTime = 0;

// always-standing height lock
const DESIRED_HEAD_HEIGHT = 1.70;
let heightVel = 0;

// bounds (keep you in room)
const BOUNDS = { minX: -10.5, maxX: 10.5, minZ: -14.5, maxZ: 8.5 };

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

  // lighting pack
  scene.add(new THREE.HemisphereLight(0xffffff, 0x203040, 1.25));

  const dir = new THREE.DirectionalLight(0xffffff, 1.05);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.35, 30);
  fill1.position.set(-6, 3.5, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0xffd27a, 0.25, 28);
  fill2.position.set(6, 2.8, -3);
  scene.add(fill2);
}

function makeNeonReticle() {
  const g = new THREE.Group();
  g.name = "TeleportReticle";

  const ring = (r1, r2, color, op) => {
    const geom = new THREE.RingGeometry(r1, r2, 64);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geom, mat);
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  g.add(ring(0.18, 0.22, 0x00ffaa, 0.95));
  g.add(ring(0.26, 0.30, 0xff2bd6, 0.85));
  g.add(ring(0.34, 0.38, 0x2bd7ff, 0.75));

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

  const factory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(factory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(factory.createControllerModel(grip1));
  scene.add(grip1);

  // Right trigger controls teleport aim (selectstart/selectend)
  controller0.addEventListener("selectstart", (e) => onSelectStart(e, 0));
  controller1.addEventListener("selectstart", (e) => onSelectStart(e, 1));
  controller0.addEventListener("selectend", (e) => onSelectEnd(e, 0));
  controller1.addEventListener("selectend", (e) => onSelectEnd(e, 1));

  controller0.addEventListener("connected", (e) => logLine(`✅ controller0 connected (${e?.data?.handedness || "?"})`));
  controller1.addEventListener("connected", (e) => logLine(`✅ controller1 connected (${e?.data?.handedness || "?"})`));
}

function isRightHand(e, idx) {
  const h = e?.data?.handedness;
  if (h) return h === "right";
  return idx === 1; // safe fallback
}

function onSelectStart(e, idx) {
  if (!isRightHand(e, idx)) return;
  aimingTeleport = true;
  reticle.visible = true;
}

function onSelectEnd(e, idx) {
  if (!isRightHand(e, idx)) return;

  if (aimingTeleport) {
    // teleport on release
    rig.position.x = THREE.MathUtils.clamp(reticle.position.x, BOUNDS.minX, BOUNDS.maxX);
    rig.position.z = THREE.MathUtils.clamp(reticle.position.z, BOUNDS.minZ, BOUNDS.maxZ);
  }

  aimingTeleport = false;
  reticle.visible = false;
}

function getXRSession() {
  return renderer?.xr?.getSession?.() || null;
}

function getGamepad(handedness) {
  const session = getXRSession();
  if (!session) return null;

  for (const src of session.inputSources) {
    if (!src) continue;
    if (src.handedness !== handedness) continue;
    if (src.gamepad) return src.gamepad;
  }
  return null;
}

function axesFromGamepad(gp) {
  if (!gp || !gp.axes || gp.axes.length < 2) return { x: 0, y: 0 };

  // Quest Touch usually uses axes[0], axes[1] for the stick.
  // Some runtimes provide additional axes; we’ll always prefer the first stick.
  const x = gp.axes[0] || 0;
  const y = gp.axes[1] || 0;
  return { x, y };
}

function deadzone(v) {
  return Math.abs(v) > DEADZONE ? v : 0;
}

function applyHeightLock(dt) {
  // Keep “always standing” without fighting XR
  const camWorld = new THREE.Vector3();
  camera.getWorldPosition(camWorld);

  const err = DESIRED_HEAD_HEIGHT - camWorld.y;

  const cdt = THREE.MathUtils.clamp(dt, 0, 0.05);
  heightVel = heightVel * 0.86 + err * 18.0 * cdt;
  rig.position.y += heightVel;

  rig.position.y = THREE.MathUtils.clamp(rig.position.y, -0.2, 2.2);
}

function updateTeleportReticle() {
  if (!aimingTeleport) return;

  // Use RIGHT grip pose (if available) to raycast down to floor plane y=0
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);

  // choose grip1 as “right” most of the time; if not tracked, fall back to camera forward
  const g = grip1 || null;

  if (g) {
    g.getWorldPosition(origin);
    dir.set(0, 0, -1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())).normalize();
  } else {
    camera.getWorldPosition(origin);
    dir.set(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  // intersect ray with floor plane y = 0
  const t = (0 - origin.y) / (dir.y || -0.0001);
  const hit = origin.clone().add(dir.clone().multiplyScalar(t > 0 ? t : 2.0));

  reticle.position.set(
    THREE.MathUtils.clamp(hit.x, BOUNDS.minX, BOUNDS.maxX),
    0.01,
    THREE.MathUtils.clamp(hit.z, BOUNDS.minZ, BOUNDS.maxZ)
  );
}

function applyLocomotion(dt) {
  // Works both in VR and non-VR
  const gpL = getGamepad("left");
  const gpR = getGamepad("right");

  const left = axesFromGamepad(gpL);
  const right = axesFromGamepad(gpR);

  const lx = deadzone(left.x);
  const ly = deadzone(left.y);
  const rx = deadzone(right.x);

  const cdt = THREE.MathUtils.clamp(dt, 0, 0.05);

  // Snap turn (right stick)
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnTime = now;
  }

  // If teleport aiming, don’t walk (keeps it clean)
  if (aimingTeleport) return;

  // Standard: forward is -ly (Quest forward push gives negative y)
  const forward = -ly;
  const strafe = lx;

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * STRAFE_SPEED * cdt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * cdt;

  // clamp to room
  rig.position.x = THREE.MathUtils.clamp(rig.position.x, BOUNDS.minX, BOUNDS.maxX);
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, BOUNDS.minZ, BOUNDS.maxZ);
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

  // safe spawn
  rig.position.set(0, 0, 4);
  rig.rotation.set(0, 0, 0);

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyHeightLock(dt);
    updateTeleportReticle();
    applyLocomotion(dt);

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
