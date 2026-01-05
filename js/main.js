// js/main.js — VIP Room Core Boot (8.0.2) FULL FIX
// - Fixes bare "three" imports by using ./three.js shim across modules
// - Rig parenting correct
// - Controller lasers attached to GRIPS (Quest tracked)
// - XR yaw uses headset world quaternion (camera.rotation.y is wrong in XR)
// - Movement strafe direction fixed + optional flip
// - Right stick 45° snap turn
// - Basic hand tracking models added
// - Boot guard prevents double-boot issues

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js";

import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

// XR input
let controller0, controller1;
let grip0, grip1;
let hand0, hand1;
let ray0, ray1;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.1;

// ✅ If you ever feel strafe is reversed again, set this to -1
const STRAFE_SIGN = 1; // 1 = right is right

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
  scene.fog = new THREE.Fog(0x05060a, 2, 60);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // ✅ Bright Quest lighting pack (stronger than before)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a2233, 1.45);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.35);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.75, 38);
  fill1.position.set(-7, 3.6, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.55, 34);
  fill2.position.set(7, 3.0, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.35, 22);
  up.position.set(0, 1.6, 0);
  scene.add(up);
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 10;
  line.visible = false;
  line.frustumCulled = false;
  return line;
}

function buildControllers() {
  // Controller objects (events/buttons)
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  // ✅ Parent to rig (important so everything stays “on you”)
  rig.add(controller0);
  rig.add(controller1);

  // Grips (tracked pose)
  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  rig.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  rig.add(grip1);

  // Rays attach to grips
  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller1 connected"); });

  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller1 disconnected"); });

  // Hands (hand tracking)
  const handFactory = new XRHandModelFactory();

  hand0 = renderer.xr.getHand(0);
  hand1 = renderer.xr.getHand(1);
  hand0.add(handFactory.createHandModel(hand0, "mesh"));
  hand1.add(handFactory.createHandModel(hand1, "mesh"));

  rig.add(hand0);
  rig.add(hand1);
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

function getAxes(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    const idx = ax.length >= 4 ? 2 : 0; // Quest thumbstick usually 2/3
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

function getHeadsetYaw() {
  // ✅ Correct XR yaw: use headset world quaternion
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  const forward = -ly;
  const strafe = lx * STRAFE_SIGN;

  const yaw = getHeadsetYaw();
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;

  // Lock to floor
  rig.position.y = 0;

  // 45° snap turn on right stick
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

// ✅ Boot guard: prevents double call issues
let BOOTED = false;

export async function boot() {
  if (BOOTED) return;
  BOOTED = true;

  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");

  await World.build(scene, rig);

  // Safe spawn clamp
  rig.position.y = 0;

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.033, clock.getDelta());
    applyLocomotion(dt);

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
    }
