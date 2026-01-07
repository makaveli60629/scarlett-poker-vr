// /js/main.js — Scarlet VR Poker (Stable XR Boot + Controls + World Loader)
// GitHub Pages + Quest safe: uses CDN three.js + VRButton.
// Requires: ./js/world.js exporting initWorld(ctx)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";

/** -------- Hub helpers (safe if hub UI exists) -------- */
const hubLog = (msg) => {
  const s = String(msg);
  try { window.__hubLog?.(s); } catch {}
  const el = document.getElementById("debug");
  if (el) { el.textContent += "\n" + s; el.scrollTop = el.scrollHeight; }
  try { console.log(s); } catch {}
};
const hubStatus = (msg) => {
  const el = document.getElementById("statusLine");
  if (el) el.textContent = "Status: " + msg;
};

/** -------- Core globals -------- */
let scene, camera, renderer, clock;
let playerRig, head;
let floorMesh;

let controller1, controller2, grip1, grip2;
let teleportMarker;
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

const state = {
  // movement
  moveSpeed: 2.25,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  lastSnapTime: 0,

  // teleport
  teleportActive: false,
  teleportHit: null,
  teleportValid: false,

  // bounds (keeps player inside room)
  bounds: { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 },
};

boot().catch((e) => {
  hubStatus("boot failed (see Debug)");
  hubLog("❌ BOOT FAILED: " + (e?.message || e));
  hubLog(e?.stack || "");
});

async function boot() {
  hubStatus("booting…");
  hubLog("✅ main.js starting");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 220);

  // Player rig (we move this; camera is inside)
  playerRig = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  playerRig.add(head);
  scene.add(playerRig);

  // start position facing the table
  playerRig.position.set(0, 1.6, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));
  hubLog("✅ VRButton created");

  // Always add lights FIRST (prevents black world even if textures fail)
  addLights(scene);

  hubStatus("building world…");
  const world = await initWorld({
    THREE,
    scene,
    renderer,
    hubLog,
    hubStatus,
  });

  // world.js returns references we need
  floorMesh = world.floorMesh;
  if (world.bounds) state.bounds = world.bounds;

  // teleport marker
  teleportMarker = makeTeleportMarker(THREE);
  scene.add(teleportMarker);

  // XR controllers
  initControllers(THREE);

  // Resize
  window.addEventListener("resize", onResize);

  hubStatus("ready (tap ENTER VR)");
  hubLog("✅ Boot complete");

  renderer.setAnimationLoop(tick);
}

function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 7, 2);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.6, 40);
  fill.position.set(-3, 3.5, -2);
  scene.add(fill);

  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(amb);
}

function initControllers(THREE) {
  controller1 = renderer.xr.getController(0);
  controller2 = renderer.xr.getController(1);
  scene.add(controller1);
  scene.add(controller2);

  const factory = new XRControllerModelFactory();
  grip1 = renderer.xr.getControllerGrip(0);
  grip1.add(factory.createControllerModel(grip1));
  scene.add(grip1);

  grip2 = renderer.xr.getControllerGrip(1);
  grip2.add(factory.createControllerModel(grip2));
  scene.add(grip2);

  // Teleport activate on controller 1 trigger
  controller1.addEventListener("selectstart", () => (state.teleportActive = true));
  controller1.addEventListener("selectend", () => {
    state.teleportActive = false;
    if (state.teleportValid && state.teleportHit) {
      playerRig.position.x = clamp(state.teleportHit.x, state.bounds.minX, state.bounds.maxX);
      playerRig.position.z = clamp(state.teleportHit.z, state.bounds.minZ, state.bounds.maxZ);
    }
  });

  hubLog("✅ Controllers ready (trigger = teleport)");
}

function applyVRLocomotion(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const axes = source.gamepad.axes || [];
    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0;
    const a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;

    // Pick the pair with the bigger magnitude for left stick
    const mag01 = a0 * a0 + a1 * a1;
    const mag23 = a2 * a2 + a3 * a3;

    let lx = 0, ly = 0, rx = 0;
    if (mag23 > mag01) {
      lx = a2; ly = a3; rx = a0;
    } else {
      lx = a0; ly = a1; rx = a2;
    }

    const dead = 0.15;
    if (Math.abs(lx) < dead) lx = 0;
    if (Math.abs(ly) < dead) ly = 0;
    if (Math.abs(rx) < dead) rx = 0;

    // Smooth move
    if (lx !== 0 || ly !== 0) {
      const yaw = playerRig.rotation.y;
      const f = -ly;
      const s = lx;

      const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw) * f - Math.sin(yaw) * s) * state.moveSpeed * dt;

      playerRig.position.x = clamp(playerRig.position.x + dx, state.bounds.minX, state.bounds.maxX);
      playerRig.position.z = clamp(playerRig.position.z + dz, state.bounds.minZ, state.bounds.maxZ);
    }

    // Snap turn
    const now = performance.now() / 1000;
    if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
      const dir = rx > 0 ? -1 : 1;
      playerRig.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
      state.lastSnapTime = now;
    }
  }
}

function updateTeleportRay() {
  state.teleportValid = false;
  state.teleportHit = null;

  if (!teleportMarker || !renderer.xr.isPresenting || !state.teleportActive || !floorMesh) {
    if (teleportMarker) teleportMarker.visible = false;
    return;
  }

  teleportMarker.visible = false;

  tmpMat.identity().extractRotation(controller1.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);

  const hits = raycaster.intersectObject(floorMesh, false);
  if (!hits.length) return;

  const p = hits[0].point;
  // validate within bounds
  if (p.x < state.bounds.minX || p.x > state.bounds.maxX || p.z < state.bounds.minZ || p.z > state.bounds.maxZ) return;

  state.teleportValid = true;
  state.teleportHit = p;
  teleportMarker.visible = true;
  teleportMarker.position.set(p.x, 0.02, p.z);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (renderer.xr.isPresenting) {
    applyVRLocomotion(dt);
    updateTeleportRay();
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

function makeTeleportMarker(THREE) {
  const g = new THREE.RingGeometry(0.15, 0.22, 32);
  const m = new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.position.y = 0.02;
  return ring;
            }
