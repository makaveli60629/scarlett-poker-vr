// /js/main.js — Scarlett VR Poker (9.0 FINAL RIG + TELEPORT FIX, cache-safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const V = new URL(import.meta.url).searchParams.get("v") || "9003";
log("[main] boot v=" + V);

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

let c0 = null, c1 = null;
let g0 = null, g1 = null; // controller grips (often better pose)

// movement tuning
const MOVE_SPEED = 2.25;
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;
let snapArmed = true;

// teleport system
let teleport = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);

  // scene/camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // non-VR preview height
  camera.position.set(0, 1.6, 0);

  // lights (safe)
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

  // spawn position (safe)
  const forcedSpawn = new THREE.Vector3(0, 0, 3.5);
  player.position.set(forcedSpawn.x, 0, forcedSpawn.z);
  player.rotation.set(0, Math.PI, 0);

  // rotate toward table (non-XR)
  faceTableNow();

  // controllers
  setupXRControls();

  // ✅ XR session start recenter (THIS FIXES “spawn facing wall”)
  renderer.xr.addEventListener("sessionstart", () => {
    // give XR a moment to populate headset pose
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

  // controller models (helps on Quest)
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

  log("[main] controllers ready ✅");
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
function findGripForController(controller) {
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

// ==================== SPAWN / RECENTER ====================
// If xrAware=true, we align the *headset forward* to the table direction.
function faceTableNow(xrAware = false) {
  if (!world?.tableFocus) return;

  const pos = new THREE.Vector3(player.position.x, 0, player.position.z);
  const toTable = new THREE.Vector3().subVectors(world.tableFocus, pos);
  const desiredYaw = Math.atan2(toTable.x, toTable.z);

  if (!xrAware) {
    player.rotation.y = desiredYaw;
    return;
  }

  // XR-aware: rotate player so that headset forward ends up facing desiredYaw
  const headYaw = getHeadYaw();
  const delta = desiredYaw - headYaw;
  player.rotation.y += delta;
}

// ==================== TELEPORT ====================
function onSelectStart(controller) {
  if (!isRightHand(controller)) return;

  teleport.active = true;

  // ✅ lock teleport to the controller that pressed trigger
  teleport.controller = controller;
  teleport.grip = findGripForController(controller) || controller;
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

    // after teleport, face table relative to headset
    faceTableNow(true);
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.hitPoint = null;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
  teleport.controller = null;
  teleport.grip = null;
}

// ==================== LOCOMOTION ====================
function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // ---- left stick move (forward is forward) ----
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
      move.addScaledVector(forward, ay * MOVE_SPEED * dt);
      move.addScaledVector(rightv, ax * MOVE_SPEED * dt);

      player.position.add(move);

      // clamp inside room
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

  // ---- teleport arc update (right trigger only) ----
  if (teleport.active) {
    const src = teleport.grip || teleport.controller || (findControllerByHand("right") || c1);
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

  return { active: false, valid: false, hitPoint: null, arcLine, ring, controller: null, grip: null };
}

// If controller pose is bad, fallback to camera-based arc so it never draws from world origin.
function updateTeleportArc(THREE, sourceObj, tp, world, cam) {
  tp.arcLine.visible = true;

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();

  // try controller/grip pose
  if (sourceObj?.getWorldPosition) sourceObj.getWorldPosition(origin);
  if (sourceObj?.getWorldQuaternion) sourceObj.getWorldQuaternion(q);

  const poseLooksBad = !isFinite(origin.x) || !isFinite(origin.y) || !isFinite(origin.z) || origin.length() < 0.001;

  if (poseLooksBad) {
    // fallback to head/gaze
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

// ==================== LOOP ====================
function tick() {
  const dt = clock.getDelta();
  applyLocomotion(dt);
  if (world?.tick) world.tick(dt);
  renderer.render(scene, camera);
}
