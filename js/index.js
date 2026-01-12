// /js/index.js — Scarlett INPUT FIX 8.0
// ✅ Movement restored on Quest (robust axes mapping; handedness optional)
// ✅ Right stick 45° snap-turn restored
// ✅ Laser will NOT stick in center; uses best controller pose each frame
// ✅ Teleport works (trigger/selectstart)

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "INPUT FIX 8.0 (Quest sticks + laser pose resolver)";
console.log("[index]", BUILD);

let scene, camera, renderer, player, clock;

// movement tuning
const MOVE_SPEED = 2.8;
const DEAD_MOVE = 0.14;
const DEAD_TURN = 0.20;

const SNAP_ANGLE = Math.PI / 4;    // 45°
const SNAP_DEAD = 0.75;
const SNAP_CD = 0.22;
let snapCooldown = 0;

// teleport / laser
const tp = {
  raycaster: null,
  marker: null,
  c0: null,
  c1: null,
  line0: null,
  line1: null,
  hit: null,
  tmpM: null,
  tmpO: null,
  tmpD: null,
};

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 600);

  player = new THREE.Group();
  scene.add(player);
  player.add(camera);
  camera.position.set(0, 1.65, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // build your world
  World.build({ THREE, scene, log: console.log });

  // spawn at VIP cube (World.getSpawn already returns it in your latest world.js)
  resetSpawn();

  // install controllers + laser
  installTeleportLaser();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetSpawn();
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function resetSpawn() {
  const s = World.getSpawn?.("vip_cube") || World.getSpawn?.() || { x: 0, y: 0, z: 8, yaw: Math.PI };
  player.position.set(s.x, s.y ?? 0, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
}

// ---------------------
// LOOP
// ---------------------
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);

  moveXR(dt);
  updateLaser(dt);

  renderer.render(scene, camera);
}

// ---------------------
// MOVEMENT (ROBUST QUEST MAPPING)
// ---------------------
function moveXR(dt) {
  if (!renderer.xr.isPresenting) return;

  const session = renderer.xr.getSession?.();
  if (!session) return;

  // Collect usable inputSources
  const sources = [];
  for (const src of session.inputSources) {
    const gp = src?.gamepad;
    if (!gp || !gp.axes) continue;
    sources.push({ src, gp });
  }
  if (!sources.length) return;

  // Prefer handedness if present, but DO NOT REQUIRE it.
  const leftSrc  = sources.find(s => s.src.handedness === "left")  || null;
  const rightSrc = sources.find(s => s.src.handedness === "right") || null;

  // Helper: choose the best stick pair from a gamepad: either (0,1) or (2,3)
  const pickStick = (gp) => {
    const a = gp.axes || [];
    const x01 = a[0] ?? 0, y01 = a[1] ?? 0;
    const x23 = a[2] ?? 0, y23 = a[3] ?? 0;

    const m01 = Math.abs(x01) + Math.abs(y01);
    const m23 = Math.abs(x23) + Math.abs(y23);

    // If the gp only has 2 axes, treat those as the stick.
    if (a.length <= 2) return { x: x01, y: y01, pair: "01" };

    return (m23 > m01) ? { x: x23, y: y23, pair: "23" } : { x: x01, y: y01, pair: "01" };
  };

  // Decide MOVE source:
  // 1) left hand if available
  // 2) otherwise the source with strongest stick magnitude this frame
  let moveSource = leftSrc;
  if (!moveSource) {
    let best = null, bestMag = 0;
    for (const s of sources) {
      const st = pickStick(s.gp);
      const mag = Math.abs(st.x) + Math.abs(st.y);
      if (mag > bestMag) { bestMag = mag; best = s; }
    }
    moveSource = best || sources[0];
  }

  // Decide TURN source:
  // 1) right hand if available
  // 2) otherwise, use a different source than moveSource if possible
  let turnSource = rightSrc;
  if (!turnSource) {
    turnSource = sources.find(s => s !== moveSource) || moveSource;
  }

  // Read move stick
  const mv = pickStick(moveSource.gp);
  let mx = dz(mv.x, DEAD_MOVE);
  let my = dz(mv.y, DEAD_MOVE);

  // Read turn stick X:
  // Try to use the *other* pair from turnSource if it has 4 axes, otherwise use its main stick X.
  const aT = turnSource.gp.axes || [];
  let turnX = 0;
  if (aT.length >= 4) {
    // If mv used 01, try turn from 23, else from 01
    const prefer23 = (mv.pair === "01");
    const cand = prefer23 ? (aT[2] ?? 0) : (aT[0] ?? 0);
    // If cand is tiny, fall back to whichever is larger
    const alt  = prefer23 ? (aT[0] ?? 0) : (aT[2] ?? 0);
    turnX = dz((Math.abs(cand) > Math.abs(alt) ? cand : alt), DEAD_TURN);
  } else {
    turnX = dz(aT[0] ?? 0, DEAD_TURN);
  }

  // Snap turn
  snapCooldown -= dt;
  if (snapCooldown <= 0) {
    if (turnX > SNAP_DEAD) {
      player.rotation.y -= SNAP_ANGLE;
      snapCooldown = SNAP_CD;
    } else if (turnX < -SNAP_DEAD) {
      player.rotation.y += SNAP_ANGLE;
      snapCooldown = SNAP_CD;
    }
  }

  // Move relative to headset yaw
  if (mx || my) {
    const heading = getHeadYaw();
    const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const r = new THREE.Vector3(f.z, 0, -f.x);

    // On most gamepads: Y is +down, so invert for forward.
    const v = new THREE.Vector3()
      .addScaledVector(r, mx)
      .addScaledVector(f, -my);

    if (v.lengthSq() > 1e-6) {
      v.normalize().multiplyScalar(MOVE_SPEED * dt);
      player.position.add(v);
    }
  }
}

