// js/main.js — VIP Room Core Boot (8.1.1)
// FIXES (YOUR CURRENT BUGS):
// - Movement restored: left stick uses inputSource.gamepad.axes[0/1] (Quest-safe)
// - Ray visuals HARD-LOCKED to floor direction (no more lasers pointing up)
// - Rays attached to GRIPS and forced each frame using local quaternion conversion
// - Snap turn 45° on right stick x
// - Teleport ring + trigger teleport
// - Controllers/grips parented to rig so they stay "with you"

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

const MOVE_SPEED = 2.15;

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
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.5));

  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.7, 44);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.5, 36);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.38, 28);
  up.position.set(0, 1.4, 0);
  scene.add(up);

  raycaster = new THREE.Raycaster();
}

function makeRayLine() {
  // line points down -Z in its local space, we’ll re-aim it every frame
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 7.5;
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

  // Parent to rig so they stay with you
  rig.add(controller0);
  rig.add(controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  rig.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  rig.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; });

  // Teleport trigger
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

// ✅ Quest-safe: per inputSource, thumbstick is axes[0]/axes[1]
function getStick(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (!src || src.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp || !gp.axes || gp.axes.length < 2) continue;
    return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
  }
  return { x: 0, y: 0 };
}

// ✅ HARD-LOCK visual ray orientation (convert world dir -> local of grip)
const _qW = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _vTmp = new THREE.Vector3();
function aimRayLine(grip, rayLine, dirWorld, dist) {
  if (!grip || !rayLine) return;
  grip.getWorldQuaternion(_qW);
  _qInv.copy(_qW).invert();

  // world dir -> local dir of grip
  const dirLocal = _vTmp.copy(dirWorld).applyQuaternion(_qInv).normalize();

  // rotate ray so its -Z points along dirLocal
  const from = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion().setFromUnitVectors(from, dirLocal);
  rayLine.quaternion.copy(q);

  rayLine.scale.z = Math.max(0.6, Math.min(30, dist));
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const dz = 0.16;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // forward correct
  const forward = -ly;
  const strafe = lx;

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

// ✅ forced “down + forward” ray in WORLD space (rotated by rig yaw)
function getForcedRayDirWorld() {
  const rigYaw = rig.rotation.y;
  const dirLocal = new THREE.Vector3(0, -0.88, -0.48).normalize(); // down+forward
  return dirLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rigYaw).normalize();
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

  // pick a grip that exists
  const g = grip1 || grip0;
  if (!g) return;

  const origin = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
  const dirWorld = getForcedRayDirWorld();

  raycaster.set(origin, dirWorld);
  const hits = raycaster.intersectObjects(targets, true);

  // Aim BOTH rays down (visual fix) even if we don’t hit anything
  // (this kills the “one up, one away” problem)
  aimRayLine(grip0, ray0, dirWorld, 8);
  aimRayLine(grip1, ray1, dirWorld, 8);

  if (hits && hits.length) {
    const hit = hits[0];
    const p = hit.point.clone();
    p.y = 0;
    teleportHit = p;

    teleportMarker.visible = true;
    teleportMarker.position.set(p.x, 0.02, p.z);

    const dist = origin.distanceTo(hit.point);
    aimRayLine(g, (g === grip1 ? ray1 : ray0), dirWorld, dist);
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

  // ensure floor plane spawn
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
