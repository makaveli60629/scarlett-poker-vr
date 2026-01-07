// /js/main.js — Scarlett VR Poker — Update 9.2 (FULL FIX)
// - GitHub Pages safe (CDN module imports)
// - VRButton
// - Left stick movement (forward is forward)
// - Right stick snap turn 45°
// - Right trigger teleport (arc + floor ring)
// - Spawns facing the table
// - Loads world.js (room/table/bots/portal machine)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { initWorld } from "./world.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));

log("[ScarlettVR] main.js boot 9.2");

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig: camera is inside a "player" group we move/teleport
const player = new THREE.Group();
const head = new THREE.Group();

init();

async function init() {
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));
  log("[ScarlettVR] VRButton added ✅");

  // scene/camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // lights (so it’s never black)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // init world
  world = await initWorld({ THREE, scene, log });

  // Spawn: use first spawn pad, face table
  const spawn = world.spawnPads?.[0] || new THREE.Vector3(0, 0, 20);
  player.position.set(spawn.x, 0, spawn.z);

  // Face the table (yaw only)
  const toTable = new THREE.Vector3().subVectors(world.tableFocus, new THREE.Vector3(spawn.x, 0, spawn.z));
  const yaw = Math.atan2(toTable.x, toTable.z);
  player.rotation.set(0, yaw, 0);

  // Controllers + locomotion
  setupXRControls();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("[ScarlettVR] Ready ✅ (ENTER VR)");
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// -------------------- CONTROLS --------------------
let c0, c1; // controllers
let teleport = null;

const MOVE_SPEED = 2.25;       // meters/sec
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;

function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  // Teleport visuals attach to RIGHT controller (we’ll detect by handedness)
  teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));

  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  // Teleport trigger: "select"
  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend",   () => onSelectEnd(c0));
  c1.addEventListener("selectend",   () => onSelectEnd(c1));

  log("[ScarlettVR] XR controllers ready");
}

function getGamepad(controller) {
  const src = controller.userData.inputSource;
  return src && src.gamepad ? src.gamepad : null;
}

function isRightHand(controller) {
  const src = controller.userData.inputSource;
  if (!src) return false;
  // Many Quests label hands reliably; if not, fallback by index
  if (src.handedness) return src.handedness === "right";
  return controller === c1;
}

function onSelectStart(controller) {
  if (!isRightHand(controller)) return;
  teleport.active = true;
}

