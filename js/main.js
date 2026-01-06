// js/main.js — 8.2.6 Controller Lock + Rainbow Laser + Always Reticle + Solid Clamp
import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

let controller0, controller1;
let grip0, grip1;

let rayLine;     // rainbow beam on RIGHT hand
let reticle;     // always visible circle
const raycaster = new THREE.Raycaster();
const tmpRot = new THREE.Matrix4();

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.25;
const DEADZONE = 0.18;

// ✅ FIX: clamp was missing
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

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
  scene.fog = new THREE.Fog(0x05060a, 2, 80);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Bright but clean
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.05);
  dir.position.set(4, 10, 6);
  scene.add(dir);
}

function makeRainbowRay() {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
  const geom = new THREE.BufferGeometry().setFromPoints(points);

  // Vertex colors (rainbow)
  const colors = new Float32Array([
    1, 0, 0,  // red
    0, 1, 1,  // cyan
  ]);
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geom, mat);
  line.name = "RainbowRay";
  line.visible = true;
  line.scale.z = 12;
  return line;
}

function buildReticle() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.18, 44),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = true; // ALWAYS visible
  ring.renderOrder = 999;
  scene.add(ring);
  return ring;
}

function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  // Parent to rig so they NEVER drift away from you
  rig.add(controller0);
  rig.add(controller1);

  const modelFactory = new XRControllerModelFactory();
  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  rig.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  rig.add(grip1);

  // Right-hand rainbow ray
  rayLine = makeRainbowRay();
  grip1.add(rayLine);

  reticle = buildReticle();

  controller0.addEventListener("selectstart", () => onSelect());
  controller1.addEventListener("selectstart", () => onSelect());

  controller0.addEventListener("connected", () => logLine("✅ controller0 connected"));
  controller1.addEventListener("connected", () => logLine("✅ controller1 connected"));
}

function onResize() {
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
    return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
  }
  return { x: 0, y: 0 };
}

function dz(v) { return Math.abs(v) > DEADZONE ? v : 0; }

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const lx = dz(left.x);
  const ly = dz(left.y);
  const rx = dz(right.x);

  // You reported forward/back reversed -> flip it
  const forward = ly; // flipped
  const strafe = lx;

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  // snap turn
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }

  // SOLID CLAMP (walls + table)
  World.constrainRig?.(rig);
}

function updateRayAndReticle() {
  const floor = scene.getObjectByName("Floor");

  if (!renderer.xr.isPresenting || !grip1 || !floor) {
    // put reticle 2m ahead
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const p = new THREE.Vector3().copy(rig.position).add(fwd.multiplyScalar(2.0));
    reticle.position.set(p.x, 0.01, p.z);
    return;
  }

  // Ray direction ALWAYS tilted downward
  tmpRot.identity().extractRotation(grip1.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(grip1.matrixWorld);

  let dir = new THREE.Vector3(0, 0, -1).applyMatrix4(tmpRot).normalize();
  dir = new THREE.Vector3(dir.x, -0.55, dir.z).normalize();

  raycaster.set(origin, dir);
  const hits = raycaster.intersectObject(floor, true);

  let target;
  if (hits.length) {
    target = hits[0].point.clone();
  } else {
    target = origin.clone().add(dir.multiplyScalar(6.0));
    target.y = 0.01;
  }

  reticle.position.set(target.x, 0.01, target.z);

  const dist = origin.distanceTo(target);
  rayLine.scale.z = clamp(dist, 0.5, 18);

  // Rainbow shimmer
  const geom = rayLine.geometry;
  const col = geom.getAttribute("color");
  const t = clock.getElapsedTime();
  col.setXYZ(
    1,
    0.5 + 0.5 * Math.sin(t * 2.2),
    0.5 + 0.5 * Math.sin(t * 2.2 + 2.1),
    0.5 + 0.5 * Math.sin(t * 2.2 + 4.2)
  );
  col.needsUpdate = true;
}

function onSelect() {
  rig.position.set(reticle.position.x, 0, reticle.position.z);
  World.constrainRig?.(rig);
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);
  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateRayAndReticle();

    World.update(dt, camera);
    renderer.render(scene, camera);
  });
}
