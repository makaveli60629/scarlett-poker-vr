// /js/main.js — Scarlett Poker VR — BLACK-VOID KILLER (Quest/GitHub Safe)
// Guarantees: visible sky + floor (even if lights fail), headlamp light, VR entry, stick move, snap turn, trigger teleport.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch (e) { /* ok */ }

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

const log = (s) => { overlay.textContent += `\n${s}`; console.log(s); };
const ok  = (s) => log(`✅ ${s}`);
const warn= (s) => log(`⚠️ ${s}`);
const fail= (s) => log(`❌ ${s}`);

overlay.textContent = "Scarlett Poker VR — booting…";

// --------------------
// Scene / Camera / Renderer
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 3.0; // brighter
document.body.appendChild(renderer.domElement);

ok("Renderer ready");
try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference space: local-floor"); }
catch { warn("Reference space set failed (ok)"); }

// --------------------
// Player Rig (move this)
// --------------------
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height lock feel: raise rig so sitting feels taller
// (local-floor already sets your floor; this is a consistent offset)
playerRig.position.y = 0.35;

// World root
const worldRoot = new THREE.Group();
scene.add(worldRoot);

// --------------------
// SKY DOME (MeshBasic = visible no matter what)
// --------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(500, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x0a0f18, side: THREE.BackSide })
);
worldRoot.add(sky);
ok("Sky dome added (cannot be black)");

// --------------------
// Headlamp (attached to camera so you ALWAYS see the room)
// --------------------
const headlamp = new THREE.PointLight(0xffffff, 4.0, 40);
headlamp.position.set(0, 0, 0);
camera.add(headlamp);

const headFill = new THREE.SpotLight(0xffffff, 5.0, 55, Math.PI / 4, 0.4, 1.0);
headFill.position.set(0, 0.1, 0.05);
headFill.target.position.set(0, 0, -1);
camera.add(headFill);
camera.add(headFill.target);

ok("Headlamp + spotlight added");

// --------------------
// Global lights (helps, but sky+headlamp already guarantee visibility)
// --------------------
worldRoot.add(new THREE.AmbientLight(0xffffff, 0.8));
worldRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(15, 25, 10);
worldRoot.add(sun);

ok("Global lighting added");

// --------------------
// ALWAYS visible marker (the lime square you saw)
// --------------------
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.6 })
);
marker.position.set(0, 1.4, -1.8);
worldRoot.add(marker);
ok("Marker added");

// --------------------
// Floor (emissive so it never goes black)
// --------------------
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x6e7682,
  roughness: 0.9,
  metalness: 0.05,
  emissive: 0x111111,
  emissiveIntensity: 1.25
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.0;
floor.userData.isFloor = true;
worldRoot.add(floor);

// Grid sits slightly above to prevent blinking
const grid = new THREE.GridHelper(60, 60, 0x00ff66, 0x223344);
grid.position.y = 0.015;
worldRoot.add(grid);

ok("Bright floor + grid added");

// --------------------
// Simple walls (visible now thanks to headlamp)
// --------------------
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x1b2028,
  roughness: 0.95,
  metalness: 0.02,
  emissive: 0x050607,
  emissiveIntensity: 0.2
});
const H = 10, W = 40, D = 40;

function wallPlane(w, h, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  worldRoot.add(m);
}
wallPlane(W, H, 0, H/2, -D/2, 0);
wallPlane(W, H, 0, H/2,  D/2, Math.PI);
wallPlane(D, H,  W/2, H/2, 0, -Math.PI/2);
wallPlane(D, H, -W/2, H/2, 0,  Math.PI/2);

ok("Walls added");

// --------------------
// Spawn: ALWAYS away from the table area
// --------------------
playerRig.position.x = 0;
playerRig.position.z = 8;
ok("Spawn set (safe)");

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
  } catch {
    warn("VRButton inject failed (manual Enter VR still works)");
  }
} else {
  warn("VRButton module blocked (manual Enter VR only)");
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
// Locomotion + Laser + Teleport
// --------------------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tempDir = new THREE.Vector3();
const tempHit = new THREE.Vector3();

const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
const laser = new THREE.Line(laserGeo, laserMat);
laser.scale.z = 10;
laser.visible = false;
playerRig.add(laser);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 32),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 1.5, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.visible = false;
worldRoot.add(ring);

let wantTeleport = false;
let lastSnap = 0;

function getPrimaryGamepad() {
  const session = renderer.xr.getSession?.();
  if (!session) return null;

  // Prefer left-handed for movement
  let best = null;
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") return src.gamepad;
    best = src.gamepad;
  }
  return best;
}

function updateLaserAndTeleport() {
  // Aim using camera forward (safe even if controller model not showing)
  camera.getWorldDirection(tempDir);
  tempDir.y = 0;
  tempDir.normalize();

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  laser.position.copy(camPos);
  laser.position.y -= 0.05;
  laser.lookAt(camPos.clone().add(tempDir));
  laser.visible = true;

  const ray = new THREE.Ray(laser.position.clone(), tempDir.clone());
  if (ray.intersectPlane(floorPlane, tempHit)) {
    ring.position.set(tempHit.x, 0.02, tempHit.z);
    ring.visible = true;

    if (wantTeleport) {
      playerRig.position.x = tempHit.x;
      playerRig.position.z = tempHit.z;
      wantTeleport = false;
      ok(`Teleport: (${tempHit.x.toFixed(2)}, ${tempHit.z.toFixed(2)})`);
    }
  } else {
    ring.visible = false;
  }
}

function updateStickLocomotion(dt) {
  const gp = getPrimaryGamepad();
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
    fwd.y = 0; fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

    playerRig.position.addScaledVector(right, mx * speed * dt);
    playerRig.position.addScaledVector(fwd, -mz * speed * dt);
  }

  const now = performance.now() / 1000;
  const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
  if (sx && now - lastSnap > 0.35) {
    playerRig.rotation.y += (sx > 0 ? -1 : 1) * (Math.PI / 4);
    lastSnap = now;
  }

  const trigger =
    gp.buttons?.[0]?.pressed ||
    gp.buttons?.[1]?.pressed ||
    gp.buttons?.[3]?.pressed;
  if (trigger) wantTeleport = true;
}

ok("Locomotion + teleport ready");

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

  updateStickLocomotion(dt);
  updateLaserAndTeleport();

  renderer.render(scene, camera);
});

ok("Boot complete — you should NOT see black void anymore.");
