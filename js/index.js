// /js/index.js — Scarlett Runtime (FULL) v1.3
// ✅ Three.js via CDN (module)
// ✅ VRButton + XR init
// ✅ Quest controllers + lasers + select
// ✅ Smooth locomotion (left stick) + snap turn (right stick)
// ✅ Android touch look + WASD flycam (debug)
// ✅ Imports world via relative path
// ✅ Logs to HUD + exposes safe hooks

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

// -------------------- LOG --------------------
const pad = (n) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const out = [];
function log(m) {
  const line = `[${now()}] ${m}`;
  out.push(line);
  console.log(line);

  const el = document.getElementById("hud-log");
  if (el) el.textContent = out.slice(-140).join("\n");

  if (typeof window.__HTML_LOG === "function") {
    try { window.__HTML_LOG(line); } catch {}
  }
}

function setStatus(t) {
  if (typeof window.__SET_BOOT_STATUS === "function") {
    try { window.__SET_BOOT_STATUS(t); } catch {}
  }
}

log(`[index] runtime start ✅ base=${window.SCARLETT_BASE || "/"}`);
setStatus("index init…");

// -------------------- Renderer / Scene / Camera --------------------
const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 500);
camera.position.set(0, 1.6, 2.0);

// Player rig: move this for locomotion + teleports
const player = new THREE.Group();
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// lights fallback
{
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 8, 4);
  scene.add(dir);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------- VR Button --------------------
try {
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  log("[index] VRButton appended ✅");
} catch (e) {
  log(`[index] VRButton failed ❌ ${e?.message || String(e)}`);
}

// Manual Enter VR button in HUD
const enterVrBtn = document.getElementById("enterVrBtn");
enterVrBtn?.addEventListener("click", async () => {
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const sessionInit = {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers", "dom-overlay"],
      domOverlay: { root: document.body }
    };
    const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
    renderer.xr.setSession(session);
    log("[index] manual XR session start ✅");
  } catch (e) {
    log(`[index] manual XR failed ❌ ${e?.message || String(e)}`);
  }
});

// -------------------- Controllers + Lasers --------------------
const controllers = {
  left: null,
  right: null,
  grips: { left: null, right: null },
  lines: { left: null, right: null },
  raycaster: new THREE.Raycaster(),
  tmpMat: new THREE.Matrix4(),
  hit: new THREE.Vector3(),
  stick: { lx: 0, ly: 0, rx: 0, ry: 0 },
  snapReady: true
};

// laser line helper
function makeLaserLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  line.name = "XR_LASER";
  line.scale.z = 10;
  return line;
}

function setupXRControllers() {
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);

  controllers.lines.left = makeLaserLine();
  controllers.lines.right = makeLaserLine();

  controllers.left.add(controllers.lines.left);
  controllers.right.add(controllers.lines.right);

  scene.add(controllers.left);
  scene.add(controllers.right);

  // optional grips (for models later)
  controllers.grips.left = renderer.xr.getControllerGrip(0);
  controllers.grips.right = renderer.xr.getControllerGrip(1);
  scene.add(controllers.grips.left);
  scene.add(controllers.grips.right);

  // events
  controllers.left.addEventListener("selectstart", (e) => onSelectStart(e, "left"));
  controllers.right.addEventListener("selectstart", (e) => onSelectStart(e, "right"));
  controllers.left.addEventListener("selectend", (e) => onSelectEnd(e, "left"));
  controllers.right.addEventListener("selectend", (e) => onSelectEnd(e, "right"));

  log("[xr] controllers + lasers installed ✅");
}

function onSelectStart(e, hand) {
  // If something is hit and has onSelect(), call it
  const hit = getRayHit(hand);
  if (hit?.object?.userData?.onSelect) {
    try { hit.object.userData.onSelect({ hand, hit, event: e }); } catch {}
  }
}
function onSelectEnd() {}

function getRayHit(hand) {
  const ctrl = hand === "left" ? controllers.left : controllers.right;
  if (!ctrl) return null;

  controllers.tmpMat.identity().extractRotation(ctrl.matrixWorld);
  controllers.raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
  controllers.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllers.tmpMat);

  // Intersect everything in the world root (best) or scene (fallback)
  const root = worldRootForRaycast() || scene;
  const hits = controllers.raycaster.intersectObjects(root.children, true);

  // ignore lasers themselves
  for (const h of hits) {
    if (h.object?.name === "XR_LASER") continue;
    return h;
  }
  return null;
}

function worldRootForRaycast() {
  // If world created WORLD_ROOT group, use it
  const wr = scene.getObjectByName("WORLD_ROOT");
  return wr || null;
}

function updateLasers() {
  // scale laser to hit distance, otherwise default length
  ["left", "right"].forEach((hand) => {
    const ctrl = hand === "left" ? controllers.left : controllers.right;
    const line = hand === "left" ? controllers.lines.left : controllers.lines.right;
    if (!ctrl || !line) return;

    const hit = getRayHit(hand);
    const dist = hit ? hit.distance : 10;
    line.scale.z = Math.max(0.3, Math.min(25, dist));
  });
}

