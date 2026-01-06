// /js/main.js — Skylark Poker VR (Update 9.0)
// GitHub Pages SAFE: uses local ./three.js wrapper only.
// Fixes: controller alignment, floor/height lock, trigger-hold teleport circle, 45° snap turn.

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

// ---------- small helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now() * 0.001;

// ---------- core ----------
let renderer, scene, camera;
let player;          // "standing" rig group (moves in world)
let dolly;           // yaw-only group (snap turn)
let clock;

// controllers
let c0, c1, g0, g1;
const controllerState = {
  triggerHeld: false,
  activeHand: "right", // right hand requested
  snapCooldown: 0,
  thumb: { lx: 0, ly: 0, rx: 0, ry: 0 },
};

// teleport visuals (no laser always-on; only shows on trigger hold)
let tpLine = null;
let tpRing = null;
let tpHitPoint = new THREE.Vector3();
let tpValid = false;

// movement tuning
const WALK_SPEED = 2.2;      // meters/sec
const SNAP_DEG = 45;         // 45° angles on right stick
const SNAP_COOLDOWN = 0.22;  // sec
const FIXED_EYE_HEIGHT = 1.65;

// keep a stable floor reference
const FLOOR_Y = 0;

boot();

async function boot() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 150);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  // IMPORTANT: stable standing height and floor
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Rig stack:
  // player (moves) -> dolly (yaw snap) -> camera
  player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, FLOOR_Y, 0);

  dolly = new THREE.Group();
  dolly.name = "YawDolly";
  player.add(dolly);

  // Put camera at fixed height in non-XR mode (XR overrides camera pose, but this keeps fallback stable)
  camera.position.set(0, FIXED_EYE_HEIGHT, 0);
  dolly.add(camera);

  scene.add(player);

  // Build world (room, walls, lighting, teleport machine spawn, rails, etc.)
  await World.build(scene, player, camera);

  // Controllers
  setupControllers();

  // Teleport visuals
  buildTeleportVisuals(scene);

  // UI events (optional)
  window.addEventListener("resize", onResize);

  // Start render loop
  renderer.setAnimationLoop(tick);

  // Optional: notify HUD if you have one
  console.log("Boot finished (9.0).");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- Controllers ----------
function setupControllers() {
  // controller 0/1
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  c0.name = "controller0";
  c1.name = "controller1";

  // grips (for models if you want later)
  g0 = renderer.xr.getControllerGrip(0);
  g1 = renderer.xr.getControllerGrip(1);
  g0.name = "grip0";
  g1.name = "grip1";

  // Attach controllers to player rig so they never float away from you
  dolly.add(c0, c1, g0, g1);

  // Simple visible controller “handle” so you can see orientation
  const handleGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.11, 16);
  const handleMatR = new THREE.MeshStandardMaterial({ color: 0x22ff88, roughness: 0.55, metalness: 0.15 });
  const handleMatL = new THREE.MeshStandardMaterial({ color: 0xff33aa, roughness: 0.55, metalness: 0.15 });

  const h0 = new THREE.Mesh(handleGeo, handleMatR);
  h0.rotation.x = Math.PI / 2;
  h0.position.z = -0.04;
  c0.add(h0);

  const h1 = new THREE.Mesh(handleGeo, handleMatL);
  h1.rotation.x = Math.PI / 2;
  h1.position.z = -0.04;
  c1.add(h1);

  // Events
  c0.addEventListener("connected", (e) => console.log("controller0 connected", e.data));
  c1.addEventListener("connected", (e) => console.log("controller1 connected", e.data));

  // Trigger hold teleport
  // Use RIGHT hand as primary teleport (as requested)
  c0.addEventListener("selectstart", () => {
    controllerState.triggerHeld = true;
    controllerState.activeHand = "right";
  });
  c0.addEventListener("selectend", () => {
    controllerState.triggerHeld = false;
    if (tpValid) doTeleport();
  });

  // Left hand can also teleport if you want (kept, but right is primary)
  c1.addEventListener("selectstart", () => {
    controllerState.triggerHeld = true;
    controllerState.activeHand = "left";
  });
  c1.addEventListener("selectend", () => {
    controllerState.triggerHeld = false;
    if (tpValid) doTeleport();
  });

  // Optional menu event hook (Meta menu button is not accessible in WebXR on Quest in most browsers)
  // So we provide a custom event you can dispatch from UI buttons:
  window.addEventListener("nova_toggle_menu", () => {
    window.dispatchEvent(new Event("nova_menu_toggle_internal"));
  });
}

