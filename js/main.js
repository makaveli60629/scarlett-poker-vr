// js/main.js — Scarlett Poker VR — FIX: Laser follows RIGHT controller (no more stuck at center)
// GitHub Pages safe. No local imports. CDN three + VRButton only.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const hubEl = document.getElementById("hub");
const lines = [];
function hub(msg) {
  lines.push(msg);
  while (lines.length > 16) lines.shift();
  if (hubEl) hubEl.textContent = lines.join("\n");
  console.log(msg);
}
const ok = (m) => hub(`✅ ${m}`);
const warn = (m) => hub(`⚠️ ${m}`);

hub("Booting…");

// ---------- Core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
ok("VRButton added");

// Rig (move this, not camera)
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));

const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(10, 18, 8);
scene.add(sun);

// Headlamp so never black void
const headlamp = new THREE.PointLight(0xffffff, 2.4, 70);
camera.add(headlamp);

// ---------- Simple world ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d2f35, roughness: 0.98, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x1b2636);
grid.position.y = 0.02;
scene.add(grid);

// Spawn away from table
rig.position.set(0, 0, 10);
ok("Spawn set");

// ---------- Controllers + grips ----------
const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);
scene.add(controller0, controller1);

const grip0 = renderer.xr.getControllerGrip(0);
const grip1 = renderer.xr.getControllerGrip(1);
scene.add(grip0, grip1);

// ---------- Thick beam (mesh, always visible) ----------
function makeBeam() {
  const geo = new THREE.CylinderGeometry(0.006, 0.010, 1.2, 10, 1, true);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 2.6,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 9999;
  // beam points forward down -Z: rotate cylinder axis to match
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

const beam = makeBeam();
scene.add(beam);

// Teleport disc + ring (always visible)
const tpDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.28, 44),
  new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
  })
);
tpDisc.rotation.x = -Math.PI / 2;
tpDisc.position.set(rig.position.x, 0.02, rig.position.z);
tpDisc.renderOrder = 9998;
scene.add(tpDisc);

const tpRing = new THREE.Mesh(
  new THREE.RingGeometry(0.30, 0.36, 44),
  new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
  })
);
tpRing.rotation.x = -Math.PI / 2;
tpRing.position.copy(tpDisc.position);
tpRing.renderOrder = 9999;
scene.add(tpRing);

// ---------- XR helpers ----------
function getRightIndex() {
  const session = renderer.xr.getSession?.();
  if (!session) return 0;

  const srcs = session.inputSources || [];
  let idx = 0;

  for (let i = 0; i < srcs.length; i++) {
    if (srcs[i]?.handedness === "right") {
      idx = i;
      break;
    }
  }
  // Clamp to 0/1
  return idx > 1 ? 1 : idx;
}

function getRightPoseObject() {
  // Prefer grip (best on Quest), fallback to controller, fallback to camera
  const idx = getRightIndex();
  const g = idx === 1 ? grip1 : grip0;
  const c = idx === 1 ? controller1 : controller0;

  // If grip is still at origin/no update, controller may still work (or vice versa).
  // We'll just return grip first; if XR not running, return camera.
  return renderer.xr.getSession?.() ? (g || c || camera) : camera;
}

renderer.xr.addEventListener("sessionstart", () => ok("XR session started"));
renderer.xr.addEventListener("sessionend", () => warn("XR session ended"));

// ---------- Ray to floor ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const tmpRot = new THREE.Matrix4();
const origin = new THREE.Vector3();
const direction = new THREE.Vector3();
const hit = new THREE.Vector3();

function clampToRoom(v) {
  v.x = THREE.MathUtils.clamp(v.x, -15.5, 15.5);
  v.z = THREE.MathUtils.clamp(v.z, -15.5, 15.5);
}

// ---------- Movement ----------
const snapAngle = Math.PI / 4;
let snapCD = 0;
const moveSpeed = 2.25;

function getGamepads() {
  const session = renderer.xr.getSession?.();
  if (!session) return { left: null, right: null };

  let left = null,
    right = null;
  for (const src of session.inputSources || []) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }
  return { left, right };
}

