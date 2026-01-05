// js/main.js — Scarlett Poker VR Core (8.2)
// Stable XR + Controller + Poker Simulation Bootstrap

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";

// IMPORTANT: new sim name
import { PokerSimulation as PokerSim } from "./poker_simulation_v8_2.js";

/* ------------------------------------------------------------------ */
/* Globals */
/* ------------------------------------------------------------------ */
let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let lastTurnTime = 0;
const SNAP_ANGLE = THREE.MathUtils.degToRad(45);
const SNAP_COOLDOWN = 0.28;
const MOVE_SPEED = 2.2;

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */
function log(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  if (el.textContent.includes("Waiting")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + msg;
}

function ensureApp() {
  return document.getElementById("app") || document.body;
}

function getXRSession() {
  return renderer?.xr?.getSession?.() || null;
}

/* ------------------------------------------------------------------ */
/* Renderer */
/* ------------------------------------------------------------------ */
function buildRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  ensureApp().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

/* ------------------------------------------------------------------ */
/* Scene + Camera */
/* ------------------------------------------------------------------ */
function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 2, 60);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Lighting (Quest friendly, bright but soft)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(5, 10, 4);
  scene.add(dir);

  const fillA = new THREE.PointLight(0x00ffaa, 0.45, 30);
  fillA.position.set(-6, 3, 4);
  scene.add(fillA);

  const fillB = new THREE.PointLight(0xff3366, 0.35, 30);
  fillB.position.set(6, 3, -4);
  scene.add(fillB);
}

/* ------------------------------------------------------------------ */
/* Controllers */
/* ------------------------------------------------------------------ */
function makeRay() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  line.visible = false;
  return line;
}

function buildControllers() {
  const modelFactory = new XRControllerModelFactory();

  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0, controller1);

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  // Rays ATTACHED TO GRIPS (this fixes “laser not on me”)
  ray0 = makeRay();
  ray1 = makeRay();
  ray0.rotation.x = -Math.PI / 6; // point slightly downward
  ray1.rotation.x = -Math.PI / 6;

  grip0.add(ray0);
  grip1.add(ray1);

  controller0.addEventListener("connected", () => {
    ray0.visible = true;
    log("Controller 0 connected");
  });

  controller1.addEventListener("connected", () => {
    ray1.visible = true;
    log("Controller 1 connected (RIGHT HAND)");
  });

  controller0.addEventListener("disconnected", () => (ray0.visible = false));
  controller1.addEventListener("disconnected", () => (ray1.visible = false));
}

/* ------------------------------------------------------------------ */
/* Input */
/* ------------------------------------------------------------------ */
function getAxes(hand) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src.handedness !== hand || !src.gamepad) continue;
    const a = src.gamepad.axes;
    if (!a || a.length < 2) continue;

    const i = a.length >= 4 ? 2 : 0;
    return { x: a[i] || 0, y: a[i + 1] || 0 };
  }
  return { x: 0, y: 0 };
}

/* ------------------------------------------------------------------ */
/* Locomotion */
/* ------------------------------------------------------------------ */
function applyMovement(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const dz = 0.18;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // forward is forward (no inversion)
  const forward = -ly;
  const strafe = lx;

  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.y = 0;

  // snap turn (right stick)
  const t = clock.getElapsedTime();
  if (rx > 0.72 && t - lastTurnTime > SNAP_COOLDOWN) {
    rig.rotation.y -= SNAP_ANGLE;
    lastTurnTime = t;
  } else if (rx < -0.72 && t - lastTurnTime > SNAP_COOLDOWN) {
    rig.rotation.y += SNAP_ANGLE;
    lastTurnTime = t;
  }
}

/* ------------------------------------------------------------------ */
/* Resize */
/* ------------------------------------------------------------------ */
window.addEventListener("resize", () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ */
/* BOOT */
/* ------------------------------------------------------------------ */
export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();

  log("Boot running…");

  await World.build(scene, rig);

  // Poker simulation (SAFE INIT)
  if (PokerSim?.init) {
    PokerSim.init({ scene });
    log("PokerSimulation initialized");
  }

  renderer.xr.addEventListener("sessionstart", () => log("XR session started"));
  renderer.xr.addEventListener("sessionend", () => log("XR session ended"));

  log("Boot finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyMovement(dt);

    if (PokerSim?.update) {
      PokerSim.update(dt, { scene, camera, rig });
    }

    World.update?.(dt, camera);
    renderer.render(scene, camera);
  });
}