function getActiveController() {
  return controllerState.activeHand === "right" ? c0 : c1;
}

// ---------- Teleport visuals ----------
function buildTeleportVisuals(scene) {
  // Rainbow line (vertex colors)
  const pts = [new THREE.Vector3(), new THREE.Vector3(0, -1, -2)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  // add vertex colors (2 points)
  const colors = new Float32Array([
    1, 0, 0, // red
    0, 0.8, 1 // cyan
  ]);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
  tpLine = new THREE.Line(geo, mat);
  tpLine.visible = false;
  scene.add(tpLine);

  // Triple neon rings (very visible)
  tpRing = new THREE.Group();
  tpRing.visible = false;

  const ringMats = [
    new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 1.6, roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x2bd7ff, emissive: 0x2bd7ff, emissiveIntensity: 1.6, roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 1.6, roughness: 0.25 }),
  ];

  for (let i = 0; i < 3; i++) {
    const r = 0.22 + i * 0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 10, 64), ringMats[i]);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01 + i * 0.003;
    tpRing.add(ring);
  }

  // subtle glow
  const glow = new THREE.PointLight(0x00ffaa, 0.7, 6);
  glow.position.set(0, 1.2, 0);
  tpRing.add(glow);

  scene.add(tpRing);
}

// ---------- Movement + Teleport update ----------
function tick() {
  const dt = clamp(clock.getDelta(), 0, 0.05);

  // Always keep player on floor baseline (prevents half-in-floor drift)
  player.position.y = FLOOR_Y;

  // Update input axes if gamepad exists
  pollGamepadAxes();

  // Smooth walk (left stick)
  applyWalk(dt);

  // Snap turn (right stick)
  applySnapTurn(dt);

  // Trigger hold teleport visuals
  updateTeleportVisuals();

  // World updates (simulation, ui, etc.)
  World.update(dt);

  renderer.render(scene, camera);
}

function pollGamepadAxes() {
  // Read from active controller first, but Quest often reports both
  const read = (ctrl) => {
    const gp = ctrl?.gamepad;
    if (!gp || !gp.axes) return null;
    return gp.axes;
  };

  const aR = read(c0);
  const aL = read(c1);

  // Quest commonly:
  // left stick axes on controller1, right stick on controller0 (varies).
  // We capture both and choose best available.
  // We'll prioritize:
  // - Left stick from LEFT controller if present
  // - Right stick from RIGHT controller if present
  const leftAxes = aL || aR || [0, 0, 0, 0];
  const rightAxes = aR || aL || [0, 0, 0, 0];

  // axes[2], axes[3] is often thumbstick, but can be [0],[1].
  // We safely pick: first two axes are stick.
  controllerState.thumb.lx = leftAxes[2] ?? leftAxes[0] ?? 0;
  controllerState.thumb.ly = leftAxes[3] ?? leftAxes[1] ?? 0;
  controllerState.thumb.rx = rightAxes[2] ?? rightAxes[0] ?? 0;
  controllerState.thumb.ry = rightAxes[3] ?? rightAxes[1] ?? 0;
}

