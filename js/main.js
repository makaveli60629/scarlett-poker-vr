// js/main.js — VIP Room Core Boot (8.0.9)
// FIX:
// - Controllers/grips are parented to rig so they stay with you when rig moves (locomotion/teleport)
// - Forward/back correct (Quest) + strafe correct
// - Teleport ray aims DOWN toward floor (comfortable pointer + circle)
// - Trigger to teleport

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

  // Bright lighting pack
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.35));

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.60, 34);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.42, 30);
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
  line.scale.z = 8;
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

  // ✅ IMPORTANT FIX: parent controllers to rig so they move with locomotion
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

  // Trigger teleport
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

// ✅ Correct axis mapping for Quest:
// left stick is axes[0,1], right stick axes[2,3] (when 4 axes exist)
function getStick(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    if (ax.length >= 4) {
      // 0/1 is left stick, 2/3 is right stick
      if (handedness === "left") return { x: ax[0] || 0, y: ax[1] || 0 };
      return { x: ax[2] || 0, y: ax[3] || 0 };
    }
    // fallback
    return { x: ax[0] || 0, y: ax[1] || 0 };
  }
  return { x: 0, y: 0 };
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const dz = 0.16;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  // ✅ Forward is forward, back is back (Quest convention)
  const forward = -ly;   // push forward (negative Y) -> move forward
  const strafe = lx;     // right is right

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;
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

  // Prefer right grip; fallback to left grip
  const source = grip1 || grip0;
  if (!source) return;

  const origin = new THREE.Vector3().setFromMatrixPosition(source.matrixWorld);

  // Aim the ray slightly DOWN so it hits the floor naturally
  const q = source.getWorldQuaternion(new THREE.Quaternion());
  const downPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.55);
  q.multiply(downPitch);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

  raycaster.set(origin, dir);
  const hits = raycaster.intersectObjects(targets, true);

  if (hits && hits.length) {
    const p = hits[0].point.clone();
    p.y = 0;
    teleportHit = p;

    teleportMarker.visible = true;
    teleportMarker.position.set(p.x, 0.02, p.z);

    // Update visible ray length to hit
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

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleportPointer();

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
