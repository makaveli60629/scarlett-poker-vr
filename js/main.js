// /js/main.js — Scarlett VR Poker 9.2.2 (GitHub Pages SAFE: no "three" bare imports)
// Fixes: ❌ Failed to resolve module specifier "three"
// by REMOVING XRControllerModelFactory (it imports "three" internally)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const V = new URL(import.meta.url).searchParams.get("v") || (window.__BUILD_V || String(Date.now()));
log("[main] boot v=" + V);

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

// controllers
let c0 = null, c1 = null;
let g0 = null, g1 = null;

// movement tuning
const MOVE_SPEED = 2.25;
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;
let snapArmed = true;

// teleport
let teleport = null;

// pointer (laser)
let rightPointer = null;

// spawn circle
let spawnCircle = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);
  log("[main] VRButton appended ✅");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // preview height (non-VR)
  camera.position.set(0, 1.6, 0);

  // ✅ stronger lighting (less “dark room”)
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
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

  // spawn point
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 3.5);
  player.position.set(spawn.x, 0, spawn.z);

  // ✅ visible spawn circle at your “ultimate spawn spot”
  spawnCircle = makeSpawnCircle(THREE);
  spawnCircle.position.set(spawn.x, 0.01, spawn.z);
  scene.add(spawnCircle);

  // face table
  faceTableNow(false);

  setupXRControls();

  // recenter event from HUD
  window.addEventListener("scarlett-recenter", () => {
    faceTableNow(true);
    log("[main] recenter ✅");
  });

  // XR session start recenter
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

// ---------------- Controllers ----------------
function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  g0 = renderer.xr.getControllerGrip(0);
  g1 = renderer.xr.getControllerGrip(1);
  scene.add(g0, g1);

  // ✅ GitHub Pages SAFE: simple controller grip meshes (no XRControllerModelFactory)
  g0.add(makeGripMesh(THREE));
  g1.add(makeGripMesh(THREE));

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));
  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  // trigger teleport
  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend", () => onSelectEnd(c0));
  c1.addEventListener("selectend", () => onSelectEnd(c1));

  // laser pointer on “right” grip (fallback ok)
  rightPointer = buildLaserPointer(THREE);
  (g1 || g0).add(rightPointer.group);

  log("[main] controllers ready ✅");
}

function makeGripMesh(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.018, 0.10, 10),
    new THREE.MeshStandardMaterial({ color: 0x222a33, roughness: 0.6, metalness: 0.2 })
  );
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.03;
  g.add(body);

  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 0.35 })
  );
  tip.position.z = -0.085;
  g.add(tip);
  return g;
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

// ---------------- Spawn / Facing ----------------
function faceTableNow(xrAware = false) {
  if (!world?.tableFocus) return;

  const pos = new THREE.Vector3(player.position.x, 0, player.position.z);
  const toTable = new THREE.Vector3().subVectors(world.tableFocus, pos);
  const desiredYaw = Math.atan2(toTable.x, toTable.z);

  if (!xrAware) {
    player.rotation.y = desiredYaw;
    return;
  }

  const headYaw = getHeadYaw();
  const delta = desiredYaw - headYaw;
  player.rotation.y += delta;
}

// ---------------- Teleport ----------------
function onSelectStart(controller) {
  if (!isRightHand(controller)) return;
  teleport.active = true;
  teleport.controller = controller;
  teleport.sourceObj = findGripForController(controller) || controller;
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
    faceTableNow(true);
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.hitPoint = null;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
  teleport.controller = null;
  teleport.sourceObj = null;
}

// ---------------- Locomotion ----------------
function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // QUEST AXIS FIX (forward is usually NEGATIVE y)
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

      // ✅ forward = -ay (Quest)
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

  // snap turn
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

  // pointer always
  updateLaserPointer(THREE, rightPointer, teleport, world, camera);

  // teleport arc
  if (teleport.active) {
    const src = teleport.sourceObj || (findControllerByHand("right") || c1);
    updateTeleportArc(THREE, src, teleport, world, camera);
  }
}

// ---------------- Pointer + Teleport visuals ----------------
function buildLaserPointer(THREE) {
  const group = new THREE.Group();
  group.name = "RightLaserPointer";

  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 6;
  group.add(line);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x33ff66 })
  );
  dot.position.set(0, 0, -6);
  group.add(dot);

  group.rotation.x = -0.10;

  return { group, line, dot, hit: new THREE.Vector3() };
}

function updateLaserPointer(THREE, pointer, tp, world, cam) {
  if (!pointer) return;

  const src = tp?.sourceObj || g1 || c1 || cam;

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();
  src.getWorldPosition(origin);
  src.getWorldQuaternion(q);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

  const t = (0.03 - origin.y) / (dir.y || -0.0001);
  const hit = origin.clone().addScaledVector(dir, Math.max(0.1, Math.min(8.0, t)));

  if (world?.roomClamp) {
    hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX, world.roomClamp.maxX);
    hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ, world.roomClamp.maxZ);
  }

  pointer.hit.copy(hit);
  pointer.dot.position.copy(pointer.group.worldToLocal(hit.clone()));

  const dist = origin.distanceTo(hit);
  pointer.line.scale.z = Math.max(0.3, dist);
}

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

  return { active: false, valid: false, hitPoint: null, arcLine, ring, controller: null, sourceObj: null };
}

function updateTeleportArc(THREE, sourceObj, tp, world, cam) {
  tp.arcLine.visible = true;

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();

  if (sourceObj?.getWorldPosition) sourceObj.getWorldPosition(origin);
  if (sourceObj?.getWorldQuaternion) sourceObj.getWorldQuaternion(q);

  const poseLooksBad =
    !isFinite(origin.x) || !isFinite(origin.y) || !isFinite(origin.z) || origin.length() < 0.001;

  if (poseLooksBad) {
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

// ---------------- Spawn circle ----------------
function makeSpawnCircle(THREE) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.36, 48),
    new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.10, 24),
    new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.22 })
  );
  dot.rotation.x = -Math.PI / 2;

  const g = new THREE.Group();
  g.add(ring, dot);
  return g;
}

// ---------------- Loop ----------------
function tick() {
  const dt = clock.getDelta();
  applyLocomotion(dt);
  if (world?.tick) world.tick(dt);
  renderer.render(scene, camera);
                               }
