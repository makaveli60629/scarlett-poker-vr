// js/main.js — VIP Room Core Boot (8.0.8)
// ADD: Floor teleport pointer (laser to floor + circle + trigger hop)
// KEEP: Snap turn + stick move

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let teleportMarker = null;
let teleportHit = null;
let raycaster = null;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.1;

// If forward/back is reversed for you, flip this: set to 1 or -1.
const FORWARD_INVERT = 1;  // try 1 first; if still reversed set -1
const STRAFE_INVERT = 1;   // your “right is right” fix

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
  scene.fog = new THREE.Fog(0x05060a, 2, 55);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Brighter lighting (Quest)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.60, 32);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.42, 28);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.35, 22);
  up.position.set(0, 1.2, 0);
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
  line.scale.z = 10;
  line.visible = false;
  return line;
}

function makeTeleportMarker() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.18, 28),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.25,
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

  // Trigger hop teleport (works on either controller)
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

function getAxes(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    // Some runtimes store left stick on 2/3; handle both
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

  // NOTE: depending on runtime, forward is often -Y. We provide FORWARD_INVERT.
  const forward = (-ly) * FORWARD_INVERT;
  const strafe = (lx) * STRAFE_INVERT;

  const yaw = rig.rotation.y;
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

  // Use RIGHT grip ray if available, else left
  const source = grip1 || grip0;
  if (!source) return;

  // Ray origin & direction
  const origin = new THREE.Vector3();
  origin.setFromMatrixPosition(source.matrixWorld);

  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(source.getWorldQuaternion(new THREE.Quaternion())).normalize();

  raycaster.set(origin, dir);
  const hits = raycaster.intersectObjects(targets, true);

  if (hits && hits.length) {
    const p = hits[0].point.clone();
    p.y = 0; // floor plane
    teleportHit = p;

    teleportMarker.visible = true;
    teleportMarker.position.set(p.x, 0.02, p.z);

    // Draw laser to hit point (visual)
    const line = (source === grip1) ? ray1 : ray0;
    if (line) {
      const dist = origin.distanceTo(hits[0].point);
      line.scale.z = Math.max(0.5, Math.min(30, dist));
    }
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

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleportPointer();

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
    }
