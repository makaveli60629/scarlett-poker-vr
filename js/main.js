// js/main.js — VIP Room Core Boot (8.1.4)
// PERMANENT CONTROLLER + ALIGNMENT FIX:
// - Controllers + grips are parented to the PLAYER RIG (teleport/move won't "leave them behind")
// - DO NOT rotate grips (tracked pose). Rotate ONLY the ray object.
// - Ray points down to floor reliably (Quest)
// - Teleport ring + trigger teleport
// - Left stick locomotion (forward is forward), right stick 45° snap turn
// - Adds visible floor + brighter lighting for sanity checks

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera;
let rig, dolly;             // rig = container, dolly = moved for locomotion/teleport
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let teleportRing;
let teleportTarget = new THREE.Vector3();
let teleportValid = false;

const MOVE_SPEED = 2.25;
const DEADZONE = 0.18;

const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.28;
let lastSnapTime = 0;

// If forward/back ever flips on your headset, set FORWARD_INVERT = -1
const FORWARD_INVERT = 1;
// If strafe ever flips, set STRAFE_INVERT = -1
const STRAFE_INVERT = 1;

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
  scene.fog = new THREE.Fog(0x05060a, 2, 85);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  dolly = new THREE.Group();
  dolly.name = "Dolly";
  rig.add(dolly);

  dolly.add(camera);

  // Brighter lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 14, 6);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.6, 60);
  fill1.position.set(-10, 6, 10);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.55, 60);
  fill2.position.set(10, 6, -10);
  scene.add(fill2);

  // Visible floor (for alignment + light sanity)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1f28, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  floor.name = "DebugFloor";
  scene.add(floor);

  // Teleport ring
  const ringGeo = new THREE.RingGeometry(0.18, 0.24, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  teleportRing = new THREE.Mesh(ringGeo, ringMat);
  teleportRing.rotation.x = -Math.PI / 2;
  teleportRing.position.set(0, 0.01, 0);
  teleportRing.visible = false;
  teleportRing.name = "TeleportRing";
  scene.add(teleportRing);
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.scale.z = 12;
  line.visible = false;

  // IMPORTANT: Rotate the RAY, not the GRIP (grip is tracked pose)
  line.rotation.x = -0.35; // aim down ~20°
  return line;
}

function buildControllers() {
  const modelFactory = new XRControllerModelFactory();

  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  grip0 = renderer.xr.getControllerGrip(0);
  grip1 = renderer.xr.getControllerGrip(1);

  grip0.add(modelFactory.createControllerModel(grip0));
  grip1.add(modelFactory.createControllerModel(grip1));

  // ✅ KEY FIX: Put ALL XR objects under the dolly/rign so teleport/move doesn't detach them
  dolly.add(controller0);
  dolly.add(controller1);
  dolly.add(grip0);
  dolly.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ Controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ Controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ Controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ Controller 1 disconnected"); });

  // Teleport on trigger (select)
  controller0.addEventListener("selectstart", () => tryTeleport());
  controller1.addEventListener("selectstart", () => tryTeleport());
}

function onResize() {
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
    // Many Quest builds: stick is at [2,3], fallback to [0,1]
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

function dz(v) { return Math.abs(v) > DEADZONE ? v : 0; }

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const lx = dz(left.x);
  const ly = dz(left.y);
  const rx = dz(right.x);

  const forward = (-ly) * FORWARD_INVERT;
  const strafe = (lx) * STRAFE_INVERT;

  // Move relative to headset yaw
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  dolly.position.x += vx;
  dolly.position.z += vz;
  dolly.position.y = 0;

  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastSnapTime) > SNAP_COOLDOWN) {
    dolly.rotation.y -= SNAP_ANGLE;
    lastSnapTime = now;
  } else if (rx < -0.72 && (now - lastSnapTime) > SNAP_COOLDOWN) {
    dolly.rotation.y += SNAP_ANGLE;
    lastSnapTime = now;
  }
}

function rayFromGrip(grip, outOrigin, outDir) {
  grip.getWorldPosition(outOrigin);

  const q = new THREE.Quaternion();
  grip.getWorldQuaternion(q);

  outDir.set(0, 0, -1).applyQuaternion(q).normalize();

  // Down-bias guarantees floor hit
  outDir.y -= 0.22;
  outDir.normalize();
}

function updateTeleport() {
  teleportValid = false;
  teleportRing.visible = false;
  if (!renderer.xr.isPresenting) return;

  // Prefer right grip if connected/visible
  const useGrip = (ray1?.visible ? grip1 : (ray0?.visible ? grip0 : null));
  if (!useGrip) return;

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  rayFromGrip(useGrip, origin, dir);

  if (Math.abs(dir.y) < 1e-4) return;
  const t = (0 - origin.y) / dir.y;
  if (t <= 0) return;

  teleportTarget.copy(origin).add(dir.multiplyScalar(t));

  // clamp to room radius
  const maxR = 28;
  const r = Math.hypot(teleportTarget.x, teleportTarget.z);
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
  dolly.position.x = teleportTarget.x;
  dolly.position.z = teleportTarget.z;
  dolly.position.y = 0;
}

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  // Spawn you in a clean spot
  dolly.position.set(0, 0, 6);
  dolly.rotation.y = 0;

  // Build world
  await World.build(scene, dolly);

  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleport();

    World.update(dt, camera);
    renderer.render(scene, camera);
  });
}
