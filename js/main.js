// /js/main.js — Scarlett VR Poker (FULL ACTIVE, crash-proof)
// Cache-proof (loaded as main.js?v=... from index.html)
// - VRButton
// - Player rig (spawn facing table)
// - Left stick move (relative to head yaw)
// - Right stick snap turn (45°)
// - Right trigger teleport (arc + landing ring)
// - Calls world.tick(dt) safely (won’t die if poker sim crashes)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));

// version passed in from index.html dynamic import
const V = new URL(import.meta.url).searchParams.get("v") || (window.__BUILD_V || "no-v");
log("[main] FULL ACTIVE boot v=" + V);

// ---- GLOBAL ERROR TRAPS (THIS WILL SHOW THE REAL FILE+LINE) ----
window.addEventListener("error", (e) => {
  log(`❌ window.error: ${e?.message || e}`);
  if (e?.error?.stack) log(e.error.stack);
});
window.addEventListener("unhandledrejection", (e) => {
  log(`❌ unhandledrejection: ${e?.reason?.message || e?.reason || e}`);
  if (e?.reason?.stack) log(e.reason.stack);
});

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

// controllers
let c0 = null, c1 = null;

// locomotion tuning
const MOVE_SPEED = 2.25; // m/s
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;

let snapArmed = true;

// teleport system
let teleport = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  log("[main] renderer ok ✅");

  // VR Button
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  log("[main] VRButton appended ✅");

  // Scene / Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // Teleport visuals
  teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  // Load world cache-proof
  try {
    const mod = await import(`./world.js?v=${V}`);
    world = await mod.initWorld({ THREE, scene, log });
    log("[main] world init ✅");
  } catch (e) {
    log("❌ world import/init failed: " + (e?.message || e));
  }

  // Spawn facing table
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 2);
  player.position.set(spawn.x, 0, spawn.z);

  if (world?.tableFocus) {
    const toTable = new THREE.Vector3().subVectors(
      world.tableFocus,
      new THREE.Vector3(spawn.x, 0, spawn.z)
    );
    const yaw = Math.atan2(toTable.x, toTable.z);
    player.rotation.set(0, yaw, 0);
  }

  // XR controllers
  setupXRControls();

  window.addEventListener("resize", onResize);

  // Render loop
  renderer.setAnimationLoop(tick);

  // XR support info
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    log("[main] XR immersive-vr supported = " + ok);
  } else {
    log("[main] navigator.xr missing (normal on many phones)");
  }

  log("[main] FULL ACTIVE ready ✅ v=" + V);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// -------------------- XR CONTROLS --------------------
function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));

  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend", () => onSelectEnd(c0));
  c1.addEventListener("selectend", () => onSelectEnd(c1));

  log("[main] controllers ready ✅");
}

function getGamepad(controller) {
  const src = controller?.userData?.inputSource;
  return src && src.gamepad ? src.gamepad : null;
}

function isRightHand(controller) {
  const src = controller?.userData?.inputSource;
  if (!src) return controller === c1;
  if (src.handedness) return src.handedness === "right";
  return controller === c1;
}

function findControllerByHand(hand) {
  const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
  const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
  return a || b || null;
}

function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// -------------------- TELEPORT --------------------
function onSelectStart(controller) {
  if (!isRightHand(controller)) return;
  teleport.active = true;
}

