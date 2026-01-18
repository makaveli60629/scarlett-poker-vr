// SCARLETT1 — DEMO RUNTIME (modular world + spawn pad + teleport arch + poker divot)
// Build: SCARLETT1_DEMO_RUNTIME_v1_0

const BUILD = "SCARLETT1_DEMO_RUNTIME_v1_0";
const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
const toast = (msg, ms) => { try { window.__scarlettToast?.(String(msg), ms ?? 1600); } catch (_) {} };

// Hard attach flags (used by your diag HUD patterns)
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.SCARLETT.attached = true;
window.SCARLETT.ok = true;
window.__scarlettEngineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;
window.__scarlettAttached = true;

console.log(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);
dwrite(`[scarlett1] booting… build=${BUILD}`);

// ---- imports (CDN) ----
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.161.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { buildWorld } from "../world.js";
import { createUIBindings } from "../ui.js";

// ---- canvas + renderer ----
const canvas = document.getElementById('c');
if (!canvas) throw new Error('Missing <canvas id="c">');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const rig = new THREE.Group();
scene.add(rig);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, 0);
rig.add(camera);

// lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x0b0f14, 0.9);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(5, 10, 3);
key.castShadow = true;
key.shadow.camera.near = 0.1;
key.shadow.camera.far = 40;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);

// basic perf stats in diag
const env = {
  THREE,
  renderer,
  scene,
  camera,
  rig,
  clock: new THREE.Clock(),
  state: {
    teleportMode: false,
    spawned: false,
    spawnPoint: new THREE.Vector3(0, 0, 0),
    spawnYaw: 0,
  },
  input: {
    keys: new Set(),
    look: { yaw: 0, pitch: 0 },
    move: { x: 0, z: 0 },
    pointers: new Map(),
  },
  updateFns: [],
  tmp: {
    v3: new THREE.Vector3(),
    v3b: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    mat4: new THREE.Matrix4(),
    raycaster: new THREE.Raycaster(),
  }
};

// UI bindings (buttons)
createUIBindings(env);

// XR controllers
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.userData.index = i;
  rig.add(c);
  controllers.push(c);

  const g = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7c4dff }));
  l.name = 'ray';
  l.scale.z = 10;
  c.add(l);

  const grip = renderer.xr.getControllerGrip(i);
  grip.add(controllerModelFactory.createControllerModel(grip));
  rig.add(grip);
}

env.xr = { controllers };

// build world (mods)
dwrite('building world…');
const world = await buildWorld(env);
Object.assign(env, { world });

dwrite('world ready ✅');
toast('World ready ✅');

// ensure we spawn on spawn pad once modules set spawnPoint
function resetToSpawn() {
  const p = env.state.spawnPoint.clone();
  // keep camera height
  rig.position.set(p.x, p.y, p.z);
  env.input.look.yaw = env.state.spawnYaw;
}
window.__scarlettResetToSpawn = resetToSpawn;
resetToSpawn();
env.state.spawned = true;

// desktop/mobile input
window.addEventListener('keydown', (e) => env.input.keys.add(e.code));
window.addEventListener('keyup', (e) => env.input.keys.delete(e.code));

// pointer input: 1 finger = look; 2 fingers = move
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  env.input.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
canvas.addEventListener('pointerup', (e) => {
  env.input.pointers.delete(e.pointerId);
  env.input.move.x = 0;
  env.input.move.z = 0;
});
canvas.addEventListener('pointermove', (e) => {
  const p = env.input.pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;

  const count = env.input.pointers.size;
  if (count === 1) {
    env.input.look.yaw -= dx * 0.003;
    env.input.look.pitch -= dy * 0.002;
    env.input.look.pitch = Math.max(-1.15, Math.min(1.15, env.input.look.pitch));
  } else if (count >= 2) {
    env.input.move.x = Math.max(-1, Math.min(1, dx * 0.01));
    env.input.move.z = Math.max(-1, Math.min(1, -dy * 0.01));
  }
});

function applyNonVRMovement(dt) {
  // yaw/pitch to camera
  rig.rotation.y = env.input.look.yaw;
  camera.rotation.x = env.input.look.pitch;

  // WASD
  let ax = 0, az = 0;
  if (env.input.keys.has('KeyA') || env.input.keys.has('ArrowLeft')) ax -= 1;
  if (env.input.keys.has('KeyD') || env.input.keys.has('ArrowRight')) ax += 1;
  if (env.input.keys.has('KeyW') || env.input.keys.has('ArrowUp')) az -= 1;
  if (env.input.keys.has('KeyS') || env.input.keys.has('ArrowDown')) az += 1;

  // touch move (two-finger)
  ax += env.input.move.x;
  az += env.input.move.z;

  const len = Math.hypot(ax, az);
  if (len < 0.001) return;
  ax /= Math.max(1, len);
  az /= Math.max(1, len);

  const speed = 2.0; // m/s
  const forward = env.tmp.v3.set(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
  const right = env.tmp.v3b.set(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
  rig.position.addScaledVector(right, ax * speed * dt);
  rig.position.addScaledVector(forward, az * speed * dt);

  // keep on ground
  rig.position.y = 0;
}

function updateTeleportRay() {
  const tp = env.world?.teleport;
  if (!tp) return;
  tp.setEnabled(env.state.teleportMode);
}

// XR select to teleport when teleport mode ON
controllers.forEach((c) => {
  c.addEventListener('selectstart', () => {
    if (!env.state.teleportMode) return;
    env.world?.teleport?.tryCommitTeleportFromController(c);
  });
});

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

let frames = 0;
let lastFpsStamp = performance.now();
let fps = 0;

renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, env.clock.getDelta());

  // non-VR movement only when not presenting
  if (!renderer.xr.isPresenting) {
    applyNonVRMovement(dt);
  }

  // module updates
  for (const fn of env.updateFns) fn(dt, env);

  updateTeleportRay();
  renderer.render(scene, camera);

  // FPS counter (cheap)
  frames++;
  const t = performance.now();
  if (t - lastFpsStamp > 500) {
    fps = Math.round((frames * 1000) / (t - lastFpsStamp));
    frames = 0;
    lastFpsStamp = t;
    window.SCARLETT.fps = fps;
  }
});

// final diag
window.SCARLETT.three = true;
window.SCARLETT.xr = !!navigator.xr;
window.SCARLETT.renderer = true;
window.SCARLETT.world = true;
dwrite('ready ✅');
