// /js/main.js — Scarlett Poker VR — PERMANENT v1.0 (GitHub/Quest Safe)
// Always visible safe scene + loads ./world.js. Anti-void teleport. Manual ENTER VR + VRButton.
// If world.js fails, game still runs (grid + cube) and overlay tells you why.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch (e) { /* ok */ }

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

function write(prefix, msg) {
  const line = `${prefix} ${msg}`;
  if (overlay) overlay.textContent += `\n${line}`;
  console.log(line);
}
const ok = (m) => write("✅", m);
const warn = (m) => write("⚠️", m);
const fail = (m) => write("❌", m);

if (overlay) overlay.textContent = "Scarlett Poker VR — booting…";

// --------------------
// Core
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.4;
document.body.appendChild(renderer.domElement);

ok("Renderer ready");

try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference space: local-floor"); }
catch { warn("Reference space set failed (ok)"); }

// Player rig
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height lock feel (tune later)
playerRig.position.y = 0.45;

// Two roots: safeRoot never removed; worldRoot gets rebuilt by World.build
const safeRoot = new THREE.Group();
scene.add(safeRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

// --------------------
// SAFE WORLD (never black / never missing)
// --------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide })
);
safeRoot.add(sky);

const safeFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
safeFloor.rotation.x = -Math.PI / 2;
safeFloor.position.y = 0;
safeRoot.add(safeFloor);

const grid = new THREE.GridHelper(120, 120, 0x00ff66, 0x1f2a3a);
grid.position.y = 0.02; // anti-blink
safeRoot.add(grid);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 0.35, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.75 })
);
cube.position.set(0, 1.35, 6.8);
safeRoot.add(cube);

// Lighting (helps any StandardMaterial objects)
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.45));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

// Headlamp so you can always see objects near you
const headlamp = new THREE.PointLight(0xffffff, 2.0, 40);
camera.add(headlamp);

ok("Safe sky + floor + grid + cube loaded");

// Safe spawn (will be overridden by world spawn)
playerRig.position.x = 0;
playerRig.position.z = 8;
ok("Spawn set (safe)");

// --------------------
// LOAD WORLD.JS (GitHub safe)
// --------------------
let World = null;
let worldData = null;

