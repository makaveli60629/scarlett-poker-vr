// js/main.js — Skylark Poker VR Boot (8.2.1)
// FIX:
// - Controllers/grips are parented to the rig so teleport/move never desyncs.
// Keeps:
// - Floor teleport circle + right trigger teleport
// - Left stick move (forward/back fixed), right stick 45° snap turn
// - Down-pointing rays

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";
import { attachXRToRig } from "./xr_rig_fix.js";

let renderer, scene, camera, rig, clock;

let controller0, controller1, grip0, grip1;
let ray0, ray1;

let floor, reticle;
const raycaster = new THREE.Raycaster();
let teleportEdge = false;

const MOVE_SPEED = 2.25;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.28;
let lastTurnT = 0;

// Your preference: forward = forward
const FORWARD_FIX = -1;   // keep as-is (this fixed your inversion)
const STRAFE_FIX  = +1;

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
  // rotate so the ray points DOWN in world (-Y)
  line.rotation.x = -Math.PI / 2;
  return line;
}

function buildTeleportReticle() {
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

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));

  ray0 = makeDownRay();
  ray1 = makeDownRay();
  grip0.add(ray0);
  grip1.add(ray1);

  // IMPORTANT: attach controllers/grips to RIG (permanent desync fix)
  attachXRToRig({ scene, rig, controller0, controller1, grip0, grip1 });

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });
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
    return !!gp.buttons[0]?.pressed; // trigger
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

  const forward = (-ly * FORWARD_FIX);
  const strafe  = (lx * STRAFE_FIX);

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

  // ray from right grip downward-ish
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const q = new THREE.Quaternion();

  grip1.getWorldPosition(origin);
  grip1.getWorldQuaternion(q);

  // aim mostly down (stable) but still follows controller orientation slightly
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q).normalize();
  dir.copy(down);

  raycaster.set(origin, dir);

  const hit = raycaster.intersectObject(floor, true)[0];
  if (hit) {
    reticle.position.copy(hit.point);
    reticle.position.y += 0.01;
    reticle.visible = true;
  } else {
    reticle.visible = false;
  }

  const pressed = isRightTriggerPressed();
  if (pressed && reticle.visible && !teleportEdge) {
    teleportEdge = true;
    rig.position.x = reticle.position.x;
    rig.position.z = reticle.position.z;
    rig.position.y = 0;
  }
  if (!pressed) teleportEdge = false;
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  buildTeleportReticle();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  await World.build(scene, rig, camera);

  // Grab floor created by world (or create fallback invisible floor)
  floor = scene.getObjectByName("WorldFloor") || null;
  if (!floor) {
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
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

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyLocomotion(dt);
    updateTeleport();
    World.update(dt, camera, rig);
    renderer.render(scene, camera);
  });
}
