// /js/main.js — Scarlett VR Poker — CASINO MASTER MAIN (movement improved)
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { initWorld, CyberAvatar } from "./world.js";

const log = (m) => { try { console.log(m); } catch {} };

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Scene + Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);
camera.position.set(0, 1.6, 6.0);

// World
const world = initWorld({ THREE, scene, log });

// VR Button (uses your index session init)
const sessionInit = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor"] };
document.body.appendChild(VRButton.createButton(renderer, sessionInit));
log("[main] VRButton appended ✅");

// Controllers hidden
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
controller1.visible = false;
controller2.visible = false;
scene.add(controller1, controller2);

// Spawn helper
function placePlayerAtSpawn() {
  const spawn = (world.spawn || new THREE.Vector3(0, 0, 6.0)).clone();
  const camXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
  const delta = spawn.clone().sub(camXZ);
  world.group.position.sub(delta);
  log("[spawn] placed ✅ " + spawn.toArray().map(n => n.toFixed(2)).join(","));
}
renderer.xr.addEventListener("sessionstart", () => requestAnimationFrame(placePlayerAtSpawn));

// Avatar 4.0
const avatar4_0 = new CyberAvatar({
  THREE, scene, camera,
  textureURL: "assets/textures/cyber_suit_atlas.png",
  log
});
window.addEventListener("scarlett-toggle-hands", (e) => avatar4_0.setHandsVisible(!!e.detail));

// Recenter
window.addEventListener("scarlett-recenter", () => {
  world.group.position.set(0, 0, 0);
  world.group.rotation.set(0, 0, 0);
  placePlayerAtSpawn();
  log("[main] recenter ✅");
});

// Teleport visuals
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.20, 0.30, 48),
  new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

const rayLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
  new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.8 })
);
rayLine.visible = false;
controller1.add(rayLine);

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();

const state = {
  moveSpeed: 2.0, // faster, less floaty
  snapAngle: THREE.MathUtils.degToRad(30),
  snapCooldown: 0,
  teleportOk: false,
  teleportHit: new THREE.Vector3(),
  teleportArmed: false,
};

// Teleport confirm
controller1.addEventListener("selectstart", () => {
  if (!window.__SCARLETT_FLAGS?.teleport) return;
  state.teleportArmed = true;
});
controller1.addEventListener("selectend", () => {
  if (!window.__SCARLETT_FLAGS?.teleport) return;
  if (state.teleportArmed && state.teleportOk) {
    const hit = state.teleportHit.clone();
    const camXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const delta = hit.clone().sub(camXZ);
    world.group.position.sub(delta);
    log("[teleport] ✅ " + hit.toArray().map(n => n.toFixed(2)).join(","));
  }
  state.teleportArmed = false;
});

// Mobile touch
const touch = { f:0,b:0,l:0,r:0,turnL:0,turnR:0 };
window.addEventListener("scarlett-touch", (e) => {
  const d = e.detail || {};
  touch.f = d.f || 0; touch.b = d.b || 0; touch.l = d.l || 0; touch.r = d.r || 0;
  touch.turnL = d.turnL || 0; touch.turnR = d.turnR || 0;
});

// stick shaping (feels tighter)
function shapeAxis(v, dead = 0.18) {
  const a = Math.abs(v);
  if (a < dead) return 0;
  const s = (a - dead) / (1 - dead);
  const curved = s * s; // quadratic curve
  return Math.sign(v) * curved;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop
let lastT = performance.now();
renderer.setAnimationLoop((t, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  controller1.visible = false;
  controller2.visible = false;

  // Avatar update
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace();
    avatar4_0.update(frame, refSpace, camera);
  }

  const flags = window.__SCARLETT_FLAGS || {};
  const teleportOn = !!flags.teleport;
  const moveOn = !!flags.move;
  const snapOn = !!flags.snap;

  // Teleport ray
  state.teleportOk = false;
  marker.visible = false;
  rayLine.visible = false;

  if (teleportOn && renderer.xr.isPresenting) {
    tmpMat.identity().extractRotation(controller1.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.copy(tmpDir);

    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;
    const denom = dir.y;
    if (Math.abs(denom) > 1e-5) {
      const tHit = (0 - origin.y) / denom;
      if (tHit > 0) {
        const hit = origin.clone().add(dir.clone().multiplyScalar(tHit));

        // Always escapable clamp near table center
        const v2 = new THREE.Vector2(hit.x, hit.z);
        const dist = v2.length();
        const TABLE_BLOCK_R = 1.25;
        const ESCAPE_R = 2.4;
        const finalHit = hit.clone();
        if (dist < TABLE_BLOCK_R) {
          if (v2.lengthSq() < 1e-6) v2.set(1, 0);
          v2.normalize().multiplyScalar(ESCAPE_R);
          finalHit.x = v2.x;
          finalHit.z = v2.y;
        }

        state.teleportOk = true;
        state.teleportHit.copy(finalHit);
        marker.position.set(finalHit.x, 0.01, finalHit.z);
        marker.visible = true;
      }
    }

    rayLine.visible = true;
    const pts = rayLine.geometry.attributes.position;
    pts.setXYZ(0, 0, 0, 0);
    pts.setXYZ(1, 0, 0, -7);
    pts.needsUpdate = true;
  }

  // Movement input (robust)
  let moveX = 0, moveZ = 0, snapX = 0;

  if (renderer.xr.isPresenting) {
    const session = renderer.xr.getSession();
    const gps = [];
    if (session?.inputSources) for (const src of session.inputSources) if (src?.gamepad) gps.push(src);

    const leftSrc = gps.find(s => s.handedness === "left") || gps[0];
    const rightSrc = gps.find(s => s.handedness === "right") || gps[1];

    const readStick = (src) => {
      const a = src?.gamepad?.axes || [];
      return { x: (a[2] ?? a[0] ?? 0), y: (a[3] ?? a[1] ?? 0) };
    };

    if (leftSrc) {
      const s = readStick(leftSrc);
      moveX = s.x; moveZ = s.y;
    }
    if (rightSrc) {
      const s = readStick(rightSrc);
      snapX = s.x;
    }
  }

  // Mobile dock
  moveZ += (touch.f ? -1 : 0) + (touch.b ? 1 : 0);
  moveX += (touch.r ? 1 : 0) + (touch.l ? -1 : 0);
  snapX += (touch.turnR ? 1 : 0) + (touch.turnL ? -1 : 0);

  // Apply move
  if (moveOn) {
    const mx = shapeAxis(moveX);
    const mz = shapeAxis(moveZ);
    if (mx || mz) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0; right.normalize();

      const dir = new THREE.Vector3();
      dir.addScaledVector(right, mx);
      dir.addScaledVector(fwd, mz);
      if (dir.lengthSq() > 1e-6) dir.normalize();

      world.group.position.sub(dir.multiplyScalar(state.moveSpeed * dt));
    }
  }

  // Snap turn
  if (snapOn) {
    const dead = 0.65;
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (state.snapCooldown === 0 && Math.abs(snapX) > dead) {
      const sgn = snapX > 0 ? -1 : 1;
      const angle = sgn * state.snapAngle;

      const camPos = camera.position.clone();
      world.group.position.sub(camPos);
      world.group.rotateY(angle);
      world.group.position.add(camPos);

      state.snapCooldown = 0.22;
    }
  }

  // World update (bots + table)
  world.update(dt, camera);

  renderer.render(scene, camera);
});

log("[main] CASINO MASTER ready ✅");