function readAxes(gp) {
  const a = gp?.axes || [];
  const p01 = { x: a[0] ?? 0, y: a[1] ?? 0, mag: Math.abs(a[0] ?? 0) + Math.abs(a[1] ?? 0) };
  const p23 = { x: a[2] ?? 0, y: a[3] ?? 0, mag: Math.abs(a[2] ?? 0) + Math.abs(a[3] ?? 0) };
  return p23.mag > p01.mag ? p23 : p01;
}

function readRightTrigger() {
  const session = renderer.xr.getSession?.();
  if (!session) return 0;

  let gp = null;
  for (const s of session.inputSources || []) {
    if (s?.handedness === "right" && s?.gamepad) {
      gp = s.gamepad;
      break;
    }
  }
  if (!gp) return 0;

  const b = gp.buttons || [];
  const v0 = typeof b[0]?.value === "number" ? b[0].value : (b[0]?.pressed ? 1 : 0);
  const v1 = typeof b[1]?.value === "number" ? b[1].value : (b[1]?.pressed ? 1 : 0);
  return Math.max(v0, v1);
}

let teleportPressed = false;

// ---------- Loop ----------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  const { left, right } = getGamepads();

  // Move (left stick) — strafe corrected (left is left, right is right)
  if (left) {
    const { x, y } = readAxes(left);
    const dead = 0.14;
    let mx = Math.abs(x) < dead ? 0 : x;
    let my = Math.abs(y) < dead ? 0 : y;

    // IMPORTANT: invert mx if your device reports swapped strafe
    mx = -mx;

    if (mx || my) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();

      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const next = rig.position.clone();
      next.addScaledVector(rightDir, mx * moveSpeed * dt);
      next.addScaledVector(fwd, -my * moveSpeed * dt);

      clampToRoom(next);
      rig.position.x = next.x;
      rig.position.z = next.z;
    }
  }

  // Snap turn (right stick)
  snapCD = Math.max(0, snapCD - dt);
  if (right) {
    const { x } = readAxes(right);
    if (snapCD <= 0 && Math.abs(x) > 0.65) {
      rig.rotation.y += (x > 0 ? -1 : 1) * snapAngle;
      snapCD = 0.28;
    }
  }

  // === LASER/TELEPORT POSE FIX ===
  // Force beam to follow RIGHT controller pose every frame (world-space)
  const srcObj = getRightPoseObject();
  srcObj.updateMatrixWorld(true);

  // Copy pose (world) into beam (world)
  srcObj.getWorldPosition(origin);
  beam.position.copy(origin);

  // Copy rotation (world) into beam
  beam.quaternion.setFromRotationMatrix(new THREE.Matrix4().extractRotation(srcObj.matrixWorld));

  // Push beam forward so it starts at controller tip instead of inside it
  // Beam is oriented along -Z after rotation.x set earlier, so we offset along -Z in local space:
  const tipOffset = new THREE.Vector3(0, 0, -0.08).applyQuaternion(beam.quaternion);
  beam.position.add(tipOffset);

  // Keep beam centered and extend forward
  // Beam mesh length is 1.2m; we keep it in front of tip:
  const beamForward = new THREE.Vector3(0, 0, -0.6).applyQuaternion(beam.quaternion);
  beam.position.add(beamForward);

  // Raycast from controller forward to floor to place teleport marker
  tmpRot.identity().extractRotation(srcObj.matrixWorld);
  direction.set(0, 0, -1).applyMatrix4(tmpRot).normalize();

  raycaster.set(origin, direction);
  const ray = raycaster.ray;
  const hitPoint = ray.intersectPlane(floorPlane, hit);

  if (hitPoint) {
    clampToRoom(hit);
    tpDisc.position.set(hit.x, 0.02, hit.z);
    tpRing.position.copy(tpDisc.position);
  }

  // Teleport on right trigger press (edge)
  const trig = readRightTrigger();
  const down = trig > 0.75;

  if (down && !teleportPressed) {
    teleportPressed = true;
    rig.position.x = tpDisc.position.x;
    rig.position.z = tpDisc.position.z;
  }
  if (!down) teleportPressed = false;

  renderer.render(scene, camera);
});

// Resize
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

ok("Running (beam follows right-hand pose)");
