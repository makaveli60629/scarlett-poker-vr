// js/main.js — Scarlett Poker VR — WebXR-frame driven laser (never stuck at center)
// GitHub Pages safe. Uses vrcontroller.js for ray pose.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { VRController } from "./vrcontroller.js";

const hubEl = document.getElementById("hub");
const logs = [];
function hub(msg) {
  logs.push(msg);
  while (logs.length > 18) logs.shift();
  if (hubEl) hubEl.textContent = logs.join("\n");
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

// Player rig
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// Spawn away from origin/center
rig.position.set(0, 0, 10);
ok("Spawn set");

// ---------- Lighting ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));

const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(10, 18, 8);
scene.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.4, 70);
camera.add(headlamp);
ok("Lights ready");

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

// Marker for center table (optional)
const tableMarker = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 0.10, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9 })
);
tableMarker.position.set(0, 0.95, 0);
scene.add(tableMarker);

// ---------- VRController (XRFrame pose) ----------
VRController.init({ renderer, camera, hub });
ok("VRController ready");

// ---------- Beam (world-space, follows XRFrame pose) ----------
function makeBeam() {
  const geo = new THREE.CylinderGeometry(0.006, 0.010, 1.2, 10, 1, true);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 2.8,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 9999;
  mesh.rotation.x = Math.PI / 2; // align with -Z
  return mesh;
}

const beam = makeBeam();
scene.add(beam);

// Teleport marker
const tpDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.28, 44),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false })
);
tpDisc.rotation.x = -Math.PI / 2;
tpDisc.renderOrder = 9998;
scene.add(tpDisc);

const tpRing = new THREE.Mesh(
  new THREE.RingGeometry(0.30, 0.36, 44),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })
);
tpRing.rotation.x = -Math.PI / 2;
tpRing.renderOrder = 9999;
scene.add(tpRing);

// ---------- Raycast ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const origin = new THREE.Vector3();
const dir = new THREE.Vector3();
const hit = new THREE.Vector3();
const q = new THREE.Quaternion();

function clampToRoom(v) {
  v.x = THREE.MathUtils.clamp(v.x, -15.5, 15.5);
  v.z = THREE.MathUtils.clamp(v.z, -15.5, 15.5);
}

// ---------- Input helpers ----------
const snapAngle = Math.PI / 4;
let snapCD = 0;
const moveSpeed = 2.25;

function getGamepads() {
  const session = renderer.xr.getSession?.();
  if (!session) return { left: null, right: null };

  let left = null, right = null;
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
    if (s?.handedness === "right" && s?.gamepad) { gp = s.gamepad; break; }
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

  // Update XRFrame pose (this is the fix)
  VRController.update();

  const { left, right } = getGamepads();

  // Movement (left stick) with corrected strafe inversion
  if (left) {
    const { x, y } = readAxes(left);
    const dead = 0.14;

    let mx = Math.abs(x) < dead ? 0 : x;
    let my = Math.abs(y) < dead ? 0 : y;

    // Fix: your strafe was reversed
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

  // Ray origin/direction from XRFrame pose
  VRController.getRayOrigin(origin);
  VRController.getRayDirection(dir);
  VRController.getQuat(q);

  // Beam follows pose (world space)
  beam.quaternion.copy(q);

  // Put beam forward from controller so it doesn't sit inside your body
  beam.position.copy(origin);
  const tip = new THREE.Vector3(0, 0, -0.08).applyQuaternion(q);
  const push = new THREE.Vector3(0, 0, -0.60).applyQuaternion(q);
  beam.position.add(tip).add(push);

  // Raycast to floor
  raycaster.set(origin, dir);
  const hitPoint = raycaster.ray.intersectPlane(floorPlane, hit);

  if (hitPoint) {
    clampToRoom(hit);
    tpDisc.position.set(hit.x, 0.02, hit.z);
    tpRing.position.copy(tpDisc.position);
  } else {
    tpDisc.position.set(rig.position.x, 0.02, rig.position.z);
    tpRing.position.copy(tpDisc.position);
  }

  // Teleport on right trigger press
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

ok("Running (XRFrame laser)");
