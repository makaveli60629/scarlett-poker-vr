// /js/main.js — Scarlett VR Poker — VRButton hard-fix + unified THREE
// - Uses local ./three.js (single THREE instance across project)
// - Forces VRButton visible bottom-right
// - Strong error logging (shows up in your Debug log box)
// - Keeps your locomotion/teleport scaffolding hooks

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { initWorld } from "./world.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const err = (m) => (window.__hubLog ? window.__hubLog("❌ " + m) : console.error(m));

log("[ScarlettVR] main.js boot (VRButton hard-fix)");

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

boot().catch((e) => {
  err("Boot failed: " + (e?.message || e));
  console.error(e);
});

// Catch runtime errors and show them in your debug box
window.addEventListener("error", (e) => err("JS Error: " + (e?.message || e)));
window.addEventListener("unhandledrejection", (e) => err("Promise Rejection: " + (e?.reason?.message || e?.reason || e)));

async function boot() {
  // Make sure the page doesn't hide the button
  document.documentElement.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.height = "100%";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VR Button
  const btn = VRButton.createButton(renderer);
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "99999";
  btn.style.maxWidth = "260px";
  btn.style.fontSize = "14px";

  document.body.appendChild(btn);
  log("[ScarlettVR] VRButton appended ✅");

  // Scene / Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // Lights so it's never black
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // Init world
  world = await initWorld({ THREE, scene, log });

  // Spawn: use first spawn pad, face table
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 20);
  player.position.set(spawn.x, 0, spawn.z);

  const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
  faceTargetYawOnly(player, focus);

  // Controllers + locomotion
  setupXRControls();

  // Resize + loop
  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  // Extra: log XR support check
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    log("[ScarlettVR] XR support immersive-vr: " + ok);
  } else {
    err("navigator.xr missing (no WebXR in this browser)");
  }

  log("[ScarlettVR] Ready ✅");
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function faceTargetYawOnly(obj3d, target) {
  const dir = new THREE.Vector3().subVectors(target, obj3d.position);
  dir.y = 0;
  const yaw = Math.atan2(dir.x, dir.z);
  obj3d.rotation.set(0, yaw, 0);
}

// -------------------- CONTROLS (same structure as your current code) --------------------
let c0, c1;
let teleport = null;

const MOVE_SPEED = 2.25;
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;

function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));
  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend", () => onSelectEnd(c0));
  c1.addEventListener("selectend", () => onSelectEnd(c1));

  log("[ScarlettVR] XR controllers ready ✅");
}

function getGamepad(controller) {
  const src = controller.userData.inputSource;
  return src && src.gamepad ? src.gamepad : null;
}

function isRightHand(controller) {
  const src = controller.userData.inputSource;
  if (!src) return false;
  if (src.handedness) return src.handedness === "right";
  return controller === c1;
}

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

    // keep facing table
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    faceTargetYawOnly(player, focus);
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
}

let snapArmed = true;

function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // Left stick move
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

  // Right stick snap turn
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

  // Teleport arc update
  const rightHand = findControllerByHand("right") || c1;
  if (teleport.active) updateTeleportArc(THREE, rightHand, teleport, world);
}

function findControllerByHand(hand) {
  const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
  const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
  return a || b;
}

function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// -------------------- TELEPORT --------------------
function createTeleportSystem(THREE) {
  const arcMat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.9 });
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
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
  for (let t = 0; t <= maxT; t += step) {
    const p = new THREE.Vector3(
      origin.x + dir.x * v * t,
      origin.y + dir.y * v * t + 0.5 * g * t * t,
      origin.z + dir.z * v * t
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
