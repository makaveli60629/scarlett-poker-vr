// /js/index.js — Scarlett MASTER 7.6 (Handedness controls + 45° snap + laser pinned to controllers + VIP spawn)

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 7.6 (VIP Cube Spawn + Handedness Controls + Laser Fix + SnapTurn 45)";

let scene, camera, renderer, player, clock;
let vrBtnEl;

const MOVE_SPEED = 2.6;
const SNAP_ANGLE = Math.PI / 4;
const SNAP_DEAD = 0.75;
const SNAP_COOLDOWN = 0.22;
let snapCD = 0;

// teleport/laser state
const tp = {
  raycaster: null,
  marker: null,
  hit: null,
  // controllers
  cL: null,
  cR: null,
  lineL: null,
  lineR: null,
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

  vrBtnEl = VRButton.createButton(renderer);
  document.body.appendChild(vrBtnEl);

  World.build({ THREE, scene, log: console.log });

  installTeleportLaser();

  // ALWAYS spawn VIP cube and face table
  resetVIP();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetVIP();
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  console.log("[index]", BUILD);

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  moveXR(dt);
  updateLaser(dt);
  renderer.render(scene, camera);
}

function resetVIP() {
  const s = World.getSpawn("vip_cube");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
}

// --------------------
// XR MOVEMENT (handedness correct)
// --------------------
function moveXR(dt) {
  if (!renderer.xr.isPresenting) return;

  const session = renderer.xr.getSession?.();
  if (!session) return;

  // Find gamepads by handedness
  let left = null, right = null;

  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src;
    if (src.handedness === "right") right = src;
  }

  // Left stick movement
  let mx = 0, my = 0;
  if (left?.gamepad?.axes) {
    const a = left.gamepad.axes;
    mx = dz(a[0] ?? 0, 0.12);
    my = dz(a[1] ?? 0, 0.12);
  }

  // Right stick snap turn (try common axis mappings)
  let turnX = 0;
  if (right?.gamepad?.axes) {
    const a = right.gamepad.axes;
    // Most common: right stick X is axes[2] OR axes[0] depending on runtime
    const cand = Math.abs(a[2] ?? 0) > Math.abs(a[0] ?? 0) ? (a[2] ?? 0) : (a[0] ?? 0);
    turnX = dz(cand, 0.18);
  }

  // Snap turn
  snapCD -= dt;
  if (snapCD <= 0) {
    if (turnX > SNAP_DEAD) { player.rotation.y -= SNAP_ANGLE; snapCD = SNAP_COOLDOWN; }
    else if (turnX < -SNAP_DEAD) { player.rotation.y += SNAP_ANGLE; snapCD = SNAP_COOLDOWN; }
  }

  // Move relative to headset heading
  if (mx || my) {
    const heading = getHeadingYaw();
    const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const r = new THREE.Vector3(f.z, 0, -f.x);

    // NOTE: gamepad Y is usually +down, so invert
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

function getHeadingYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// --------------------
// TELEPORT LASER (cannot stick at origin)
// --------------------
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();

  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.92 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  // We still create two controllers, but we will ONLY show laser if session says they exist.
  tp.cL = renderer.xr.getController(0);
  tp.cR = renderer.xr.getController(1);
  scene.add(tp.cL, tp.cR);

  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  tp.lineL = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.lineL.scale.z = 12;
  tp.lineL.visible = false;
  tp.cL.add(tp.lineL);

  tp.lineR = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.lineR.scale.z = 12;
  tp.lineR.visible = false;
  tp.cR.add(tp.lineR);

  // Teleport on trigger
  const teleport = () => {
    if (!tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
  };
  tp.cL.addEventListener("selectstart", teleport);
  tp.cR.addEventListener("selectstart", teleport);
}

function updateLaser() {
  if (!renderer.xr.isPresenting) {
    tp.marker.visible = false;
    tp.hit = null;
    tp.lineL.visible = false;
    tp.lineR.visible = false;
    return;
  }

  const session = renderer.xr.getSession?.();
  if (!session) return;

  // Determine which hands exist *this frame*
  let hasLeft = false, hasRight = false;

  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") hasLeft = true;
    if (src.handedness === "right") hasRight = true;
  }

  // If no controller exists, hide everything — this prevents “laser stuck in center”
  tp.lineL.visible = hasLeft;
  tp.lineR.visible = hasRight;

  const floors = World.getFloors ? World.getFloors() : [];
  tp.hit = null;

  // Prefer right laser if present, else left
  const cands = [];
  if (hasRight) cands.push(tp.cR);
  if (hasLeft) cands.push(tp.cL);

  if (!cands.length) {
    tp.marker.visible = false;
    return;
  }

  for (const c of cands) {
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
