// /js/main.js — Scarlett Poker VR — MAIN (GitHub Pages Safe)
// - VRButton always
// - World build (imports ./world.js)
// - Spawn ALWAYS on lobby pad
// - Height lock @ 1.80m
// - VR movement: left stick move, right stick snap turn
// - Teleport laser + ring hard-bound to controller GRIP
// - Teleport activation: GRIP + TRIGGER + THUMBSTICK CLICK (ALL)
// - Android DEV movement: on-screen MOVE/TURN pads + touch-safe
// - Desktop movement: WASD + QE

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const HUD = document.getElementById("hud");

function line(msg, cls="ok") {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = msg;
  HUD.appendChild(el);
}
function setTitle(t) { HUD.textContent = t; }
function ok(m){ line("✓ " + m, "ok"); }
function warn(m){ line("! " + m, "warn"); }
function bad(m){ line("✗ " + m, "bad"); }

setTitle("Scarlett Poker VR — booting…");

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Always show VRButton (Quest uses it; Android may still show "Enter VR" if supported)
document.body.appendChild(VRButton.createButton(renderer));
ok("VRButton added");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050607);
scene.fog = new THREE.Fog(0x050607, 8, 48);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 180);

// ---------- Rig (we move this, not camera) ----------
const rig = new THREE.Group();
rig.position.set(0, 0, 0);
rig.add(camera);
scene.add(rig);

// Headlamp (camera light)
const headlamp = new THREE.PointLight(0xffffff, 1.25, 18);
headlamp.position.set(0, 0, 0);
camera.add(headlamp);
ok("Headlamp on camera");

// Baseline lights (in case world lights fail)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.65);
hemi.position.set(0, 10, 0);
scene.add(hemi);
ok("Baseline lights enabled");

// ---------- Build World ----------
let world = null;
let pads = [];
let padById = {};
let colliders = [];
let bounds = null;
let floorY = 0;

try {
  world = World.build(scene, rig);
  pads = world.pads || [];
  padById = world.padById || {};
  colliders = world.colliders || [];
  bounds = world.bounds || null;
  floorY = world.floorY ?? 0;
  ok("world.js built");
} catch (e) {
  bad("world.js build failed: " + (e?.message || e));
}

// Spawn ALWAYS on lobby pad (never in table)
function setSpawnToLobby() {
  const lobby = padById?.lobby?.position;
  if (lobby) {
    rig.position.set(lobby.x, lobby.y, lobby.z);
    ok(`Spawn set to pad (${lobby.x.toFixed(2)}, ${lobby.z.toFixed(2)})`);
  } else {
    // safe fallback
    rig.position.set(0, floorY, 11.5);
    warn("Spawn fallback used (pad missing)");
  }
}
setSpawnToLobby();

// ---------- Height Lock ----------
const HEIGHT_LOCK_M = 1.80;
let heightLockOn = true;
function applyHeightLock() {
  if (!heightLockOn) return;
  // Force rig Y so camera ends up around HEIGHT_LOCK_M.
  // In VR, camera.y comes from XR; in non-VR it may be 0.
  const camY = camera.position.y || 0;
  const targetRigY = HEIGHT_LOCK_M - camY;
  rig.position.y = targetRigY;
}
ok(`Height lock enabled @ ${HEIGHT_LOCK_M.toFixed(2)}m`);

// ---------- DEV MODE (Android pads) ----------
const devPad = document.getElementById("devPad");
const moveStick = document.getElementById("moveStick");
const turnStick = document.getElementById("turnStick");
const moveKnob = document.getElementById("moveKnob");
const turnKnob = document.getElementById("turnKnob");

const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const isAndroid = /Android/i.test(navigator.userAgent || "");
const devMode = isTouch && !renderer.xr.isPresenting; // always helpful on phone browser
if (isTouch || isAndroid) {
  devPad.style.display = "flex";
  ok("DEV MODE ON (buttons + movement)");
}

