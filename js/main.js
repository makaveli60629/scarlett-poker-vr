// /js/main.js — Scarlett VR Poker (9.0 FULL FIX)
// - Always face the table (XR-aware recenter)
// - Controller grip models + pointer ray anchored to your hands
// - Teleport arc anchored to RIGHT grip (never stuck at table)
// - Fix forward/back movement inversion
// - Hard room clamp collision
// - Calls world.tick(dt)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const V = new URL(import.meta.url).searchParams.get("v") || "9009";
log("[main] boot v=" + V);

let renderer, scene, camera, world = null;
const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

// controllers + grips
let c0 = null, c1 = null;
let g0 = null, g1 = null;

// pointer rays
let rayL = null, rayR = null;

// locomotion
const MOVE_SPEED = 2.25;
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;
let snapArmed = true;

// teleport visuals/system
let teleport = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button
  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // non-VR preview height
  camera.position.set(0, 1.6, 0);

  // safe lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(6, 10, 4);
  scene.add(key);

  // teleport visuals
  teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  // load world
  try {
    const mod = await import(`./world.js?v=${encodeURIComponent(V)}`);
    world = await mod.initWorld({ THREE, scene, log, v: V });
    log("[main] world init ✅");
  } catch (e) {
    log("❌ world import/init failed: " + (e?.message || e));
  }

  // spawn (world may override with safe spawn)
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 3.5);
  player.position.set(spawn.x, 0, spawn.z);

  // face table (non-XR initial)
  faceTableNow(false);

  // controllers
  setupXRControls();

  // XR session start: recenter so headset forward faces table
  renderer.xr.addEventListener("sessionstart", () => {
    setTimeout(() => {
      faceTableNow(true);
      log("[main] sessionstart recenter ✅");
    }, 60);
  });

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("[main] ready ✅ v=" + V);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// ==================== CONTROLLERS ====================
function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  g0 = renderer.xr.getControllerGrip(0);
  g1 = renderer.xr.getControllerGrip(1);
  scene.add(g0, g1);

  const modelFactory = new XRControllerModelFactory();
  g0.add(modelFactory.createControllerModel(g0));
  g1.add(modelFactory.createControllerModel(g1));

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));
  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  // teleport trigger
  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend", () => onSelectEnd(c0));
  c1.addEventListener("selectend", () => onSelectEnd(c1));

  // pointer rays (anchored to grips, updated every frame)
  rayL = makeHandRay(THREE, 0x33ff66);
  rayR = makeHandRay(THREE, 0x33ff66);
  g0.add(rayL);
  g1.add(rayR);

  log("[main] controllers ready ✅");
}

function makeHandRay(THREE, color) {
  const pts = new Float32Array([0, 0, 0, 0, 0, -1.2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  line.frustumCulled = false;
  return line;
}

function getGamepad(controller) {
  const src = controller?.userData?.inputSource;
  return src && src.gamepad ? src.gamepad : null;
}
function isRightHand(controller) {
  const src = controller?.userData?.inputSource;
  if (!src) return controller === c1;
  return src.handedness ? src.handedness === "right" : controller === c1;
}
function findControllerByHand(hand) {
  const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
  const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
  return a || b || null;
}
function gripForController(controller) {
  if (controller === c0) return g0;
  if (controller === c1) return g1;
  return null;
}
function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ==================== FACE TABLE ====================
function faceTableNow(xrAware = false) {
  if (!world?.tableFocus) return;

  const pos = new THREE.Vector3(player.position.x, 0, player.position.z);
  const toTable = new THREE.Vector3().subVectors(world.tableFocus, pos);
  const desiredYaw = Math.atan2(toTable.x, toTable.z);

  if (!xrAware) {
    player.rotation.y = desiredYaw;
    return;
  }

  // XR-aware: rotate player so headset forward aligns to desiredYaw
  const headYaw = getHeadYaw();
  player.rotation.y += (desiredYaw - headYaw);
}

// ==================== TELEPORT ====================
function onSelectStart(controller) {
  if (!isRightHand(controller)) return;

  teleport.active = true;
  teleport.controller = controller;
  teleport.source = gripForController(controller) || controller; // ✅ grip first
}

function onSelectEnd(controller) {
  if (!isRightHand(controller)) return;

  if (teleport.active && teleport.valid && teleport.hitPoint) {
    const p = teleport.hitPoint.clone();

    // Hard clamp inside room
    if (world?.roomClamp) {
      const m = world.roomClampMargin ?? 0.25;
      p.x = THREE.MathUtils.clamp(p.x, world.roomClamp.minX + m, world.roomClamp.maxX - m);
      p.z = THREE.MathUtils.clamp(p.z, world.roomClamp.minZ + m, world.roomClamp.maxZ - m);
    }

    player.position.set(p.x, 0, p.z);
    faceTableNow(true);
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.hitPoint = null;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
  teleport.controller = null;
  teleport.source = null;
}

// ==================== LOCOMOTION ====================
function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // ---- left stick move (FIXED: forward/back correct) ----
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

      // ✅ Most controllers: push forward => y is NEGATIVE.
      // We want push forward => move forward, so use (-ay).
      const move = new THREE.Vector3();
      move.addScaledVector(forward, (-ay) * MOVE_SPEED * dt);
      move.addScaledVector(rightv, (ax) * MOVE_SPEED * dt);

      // hard clamp
      const next = player.position.clone().add(move);
      if (world?.roomClamp) {
        const m = world.roomClampMargin ?? 0.25;
        next.x = THREE.MathUtils.clamp(next.x, world.roomClamp.minX + m, world.roomClamp.maxX - m);
        next.z = THREE.MathUtils.clamp(next.z, world.roomClamp.minZ + m, world.roomClamp.maxZ - m);
      }
      player.position.copy(next);
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

  // ---- teleport arc update (anchored to RIGHT grip) ----
  if (teleport.active) {
    const src = teleport.source || (gripForController(findControllerByHand("right") || c1) || c1);
    updateTeleportArc(THREE, src, teleport, world, camera);
  }
}

// ==================== TELEPORT VISUALS ====================
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

  return { active: false, valid: false, hitPoint: null, arcLine, ring, controller: null, source: null };
}

function updateTeleportArc(THREE, sourceObj, tp, world, cam) {
  tp.arcLine.visible = true;

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();

  if (sourceObj?.getWorldPosition) sourceObj.getWorldPosition(origin);
  if (sourceObj?.getWorldQuaternion) sourceObj.getWorldQuaternion(q);

  // if pose is bad, fallback to head
  const bad = !isFinite(origin.x) || !isFinite(origin.y) || !isFinite(origin.z) || origin.length() < 0.001;
  if (bad) {
    cam.getWorldPosition(origin);
    cam.getWorldQuaternion(q);
  }

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

  const g = -9.8, v = 7.0, step = 0.06, maxT = 2.0;
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

    if (!hit && p.y <= 0.02) { hit = p; break; }
  }

  while (idx < positions.length) {
    positions[idx] = positions[idx - 3];
    idx++;
  }
  tp.arcLine.geometry.attributes.position.needsUpdate = true;

  if (hit) {
    if (world?.roomClamp) {
      const m = world.roomClampMargin ?? 0.25;
      hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX + m, world.roomClamp.maxX - m);
      hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ + m, world.roomClamp.maxZ - m);
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

// ==================== LOOP ====================
function tick() {
  const dt = clock.getDelta();
  applyLocomotion(dt);
  if (world?.tick) world.tick(dt);
  renderer.render(scene, camera);
    }
