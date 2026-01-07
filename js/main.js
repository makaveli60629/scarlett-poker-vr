// /js/main.js — Scarlet VR Poker — WebXR GitHub Pages SAFE (CDN)
// Features:
// - VRButton + WebXR
// - Teleport (VR trigger / Desktop click) + marker
// - Smooth locomotion + snap turn (VR) + WASD/QE (desktop)
// - Basic collision (walls)
// - Lobby room, lighting, floor, poker table + 8 seats + 8 bot placeholders
// Notes:
// - Uses CDN three + examples. Versions MUST match.

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

// -------------------------
// Globals
// -------------------------
let scene, camera, renderer;
let player, head; // player rig (group) + head (camera parent)
let clock;

let controller1, controller2;
let controllerGrip1, controllerGrip2;
let rayLine1, rayLine2;
let teleportMarker;

let roomColliders = []; // AABBs
let floorMesh;

const HUD = document.getElementById("hud");
const BLOCKER = document.getElementById("blocker");

const state = {
  hudVisible: true,
  moveSpeed: 2.2,         // m/s
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  lastSnapTime: 0,

  // desktop
  keys: new Set(),
  pointerDown: false,

  // teleport
  teleportEnabled: true,
  teleportHit: null,
  teleportValid: false,

  // bots
  bots: [],
  botTime: 0,
};

init();
animate();

// -------------------------
// Init
// -------------------------
function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Camera + Player Rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  player = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  player.add(head);
  scene.add(player);

  // Start position
  player.position.set(0, 1.6, 3.0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Lighting (fixes “everything black”)
  addLights();

  // World (room + table + bots)
  buildWorld();

  // Teleport marker
  teleportMarker = makeTeleportMarker();
  scene.add(teleportMarker);

  // Controllers + rays
  initControllers();

  // Desktop controls
  initDesktopControls();

  // Events
  window.addEventListener("resize", onWindowResize);
}

// -------------------------
// Lighting
// -------------------------
function addLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(3, 7, 2);
  scene.add(dir);

  const fill = new THREE.PointLight(0xffffff, 0.7, 30);
  fill.position.set(-3, 3.5, -2);
  scene.add(fill);

  // subtle ambient
  const amb = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(amb);
}

// -------------------------
// World / Room / Colliders
// -------------------------
function buildWorld() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 1, metalness: 0 });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = false;
  floorMesh.name = "FLOOR";
  scene.add(floorMesh);

  // Simple room (4 walls)
  // We’ll create walls as boxes, and also store AABB colliders.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.0 });

  // Room dimensions
  const roomSize = 14;
  const wallH = 3.2;
  const wallT = 0.3;

  // +Z wall (behind player)
  addWall(0, wallH / 2, roomSize / 2, roomSize, wallH, wallT, wallMat);
  // -Z wall
  addWall(0, wallH / 2, -roomSize / 2, roomSize, wallH, wallT, wallMat);
  // +X wall
  addWall(roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);
  // -X wall
  addWall(-roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);

  // A “lobby” rug spot (visual)
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b1a12, roughness: 1, metalness: 0 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 0);
  scene.add(rug);

  // Poker table center
  createPokerTable();

  // Bots
  spawnBots(8);
}

function addWall(x, y, z, sx, sy, sz, mat) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.name = "WALL";
  scene.add(mesh);

  // Collider AABB
  const box = new THREE.Box3().setFromObject(mesh);
  roomColliders.push(box);

  return mesh;
}

// -------------------------
// Poker Table + Seats
// -------------------------
function createPokerTable() {
  const table = new THREE.Group();
  table.position.set(0, 0, 0);

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
  );
  base.position.y = 0.375;
  table.add(base);

  // Top rim
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x2d241a, roughness: 0.7 })
  );
  rim.position.y = 0.82;
  table.add(rim);

  // Felt
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.10, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.y = 0.82;
  table.add(felt);

  // Dealer “logo” ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a2f1f, roughness: 1.0, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.88;
  table.add(ring);

  // Seats (8)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.95 });
  const seatGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 2.7;

    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    seat.rotation.y = -a + Math.PI / 2;
    table.add(seat);
  }

  scene.add(table);
}