function makeStick(stickEl, knobEl) {
  const state = { x: 0, y: 0, active: false, id: null };
  const rectOf = () => stickEl.getBoundingClientRect();

  function setKnob(nx, ny) {
    // nx, ny in [-1..1]
    const r = rectOf();
    const max = Math.min(r.width, r.height) * 0.30;
    knobEl.style.transform = `translate(${nx * max}px, ${ny * max}px)`;
  }

  stickEl.addEventListener("pointerdown", (e) => {
    state.active = true;
    state.id = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    stickEl.style.borderColor = "rgba(83,255,154,.55)";
  });

  stickEl.addEventListener("pointermove", (e) => {
    if (!state.active || e.pointerId !== state.id) return;
    const r = rectOf();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / (r.width / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    const nx = Math.max(-1, Math.min(1, dx));
    const ny = Math.max(-1, Math.min(1, dy));
    state.x = nx;
    state.y = ny;
    setKnob(nx, ny);
  });

  stickEl.addEventListener("pointerup", (e) => {
    if (e.pointerId !== state.id) return;
    state.active = false;
    state.id = null;
    state.x = 0;
    state.y = 0;
    setKnob(0, 0);
    stickEl.style.borderColor = "rgba(83,255,154,.25)";
  });

  stickEl.addEventListener("pointercancel", () => {
    state.active = false;
    state.id = null;
    state.x = 0;
    state.y = 0;
    setKnob(0, 0);
    stickEl.style.borderColor = "rgba(83,255,154,.25)";
  });

  setKnob(0, 0);
  return state;
}

const devMove = makeStick(moveStick, moveKnob);
const devTurn = makeStick(turnStick, turnKnob);

// Desktop keys
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

// ---------- Controller + Laser + Teleport ----------
const controllerGripL = renderer.xr.getControllerGrip(0);
const controllerGripR = renderer.xr.getControllerGrip(1);
rig.add(controllerGripL);
rig.add(controllerGripR);

// Visible “laser” line (green) + ring
const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
const laserGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1),
]);
const laserLine = new THREE.Line(laserGeo, laserMat);

// Teleport ring
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.22, 0.28, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.visible = false;

// Attach visuals to RIGHT grip by default (Quest standard)
controllerGripR.add(laserLine);
scene.add(ring);

ok("VRRig: controllers ready");

// Raycast setup
const raycaster = new THREE.Raycaster();
const tmpMat4 = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const floorPlanes = []; // we’ll raycast against meshes flagged isFloor if present

scene.traverse((o) => {
  if (o?.userData?.isFloor) floorPlanes.push(o);
});

let wantTeleport = false;
let lastGoodHit = null;

// Input helpers: listen for ALL of them (grip + trigger + thumbstick-click)
function bindTeleportButtons(controller, label) {
  controller.addEventListener("selectstart", () => { wantTeleport = true; });  // trigger on many devices
  controller.addEventListener("selectend", () => { wantTeleport = false; });

  controller.addEventListener("squeezestart", () => { wantTeleport = true; }); // grip
  controller.addEventListener("squeezeend", () => { wantTeleport = false; });

  // Thumbstick click has no universal XR event — we read gamepad buttons in loop (below)
  ok(`Teleport bound (${label}): trigger + grip + stick-click`);
}

const xrControllerL = renderer.xr.getController(0);
const xrControllerR = renderer.xr.getController(1);
rig.add(xrControllerL);
rig.add(xrControllerR);
bindTeleportButtons(xrControllerL, "Left");
bindTeleportButtons(xrControllerR, "Right");

// ---------- Movement ----------
const MOVE_SPEED = 2.0;        // m/s
const STRAFE_SPEED = 2.0;      // m/s
const SNAP_TURN_DEG = 45;
const SNAP_COOLDOWN = 0.28;
let snapCooldown = 0;

// Fix your “left stick inverted” issue: we map axes carefully
function getXRGamepads() {
  const session = renderer.xr.getSession?.();
  if (!session) return [];
  const pads = [];
  for (const src of session.inputSources) {
    if (src && src.gamepad) pads.push(src.gamepad);
  }
  return pads;
}

function clampToBounds() {
  if (!bounds) return;
  rig.position.x = Math.max(bounds.min.x, Math.min(bounds.max.x, rig.position.x));
  rig.position.z = Math.max(bounds.min.z, Math.min(bounds.max.z, rig.position.z));
}