try {
  const mod = await import("./world.js?v=2026"); // cache-bust (change if needed)
  World = mod?.World;
  if (!World?.build) throw new Error("Export World.build missing");

  worldData = World.build(worldRoot, playerRig);
  ok("world.js imported + World.build() executed");

  if (worldData?.spawn) {
    playerRig.position.x = worldData.spawn.x;
    playerRig.position.z = worldData.spawn.z;
    ok(`World spawn applied: (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
  } else {
    warn("World returned no spawn; kept safe spawn");
  }
} catch (e) {
  fail(`world.js failed: ${e?.message || e}`);
  warn("Continuing with safe scene only (grid + cube).");
}

// --------------------
// VR Buttons (ALWAYS keep both)
// --------------------
if (VRButton) {
  try {
    const btn = VRButton.createButton(renderer);
    btn.style.position = "fixed";
    btn.style.right = "18px";
    btn.style.bottom = "80px";
    btn.style.zIndex = "2147483647";
    document.body.appendChild(btn);
    ok("VRButton injected");
  } catch (e) {
    warn("VRButton inject failed (manual ENTER VR still works)");
  }
} else {
  warn("VRButton module blocked (manual ENTER VR only)");
}

async function manualEnterVR() {
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) throw new Error("immersive-vr not supported");

    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"]
    });

    await renderer.xr.setSession(session);
    ok("XR session started");
  } catch (e) {
    fail(`ENTER VR failed: ${e?.message || e}`);
  }
}

enterVrBtn?.addEventListener("click", () => {
  ok("ENTER VR clicked");
  manualEnterVR();
});

// --------------------
// Controls: Move + SnapTurn + Teleport (ANTI-VOID)
// --------------------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tempDir = new THREE.Vector3();
const tempHit = new THREE.Vector3();
const camPos = new THREE.Vector3();

const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
  new THREE.LineBasicMaterial({ color: 0x00ff66 })
);
laser.scale.z = 12;
playerRig.add(laser);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(0, 0.02, 8);
safeRoot.add(ring);

let wantTeleport = false;
let lastSnap = 0;
let lastGood = new THREE.Vector3(playerRig.position.x, 0, playerRig.position.z);

// Bounds: prefer world bounds, else safe defaults
const DEFAULT_BOUNDS = { minX: -32, maxX: 32, minZ: -32, maxZ: 32 };
function getBounds() {
  if (worldData?.bounds?.min && worldData?.bounds?.max) {
    return {
      minX: worldData.bounds.min.x,
      maxX: worldData.bounds.max.x,
      minZ: worldData.bounds.min.z,
      maxZ: worldData.bounds.max.z,
    };
  }
  return DEFAULT_BOUNDS;
}
function clampXZ(v) {
  const b = getBounds();
  v.x = Math.max(b.minX, Math.min(b.maxX, v.x));
  v.z = Math.max(b.minZ, Math.min(b.maxZ, v.z));
  return v;
}
function isBad(n) { return !Number.isFinite(n); }
function rescueIfVoid() {
  if (isBad(playerRig.position.x) || isBad(playerRig.position.z) ||
      Math.abs(playerRig.position.x) > 5000 || Math.abs(playerRig.position.z) > 5000) {
    warn("VOID detected — rescue to spawn");
    const s = worldData?.spawn || new THREE.Vector3(0, 0, 8);
    playerRig.position.x = s.x;
    playerRig.position.z = s.z;
  }
}
function aimDirSafe() {
  camera.getWorldDirection(tempDir);
  tempDir.y = 0;
  let len = tempDir.length();
  if (len < 0.0005 || !Number.isFinite(len)) {
    tempDir.set(0, 0, -1);
    tempDir.applyQuaternion(camera.quaternion);
    tempDir.y = 0;
    if (tempDir.length() < 0.0005) tempDir.set(0, 0, -1);
  }
  tempDir.normalize();
  return tempDir;
}

function getLeftPreferredGamepad() {
  const session = renderer.xr.getSession?.();
  if (!session) return null;
  let best = null;
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") return src.gamepad;
    best = src.gamepad;
  }
  return best;
}

function updateMove(dt) {
  const gp = getLeftPreferredGamepad();
  if (!gp) return;

  const ax0 = gp.axes?.[0] ?? 0; // left stick x
  const ax1 = gp.axes?.[1] ?? 0; // left stick y
  const ax2 = gp.axes?.[2] ?? 0; // right stick x

  const dead = 0.15;
  const mx = Math.abs(ax0) > dead ? ax0 : 0;
  const mz = Math.abs(ax1) > dead ? ax1 : 0;

  const speed = 2.1;
  if (mx || mz) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3()
      .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(-1);

    playerRig.position.addScaledVector(right, mx * speed * dt);
    playerRig.position.addScaledVector(fwd, -mz * speed * dt);
    clampXZ(playerRig.position);
  }

  const now = performance.now() / 1000;
  const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
  if (sx && now - lastSnap > 0.35) {
    playerRig.rotation.y += (sx > 0 ? -1 : 1) * (Math.PI / 4);
    lastSnap = now;
  }

  // Use any common trigger button as teleport
  const trigger =
    gp.buttons?.[0]?.pressed ||
    gp.buttons?.[1]?.pressed ||
    gp.buttons?.[3]?.pressed;

  if (trigger) wantTeleport = true;
}

function updateTeleport() {
  camera.getWorldPosition(camPos);
  const dir = aimDirSafe();

  laser.position.copy(camPos);
  laser.position.y -= 0.05;
  laser.lookAt(camPos.clone().add(dir));

  const ray = new THREE.Ray(laser.position.clone(), dir.clone());
  if (ray.intersectPlane(floorPlane, tempHit)) {
    clampXZ(tempHit);
    ring.position.set(tempHit.x, 0.02, tempHit.z);
    lastGood.copy(tempHit);

    if (wantTeleport) {
      const dest = lastGood.clone();
      clampXZ(dest);
      if (!Number.isFinite(dest.x) || !Number.isFinite(dest.z)) {
        warn("Teleport blocked (invalid destination)");
      } else {
        playerRig.position.x = dest.x;
        playerRig.position.z = dest.z;
      }
      wantTeleport = false;
    }
  } else {
    // Keep ring at last good hit so clicking can't void you
    ring.position.set(lastGood.x, 0.02, lastGood.z);
    if (wantTeleport) {
      warn("Teleport blocked (no floor hit)");
      wantTeleport = false;
    }
  }
}

ok("Controls ready");

// --------------------
// Resize + Loop
// --------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  rescueIfVoid();
  updateMove(dt);
  updateTeleport();

  renderer.render(scene, camera);
});