function onSelectEnd(controller) {
  if (!isRightHand(controller)) return;

  // If we have a valid teleport target, move player there
  if (teleport.active && teleport.valid && teleport.hitPoint) {
    const p = teleport.hitPoint;

    // Clamp inside room so you never land in walls
    if (world?.roomClamp) {
      p.x = THREE.MathUtils.clamp(p.x, world.roomClamp.minX, world.roomClamp.maxX);
      p.z = THREE.MathUtils.clamp(p.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }

    player.position.set(p.x, 0, p.z);

    // Optional: keep facing the table after teleport
    const toTable = new THREE.Vector3().subVectors(world.tableFocus, new THREE.Vector3(p.x, 0, p.z));
    const yaw = Math.atan2(toTable.x, toTable.z);
    player.rotation.y = yaw;
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
}

// Movement + snap turn
let snapArmed = true;

function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // ---- Left stick move (forward is forward) ----
  const gpL = getGamepad(left);
  if (gpL && gpL.axes && gpL.axes.length >= 2) {
    const x = gpL.axes[2] ?? gpL.axes[0]; // varies across runtimes
    const y = gpL.axes[3] ?? gpL.axes[1];

    const ax = Math.abs(x) > DEADZONE ? x : 0;
    const ay = Math.abs(y) > DEADZONE ? y : 0;

    if (ax || ay) {
      // Move relative to HEAD yaw (so your forward is where you look)
      const headYaw = getHeadYaw();
      const forward = new THREE.Vector3(Math.sin(headYaw), 0, Math.cos(headYaw));
      const rightv = new THREE.Vector3(forward.z, 0, -forward.x);

      // IMPORTANT: many gamepads report up as -1, down as +1.
      // We want: push forward => move forward, so invert Y.
      const move = new THREE.Vector3();
      move.addScaledVector(forward, (-ay) * MOVE_SPEED * dt);
      move.addScaledVector(rightv, (ax) * MOVE_SPEED * dt);

      player.position.add(move);

      // Clamp inside room
      if (world?.roomClamp) {
        player.position.x = THREE.MathUtils.clamp(player.position.x, world.roomClamp.minX, world.roomClamp.maxX);
        player.position.z = THREE.MathUtils.clamp(player.position.z, world.roomClamp.minZ, world.roomClamp.maxZ);
      }
    }
  }

  // ---- Right stick snap turn 45° ----
  const gpR = getGamepad(right);
  if (gpR && gpR.axes && gpR.axes.length >= 2) {
    const x = gpR.axes[2] ?? gpR.axes[0]; // runtime-dependent
    const ax = Math.abs(x) > 0.65 ? x : 0;

    if (ax === 0) snapArmed = true;
    if (snapArmed && ax !== 0) {
      player.rotation.y += ax > 0 ? -TURN_ANGLE : TURN_ANGLE;
      snapArmed = false;
    }
  }

  // ---- Teleport arc update on right hand ----
  const rightHand = findControllerByHand("right") || c1;
  if (teleport.active) {
    updateTeleportArc(THREE, rightHand, teleport, world);
  }
}

function findControllerByHand(hand) {
  const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
  const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
  return a || b;
}

function getHeadYaw() {
  // camera world quaternion -> yaw
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// -------------------- TELEPORT SYSTEM --------------------
function createTeleportSystem(THREE) {
  const arcMat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.9 });
  const arcGeo = new THREE.BufferGeometry();
  const arcPts = new Float32Array(60 * 3);
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.36, 40),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;

  return { active: false, valid: false, hitPoint: null, arcLine, ring };
}

function updateTeleportArc(THREE, controller, tp, world) {
  tp.arcLine.visible = true;

  // start from controller world position
  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  // direction from controller world quaternion
  const dir = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion();
  controller.getWorldQuaternion(q);
  dir.applyQuaternion(q).normalize();

  // projectile arc
  const g = -9.8;
  const v = 7.0;
  const step = 0.06;
  const maxT = 2.0;

  const positions = tp.arcLine.geometry.attributes.position.array;
  let hit = null;

  let idx = 0;
  for (let t = 0; t <= maxT; t += step) {
    const p = new THREE.Vector3(
      origin.x + dir.x * v * t,
      origin.y + dir.y * v * t + 0.5 * g * t * t,
      origin.z + dir.z * v * t
    );

    positions[idx++] = p.x;
    positions[idx++] = p.y;
    positions[idx++] = p.z;

    // hit floor (y <= 0)
    if (!hit && p.y <= 0.02) {
      hit = p;
      break;
    }
  }

  // fill remaining
  while (idx < positions.length) {
    positions[idx] = positions[idx - 3];
    idx++;
  }
  tp.arcLine.geometry.attributes.position.needsUpdate = true;

  if (hit) {
    // clamp inside room
    if (world?.roomClamp) {
      hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX, world.roomClamp.maxX);
      hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }

    tp.valid = true;
    tp.hitPoint = hit;

    tp.ring.visible = true;
    tp.ring.position.set(hit.x, 0.03, hit.z);
  } else {
    tp.valid = false;
    tp.hitPoint = null;
    tp.ring.visible = false;
  }
}

// -------------------- LOOP --------------------
function tick() {
  const dt = clock.getDelta();
  applyLocomotion(dt);

  if (world?.tick) world.tick(dt);

  renderer.render(scene, camera);
    }