function dz(v, d) { return Math.abs(v) < d ? 0 : v; }

function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ---------------------
// LASER / TELEPORT (POSE RESOLVER)
// ---------------------
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();

  // marker ring
  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.92 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  // controllers
  tp.c0 = renderer.xr.getController(0);
  tp.c1 = renderer.xr.getController(1);
  scene.add(tp.c0, tp.c1);

  // laser lines (hidden by default)
  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  tp.line0 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.line0.scale.z = 12;
  tp.line0.visible = false;
  tp.c0.add(tp.line0);

  tp.line1 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.line1.scale.z = 12;
  tp.line1.visible = false;
  tp.c1.add(tp.line1);

  // Teleport on select (trigger)
  const teleport = () => {
    if (!tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
  };

  tp.c0.addEventListener("selectstart", teleport);
  tp.c1.addEventListener("selectstart", teleport);
}

function updateLaser() {
  if (!renderer.xr.isPresenting) {
    tp.marker.visible = false;
    tp.hit = null;
    tp.line0.visible = false;
    tp.line1.visible = false;
    return;
  }

  // Choose the best controller pose EACH FRAME:
  // If a controller has identity matrix (not tracked), it effectively sits at origin.
  const cands = [];

  if (controllerHasPose(tp.c1)) cands.push({ c: tp.c1, line: tp.line1 });
  if (controllerHasPose(tp.c0)) cands.push({ c: tp.c0, line: tp.line0 });

  // If neither has a valid pose, hide everything (prevents center-stuck laser)
  if (!cands.length) {
    tp.marker.visible = false;
    tp.hit = null;
    tp.line0.visible = false;
    tp.line1.visible = false;
    return;
  }

  // Show lasers only for candidates
  tp.line0.visible = cands.some(x => x.c === tp.c0);
  tp.line1.visible = cands.some(x => x.c === tp.c1);

  const floors = World.getFloors ? World.getFloors() : [];
  tp.hit = null;

  for (const { c } of cands) {
    tp.tmpM.identity().extractRotation(c.matrixWorld);
    tp.tmpO.setFromMatrixPosition(c.matrixWorld);
    tp.tmpD.set(0, 0, -1).applyMatrix4(tp.tmpM).normalize();

    tp.raycaster.set(tp.tmpO, tp.tmpD);
    const hits = tp.raycaster.intersectObjects(floors, true);

    if (hits?.length) {
      const p = hits[0].point;
      tp.hit = p;
      tp.marker.position.set(p.x, p.y + 0.02, p.z);
      tp.marker.visible = true;
      return;
    }
  }

  tp.marker.visible = false;
}

// Detect if controller has a real tracked pose (not sitting at origin)
function controllerHasPose(ctrl) {
  if (!ctrl) return false;
  // if matrixWorld is near identity translation, it's probably not tracked yet
  const v = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
  const dist = Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z);
  return dist > 0.001; // if it's ~0, it's “stuck at center”
    }
