// /js/main.js — Scarlett VR Poker — Update 9.1 (Controls + Spawn Facing + Teleport Laser)
// Uses import-map in index.html, so "three" specifier is SAFE now.

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

import { initWorld } from "./world.js";

const log = (m) => {
  console.log(m);
  try { window.__hubLog?.(String(m)); } catch {}
};

let scene, camera, renderer, rig, clock;
let world;

const MOVE_SPEED = 2.4;
const SNAP_DEG = 45;
const SNAP_COOLDOWN = 0.22;
let snapCooldown = 0;

let leftController, rightController;
let leftGP = null, rightGP = null;

// teleport visuals
let laserLine, targetRing;
let teleportTarget = new THREE.Vector3();
let hasTeleportTarget = false;
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpOrigin = new THREE.Vector3();

// floor plane y=0
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

boot().catch((e) => {
  log("❌ BOOT FAILED: " + (e?.message || e));
  console.error(e);
});

async function boot() {
  log("[ScarlettVR] main.js boot 9.1");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.04, 200);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  log("[ScarlettVR] VRButton added ✅");

  rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  addLights();

  clock = new THREE.Clock();

  // build world
  world = await initWorld({ THREE, scene, log });

  // controllers + locomotion + teleport
  setupControllers();

  // spawn at pad and face table
  spawnAtLobbyPad();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("[ScarlettVR] boot complete ✅");
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.8));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(10, 12, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-10, 8, -8);
  scene.add(fill);

  const glow = new THREE.PointLight(0x33ff66, 0.35, 24);
  glow.position.set(0, 2.4, 18);
  scene.add(glow);
}

function setupControllers() {
  leftController = renderer.xr.getController(0);
  rightController = renderer.xr.getController(1);
  scene.add(leftController);
  scene.add(rightController);

  // Laser line attached to right controller
  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x33ff66 });
  laserLine = new THREE.Line(laserGeom, laserMat);
  laserLine.scale.z = 10;
  rightController.add(laserLine);

  // Target ring on floor
  targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.28, 40),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.visible = false;
  scene.add(targetRing);

  // Trigger teleport (select)
  rightController.addEventListener("selectstart", () => {
    if (!hasTeleportTarget) return;
    // move rig to target (keep y=0)
    rig.position.set(teleportTarget.x, 0, teleportTarget.z);
    faceTable();
  });

  // Also allow squeeze to teleport (some controllers prefer it)
  rightController.addEventListener("squeezestart", () => {
    if (!hasTeleportTarget) return;
    rig.position.set(teleportTarget.x, 0, teleportTarget.z);
    faceTable();
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);

  // refresh gamepads each frame
  readGamepads();

  // movement & snap turn
  updateLocomotion(dt);

  // teleport aim ring
  updateTeleportAim();

  // world animation
  world?.tick?.(dt);

  renderer.render(scene, camera);
}

function readGamepads() {
  leftGP = null;
  rightGP = null;

  const session = renderer.xr.getSession();
  if (!session) return;

  for (const src of session.inputSources) {
    if (!src.gamepad) continue;
    if (src.handedness === "left") leftGP = src.gamepad;
    if (src.handedness === "right") rightGP = src.gamepad;
  }
}

function updateLocomotion(dt) {
  // LEFT stick move — FIXED: forward/back is correct relative to where you look
  if (leftGP?.axes?.length >= 2) {
    // Many headsets expose sticks differently; we support both layouts.
    const ax = pickAxis(leftGP.axes, "x");     // strafe
    const ay = pickAxis(leftGP.axes, "y");     // forward/back

    const dead = 0.12;
    const strafe = Math.abs(ax) < dead ? 0 : ax;
    const forward = Math.abs(ay) < dead ? 0 : ay;

    if (strafe || forward) {
      // Use camera yaw so "forward" matches your head direction
      const yaw = getCameraYaw();
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      // IMPORTANT: forward should move you forward, so we use +forward
      // and we invert ay in pickAxis so it behaves as expected.
      rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
      rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;

      // clamp inside room so you never walk through walls
      const c = world?.roomClamp;
      if (c) {
        rig.position.x = clamp(rig.position.x, c.minX, c.maxX);
        rig.position.z = clamp(rig.position.z, c.minZ, c.maxZ);
      }
    }
  }

  // RIGHT stick snap turn 45°
  if (rightGP?.axes?.length >= 2) {
    snapCooldown = Math.max(0, snapCooldown - dt);
    const rx = pickAxis(rightGP.axes, "x");
    const dead = 0.55;

    if (snapCooldown === 0) {
      if (rx > dead) {
        rig.rotation.y -= THREE.MathUtils.degToRad(SNAP_DEG);
        snapCooldown = SNAP_COOLDOWN;
      } else if (rx < -dead) {
        rig.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG);
        snapCooldown = SNAP_COOLDOWN;
      }
    }
  }
}

// Chooses axis layout robustly across Quest/browser variations.
// We also invert Y so pushing stick forward yields positive forward movement.
function pickAxis(axes, which) {
  // Common layouts:
  // - [x, y]
  // - [0,0,x,y]
  if (axes.length >= 4) {
    const x = axes[2];
    const y = axes[3];
    if (which === "x") return x ?? axes[0] ?? 0;
    if (which === "y") return -(y ?? axes[1] ?? 0);
  } else {
    const x = axes[0] ?? 0;
    const y = axes[1] ?? 0;
    if (which === "x") return x;
    if (which === "y") return -y;
  }
  return 0;
}

function updateTeleportAim() {
  hasTeleportTarget = false;
  targetRing.visible = false;

  if (!rightController) return;

  // Laser direction from controller
  tmpMat.identity().extractRotation(rightController.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
  tmpOrigin.setFromMatrixPosition(rightController.matrixWorld);

  raycaster.ray.origin.copy(tmpOrigin);
  raycaster.ray.direction.copy(tmpDir);

  const hit = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(floorPlane, hit);
  if (!ok) return;

  // must be inside playable area
  const c = world?.roomClamp;
  if (c) {
    if (hit.x < c.minX || hit.x > c.maxX || hit.z < c.minZ || hit.z > c.maxZ) return;
  }

  teleportTarget.copy(hit);
  hasTeleportTarget = true;

  // Update laser length
  const dist = tmpOrigin.distanceTo(hit);
  laserLine.scale.z = Math.max(0.25, dist);

  // Update ring
  targetRing.position.set(hit.x, 0.02, hit.z);
  targetRing.visible = true;
}

function spawnAtLobbyPad() {
  const p = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 18);
  rig.position.set(p.x, 0, p.z);
  faceTable();
}

function faceTable() {
  const focus = world?.tableFocus || new THREE.Vector3(0, 0, 6);
  const dx = focus.x - rig.position.x;
  const dz = focus.z - rig.position.z;
  const yaw = Math.atan2(dx, dz);
  rig.rotation.set(0, yaw, 0);
}

function getCameraYaw() {
  // camera world yaw (so movement follows head direction)
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
  }