function applyWalk(dt) {
  const lx = controllerState.thumb.lx || 0;
  const ly = controllerState.thumb.ly || 0;

  const dead = 0.12;
  const x = Math.abs(lx) < dead ? 0 : lx;
  const y = Math.abs(ly) < dead ? 0 : ly;

  // NOTE: You previously had forward/backwards inverted.
  // Here we correct: pushing stick forward (negative y on most controllers) moves forward.
  const fwd = -y;
  const strafe = x;

  if (fwd === 0 && strafe === 0) return;

  // Move relative to dolly yaw (not headset tilt)
  const yaw = dolly.rotation.y;

  const dirF = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const dirR = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const move = new THREE.Vector3();
  move.addScaledVector(dirF, fwd);
  move.addScaledVector(dirR, strafe);

  const len = move.length();
  if (len > 0.0001) move.multiplyScalar(1 / len);

  // smooth speed scaling
  const mag = clamp(Math.sqrt(fwd * fwd + strafe * strafe), 0, 1);
  player.position.addScaledVector(move, WALK_SPEED * mag * dt);

  // clamp inside room bounds if World provides it
  if (World.bounds) {
    player.position.x = clamp(player.position.x, World.bounds.minX, World.bounds.maxX);
    player.position.z = clamp(player.position.z, World.bounds.minZ, World.bounds.maxZ);
  }
}

function applySnapTurn(dt) {
  controllerState.snapCooldown = Math.max(0, controllerState.snapCooldown - dt);

  const rx = controllerState.thumb.rx || 0;
  const dead = 0.35;

  if (controllerState.snapCooldown > 0) return;
  if (Math.abs(rx) < dead) return;

  const dir = rx > 0 ? -1 : 1; // right stick right = turn right (negative yaw)
  dolly.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG) * dir;
  controllerState.snapCooldown = SNAP_COOLDOWN;
}

function updateTeleportVisuals() {
  const active = getActiveController();

  if (!controllerState.triggerHeld || !active) {
    tpLine.visible = false;
    tpRing.visible = false;
    tpValid = false;
    return;
  }

  // Cast a ray from controller forward, but FIX the “15° downward” problem:
  // We bias the ray slightly downward so you don’t need to aim at the floor.
  const origin = new THREE.Vector3();
  active.getWorldPosition(origin);

  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(active.getWorldQuaternion(new THREE.Quaternion()));

  // Bias down a bit so it's easier (you asked for floor circle always)
  dir.y -= 0.35;
  dir.normalize();

  // Intersect with y=FLOOR_Y plane
  const t = (FLOOR_Y - origin.y) / (dir.y || -0.00001);
  tpValid = t > 0.05 && t < 30;

  if (!tpValid) {
    tpLine.visible = true;
    tpRing.visible = false;
    setLine(origin, origin.clone().addScaledVector(dir, 4));
    return;
  }

  tpHitPoint.copy(origin).addScaledVector(dir, t);

  // line
  tpLine.visible = true;
  setLine(origin, tpHitPoint);

  // ring on floor
  tpRing.visible = true;
  tpRing.position.set(tpHitPoint.x, FLOOR_Y + 0.001, tpHitPoint.z);

  // pulse brightness so it is impossible to miss
  const pulse = 1.0 + Math.sin(performance.now() * 0.008) * 0.35;
  tpRing.children.forEach((ch) => {
    if (ch.material && ch.material.emissiveIntensity !== undefined) {
      ch.material.emissiveIntensity = 1.25 * pulse;
    }
  });
}

function setLine(a, b) {
  const pos = tpLine.geometry.attributes.position;
  pos.setXYZ(0, a.x, a.y, a.z);
  pos.setXYZ(1, b.x, b.y, b.z);
  pos.needsUpdate = true;
}

function doTeleport() {
  // Teleport by moving player rig so headset stays consistent
  // Keep y locked to floor baseline
  player.position.set(tpHitPoint.x, FLOOR_Y, tpHitPoint.z);

  // optional: face toward table (World provides a table center target)
  if (World.lookTarget) {
    const to = new THREE.Vector3().subVectors(World.lookTarget, player.position);
    to.y = 0;
    if (to.lengthSq() > 0.001) {
      dolly.rotation.y = Math.atan2(to.x, to.z);
    }
  }
}
