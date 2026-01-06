// /js/main.js — Scarlett Poker VR — PERMANENT v2.0 (Alignment + Calibration + Move/Turn/Teleport)
// GitHub Pages safe. CDN-only three.module.js + VRButton.
// Uses:
//  - ./alignment.js        (one source of truth for dimensions + spawn + height lock)
//  - ./world.js            (builds walls/table/chairs/pads + returns {spawn,bounds,colliders,pads,padById})
//  - ./control_config.js   (in-world calibration HUD + persistent controller mapping)
//
// Controls after calibration:
//  - Move: calibrated "move stick" (walk)
//  - Turn: calibrated "turn stick" X (45° snap turn)
//  - Teleport: calibrated trigger (hold/pull) to teleport to green ring
//
// Calibration:
//  - Big HUD always in front of your face in VR
//  - Hold LEFT trigger to start calibration
//  - Hold RIGHT trigger to reset mapping
//
// Notes:
//  - This main.js does NOT require any other modules.
//  - If any module fails to load, safe room still renders and HUD tells you why.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch {}

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");
const { Alignment } = await import("./alignment.js");
// -------------------- Basic log (for non-VR) --------------------
const logLines = [];
function log(prefix, msg) {
  const line = `${prefix} ${msg}`;
  logLines.push(line);
  if (logLines.length > 24) logLines.shift();
  if (overlay) overlay.textContent = logLines.join("\n");
  console.log(line);
}
const ok = (m) => log("✅", m);
const warn = (m) => log("⚠️", m);
const fail = (m) => log("❌", m);

if (overlay) overlay.textContent = "Scarlett Poker VR — booting…";

// -------------------- Scene / Renderer --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.35;

document.body.appendChild(renderer.domElement);
ok("Renderer ready");

try {
  renderer.xr.setReferenceSpaceType("local-floor");
  ok("Reference: local-floor");
} catch {
  warn("Reference set failed (ok)");
}

// Player rig
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Roots
const safeRoot = new THREE.Group();
scene.add(safeRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

// -------------------- Safe lights (never black) --------------------
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.45));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.95));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

// "Headlamp" so you always see something
const headlamp = new THREE.PointLight(0xffffff, 2.2, 45);
camera.add(headlamp);

// Safe floor + grid + cube
const safeFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
safeFloor.rotation.x = -Math.PI / 2;
safeRoot.add(safeFloor);

const grid = new THREE.GridHelper(120, 120, 0x00ff66, 0x1f2a3a);
grid.position.y = 0.02;
safeRoot.add(grid);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 0.35, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.85 })
);
cube.position.set(0, 1.35, 6.8);
safeRoot.add(cube);

ok("Safe room loaded");

// -------------------- Imports (alignment + control config + world) --------------------
let Align = null;
let ControlConfig = null;
let World = null;

try {
  const mod = await import("./alignment.js?v=2026");
  Align = mod.Align;
  ok("alignment.js loaded");
} catch (e) {
  fail(`alignment.js failed: ${e?.message || e}`);
}

try {
  const mod = await import("./control_config.js?v=2026");
  ControlConfig = mod.ControlConfig;
  ok("control_config.js loaded");
} catch (e) {
  fail(`control_config.js failed: ${e?.message || e}`);
}

try {
  const mod = await import("./world.js?v=2026");
  World = mod.World;
  ok("world.js module loaded");
} catch (e) {
  fail(`world.js import failed: ${e?.message || e}`);
}

// -------------------- Apply alignment defaults --------------------
if (Align) {
  // Lock your "perfect sitting height" feel
  playerRig.position.y = (Align.RIG_BASE_Y ?? 0.45) + (Align.USER_HEIGHT_OFFSET_Y ?? 0.35);
  ok(`Rig Y locked: ${playerRig.position.y.toFixed(2)}`);
} else {
  playerRig.position.y = 0.8;
  warn("Rig Y defaulted (alignment missing)");
}

// -------------------- Build world --------------------
let worldData = null;
if (World?.build) {
  try {
    worldData = World.build(worldRoot, playerRig);
    ok("World built");
  } catch (e) {
    fail(`World.build failed: ${e?.message || e}`);
  }
} else {
  warn("World.build missing — using safe-only");
}

// Spawn: always on lobby pad (never table)
(function forceSpawn() {
  const spawn =
    worldData?.padById?.lobby?.position?.clone?.() ||
    worldData?.spawn?.clone?.() ||
    (Align?.defaultSpawn?.() ?? new THREE.Vector3(0, 0, 8));

  playerRig.position.x = spawn.x;
  playerRig.position.z = spawn.z;
  ok(`Spawn forced -> (${spawn.x.toFixed(2)}, ${spawn.z.toFixed(2)})`);
})();

// -------------------- Controller calibration HUD --------------------
if (ControlConfig?.attachHUD) {
  try {
    ControlConfig.load?.();
    ControlConfig.attachHUD(camera);
    ok("Calibration HUD attached (in-world)");
  } catch (e) {
    fail(`HUD attach failed: ${e?.message || e}`);
  }
} else {
  warn("ControlConfig missing — movement may not work");
}

