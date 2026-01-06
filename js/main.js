// js/main.js — Scarlett Poker VR — FIXED: Right-hand beam follows YOU + strafe inversion fixed
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

// Rig (move this)
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.42));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));

const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(10, 18, 8);
scene.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.2, 60);
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

// ---------- Controllers (targetRay spaces) ----------
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
scene.add(controllers[0], controllers[1]);

// ---------- Thick Beam (always visible) ----------
function makeBeam() {
  const geo = new THREE.CylinderGeometry(0.006, 0.010, 1.2, 10, 1, true);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 9999;
  mesh.rotation.x = Math.PI / 2;     // point down -Z
  mesh.position.set(0, 0, -0.6);     // start at “tip”, not inside you
  return mesh;
}

const beam = makeBeam();
let beamParent = null;

// ---------- Teleport disc + ring ----------
const tpDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.28, 44),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false })
);
tpDisc.rotation.x = -Math.PI / 2;
tpDisc.position.set(rig.position.x, 0.02, rig.position.z);
tpDisc.renderOrder = 9998;
scene.add(tpDisc);

const tpRing = new THREE.Mesh(
  new THREE.RingGeometry(0.30, 0.36, 44),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })
);
tpRing.rotation.x = -Math.PI / 2;
tpRing.position.copy(tpDisc.position);
tpRing.renderOrder = 9999;
scene.add(tpRing);

// ---------- XR helpers ----------
function getRightControllerObject() {
  const session = renderer.xr.getSession?.();
  if (!session) return null;

  // Map handedness -> controller index by inputSources order (common on Quest)
  const srcs = session.inputSources || [];
  let rightIndex = -1;

  for (let i = 0; i < srcs.length; i++) {
    if (srcs[i]?.handedness === "right") { rightIndex = i; break; }
  }

  // If not found, use controller 0 as fallback
  if (rightIndex < 0) rightIndex = 0;

  // Only support 0/1
  if (rightIndex > 1) rightIndex = 1;

  return controllers[rightIndex] || controllers[0];
}

function attachBeamTo(obj, label) {
  if (!obj) return;
  if (beamParent === obj) return;

  if (beamParent) beamParent.remove(beam);
  obj.add(beam);
  beamParent = obj;
  ok(`Beam attached to ${label}`);
}

renderer.xr.addEventListener("sessionstart", () => {
  const rightObj = getRightControllerObject();
  if (rightObj) attachBeamTo(rightObj, "RIGHT controller");
  else attachBeamTo(camera, "CAMERA (fallback)");
});

renderer.xr.addEventListener("sessionend", () => {
  if (beamParent) beamParent.remove(beam);
  beamParent = null;
  warn("XR ended");
});

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

  const { left, right } = getGamepads();

  // Move with LEFT stick (FIXED strafe inversion)
  if (left) {
    const { x, y } = readAxes(left);
    const dead = 0.14;
    let mx = Math.abs(x) < dead ? 0 : x;
    let my = Math.abs(y) < dead ? 0 : y;

    // FIX: invert strafe so stick left goes left, stick right goes right
    mx = -mx;

    if (mx || my) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();

      // rightDir (true right)
      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const next = rig.position.clone();
      next.addScaledVector(rightDir, mx * moveSpeed * dt);
      next.addScaledVector(fwd, -my * moveSpeed * dt);

      clampToRoom(next);
      rig.position.x = next.x;
      rig.position.z = next.z;
    }
  }

  // Snap turn with RIGHT stick
  snapCD = Math.max(0, snapCD - dt);
  if (right) {
    const { x } = readAxes(right);
    if (snapCD <= 0 && Math.abs(x) > 0.65) {
      rig.rotation.y += (x > 0 ? -1 : 1) * snapAngle;
      snapCD = 0.28;
    }
  }

  // Make sure beam is on the actual right controller (not stuck in world center)
  const rightObj = getRightControllerObject();
  if (renderer.xr.getSession?.()) {
    if (rightObj) attachBeamTo(rightObj, "RIGHT controller");
    else attachBeamTo(camera, "CAMERA (fallback)");
  }

  // Raycast from right controller forward to floor
  const srcObj = beamParent || rightObj || camera;
  srcObj.updateMatrixWorld(true);

  tmpRot.identity().extractRotation(srcObj.matrixWorld);
  origin.setFromMatrixPosition(srcObj.matrixWorld);
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

ok("Running");
