// js/main.js — VIP Room Core Boot (8.0.7)
// FIXES:
// - Controllers/grips parented to rig (keeps them with you)
// - Ray is forced DOWN + forward (Quest grip often points upward)
// - Boot guard prevents double-boot errors
// - Brighter lighting

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.2;
const STRAFE_RIGHT_IS_RIGHT = 1;

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

  // Brighter light pack
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.35));

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.6, 40);
  fill1.position.set(-6, 3.4, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.4, 38);
  fill2.position.set(6, 3.0, -2);
  scene.add(fill2);

  const centerUp = new THREE.PointLight(0xffffff, 0.35, 22);
  centerUp.position.set(0, 1.4, 0);
  scene.add(centerUp);
}

function makeRayLine() {
  // Ray points forward in its own local space; we force it DOWN by rotating the line
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 10;
  line.visible = false;

  // Force ray to aim downward a bit (fix "laser up")
  line.rotation.x = -0.55; // ~31.5 degrees downward
  line.position.set(0, -0.01, -0.02);

  // Small tip dot (helps visually confirm direction)
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 12, 12),
    new THREE.MeshStandardMaterial({ emissive: 0x00ffaa, emissiveIntensity: 1.2, color: 0x00ffaa })
  );
  dot.position.set(0, 0, -1);
  line.add(dot);

  return line;
}

function buildControllers() {
  const modelFactory = new XRControllerModelFactory();

  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  rig.add(controller0);
  rig.add(controller1);

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
  controller0.addEventListener("disconnected", () => { ray0.visible = false; logLine("ℹ️ controller 0 disconnected"); });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; logLine("ℹ️ controller 1 disconnected"); });
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
    const idx = ax.length >= 4 ? 2 : 0;
    return { x: ax[idx] || 0, y: ax[idx + 1] || 0 };
  }
  return { x: 0, y: 0 };
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
  const strafe = lx * STRAFE_RIGHT_IS_RIGHT;

  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;
  rig.position.y = 0;

  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

export async function boot() {
  if (window.__VIP_BOOTED__) {
    logLine("ℹ️ boot() skipped (already running)");
    return;
  }
  window.__VIP_BOOTED__ = true;

  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  rig.position.y = 0;

  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    applyLocomotion(dt);

    World.update(dt, camera);
    renderer.render(scene, camera);
  });
}
