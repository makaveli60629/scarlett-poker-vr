// /js/main.js — Scarlet VR Poker (FULL FEEL BUILD)
// Goals:
// - Always boot WebXR + visible world (no black screen)
// - Movement: smooth + snap turn + teleport
// - World: lobby + walls + floor + lighting + poker table + bots
// - "Watch mode": bots idle + table scene so you can feel the game
// - Attempts to auto-load your real modules (world/table/poker/avatar/shop) if available
// - Sends status/errors into Hub debug panel (index.html)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

// --------------------
// Hub logging helpers
// --------------------
const hubLog = (msg) => {
  try { window.__hubLog?.(String(msg)); } catch {}
  const el = document.getElementById("debug");
  if (el) {
    el.textContent += "\n" + msg;
    el.scrollTop = el.scrollHeight;
  }
  // Also console (if available)
  try { console.log(msg); } catch {}
};

const hubStatus = (msg) => {
  const statusLine = document.getElementById("statusLine");
  if (statusLine) statusLine.textContent = "Status: " + msg;
};

// --------------------
// Core globals
// --------------------
let scene, camera, renderer, clock;
let playerRig; // group that we move around
let head;      // camera parent inside rig

// XR
let controller1, controller2, grip1, grip2;
let rayLine1, teleportMarker;
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

// World
let floorMesh;
const state = {
  bots: [],
  botTime: 0,

  // movement
  moveSpeed: 2.25,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  lastSnapTime: 0,

  // teleport
  teleportActive: false,
  teleportHit: null,
  teleportValid: false,

  // desktop (kept for Android non-VR too)
  keys: new Set(),
};

// Boot
boot().catch((e) => {
  hubStatus("boot failed (open debug)");
  hubLog("❌ BOOT FAILED: " + (e?.message || e));
  hubLog(e?.stack || "");
});

async function boot() {
  hubStatus("booting renderer…");
  hubLog("✅ main.js starting…");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060606);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 220);

  playerRig = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  playerRig.add(head);
  scene.add(playerRig);

  // Comfortable start
  playerRig.position.set(0, 1.6, 3.0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VRButton
  document.body.appendChild(VRButton.createButton(renderer));
  hubLog("✅ VRButton created");

  // Lighting ALWAYS (prevents black screen)
  addLights();

  // Build a guaranteed world first (fallback world)
  hubStatus("building world…");
  buildFallbackWorld();

  // XR controllers + teleport
  initControllers();

  // Desktop keys (Android browser can still use touch/gamepad sometimes)
  initDesktopKeys();

  // Try auto-loading your real modules ON TOP (optional)
  // This will never break the scene; errors are caught and logged.
  hubStatus("loading modules…");
  await tryLoadProjectModules();

  // Finalize
  window.addEventListener("resize", onResize);
  hubStatus("ready (enter VR)");
  hubLog("✅ Boot complete.");

  renderer.setAnimationLoop(tick);
}

// --------------------
// Lights
// --------------------
function addLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 7, 2);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.65, 40);
  fill.position.set(-3, 3.5, -2);
  scene.add(fill);

  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(amb);
}

// --------------------
// Fallback World (always works)
// --------------------
function buildFallbackWorld() {
  // Floor
  floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 1, metalness: 0 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.name = "FLOOR";
  scene.add(floorMesh);

  // Room
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9, metalness: 0 });
  const roomSize = 14;
  const wallH = 3.2;
  const wallT = 0.3;

  addWall(0, wallH / 2, roomSize / 2, roomSize, wallH, wallT, wallMat);
  addWall(0, wallH / 2, -roomSize / 2, roomSize, wallH, wallT, wallMat);
  addWall(roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);
  addWall(-roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);

  // Rug (placeholder “carpet” feel)
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1a12, roughness: 1, metalness: 0 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  scene.add(rug);

  // Poker table + seats
  createPokerTable();

  // Bots
  spawnBots(8);

  // Teleport marker
  teleportMarker = makeTeleportMarker();
  scene.add(teleportMarker);

  // A visible “anchor cube” so you always know orientation
  const anchor = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
  );
  anchor.position.set(0, 1.4, -1.5);
  anchor.name = "ANCHOR";
  scene.add(anchor);

  hubLog("✅ Fallback world built (floor/room/table/bots).");
}

function addWall(x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.name = "WALL";
  scene.add(mesh);
}

function createPokerTable() {
  const table = new THREE.Group();
  table.position.set(0, 0, 0);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 })
  );
  base.position.y = 0.375;
  table.add(base);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x2d241a, roughness: 0.7 })
  );
  rim.position.y = 0.82;
  table.add(rim);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.10, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.y = 0.82;
  table.add(felt);

  // Seats
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.95 });
  const seatGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 2.7;
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    seat.rotation.y = -a + Math.PI / 2;
    table.add(seat);
  }

  table.name = "POKER_TABLE";
  scene.add(table);
}

