// js/main.js — VIP Room Core Boot (8.1.2)
// CONTROLLER HOTFIX:
// - Controllers + grips are added to SCENE (not rig) to prevent offset/down bug
// - Laser rays FOLLOW controller aim, with a gentle pitch-down so it hits the floor
// - Movement reads sticks robustly: axes[0/1] OR axes[2/3] (Quest-safe)
// - Snap turn 45° on right stick
// - Teleport ring on floor + trigger (select) teleports

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig, clock;
let controller0, controller1, grip0, grip1;
let ray0, ray1;

let teleportMarker = null;
let teleportHit = null;
let raycaster = null;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.2;
const RAY_LENGTH_DEFAULT = 9.0;
const RAY_PITCH_DOWN = THREE.MathUtils.degToRad(32); // follow wrist but aim down slightly

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

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Brighter Quest lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const dir = new THREE.DirectionalLight(0xffffff, 1.35);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.7, 44);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.55, 36);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.42, 28);
  up.position.set(0, 1.4, 0);
  scene.add(up);

  raycaster = new THREE.Raycaster();
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = RAY_LENGTH_DEFAULT;
  line.visible = false;
  return line;
}

function makeTeleportMarker() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.19, 32),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.visible = false;
  ring.name = "TeleportMarker";
  scene.add(ring);
  return ring;
}

function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  // IMPORTANT: add to SCENE (not rig) to avoid double transforms on Quest
  scene.add(controller0);
  scene.add(controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });

  controller0.addEventListener("disconnected", () => { ray0.visible = false; });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; });

  // Teleport on trigger/select
  controller0.addEventListener("selectstart", () => tryTeleport());
  controller1.addEventListener("selectstart", () => tryTeleport());
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

// Pick the best stick pair: (0,1) or (2,3)
function readStickFromGamepad(gp) {
  const ax = gp?.axes || [];
  if (ax.length < 2) return { x: 0, y: 0 };

  const a0 = { x: ax[0] || 0, y: ax[1] || 0 };
  const a2 = ax.length >= 4 ? { x: ax[2] || 0, y: ax[3] || 0 } : { x: 0, y: 0 };

  const m0 = Math.abs(a0.x) + Math.abs(a0.y);
  const m2 = Math.abs(a2.x) + Math.abs(a2.y);

  // choose the pair with more signal
  return (m2 > m0 * 1.15) ? a2 : a0;
}

function getStick(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (!src || src.handedness !== handedness) continue;
    if (!src.gamepad) continue;
    return readStickFromGamepad(src.gamepad);
  }
  return { x: 0, y: 0 };
}

// Compute controller-based ray direction that follows wrist but pitches down.
const _q = new THREE.Quaternion();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
function getRayDirWorldFromGrip(grip) {
  if (!grip) return new THREE.Vector3(0, -1, 0);

  grip.getWorldQuaternion(_q);

  // controller forward in world: -Z
  _dir.set(0, 0, -1).applyQuaternion(_q).normalize();

  // controller right in world: +X
  _right.set(1, 0, 0).applyQuaternion(_q).normalize();

  // pitch down around the controller's right axis
  _dir.applyAxisAngle(_right, RAY_PITCH_DOWN).normalize();

  return _dir.clone();
}

// Aim ray line in grip local space to match dirWorld
const _qW = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _tmp = new THREE.Vector3();
function aimRay(grip, rayLine, dirWorld, dist) {
  if (!grip || !rayLine) return;

  grip.getWorldQuaternion(_qW);
  _qInv.copy(_qW).invert();

  const dirLocal = _tmp.copy(dirWorld).applyQuaternion(_qInv).normalize();
  const from = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion().setFromUnitVectors(from, dirLocal);

  rayLine.quaternion.copy(q);
  rayLine.scale.z = Math.max(0.8, Math.min(30, dist || RAY_LENGTH_DEFAULT));
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // forward/back correct
  const forward = -ly;   // push up = go forward
  const strafe = lx;     // push right = go right

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;
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

function updateTeleportPointer() {
  teleportHit = null;
  if (!renderer.xr.isPresenting) {
    if (teleportMarker) teleportMarker.visible = false;
    return;
  }

  const targets = World.getTeleportTargets?.() || [];
  if (!targets.length) {
    if (teleportMarker) teleportMarker.visible = false;
    return;
  }

  // Choose right-hand grip for aiming if available
  const g = grip1 || grip0;
  const r = (g === grip1) ? ray1 : ray0;

  if (!g || !r) return;

  const origin = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
  const dirWorld = getRayDirWorldFromGrip(g);

  raycaster.set(origin, dirWorld);
  const hits = raycaster.intersectObjects(targets, true);

  // Always keep rays aimed (so they follow controller)
  aimRay(grip0, ray0, getRayDirWorldFromGrip(grip0), RAY_LENGTH_DEFAULT);
  aimRay(grip1, ray1, getRayDirWorldFromGrip(grip1), RAY_LENGTH_DEFAULT);

  if (hits && hits.length) {
    const hit = hits[0];
    const p = hit.point.clone();
    p.y = 0;
    teleportHit = p;

    teleportMarker.visible = true;
    teleportMarker.position.set(p.x, 0.02, p.z);

    const dist = origin.distanceTo(hit.point);
    aimRay(g, r, dirWorld, dist);
  } else {
    teleportMarker.visible = false;
  }
}

function tryTeleport() {
  if (!teleportHit) return;
  rig.position.x = teleportHit.x;
  rig.position.z = teleportHit.z;
  rig.position.y = 0;
  logLine(`🟢 Teleport -> (${teleportHit.x.toFixed(2)}, ${teleportHit.z.toFixed(2)})`);
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  teleportMarker = makeTeleportMarker();

  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  rig.position.y = 0;
  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyLocomotion(dt);
    updateTeleportPointer();
    World.update(dt, camera);
    renderer.render(scene, camera);
  });
               }