function applyMove(dt) {
  // Determine heading from camera (where you look)
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  let moveX = 0;
  let moveY = 0; // forward/back

  // 1) Android DEV sticks
  if (devPad.style.display === "flex") {
    // move stick: x = strafe, y = forward (invert y because screen coords)
    moveX += devMove.x;
    moveY += -devMove.y;
  }

  // 2) Desktop WASD
  if (keys.has("KeyW")) moveY += 1;
  if (keys.has("KeyS")) moveY -= 1;
  if (keys.has("KeyA")) moveX -= 1;
  if (keys.has("KeyD")) moveX += 1;

  // 3) VR: gamepad axes
  if (renderer.xr.isPresenting) {
    const pads = getXRGamepads();

    // Heuristic: first pad = left hand on Quest usually
    const gpL = pads[0];
    const gpR = pads[1];

    if (gpL && gpL.axes && gpL.axes.length >= 2) {
      // Quest: axes[2]/[3] sometimes used, but common is [2,3] for thumbstick on some mappings.
      // We'll prefer [2,3] if present & non-zero; else use [0,1].
      let ax = gpL.axes[2] ?? gpL.axes[0] ?? 0;
      let ay = gpL.axes[3] ?? gpL.axes[1] ?? 0;

      // Fix: user reports left stick left/right swapped → invert X if needed
      // We will invert X to match expectation (left goes left).
      ax = -ax;

      moveX += ax;
      moveY += -ay;
    }

    // Snap turn from RIGHT stick X
    if (gpR && gpR.axes && gpR.axes.length >= 2) {
      let tx = gpR.axes[2] ?? gpR.axes[0] ?? 0;
      // Snap by threshold
      if (snapCooldown <= 0) {
        if (tx > 0.75) {
          rig.rotation.y -= THREE.MathUtils.degToRad(SNAP_TURN_DEG);
          snapCooldown = SNAP_COOLDOWN;
        } else if (tx < -0.75) {
          rig.rotation.y += THREE.MathUtils.degToRad(SNAP_TURN_DEG);
          snapCooldown = SNAP_COOLDOWN;
        }
      }
    }

    // Thumbstick click -> teleport (buttons)
    if (gpR && gpR.buttons && gpR.buttons.length) {
      const stickClick = gpR.buttons[3] || gpR.buttons[1]; // varies; 3 often thumbstick
      if (stickClick?.pressed) wantTeleport = true;
    }
    if (gpL && gpL.buttons && gpL.buttons.length) {
      const stickClick = gpL.buttons[3] || gpL.buttons[1];
      if (stickClick?.pressed) wantTeleport = true;
    }
  }

  // Turn (DEV right stick) + QE for desktop
  if (!renderer.xr.isPresenting && devPad.style.display === "flex") {
    rig.rotation.y -= devTurn.x * dt * 1.8; // smooth yaw for dev
  }
  if (keys.has("KeyQ")) rig.rotation.y += dt * 1.6;
  if (keys.has("KeyE")) rig.rotation.y -= dt * 1.6;

  // Apply movement
  if (moveX !== 0 || moveY !== 0) {
    const v = new THREE.Vector3();
    v.addScaledVector(right, moveX * STRAFE_SPEED * dt);
    v.addScaledVector(forward, moveY * MOVE_SPEED * dt);

    rig.position.add(v);
    clampToBounds();
  }

  if (snapCooldown > 0) snapCooldown -= dt;
}

// ---------- Teleport Aim (laser ALWAYS from controllerGripR) ----------
function updateTeleportAim() {
  // If not in VR, use camera forward for dev aiming
  const originObj = renderer.xr.isPresenting ? controllerGripR : camera;

  // Build ray from grip/camera pose (THIS prevents “laser stuck at center”)
  tmpMat4.identity().extractRotation(originObj.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat4).normalize();
  originObj.getWorldPosition(tmpPos);

  raycaster.set(tmpPos, tmpDir);
  raycaster.far = 25;

  let hit = null;

  // Prefer floor mesh if flagged
  if (floorPlanes.length) {
    const hits = raycaster.intersectObjects(floorPlanes, true);
    if (hits && hits.length) hit = hits[0];
  }

  // Fallback: invisible ground plane at floorY
  if (!hit) {
    const t = (floorY - tmpPos.y) / tmpDir.y;
    if (isFinite(t) && t > 0 && t < 25) {
      const p = tmpPos.clone().add(tmpDir.clone().multiplyScalar(t));
      hit = { point: p };
    }
  }

  // Update laser length + ring
  if (hit && hit.point) {
    lastGoodHit = hit.point.clone();
    ring.position.copy(lastGoodHit);
    ring.visible = true;

    // update laser geometry
    const localEnd = originObj.worldToLocal(hit.point.clone());
    laserGeo.setFromPoints([new THREE.Vector3(0, 0, 0), localEnd]);
    laserGeo.attributes.position.needsUpdate = true;
  } else {
    ring.visible = false;
    // default short laser
    laserGeo.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)]);
    laserGeo.attributes.position.needsUpdate = true;
  }
}

// Teleport execution
function tryTeleport() {
  if (!wantTeleport) return;
  if (!lastGoodHit) return;

  // Teleport rig so that camera lands on the hit point (keeping height lock)
  // We move rig XZ to hit, keep current rig Y (height lock will keep stable)
  rig.position.x = lastGoodHit.x;
  rig.position.z = lastGoodHit.z;
  clampToBounds();

  // reset wantTeleport so it doesn't spam
  wantTeleport = false;
}

// ---------- Loop ----------
let lastT = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  applyHeightLock();
  applyMove(dt);

  updateTeleportAim();
  tryTeleport();

  renderer.render(scene, camera);
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Final log
ok("Boot complete");
