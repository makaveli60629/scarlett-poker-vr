// /js/main.js — Skylark Poker VR (Update 9.0 Fix Pack)
// Fixes: Quest thumbstick mapping, 45° snap turn, teleport circle visibility,
// spectator mode (no player-cards spawned here), stable floor height.

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let renderer, scene, camera;
let player, dolly;
let clock;

let c0, c1; // controllers

// Input
const input = {
  triggerHeld: false,
  activeHand: 0, // 0 = right, 1 = left
  snapCooldown: 0,
  lx: 0, ly: 0,
  rx: 0, ry: 0,
};

// Teleport visuals
let tpLine, tpRing;
let tpHit = new THREE.Vector3();
let tpValid = false;

const WALK_SPEED = 2.4;
const SNAP_DEG = 45;
const SNAP_COOLDOWN = 0.22;
const FLOOR_Y = 0;

boot();

async function boot() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  // IMPORTANT: standing/floor stable
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Rig: player -> dolly(yaw) -> camera
  player = new THREE.Group();
  player.position.set(0, FLOOR_Y, 0);

  dolly = new THREE.Group();
  player.add(dolly);

  // Fallback non-xr camera height (XR will override pose)
  camera.position.set(0, 1.65, 0);
  dolly.add(camera);

  scene.add(player);

  await World.build(scene, player, camera);

  setupControllers();
  buildTeleportVisuals(scene);

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupControllers() {
  // NOTE: On Quest, controller index order can vary.
  // We treat c0 as "right-ish" and c1 as "left-ish", but we also robustly read axes.
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  dolly.add(c0, c1);

  // Trigger-hold teleport
  c0.addEventListener("selectstart", () => { input.triggerHeld = true; input.activeHand = 0; });
  c0.addEventListener("selectend", () => { input.triggerHeld = false; if (tpValid) doTeleport(); });

  c1.addEventListener("selectstart", () => { input.triggerHeld = true; input.activeHand = 1; });
  c1.addEventListener("selectend", () => { input.triggerHeld = false; if (tpValid) doTeleport(); });
}

function getActiveController() {
  return input.activeHand === 0 ? c0 : c1;
}

function readStickAxes(gamepad) {
  if (!gamepad || !gamepad.axes) return [0, 0];

  // Most Quest Touch controllers report stick on axes[2,3] OR [0,1] depending on browser.
  // We pick the pair with the largest magnitude.
  const a = gamepad.axes;

  const p01 = [a[0] ?? 0, a[1] ?? 0];
  const p23 = [a[2] ?? 0, a[3] ?? 0];

  const m01 = Math.abs(p01[0]) + Math.abs(p01[1]);
  const m23 = Math.abs(p23[0]) + Math.abs(p23[1]);

  return m23 > m01 ? p23 : p01;
}

function pollInput() {
  // Left stick should come from "left controller" if possible
  const left = c1?.gamepad ? readStickAxes(c1.gamepad) : [0, 0];
  const right = c0?.gamepad ? readStickAxes(c0.gamepad) : [0, 0];

  input.lx = left[0];
  input.ly = left[1];
  input.rx = right[0];
  input.ry = right[1];
}

function tick() {
  const dt = clamp(clock.getDelta(), 0, 0.05);

  // Lock rig to floor baseline to prevent sinking
  player.position.y = FLOOR_Y;

  pollInput();
  applyWalk(dt);
  applySnapTurn(dt);
  updateTeleportVisuals();

  World.update(dt);

  renderer.render(scene, camera);
}

function applyWalk(dt) {
  const dead = 0.12;
  const lx = Math.abs(input.lx) < dead ? 0 : input.lx;
  const ly = Math.abs(input.ly) < dead ? 0 : input.ly;

  if (!lx && !ly) return;

  // Forward is usually -Y on thumbstick
  const fwd = -ly;
  const strafe = lx;

  const yaw = dolly.rotation.y;
  const dirF = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const dirR = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const move = new THREE.Vector3();
  move.addScaledVector(dirF, fwd);
  move.addScaledVector(dirR, strafe);

  const len = move.length();
  if (len > 0.0001) move.multiplyScalar(1 / len);

  const mag = clamp(Math.sqrt(fwd * fwd + strafe * strafe), 0, 1);
  player.position.addScaledVector(move, WALK_SPEED * mag * dt);

  // Clamp inside bounds (solid-ish)
  if (World.bounds) {
    player.position.x = clamp(player.position.x, World.bounds.minX, World.bounds.maxX);
    player.position.z = clamp(player.position.z, World.bounds.minZ, World.bounds.maxZ);
  }
}

function applySnapTurn(dt) {
  input.snapCooldown = Math.max(0, input.snapCooldown - dt);

  const dead = 0.35;
  const rx = input.rx;

  if (input.snapCooldown > 0) return;
  if (Math.abs(rx) < dead) return;

  // Right stick right -> turn right
  const dir = rx > 0 ? -1 : 1;
  dolly.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG) * dir;
  input.snapCooldown = SNAP_COOLDOWN;
}

function buildTeleportVisuals(scene) {
  // line
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, -2)]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  tpLine = new THREE.Line(geo, mat);
  tpLine.visible = false;
  scene.add(tpLine);

  // triple neon ring
  tpRing = new THREE.Group();
  tpRing.visible = false;

  const mats = [
    new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 1.7, roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x2bd7ff, emissive: 0x2bd7ff, emissiveIntensity: 1.7, roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 1.7, roughness: 0.25 }),
  ];

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22 + i * 0.06, 0.012, 10, 64), mats[i]);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01 + i * 0.004;
    tpRing.add(ring);
  }

  const glow = new THREE.PointLight(0x00ffaa, 0.8, 7);
  glow.position.set(0, 1.3, 0);
  tpRing.add(glow);

  scene.add(tpRing);
}

function updateTeleportVisuals() {
  const ctrl = getActiveController();

  if (!input.triggerHeld || !ctrl) {
    tpLine.visible = false;
    tpRing.visible = false;
    tpValid = false;
    return;
  }

  const origin = new THREE.Vector3();
  ctrl.getWorldPosition(origin);

  const q = new THREE.Quaternion();
  ctrl.getWorldQuaternion(q);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);

  // Bias slightly downward so you never have to point straight down
  dir.y -= 0.35;
  dir.normalize();

  const t = (FLOOR_Y - origin.y) / (dir.y || -0.00001);
  tpValid = t > 0.05 && t < 30;

  const end = tpValid ? tpHit.copy(origin).addScaledVector(dir, t) : origin.clone().addScaledVector(dir, 4);

  // Update line
  const pos = tpLine.geometry.attributes.position;
  pos.setXYZ(0, origin.x, origin.y, origin.z);
  pos.setXYZ(1, end.x, end.y, end.z);
  pos.needsUpdate = true;

  tpLine.visible = true;

  if (!tpValid) {
    tpRing.visible = false;
    return;
  }

  tpRing.visible = true;
  tpRing.position.set(tpHit.x, FLOOR_Y + 0.001, tpHit.z);

  // pulse
  const pulse = 1.0 + Math.sin(performance.now() * 0.008) * 0.35;
  tpRing.children.forEach((ch) => {
    if (ch.material?.emissiveIntensity != null) ch.material.emissiveIntensity = 1.35 * pulse;
  });
}

function doTeleport() {
  player.position.set(tpHit.x, FLOOR_Y, tpHit.z);

  if (World.lookTarget) {
    const to = new THREE.Vector3().subVectors(World.lookTarget, player.position);
    to.y = 0;
    if (to.lengthSq() > 0.001) dolly.rotation.y = Math.atan2(to.x, to.z);
  }
                                }