function spawnBots(count) {
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 12);
  const colors = [0x7b1e1e, 0x1e3a7b, 0x2a7b1e, 0x7b6a1e, 0x5a1e7b, 0x1e7b6f, 0x7b3f1e, 0x3f3f3f];

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 });
    const bot = new THREE.Mesh(botGeo, mat);

    const a = (i / count) * Math.PI * 2;
    const r = 2.9;
    bot.position.set(Math.cos(a) * r, 0.95, Math.sin(a) * r);
    bot.rotation.y = -a + Math.PI / 2;

    bot.userData = {
      phase: Math.random() * Math.PI * 2,
      bob: 0.02 + Math.random() * 0.02,
    };

    bot.name = "BOT_" + i;
    scene.add(bot);
    state.bots.push(bot);
  }
}

// --------------------
// XR Controllers + Teleport
// --------------------
function initControllers() {
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

  rayLine1 = makeRayLine();
  controller1.add(rayLine1);

  controller1.addEventListener("selectstart", () => (state.teleportActive = true));
  controller1.addEventListener("selectend", () => {
    state.teleportActive = false;
    if (state.teleportValid && state.teleportHit) {
      playerRig.position.x = state.teleportHit.x;
      playerRig.position.z = state.teleportHit.z;
    }
  });

  hubLog("✅ XR controllers initialized");
}

function makeRayLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 8;
  return line;
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

// --------------------
// Movement (VR + basic desktop keys)
// --------------------
function applyVRMovement(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const gp = source.gamepad;
    const axes = gp.axes || [];

    const a0 = axes[0] ?? 0, a1 = axes[1] ?? 0;
    const a2 = axes[2] ?? 0, a3 = axes[3] ?? 0;

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

    // Smooth move (left stick)
    if (lx !== 0 || ly !== 0) {
      const yaw = playerRig.rotation.y;
      const f = -ly;
      const s = lx;

      const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * state.moveSpeed * dt;
      const dz = (Math.cos(yaw) * f - Math.sin(yaw) * s) * state.moveSpeed * dt;

      tryMove(dx, dz);
    }

    // Snap turn (right stick)
    const now = performance.now() / 1000;
    if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
      const dir = rx > 0 ? -1 : 1;
      playerRig.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
      state.lastSnapTime = now;
    }
  }
}

function tryMove(dx, dz) {
  const nextX = THREE.MathUtils.clamp(playerRig.position.x + dx, -6.6, 6.6);
  const nextZ = THREE.MathUtils.clamp(playerRig.position.z + dz, -6.6, 6.6);
  playerRig.position.x = nextX;
  playerRig.position.z = nextZ;
}

function initDesktopKeys() {
  window.addEventListener("keydown", (e) => state.keys.add(e.code));
  window.addEventListener("keyup", (e) => state.keys.delete(e.code));
}

// --------------------
// Teleport ray update
// --------------------
function updateTeleportRay() {
  state.teleportValid = false;
  state.teleportHit = null;
  if (!teleportMarker) return;

  teleportMarker.visible = false;
  if (!renderer.xr.isPresenting) return;
  if (!state.teleportActive) return;

  tmpMat.identity().extractRotation(controller1.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);

  const hits = raycaster.intersectObject(floorMesh, false);
  if (hits.length) {
    const p = hits[0].point;
    const interior = 6.6;
    if (Math.abs(p.x) <= interior && Math.abs(p.z) <= interior) {
      state.teleportValid = true;
      state.teleportHit = p;
      teleportMarker.visible = true;
      teleportMarker.position.set(p.x, 0.02, p.z);
    }
  }
}

// --------------------
// Bots idle (watch feel)
// --------------------
function updateBots(dt) {
  state.botTime += dt;
  for (const bot of state.bots) {
    const ud = bot.userData;
    bot.position.y = 0.95 + Math.sin(state.botTime * 2 + ud.phase) * ud.bob;
  }
}

// --------------------
// Tick
// --------------------
function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (renderer.xr.isPresenting) {
    applyVRMovement(dt);
    updateTeleportRay();
  }

  updateBots(dt);

  renderer.render(scene, camera);
}

// --------------------
// Resize
// --------------------
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// --------------------
// Attempt to load your existing modules (safe)
// --------------------
async function tryLoadProjectModules() {
  // We try importing your modules. If they don’t match expected exports, we just log and keep fallback world.
  const candidates = [
    "./js/safe_import.js",
    "./js/world.js",
    "./js/table_factory.js",
    "./js/poker_simulation.js",
    "./js/avatar.js",
    "./js/shop_ui.js",
    "./js/audio.js",
  ];

  for (const path of candidates) {
    try {
      const mod = await import(path);

      hubLog(`✅ loaded module: ${path}`);

      // Try common entrypoint names.
      // If your module exports any of these, we call it with a context.
      const fn =
        mod.init || mod.start || mod.boot ||
        mod.createWorld || mod.initWorld || mod.buildWorld ||
        mod.run || mod.main;

      if (typeof fn === "function") {
        hubLog(`▶ calling entrypoint in ${path}…`);
        await fn({
          THREE,
          scene,
          camera,
          renderer,
          playerRig,
          head,
          hubLog,
          hubStatus,
        });
        hubLog(`✅ entrypoint ran: ${path}`);
      }
    } catch (e) {
      // Not fatal.
      hubLog(`⚠ module skipped: ${path} — ${(e?.message || e)}`);
    }
  }

  hubLog("✅ Module load pass complete (fallback world remains if modules didn’t attach).");
    }
