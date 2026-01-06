// /js/main.js — Scarlett Poker VR — SAFE CORE + WORLD LOADER (GitHub/Quest)
// You will ALWAYS see grid + cube.
// If /js/world.js loads, you will also see walls/table/pads.
// Overlay will tell you exactly what loaded.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch (e) { /* ok */ }
const mod = await import("./world.js?v=1");
const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

function line(prefix, s){
  const msg = `${prefix} ${s}`;
  overlay.textContent += `\n${msg}`;
  console.log(msg);
}
const ok   = (s)=>line("✅", s);
const warn = (s)=>line("⚠️", s);
const fail = (s)=>line("❌", s);

overlay.textContent = "Scarlett Poker VR — booting…";

// --------------------
// Scene / Camera / Renderer
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
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

// --------------------
// Player rig (we move this for locomotion)
// --------------------
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height lock feel (taller while sitting)
playerRig.position.y = 0.45;

// Root groups
const safeRoot = new THREE.Group(); // never remove
scene.add(safeRoot);

const worldRoot = new THREE.Group(); // your real world goes here
scene.add(worldRoot);

// --------------------
// SAFE SKY + SAFE FLOOR (never black)
// --------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide })
);
safeRoot.add(sky);

const safeFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 90),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
safeFloor.rotation.x = -Math.PI/2;
safeFloor.position.y = 0;
safeRoot.add(safeFloor);

const grid = new THREE.GridHelper(90, 90, 0x00ff66, 0x1f2a3a);
grid.position.y = 0.02;
safeRoot.add(grid);

// Debug cube (proves code is running)
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.35,0.35,0.35),
  new THREE.MeshStandardMaterial({ color:0x00ff66, emissive:0x00ff66, emissiveIntensity:0.7 })
);
cube.position.set(0, 1.35, 6.8);
safeRoot.add(cube);

ok("Safe sky + floor + grid + cube loaded");

// Some light for the cube and any StandardMaterials
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.5));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

// Headlamp to camera
const headlamp = new THREE.PointLight(0xffffff, 2.0, 40);
camera.add(headlamp);

// Spawn safe
playerRig.position.x = 0;
playerRig.position.z = 8;
ok("Spawn set (0, 8)");

// --------------------
// Load WORLD.JS (this is the missing piece)
// --------------------
let worldData = null;
try {
  // IMPORTANT: main.js is in /js, so world.js must be /js/world.js
  const mod = await import("./world.js?v=1"); // cache-bust
  if (!mod?.World?.build) throw new Error("World.build missing export");

  worldData = mod.World.build(worldRoot, playerRig);
  ok("world.js imported + World.build() executed");

  // If world provides spawn, use it (spawn on telepad)
  if (worldData?.spawn) {
    playerRig.position.x = worldData.spawn.x;
    playerRig.position.z = worldData.spawn.z;
    ok(`World spawn applied: (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
  } else {
    warn("World returned no spawn — kept safe spawn");
  }
} catch (e) {
  fail(`world.js failed to load/build: ${e?.message || e}`);
  warn("You will only see safe grid + cube until world.js is fixed/recognized.");
}

// --------------------
// VR buttons (keep BOTH)
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
enterVrBtn?.addEventListener("click", () => { ok("ENTER VR clicked"); manualEnterVR(); });

// --------------------
// Locomotion + Teleport (anti-void)
// --------------------
const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const dir = new THREE.Vector3();
const hit = new THREE.Vector3();
const camPos = new THREE.Vector3();

const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]),
  new THREE.LineBasicMaterial({ color: 0x00ff66 })
);
laser.scale.z = 12;
playerRig.add(laser);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.position.set(0, 0.02, 7);
safeRoot.add(ring);

let wantTeleport = false;
let lastSnap = 0;
let lastGood = new THREE.Vector3(0, 0, 8);

const BOUNDS = { minX:-32, maxX:32, minZ:-32, maxZ:32 };
function clamp(v){
  v.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, v.x));
  v.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, v.z));
  return v;
}
function aimDir(){
  camera.getWorldDirection(dir);
  dir.y = 0;
  if (dir.length() < 0.0005 || !Number.isFinite(dir.length())) dir.set(0,0,-1);
  dir.normalize();
  return dir;
}
function gpLeftPrefer(){
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
function updateTeleport(){
  camera.getWorldPosition(camPos);
  const d = aimDir();

  laser.position.copy(camPos);
  laser.position.y -= 0.05;
  laser.lookAt(camPos.clone().add(d));

  const ray = new THREE.Ray(laser.position.clone(), d.clone());
  if (ray.intersectPlane(floorPlane, hit)) {
    clamp(hit);
    ring.position.set(hit.x, 0.02, hit.z);
    lastGood.copy(hit);

    if (wantTeleport) {
      playerRig.position.x = lastGood.x;
      playerRig.position.z = lastGood.z;
      wantTeleport = false;
    }
  } else {
    ring.position.set(lastGood.x, 0.02, lastGood.z);
    if (wantTeleport) wantTeleport = false;
  }
}
function updateMove(dt){
  const gp = gpLeftPrefer();
  if (!gp) return;

  const ax0 = gp.axes?.[0] ?? 0;
  const ax1 = gp.axes?.[1] ?? 0;
  const ax2 = gp.axes?.[2] ?? 0;

  const dead = 0.15;
  const mx = Math.abs(ax0) > dead ? ax0 : 0;
  const mz = Math.abs(ax1) > dead ? ax1 : 0;

  const speed = 2.1;
  if (mx || mz) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

    playerRig.position.addScaledVector(right, mx * speed * dt);
    playerRig.position.addScaledVector(fwd, -mz * speed * dt);
    clamp(playerRig.position);
  }

  const now = performance.now()/1000;
  const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
  if (sx && now - lastSnap > 0.35) {
    playerRig.rotation.y += (sx > 0 ? -1 : 1) * (Math.PI/4);
    lastSnap = now;
  }

  const trigger = gp.buttons?.[0]?.pressed || gp.buttons?.[1]?.pressed || gp.buttons?.[3]?.pressed;
  if (trigger) wantTeleport = true;
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
  const dt = Math.min(0.05, (t - lastT)/1000);
  lastT = t;

  updateMove(dt);
  updateTeleport();

  renderer.render(scene, camera);
});
