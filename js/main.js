// js/main.js — Scarlett Poker VR — WORKING MOVE + CONTROLLERS + RIGHT-HAND LASER + TELEPORT
// GitHub Pages safe. No local imports. CDN three + VRButton + controller models.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const hubEl = document.getElementById("hub");
const lines = [];
function hub(msg) {
  lines.push(msg);
  while (lines.length > 18) lines.shift();
  if (hubEl) hubEl.textContent = lines.join("\n");
  console.log(msg);
}
const ok = (m) => hub(`✅ ${m}`);
const warn = (m) => hub(`⚠️ ${m}`);

hub("Booting…");

// ---------- Core three ----------
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

// ---------- Lights (anti-black) ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.40));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.05));

const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(10, 18, 8);
scene.add(sun);

// Headlamp so you never get a black void
const headlamp = new THREE.PointLight(0xffffff, 2.2, 50);
camera.add(headlamp);
ok("Lights ready");

// ---------- World (simple but stable) ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d2f35, roughness: 0.98, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x1b2636);
grid.position.y = 0.02;
scene.add(grid);

// Walls
function wall(w, h, x, y, z, ry) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.98, metalness: 0.0 })
  );
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
}
wall(34, 9.5, 0, 4.75, -17, 0);
wall(34, 9.5, 0, 4.75,  17, Math.PI);
wall(34, 9.5, 17, 4.75, 0, -Math.PI / 2);
wall(34, 9.5, -17, 4.75, 0, Math.PI / 2);

// Table + chairs (kept)
const tableGroup = new THREE.Group();
scene.add(tableGroup);

const felt = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 });
const rail = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.1 });
const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 48), felt);
tableTop.position.y = 0.95;
tableGroup.add(tableTop);

const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 56), rail);
tableRail.rotation.x = Math.PI / 2;
tableRail.position.y = 1.05;
tableGroup.add(tableRail);

const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), rail);
pedestal.position.y = 0.45;
tableGroup.add(pedestal);

// Chairs ring
const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  const chair = new THREE.Group();
  chair.position.set(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1);
  chair.rotation.y = -a + Math.PI / 2;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
  seat.position.y = 0.45;
  chair.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), chairMat);
  back.position.set(0, 0.75, -0.23);
  chair.add(back);

  // legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);
  for (const [lx, ly, lz] of [[0.22,0.22,0.22],[-0.22,0.22,0.22],[0.22,0.22,-0.22],[-0.22,0.22,-0.22]]) {
    const leg = new THREE.Mesh(legGeo, chairMat);
    leg.position.set(lx, ly, lz);
    chair.add(leg);
  }

  scene.add(chair);
}

// Spawn away from table
rig.position.set(0, 0, 10);
ok("Spawn set");

// ---------- Controller models (so you can SEE hands) ----------
let XRControllerModelFactory = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js");
  XRControllerModelFactory = m.XRControllerModelFactory;
  ok("ControllerModelFactory loaded");
} catch {
  warn("ControllerModelFactory failed (controllers may be invisible)");
}

const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);
scene.add(controller0, controller1);

// Grips are where the actual controller model attaches
const grip0 = renderer.xr.getControllerGrip(0);
const grip1 = renderer.xr.getControllerGrip(1);
scene.add(grip0, grip1);

if (XRControllerModelFactory) {
  const factory = new XRControllerModelFactory();
  grip0.add(factory.createControllerModel(grip0));
  grip1.add(factory.createControllerModel(grip1));
  ok("Controller models attached");
}

// ---------- RIGHT-HAND LASER + TELEPORT ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const origin = new THREE.Vector3();
const direction = new THREE.Vector3();
const hit = new THREE.Vector3();

const tpRing = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
tpRing.rotation.x = -Math.PI / 2;
tpRing.position.set(rig.position.x, 0.02, rig.position.z);
scene.add(tpRing);

// Laser line (we will attach it to RIGHT controller object)
const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const laserLine = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00ff66 }));
laserLine.scale.z = 12;
laserLine.visible = true;

