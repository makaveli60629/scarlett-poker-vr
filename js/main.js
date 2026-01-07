// /js/main.js — Scarlett VR Poker — Update 9.0 (PATCH A)
// Quest + GitHub Pages SAFE (CDN only). No bare "three" imports.
// Fixes: spawn orientation/inside room, forward/back, 45° snap, teleport laser, bounds clamp.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

const hubLog = (m) => { try { window.__hubLog?.(String(m)); } catch {} };
const log = (m) => { console.log("[ScarlettVR]", m); hubLog("[ScarlettVR] " + m); };

let scene, camera, renderer, clock;
let playerRig;
let controller1;
let floorMesh;

let teleportMarker, teleportBeam;
let pads = [];
let spawnPads = [];
let worldTick = null;

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpVec = new THREE.Vector3();

const state = {
  moveSpeed: 2.35,
  snapTurnDeg: 45,
  snapCooldown: 0.22,
  lastSnapTime: 0,
  teleportActive: false,
  teleportValid: false,
  teleportPadHit: null,
  roomClamp: { minX: -28, maxX: 28, minZ: -28, maxZ: 28 } // updated by world.js
};

boot().catch((e) => {
  log("❌ BOOT FAILED: " + (e?.message || e));
  log(e?.stack || "");
});

async function boot() {
  log("main.js booting (Update 9.0 Patch A)");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070707);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 240);

  // Rig at ground level; camera sits at head height
  playerRig = new THREE.Group();
  camera.position.set(0, 1.6, 0);
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
  log("VRButton added");

  addLights();

  // Load world
  const mod = await import("./world.js");
  const world = await mod.initWorld({ THREE, scene, renderer, hubLog: log });

  floorMesh = world.floorMesh;
  pads = world.teleportPads || [];
  spawnPads = world.spawnPads || [];
  worldTick = world.tick || null;

  if (world.roomClamp) state.roomClamp = world.roomClamp;

  // Spawn ONLY on teleport pad 0, face table
  spawnOnPad(0);

  // Controllers + teleport
  initControllers();

  // Teleport visuals
  teleportMarker = makeTeleportMarker(THREE);
  teleportBeam = makeTeleportBeam(THREE);
  scene.add(teleportMarker);
  scene.add(teleportBeam);

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("✅ Update 9.0 Patch A running");
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(6, 10, 3);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.7, 90);
  fill.position.set(-6, 4.2, 6);
  scene.add(fill);

  // ceiling lights feel
  for (let i = 0; i < 5; i++) {
    const p = new THREE.PointLight(0xffffff, 0.35, 40);
    p.position.set(-10 + i * 5, 3.0, 0);
    scene.add(p);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
}

function spawnOnPad(index = 0) {
  const p = spawnPads[index] || spawnPads[0] || new THREE.Vector3(0, 0, 14);
  playerRig.position.set(p.x, 0, p.z);

  // Face toward origin (table area)
  tmpVec.set(0, 0, 0).sub(playerRig.position);
  playerRig.rotation.set(0, Math.atan2(tmpVec.x, tmpVec.z), 0);

  log(`Spawned on pad ${index} at x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`);
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
    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0, a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;

    // Choose the pair with larger magnitude as left stick
    const mag01 = a0*a0 + a1*a1;
    const mag23 = a2*a2 + a3*a3;

    let lx=0, ly=0, rx=0;
    if (mag23 > mag01) { lx=a2; ly=a3; rx=a0; }
    else { lx=a0; ly=a1; rx=a2; }

    const dead = 0.15;
    if (Math.abs(lx) < dead) lx = 0;
    if (Math.abs(ly) < dead) ly = 0;
    if (Math.abs(rx) < dead) rx = 0;

    // FIX: Forward must move forward (your old build was inverted)
    // On most controllers: ly is negative when pushing forward.
    // So we use f = -ly (this is the correct mapping).
    const f = -ly;
    const s = lx;

    if (f !== 0 || s !== 0) {
      const yaw = playerRig.rotation.y;
      const dx = (Math.sin(yaw)*f + Math.cos(yaw)*s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw)*f - Math.sin(yaw)*s) * state.moveSpeed * dt;

      playerRig.position.x += dx;
      playerRig.position.z += dz;
    }

    // Snap turn 45°
    const now = performance.now()/1000;
    if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
      const dir = rx > 0 ? -1 : 1;
      playerRig.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
      state.lastSnapTime = now;
    }
  }

  // Clamp inside room bounds (simple “solid” safety)
  const c = state.roomClamp;
  playerRig.position.x = Math.min(c.maxX, Math.max(c.minX, playerRig.position.x));
  playerRig.position.z = Math.min(c.maxZ, Math.max(c.minZ, playerRig.position.z));
}

function updateTeleportVisuals() {
  state.teleportValid = false;
  state.teleportPadHit = null;

  if (!renderer.xr.isPresenting || !state.teleportActive || !pads.length) {
    teleportMarker.visible = false;
    teleportBeam.visible = false;
    return;
  }

  // Ray from controller forward
  tmpMat.identity().extractRotation(controller1.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster.ray.direction.set(0,0,-1).applyMatrix4(tmpMat);

  // Intersect pads only
  const hits = raycaster.intersectObjects(pads, false);

  let endPoint;
  if (hits.length) {
    const hitPad = hits[0].object;
    state.teleportValid = true;
    state.teleportPadHit = hitPad;

    teleportMarker.visible = true;
    teleportMarker.position.set(hitPad.position.x, 0.035, hitPad.position.z);

    endPoint = teleportMarker.position.clone().setY(0.12);
  } else {
    teleportMarker.visible = false;
    endPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(8));
  }

  // Beam line
  teleportBeam.visible = true;
  const a = raycaster.ray.origin.clone();
  const b = endPoint;

  const pos = teleportBeam.geometry.attributes.position;
  pos.setXYZ(0, a.x, a.y, a.z);
  pos.setXYZ(1, b.x, b.y, b.z);
  pos.needsUpdate = true;
}

function makeTeleportMarker(THREE) {
  const g = new THREE.RingGeometry(0.16, 0.24, 32);
  const m = new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  return ring;
}

function makeTeleportBeam(THREE) {
  const g = new THREE.BufferGeometry();
  const vertices = new Float32Array(6); // 2 points
  g.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x33ff66 });
  const line = new THREE.Line(g, m);
  line.visible = false;
  return line;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (renderer.xr.isPresenting) {
    applyVRLocomotion(dt);
    updateTeleportVisuals();
  }

  try { worldTick?.(dt); } catch {}
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
