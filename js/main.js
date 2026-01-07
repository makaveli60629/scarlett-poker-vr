// /js/main.js — Scarlet VR Poker (UNBREAKABLE GitHub Pages Boot)
// - Always shows ENTER VR (unless CDN is blocked)
// - Does NOT hard-import world.js (so main.js won't fail if world.js missing)
// - If world.js loads & exports initWorld, it uses it
// - Otherwise it builds a full fallback world (floor + walls + table + bots)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

// Hub logging (safe)
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

let scene, camera, renderer, clock;
let playerRig;
let floorMesh;

let controller1, grip1;
let teleportMarker;

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

const state = {
  moveSpeed: 2.25,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  lastSnapTime: 0,

  teleportActive: false,
  teleportHit: null,
  teleportValid: false,

  bounds: { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 },
};

boot().catch((e) => {
  hubStatus("boot failed (see Debug)");
  hubLog("❌ BOOT FAILED: " + (e?.message || e));
  hubLog(e?.stack || "");
});

async function boot() {
  hubStatus("booting…");
  hubLog("✅ main.js running");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 220);

  playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);
  playerRig.position.set(0, 1.6, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  hubLog("✅ VRButton created (ENTER VR should appear)");

  addLights();

  // Build fallback world first (guaranteed)
  hubStatus("building fallback world…");
  const fallback = buildFallbackWorld();
  floorMesh = fallback.floorMesh;

  teleportMarker = makeTeleportMarker();
  scene.add(teleportMarker);

  initControllers();

  // Try to load world.js dynamically (won’t break boot)
  hubStatus("loading world.js (optional)…");
  await tryLoadWorldModule();

  window.addEventListener("resize", onResize);
  hubStatus("ready (tap ENTER VR)");

  renderer.setAnimationLoop(tick);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.05));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 7, 2);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.6, 40);
  fill.position.set(-3, 3.5, -2);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
}

function initControllers() {
  controller1 = renderer.xr.getController(0);
  scene.add(controller1);

  const factory = new XRControllerModelFactory();
  grip1 = renderer.xr.getControllerGrip(0);
  grip1.add(factory.createControllerModel(grip1));
  scene.add(grip1);

  controller1.addEventListener("selectstart", () => (state.teleportActive = true));
  controller1.addEventListener("selectend", () => {
    state.teleportActive = false;
    if (state.teleportValid && state.teleportHit) {
      playerRig.position.x = clamp(state.teleportHit.x, state.bounds.minX, state.bounds.maxX);
      playerRig.position.z = clamp(state.teleportHit.z, state.bounds.minZ, state.bounds.maxZ);
    }
  });

  hubLog("✅ Controllers ready");
}

function applyVRLocomotion(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const axes = source.gamepad.axes || [];
    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0;
    const a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;

    const mag01 = a0 * a0 + a1 * a1;
    const mag23 = a2 * a2 + a3 * a3;

    let lx = 0, ly = 0, rx = 0;
    if (mag23 > mag01) { lx = a2; ly = a3; rx = a0; }
    else { lx = a0; ly = a1; rx = a2; }

    const dead = 0.15;
    if (Math.abs(lx) < dead) lx = 0;
    if (Math.abs(ly) < dead) ly = 0;
    if (Math.abs(rx) < dead) rx = 0;

    if (lx !== 0 || ly !== 0) {
      const yaw = playerRig.rotation.y;
      const f = -ly;
      const s = lx;

      const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw) * f - Math.sin(yaw) * s) * state.moveSpeed * dt;

      playerRig.position.x = clamp(playerRig.position.x + dx, state.bounds.minX, state.bounds.maxX);
      playerRig.position.z = clamp(playerRig.position.z + dz, state.bounds.minZ, state.bounds.maxZ);
    }

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

// ---------- Fallback world ----------
function buildFallbackWorld() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
  const roomSize = 14, wallH = 3.2, wallT = 0.3;
  addWall(0, wallH / 2, roomSize / 2, roomSize, wallH, wallT, wallMat);
  addWall(0, wallH / 2, -roomSize / 2, roomSize, wallH, wallT, wallMat);
  addWall(roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);
  addWall(-roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);

  // table
  const table = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 0.75, 24), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 }));
  base.position.y = 0.375;
  table.add(base);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x2d241a, roughness: 0.7 }));
  rim.position.y = 0.82;
  table.add(rim);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.10, 64), new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 }));
  felt.position.y = 0.82;
  table.add(felt);
  scene.add(table);

  // bots
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 12);
  const colors = [0x7b1e1e, 0x1e3a7b, 0x2a7b1e, 0x7b6a1e, 0x5a1e7b, 0x1e7b6f, 0x7b3f1e, 0x3f3f3f];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 });
    const bot = new THREE.Mesh(botGeo, mat);
    const a = (i / 8) * Math.PI * 2;
    bot.position.set(Math.cos(a) * 2.9, 0.95, Math.sin(a) * 2.9);
    scene.add(bot);
  }

  hubLog("✅ Fallback world built (so you never see black).");
  return { floorMesh: floor };
}

function addWall(x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
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

// ---------- Dynamic world.js loader ----------
async function tryLoadWorldModule() {
  try {
    const mod = await import("./world.js");
    hubLog("✅ Imported ./world.js");

    if (typeof mod.initWorld !== "function") {
      hubLog("⚠ world.js has no export initWorld(ctx). Keeping fallback world.");
      return;
    }

    hubStatus("world.js: initializing…");
    const result = await mod.initWorld({ THREE, scene, renderer, hubLog, hubStatus });

    if (result?.floorMesh) floorMesh = result.floorMesh;
    if (result?.bounds) state.bounds = result.bounds;

    hubLog("✅ world.js initialized (override/fill applied).");
    hubStatus("ready (tap ENTER VR)");
  } catch (e) {
    hubLog("⚠ world.js failed to load — keeping fallback world: " + (e?.message || e));
  }
  }