// We will resolve which controller is right-hand every frame using inputSources
let rightControllerObj = controller0; // fallback

function getRightControllerObj() {
  const session = renderer.xr.getSession?.();
  if (!session) return rightControllerObj;

  // Map handedness -> controller index (0 or 1) by comparing to XR controller objects
  // In practice: inputSources order usually matches getController(index)
  const srcs = session.inputSources || [];

  // Default fallback: controller0
  let idx = 0;

  for (let i = 0; i < srcs.length; i++) {
    const s = srcs[i];
    if (s?.handedness === "right") { idx = i; break; }
  }

  return idx === 1 ? controller1 : controller0;
}

function attachLaser() {
  // remove from any parent
  if (laserLine.parent) laserLine.parent.remove(laserLine);

  rightControllerObj = getRightControllerObj();
  rightControllerObj.add(laserLine);

  // small offset so it starts near the tip
  laserLine.position.set(0, 0, 0);
  ok("Laser attached to RIGHT controller");
}

renderer.xr.addEventListener("sessionstart", () => {
  ok("XR session started");
  attachLaser();
});

renderer.xr.addEventListener("sessionend", () => {
  warn("XR session ended");
  if (laserLine.parent) laserLine.parent.remove(laserLine);
});

// Teleport trigger state
let teleportPressed = false;

function readTriggerFromRight() {
  const session = renderer.xr.getSession?.();
  if (!session) return 0;

  const srcs = session.inputSources || [];
  let right = null;
  for (const s of srcs) {
    if (s?.handedness === "right" && s.gamepad) { right = s.gamepad; break; }
  }
  // fallback if right not found
  if (!right) {
    for (const s of srcs) { if (s?.gamepad) { right = s.gamepad; break; } }
  }
  if (!right) return 0;

  // Quest trigger often button[0] value
  const b = right.buttons || [];
  const v0 = typeof b[0]?.value === "number" ? b[0].value : (b[0]?.pressed ? 1 : 0);
  const v1 = typeof b[1]?.value === "number" ? b[1].value : (b[1]?.pressed ? 1 : 0);
  return Math.max(v0, v1);
}

// ---------- Movement (keep what works) ----------
const snapAngle = Math.PI / 4;
let snapCD = 0;
const moveSpeed = 2.25;

function getPads() {
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

function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -15.5, 15.5);
  pos.z = THREE.MathUtils.clamp(pos.z, -15.5, 15.5);
}

// ---------- Loop ----------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  const { left, right } = getPads();

  // Move with LEFT stick
  if (left) {
    const { x, y } = readAxes(left);
    const dead = 0.14;
    const mx = Math.abs(x) < dead ? 0 : x;
    const my = Math.abs(y) < dead ? 0 : y;

    if (mx || my) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();

      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1);

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

  // Ensure laser stays on right controller (in case handedness swaps)
  const currentRight = getRightControllerObj();
  if (currentRight !== rightControllerObj) {
    attachLaser();
  }

  // Raycast from right controller forward to floor
  rightControllerObj.updateMatrixWorld(true);
  tmpMat.identity().extractRotation(rightControllerObj.matrixWorld);

  origin.setFromMatrixPosition(rightControllerObj.matrixWorld);
  direction.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

  // Build ray against infinite floor plane
  raycaster.set(origin, direction);

  // Intersect plane y=0
  const ray = raycaster.ray;
  const hitPoint = ray.intersectPlane(floorPlane, hit);

  if (hitPoint) {
    clampToRoom(hit);
    tpRing.position.set(hit.x, 0.02, hit.z);
  }

  // Teleport: press right trigger (edge-detect)
  const trig = readTriggerFromRight();
  const down = trig > 0.75;

  if (down && !teleportPressed) {
    teleportPressed = true;
    rig.position.x = tpRing.position.x;
    rig.position.z = tpRing.position.z;
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

ok("Loop running");