// -------------------------
// Bots (placeholder NPCs)
// -------------------------
function spawnBots(count) {
  // We place bots around table ring.
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 12);
  const colors = [0x7b1e1e, 0x1e3a7b, 0x2a7b1e, 0x7b6a1e, 0x5a1e7b, 0x1e7b6f, 0x7b3f1e, 0x3f3f3f];

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 });
    const bot = new THREE.Mesh(botGeo, mat);

    const a = (i / count) * Math.PI * 2;
    const r = 2.9;
    bot.position.set(Math.cos(a) * r, 0.95, Math.sin(a) * r);
    bot.rotation.y = -a + Math.PI / 2;

    bot.userData = {
      home: bot.position.clone(),
      phase: Math.random() * Math.PI * 2,
      bob: 0.02 + Math.random() * 0.02,
    };

    scene.add(bot);
    state.bots.push(bot);
  }
}

// -------------------------
// Controllers / Teleport
// -------------------------
function initControllers() {
  controller1 = renderer.xr.getController(0);
  controller2 = renderer.xr.getController(1);
  scene.add(controller1);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);

  rayLine1 = makeRayLine();
  rayLine2 = makeRayLine();
  controller1.add(rayLine1);
  controller2.add(rayLine2);

  controller1.addEventListener("selectstart", onTeleportSelectStart);
  controller1.addEventListener("selectend", onTeleportSelectEnd);
  controller2.addEventListener("selectstart", onTeleportSelectStart);
  controller2.addEventListener("selectend", onTeleportSelectEnd);
}

function makeRayLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 8;
  return line;
}

function makeTeleportMarker() {
  const g = new THREE.RingGeometry(0.15, 0.22, 32);
  const m = new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.position.y = 0.02;
  return ring;
}

function onTeleportSelectStart() {
  // show marker while holding
  state.pointerDown = true;
}
function onTeleportSelectEnd() {
  // teleport if valid
  state.pointerDown = false;

  if (!state.teleportEnabled) return;
  if (!state.teleportValid || !state.teleportHit) return;

  // Keep current head offset (so you land naturally)
  // In XR, camera position is inside player rig.
  const hit = state.teleportHit.clone();
  player.position.x = hit.x;
  player.position.z = hit.z;
}

// -------------------------
// Desktop input
// -------------------------
function initDesktopControls() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") toggleHud();
    state.keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => state.keys.delete(e.code));

  // Mouse teleport (click)
  renderer.domElement.addEventListener("pointerdown", () => (state.pointerDown = true));
  renderer.domElement.addEventListener("pointerup", () => (state.pointerDown = false));
}

function toggleHud() {
  state.hudVisible = !state.hudVisible;
  HUD.style.display = state.hudVisible ? "block" : "none";
}

// -------------------------
// Movement + Collision
// -------------------------
function applyDesktopMovement(dt) {
  // WASD move on XZ
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  let moveX = 0;
  let moveZ = 0;

  if (state.keys.has("KeyW")) { moveX += forward.x; moveZ += forward.z; }
  if (state.keys.has("KeyS")) { moveX -= forward.x; moveZ -= forward.z; }
  if (state.keys.has("KeyA")) { moveX -= right.x;   moveZ -= right.z; }
  if (state.keys.has("KeyD")) { moveX += right.x;   moveZ += right.z; }

  // turn QE
  if (state.keys.has("KeyQ")) player.rotation.y += (1.5 * dt);
  if (state.keys.has("KeyE")) player.rotation.y -= (1.5 * dt);

  const len = Math.hypot(moveX, moveZ);
  if (len > 0.0001) {
    moveX /= len; moveZ /= len;
    const speed = state.moveSpeed;
    tryMovePlayer(moveX * speed * dt, moveZ * speed * dt);
  }
}