// -------------------- VR Buttons --------------------
if (VRButton) {
  try {
    const btn = VRButton.createButton(renderer);
    btn.style.position = "fixed";
    btn.style.right = "18px";
    btn.style.bottom = "80px";
    btn.style.zIndex = "2147483647";
    document.body.appendChild(btn);
    ok("VRButton injected");
  } catch {
    warn("VRButton inject failed (manual ENTER VR works)");
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
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
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

// -------------------- Movement + teleport visuals --------------------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const camWorld = new THREE.Vector3();
const dir = new THREE.Vector3();
const hit = new THREE.Vector3();
const tmp = new THREE.Vector3();

let lastGood = new THREE.Vector3(playerRig.position.x, 0, playerRig.position.z);
let wantTeleport = false;
let snapCooldown = 0;

// Laser always attached to camera (so it never "sticks to a pad")
const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
  new THREE.LineBasicMaterial({ color: 0x00ff66 })
);
laser.scale.z = 12;
camera.add(laser);

// Teleport ring
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(playerRig.position.x, 0.02, playerRig.position.z);
safeRoot.add(ring);

// Bounds + collider helpers
function boundsClamp(pos) {
  const b = worldData?.bounds || Align?.bounds?.();
  if (b?.min && b?.max) {
    pos.x = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
    pos.z = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
  } else {
    pos.x = THREE.MathUtils.clamp(pos.x, -32, 32);
    pos.z = THREE.MathUtils.clamp(pos.z, -32, 32);
  }
}

function collidesXZ(pos) {
  const r = 0.28;
  const cols = worldData?.colliders || [];
  for (const m of cols) {
    if (!m) continue;
    const box = new THREE.Box3().setFromObject(m);
    if (
      pos.x > box.min.x - r &&
      pos.x < box.max.x + r &&
      pos.z > box.min.z - r &&
      pos.z < box.max.z + r
    ) {
      return true;
    }
  }
  return false;
}

function rescueVoid() {
  if (
    !Number.isFinite(playerRig.position.x) ||
    !Number.isFinite(playerRig.position.z) ||
    Math.abs(playerRig.position.x) > 5000 ||
    Math.abs(playerRig.position.z) > 5000
  ) {
    warn("VOID detected — rescue to spawn");
    const spawn =
      worldData?.padById?.lobby?.position?.clone?.() ||
      worldData?.spawn?.clone?.() ||
      (Align?.defaultSpawn?.() ?? new THREE.Vector3(0, 0, 8));
    playerRig.position.x = spawn.x;
    playerRig.position.z = spawn.z;
  }
}

// Read calibrated input (normalized)
function readInput() {
  if (!ControlConfig?.readMapped) return null;
  return ControlConfig.readMapped(renderer);
}

// Apply movement / snap / teleport from calibrated mapping
function applyControls(dt) {
  const inp = readInput();
  if (!inp) return;

  const m = inp.mapping;
  const dead = m?.deadzone ?? 0.15;
  const snapTh = m?.snapThreshold ?? 0.65;
  const trigTh = m?.triggerThreshold ?? 0.7;

  // Move (mx,my from calibrated move stick)
  const mx = Math.abs(inp.mx) < dead ? 0 : inp.mx;
  const my = Math.abs(inp.my) < dead ? 0 : inp.my;

  if (mx || my) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const rightDir = new THREE.Vector3()
      .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(-1);

    const step = 2.2 * dt;

    tmp.copy(playerRig.position);
    tmp.addScaledVector(rightDir, mx * step);
    tmp.addScaledVector(fwd, -my * step);

    boundsClamp(tmp);

    if (!collidesXZ(tmp)) {
      playerRig.position.x = tmp.x;
      playerRig.position.z = tmp.z;
    }
  }

  // Snap turn (tx from calibrated turn stick X)
  snapCooldown = Math.max(0, snapCooldown - dt);
  if (snapCooldown <= 0 && Math.abs(inp.tx) > snapTh) {
    playerRig.rotation.y += (inp.tx > 0 ? -1 : 1) * (Math.PI / 4);
    snapCooldown = 0.28;
  }

  // Trigger -> request teleport
  if (inp.trig > trigTh) wantTeleport = true;
}

// Update ring target from gaze direction
function updateAimAndTeleport() {
  camera.getWorldPosition(camWorld);
  camera.getWorldDirection(dir);
  dir.y = 0;
  if (dir.length() < 0.001) dir.set(0, 0, -1);
  dir.normalize();

  const ray = new THREE.Ray(camWorld.clone(), dir.clone());
  if (ray.intersectPlane(floorPlane, hit)) {
    boundsClamp(hit);

    ring.position.set(hit.x, 0.02, hit.z);
    lastGood.copy(hit);

    if (wantTeleport) {
      const dest = lastGood.clone();
      boundsClamp(dest);

      if (!collidesXZ(dest)) {
        playerRig.position.x = dest.x;
        playerRig.position.z = dest.z;
      } else {
        warn("Teleport blocked by collider");
      }
      wantTeleport = false;
    }
  } else {
    ring.position.set(lastGood.x, 0.02, lastGood.z);
    wantTeleport = false;
  }
}

// -------------------- Resize --------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// -------------------- Loop --------------------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  rescueVoid();

  // Update calibration HUD + mapping
  try {
    ControlConfig?.update?.(renderer);
  } catch {}

  applyControls(dt);
  updateAimAndTeleport();

  renderer.render(scene, camera);
});

ok("Main loop running");
