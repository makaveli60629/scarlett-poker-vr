// /js/main.js — Scarlett VR Poker — Update 9.0 (SAFE FOUNDATION)
// GitHub Pages + Quest safe: CDN imports only (NO "three").
// Spawns ONLY on teleport pads, lobby start, visible table + bots, simple gameplay loop.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

const hubLog = (m) => { try { window.__hubLog?.(String(m)); } catch {} };
const log = (m) => { console.log("[ScarlettVR]", m); hubLog("[ScarlettVR] " + m); };

let scene, camera, renderer, clock;
let playerRig;
let controller1;
let floorMesh;
let teleportMarker;
let pads = [];           // teleport pads (mesh list)
let spawnPads = [];      // pad positions used for spawn
let worldTick = null;

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

const state = {
  moveSpeed: 2.35,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  lastSnapTime: 0,
  teleportActive: false,
  teleportValid: false,
  teleportPadHit: null,
};

boot().catch((e) => {
  log("❌ BOOT FAILED: " + (e?.message || e));
  log(e?.stack || "");
});

async function boot() {
  log("main.js booting (Update 9.0)");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 220);

  playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  const btn = VRButton.createButton(renderer);
  btn.style.position = "fixed";
  btn.style.right = "14px";
  btn.style.bottom = "14px";
  btn.style.zIndex = "99999";
  document.body.appendChild(btn);

  addLights();

  // Load world
  const mod = await import("./world.js");
  const world = await mod.initWorld({ THREE, scene, renderer, hubLog: log });

  floorMesh = world.floorMesh;
  pads = world.teleportPads || [];
  spawnPads = world.spawnPads || [];

  worldTick = world.tick || null;

  // Spawn player ONLY on a teleport pad (lobby)
  spawnOnPad(0);

  // Controllers + locomotion + teleport
  initControllers();

  // Teleport marker (ring)
  teleportMarker = makeTeleportMarker();
  scene.add(teleportMarker);

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("✅ Update 9.0 running");
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.1));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 8, 2);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.55, 40);
  fill.position.set(-3, 3.2, -2);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
}

function spawnOnPad(index = 0) {
  const p = spawnPads[index] || spawnPads[0] || new THREE.Vector3(0, 0, 4.8);
  playerRig.position.set(p.x, 1.6, p.z);
  playerRig.rotation.set(0, Math.PI, 0); // face toward table area by default
  log("Spawned on pad " + index + " at " + p.x.toFixed(2) + "," + p.z.toFixed(2));
}

function initControllers() {
  controller1 = renderer.xr.getController(0);
  scene.add(controller1);

  controller1.addEventListener("selectstart", () => (state.teleportActive = true));
  controller1.addEventListener("selectend", () => {
    state.teleportActive = false;
    if (state.teleportValid && state.teleportPadHit) {
      const p = state.teleportPadHit.position;
      playerRig.position.x = p.x;
      playerRig.position.z = p.z;
    }
  });

  log("Controllers ready");
}

function applyVRLocomotion(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const axes = source.gamepad.axes || [];
    // Heuristic to handle different controllers:
    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0, a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;
    const mag01 = a0*a0 + a1*a1;
    const mag23 = a2*a2 + a3*a3;

    let lx=0, ly=0, rx=0;
    if (mag23 > mag01) { lx=a2; ly=a3; rx=a0; }
    else { lx=a0; ly=a1; rx=a2; }

    const dead = 0.15;
    if (Math.abs(lx) < dead) lx = 0;
    if (Math.abs(ly) < dead) ly = 0;
    if (Math.abs(rx) < dead) rx = 0;

    // Move
    if (lx !== 0 || ly !== 0) {
      const yaw = playerRig.rotation.y;
      const f = -ly;
      const s = lx;

      const dx = (Math.sin(yaw)*f + Math.cos(yaw)*s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw)*f - Math.sin(yaw)*s) * state.moveSpeed * dt;

      playerRig.position.x += dx;
      playerRig.position.z += dz;
    }

    // Snap turn
    const now = performance.now()/1000;
    if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
      const dir = rx > 0 ? -1 : 1;
      playerRig.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
      state.lastSnapTime = now;
    }
  }
}

function updateTeleport() {
  state.teleportValid = false;
  state.teleportPadHit = null;

  if (!renderer.xr.isPresenting || !state.teleportActive || !pads.length) {
    teleportMarker.visible = false;
    return;
  }

  // Ray from controller forward
  tmpMat.identity().extractRotation(controller1.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster.ray.direction.set(0,0,-1).applyMatrix4(tmpMat);

  const hits = raycaster.intersectObjects(pads, false);
  if (!hits.length) {
    teleportMarker.visible = false;
    return;
  }

  // Hit a teleport pad ONLY
  const hitPad = hits[0].object;
  state.teleportValid = true;
  state.teleportPadHit = hitPad;

  teleportMarker.visible = true;
  teleportMarker.position.set(hitPad.position.x, 0.03, hitPad.position.z);
}

function makeTeleportMarker() {
  const g = new THREE.RingGeometry(0.16, 0.24, 32);
  const m = new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  return ring;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);
  if (renderer.xr.isPresenting) {
    applyVRLocomotion(dt);
    updateTeleport();
  }
  try { worldTick?.(dt); } catch {}
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
    }