function applyVRMovement(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  // Read gamepads from XR input sources
  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const gp = source.gamepad;
    const axes = gp.axes || [];

    // Heuristic:
    // - Left stick usually axes[2], axes[3] OR axes[0], axes[1] depending on device.
    // We'll try both and pick the one with bigger magnitude.
    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0;
    const a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;

    const mag01 = a0*a0 + a1*a1;
    const mag23 = a2*a2 + a3*a3;

    let lx = 0, ly = 0, rx = 0;

    if (mag23 > mag01) {
      // common: left stick = [2,3], right stick = [0,1] on some
      lx = a2; ly = a3;
      rx = a0;
    } else {
      lx = a0; ly = a1;
      rx = a2;
    }

    // deadzones
    const dead = 0.15;
    if (Math.abs(lx) < dead) lx = 0;
    if (Math.abs(ly) < dead) ly = 0;
    if (Math.abs(rx) < dead) rx = 0;

    // Smooth move (left stick)
    if (lx !== 0 || ly !== 0) {
      // move relative to player yaw
      const yaw = player.rotation.y;

      // forward is -Z in local. ly is typically up = -1 forward. invert.
      const f = -ly;
      const s = lx;

      const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw) * f - Math.sin(yaw) * s) * state.moveSpeed * dt;

      tryMovePlayer(dx, dz);
    }

    // Snap turn (right stick X)
    const now = performance.now() / 1000;
    if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
      const dir = rx > 0 ? -1 : 1;
      player.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
      state.lastSnapTime = now;
    }
  }
}

function tryMovePlayer(dx, dz) {
  // attempt move
  const next = player.position.clone();
  next.x += dx;
  next.z += dz;

  // simple collision: keep player inside room bounds by checking AABB overlaps
  // player capsule approximated as sphere radius
  const r = 0.35;

  // room walls are axis aligned; we can clamp to interior quickly too:
  // interior bounds are roughly ±(7 - margin)
  const interior = 6.6;
  next.x = THREE.MathUtils.clamp(next.x, -interior, interior);
  next.z = THREE.MathUtils.clamp(next.z, -interior, interior);

  // If you want stricter collider checks later, we can expand this.
  player.position.copy(next);
}

// -------------------------
// Teleport update
// -------------------------
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

function updateTeleportRay() {
  state.teleportValid = false;
  state.teleportHit = null;
  teleportMarker.visible = false;

  if (!state.teleportEnabled) return;

  // In VR: show ray when trigger held (selectstart sets pointerDown)
  // On desktop: show ray when mouse held
  const active = state.pointerDown || (!renderer.xr.isPresenting && state.pointerDown);

  if (!active) return;

  // Choose controller if in XR, else use camera
  let originObj = null;

  if (renderer.xr.isPresenting) {
    // pick controller that exists (controller1)
    originObj = controller1;
    if (!originObj) return;

    tempMatrix.identity().extractRotation(originObj.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(originObj.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  } else {
    // desktop: ray from camera center
    raycaster.ray.origin.copy(camera.getWorldPosition(new THREE.Vector3()));
    raycaster.ray.direction.copy(camera.getWorldDirection(new THREE.Vector3()));
  }

  const hits = raycaster.intersectObject(floorMesh, false);
  if (hits.length > 0) {
    const p = hits[0].point;

    // validate within interior bounds
    const interior = 6.6;
    if (Math.abs(p.x) <= interior && Math.abs(p.z) <= interior) {
      state.teleportValid = true;
      state.teleportHit = p;
      teleportMarker.visible = true;
      teleportMarker.position.set(p.x, 0.02, p.z);
    }
  }
}

// -------------------------
// Bots animate
// -------------------------
function updateBots(dt) {
  state.botTime += dt;

  // gentle idle motion
  for (const bot of state.bots) {
    const ud = bot.userData;
    bot.position.y = 0.95 + Math.sin(state.botTime * 2 + ud.phase) * ud.bob;
  }
}

// -------------------------
// Animate
// -------------------------
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.033);

  // movement
  if (renderer.xr.isPresenting) {
    applyVRMovement(dt);
    BLOCKER.style.opacity = "0.0";
  } else {
    applyDesktopMovement(dt);
    BLOCKER.style.opacity = "0.05";
  }

  // teleport
  updateTeleportRay();

  // bots
  updateBots(dt);

  renderer.render(scene, camera);
}

// -------------------------
// Resize
// -------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
    }