// -------------------- VR Locomotion --------------------
function sampleGamepads() {
  controllers.stick.lx = 0; controllers.stick.ly = 0;
  controllers.stick.rx = 0; controllers.stick.ry = 0;

  const session = renderer.xr.getSession?.();
  if (!session) return;

  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;

    // Most Quest controllers: axes[2,3] = right stick, axes[0,1] = left stick
    // Some browsers use [0,1] for primary regardless of hand. We'll handle both.
    const hand = src.handedness;

    const ax0 = gp.axes[0] ?? 0;
    const ax1 = gp.axes[1] ?? 0;
    const ax2 = gp.axes[2] ?? 0;
    const ax3 = gp.axes[3] ?? 0;

    if (hand === "left") {
      controllers.stick.lx = ax0;
      controllers.stick.ly = ax1;
      controllers.stick.rx = ax2;
      controllers.stick.ry = ax3;
    } else if (hand === "right") {
      // Some implementations: right controller has primary on [0,1]
      controllers.stick.rx = ax0;
      controllers.stick.ry = ax1;
    } else {
      // no handedness: assume [0,1]=move [2,3]=turn
      controllers.stick.lx = ax0;
      controllers.stick.ly = ax1;
      controllers.stick.rx = ax2;
      controllers.stick.ry = ax3;
    }
  }
}

function applyVRLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  sampleGamepads();

  // deadzones
  const dz = 0.15;
  const lx = Math.abs(controllers.stick.lx) > dz ? controllers.stick.lx : 0;
  const ly = Math.abs(controllers.stick.ly) > dz ? controllers.stick.ly : 0;
  const rx = Math.abs(controllers.stick.rx) > dz ? controllers.stick.rx : 0;

  // Smooth move based on headset yaw
  const speed = 2.0; // m/s
  if (lx || ly) {
    const dir = new THREE.Vector3(lx, 0, ly); // note ly is forward/back (usually -forward)
    // Convert to forward motion: invert Y axis
    dir.z = ly;
    dir.x = lx;

    // Headset yaw
    const eul = new THREE.Euler(0, 0, 0, "YXZ");
    eul.setFromQuaternion(camera.quaternion);
    const yaw = eul.y;

    dir.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    dir.multiplyScalar(speed * dt);

    player.position.add(dir);
  }

  // Snap turn on right stick
  const snap = 30 * (Math.PI / 180);
  if (Math.abs(rx) < 0.35) controllers.snapReady = true;
  if (controllers.snapReady && Math.abs(rx) >= 0.6) {
    player.rotation.y += (rx > 0 ? -snap : snap);
    controllers.snapReady = false;
  }
}

// -------------------- Android / Desktop Debug Controls --------------------
const input = {
  keys: new Set(),
  dragging: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0
};

window.addEventListener("keydown", (e) => input.keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => input.keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (renderer.xr.isPresenting) return;
  input.dragging = true;
  input.lastX = e.clientX;
  input.lastY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});

renderer.domElement.addEventListener("pointerup", () => { input.dragging = false; });

renderer.domElement.addEventListener("pointermove", (e) => {
  if (renderer.xr.isPresenting) return;
  if (!input.dragging) return;

  const dx = e.clientX - input.lastX;
  const dy = e.clientY - input.lastY;
  input.lastX = e.clientX;
  input.lastY = e.clientY;

  input.yaw -= dx * 0.003;
  input.pitch -= dy * 0.003;
  input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch));
});

const v3 = new THREE.Vector3();
const forward = new THREE.Vector3();

function updateDebugControls(dt) {
  if (renderer.xr.isPresenting) return;

  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;

  const speed = input.keys.has("shift") ? 4.5 : 2.2;

  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();

  const right = v3.set(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  right.normalize();

  const move = v3.set(0, 0, 0);
  if (input.keys.has("w")) move.add(forward);
  if (input.keys.has("s")) move.sub(forward);
  if (input.keys.has("a")) move.sub(right);
  if (input.keys.has("d")) move.add(right);
  if (input.keys.has("q")) move.y -= 1;
  if (input.keys.has("e")) move.y += 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.position.add(move);
  }
}

// -------------------- XR session hooks --------------------
renderer.xr.addEventListener("sessionstart", () => {
  log("[xr] sessionstart ✅");
  setupXRControllers();
});

renderer.xr.addEventListener("sessionend", () => {
  log("[xr] sessionend ✅");
});

// -------------------- World Load --------------------
let worldApi = null;

(async () => {
  try {
    setStatus("loading world…");
    log("[index] importing + init world…");

    worldApi = await World.init?.({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers, // ✅ now provided
      log,
      BUILD: Date.now(),
      flags: { safeMode: false, poker: true, bots: true, fx: true }
    });

    log("[index] world init ✅");
    setStatus("ready");
  } catch (e) {
    log(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setStatus("world failed ❌ (see log)");
  }
})();

// -------------------- Animate --------------------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    updateDebugControls(dt);
    applyVRLocomotion(dt);
    if (renderer.xr.isPresenting) updateLasers();

    worldApi?.tick?.(dt);
    worldApi?.update?.(dt, t);
  } catch (e) {
    log(`[index] loop error ❌ ${e?.message || String(e)}`);
  }

  renderer.render(scene, camera);
});