function onSelectEnd(controller) {
  if (!isRightHand(controller)) return;

  if (teleport.active && teleport.valid && teleport.hitPoint) {
    const p = teleport.hitPoint.clone();

    if (world?.roomClamp) {
      p.x = THREE.MathUtils.clamp(p.x, world.roomClamp.minX, world.roomClamp.maxX);
      p.z = THREE.MathUtils.clamp(p.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }

    player.position.set(p.x, 0, p.z);

    if (world?.tableFocus) {
      const toTable = new THREE.Vector3().subVectors(world.tableFocus, new THREE.Vector3(p.x, 0, p.z));
      player.rotation.y = Math.atan2(toTable.x, toTable.z);
    }
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.hitPoint = null;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
}

// -------------------- LOCOMOTION --------------------
function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // ---- left stick move ----
  const gpL = getGamepad(left);
  if (gpL?.axes?.length >= 2) {
    const x = gpL.axes[2] ?? gpL.axes[0];
    const y = gpL.axes[3] ?? gpL.axes[1];

    const ax = Math.abs(x) > DEADZONE ? x : 0;
    const ay = Math.abs(y) > DEADZONE ? y : 0;

    if (ax || ay) {
      const headYaw = getHeadYaw();
      const forward = new THREE.Vector3(Math.sin(headYaw), 0, Math.cos(headYaw));
      const rightv = new THREE.Vector3(forward.z, 0, -forward.x);

      const move = new THREE.Vector3();
      move.addScaledVector(forward, (-ay) * MOVE_SPEED * dt);
      move.addScaledVector(rightv, (ax) * MOVE_SPEED * dt);

      player.position.add(move);

      if (world?.roomClamp) {
        player.position.x = THREE.MathUtils.clamp(player.position.x, world.roomClamp.minX, world.roomClamp.maxX);
        player.position.z = THREE.MathUtils.clamp(player.position.z, world.roomClamp.minZ, world.roomClamp.maxZ);
      }
    }
  }

  // ---- right stick snap turn ----
  const gpR = getGamepad(right);
  if (gpR?.axes?.length >= 2) {
    const x = gpR.axes[2] ?? gpR.axes[0];
    const ax = Math.abs(x) > 0.65 ? x : 0;

    if (ax === 0) snapArmed = true;
    if (snapArmed && ax !== 0) {
      player.rotation.y += ax > 0 ? -TURN_ANGLE : TURN_ANGLE;
      snapArmed = false;
    }
  }

  // ---- teleport arc update ----
  const rightHand = findControllerByHand("right") || c1;
  if (teleport.active && rightHand) {
    updateTeleportArc(THREE, rightHand, teleport, world);
  }
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

  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const dir = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion();
  controller.getWorldQuaternion(q);
  dir.applyQuaternion(q).normalize();

  const g = -9.8;
  const v = 7.0;
  const step = 0.06;
  const maxT = 2.0;

  const positions = tp.arcLine.geometry.attributes.position.array;
  let hit = null;

  let idx = 0;
  for (let tt = 0; tt <= maxT; tt += step) {
    const p = new THREE.Vector3(
      origin.x + dir.x * v * tt,
      origin.y + dir.y * v * tt + 0.5 * g * tt * tt,
      origin.z + dir.z * v * tt
    );

    positions[idx++] = p.x;
    positions[idx++] = p.y;
    positions[idx++] = p.z;

    if (!hit && p.y <= 0.02) {
      hit = p;
      break;
    }
  }

  while (idx < positions.length) {
    positions[idx] = positions[idx - 3];
    idx++;
  }
  tp.arcLine.geometry.attributes.position.needsUpdate = true;

  if (hit) {
    if (world?.roomClamp) {
      hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX, world.roomClamp.maxX);
      hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }

    tp.valid = true;
    tp.hitPoint = hit;

    tp.ring.visible = true;
    tp.ring.position.set(hit.x, 0.03, hit.z);
    tp.arcLine.visible = true;
  } else {
    tp.valid = false;
    tp.hitPoint = null;
    tp.ring.visible = false;
  }
}

// -------------------- LOOP (SAFE) --------------------
function tick() {
  const dt = clock.getDelta();

  try {
    applyLocomotion(dt);
  } catch (e) {
    log("❌ applyLocomotion crashed: " + (e?.message || e));
    if (e?.stack) log(e.stack);
  }

  try {
    if (world?.tick) world.tick(dt);
  } catch (e) {
    log("❌ world.tick crashed: " + (e?.message || e));
    if (e?.stack) log(e.stack);
  }

  try {
    renderer.render(scene, camera);
  } catch (e) {
    log("❌ render crashed: " + (e?.message || e));
    if (e?.stack) log(e.stack);
  }
}
