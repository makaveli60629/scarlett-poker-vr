// /js/main.js — Scarlett Poker VR — PERMA SAFE (GitHub/Quest)
// Fixes: teleport-to-void, missing floor, missing VR button, rescue spawn.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch (e) { /* ok */ }

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

function logLine(prefix, s){
  const line = `${prefix} ${s}`;
  overlay.textContent += `\n${line}`;
  console.log(line);
}
const ok = (s)=>logLine("✅", s);
const warn=(s)=>logLine("⚠️", s);
const fail=(s)=>logLine("❌", s);

overlay.textContent = "Scarlett Poker VR — booting…";

// --------------------
// Scene / Camera / Renderer
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

// --------------------
// Player Rig
// --------------------
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height “lock feel” (small consistent lift)
playerRig.position.y = 0.25;

// World root
const worldRoot = new THREE.Group();
scene.add(worldRoot);

// --------------------
// Unbreakable SKY + FLOOR (MeshBasic = never black)
// --------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide })
);
worldRoot.add(sky);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.userData.isFloor = true;
worldRoot.add(floor);

// Safety platform (so even if world floor is missed, you still see something)
const safety = new THREE.Mesh(
  new THREE.CircleGeometry(3.5, 48),
  new THREE.MeshBasicMaterial({ color: 0x10141c })
);
safety.rotation.x = -Math.PI/2;
safety.position.set(0, 0.01, 8);
worldRoot.add(safety);

// Grid slightly above floor (prevents blinking/z-fight)
const grid = new THREE.GridHelper(80, 80, 0x00ff66, 0x1f2a3a);
grid.position.y = 0.02;
worldRoot.add(grid);

ok("Sky + floor + grid added (cannot be black)");

// --------------------
// Helpful lights (not required now, but nice)
// --------------------
worldRoot.add(new THREE.AmbientLight(0xffffff, 0.4));
worldRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.7));

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(15, 25, 10);
worldRoot.add(sun);

// Headlamp to camera (helps your table/chairs)
const headlamp = new THREE.PointLight(0xffffff, 2.0, 40);
camera.add(headlamp);
ok("Lighting added");

// --------------------
// Marker cube (debug)
// --------------------
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 0.35, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.7 })
);
marker.position.set(0, 1.35, 6.8);
worldRoot.add(marker);

// --------------------
// SAFE SPAWN (telepad area)
// --------------------
const SAFE_SPAWN = new THREE.Vector3(0, 0, 8);
playerRig.position.x = SAFE_SPAWN.x;
playerRig.position.z = SAFE_SPAWN.z;
ok("Spawn set to safe pad zone");

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
enterVrBtn?.addEventListener("click", () => { ok("ENTER VR clicked"); manualEnterVR(); });

// --------------------
// Locomotion + Teleport (ANTI-VOID)
// --------------------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tempDir = new THREE.Vector3();
const tempHit = new THREE.Vector3();
const tempCamPos = new THREE.Vector3();

const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]),
  new THREE.LineBasicMaterial({ color: 0x00ff66 })
);
laser.scale.z = 12;
laser.visible = true;
playerRig.add(laser);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.visible = true;
worldRoot.add(ring);

let lastGoodHit = SAFE_SPAWN.clone();
let wantTeleport = false;
let lastSnap = 0;

const BOUNDS = {
  minX: -32, maxX: 32,
  minZ: -32, maxZ: 32
};

function clampToBounds(v){
  v.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, v.x));
  v.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, v.z));
  return v;
}

function isBadNumber(n){ return !Number.isFinite(n); }
function rigIsInvalid(){
  return isBadNumber(playerRig.position.x) || isBadNumber(playerRig.position.z) ||
         Math.abs(playerRig.position.x) > 5000 || Math.abs(playerRig.position.z) > 5000;
}

function rescueIfVoid(){
  if (rigIsInvalid()){
    warn("VOID detected — rescuing to SAFE SPAWN");
    playerRig.position.x = SAFE_SPAWN.x;
    playerRig.position.z = SAFE_SPAWN.z;
  }
}

function getAimDirectionSafe(){
  // Use camera forward but avoid the “vertical = zero xz” bug.
  camera.getWorldDirection(tempDir);

  // flatten to XZ so teleport is on floor plane
  tempDir.y = 0;

  const len = tempDir.length();
  if (len < 0.0005 || !Number.isFinite(len)) {
    // fallback direction: camera -Z in world space
    tempDir.set(0, 0, -1);
    tempDir.applyQuaternion(camera.quaternion);
    tempDir.y = 0;
    if (tempDir.length() < 0.0005) tempDir.set(0,0,-1);
  }
  tempDir.normalize();
  return tempDir;
}

function getPrimaryGamepad() {
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

function updateLaserAndTeleport(){
  // Laser starts at camera position, points forward
  camera.getWorldPosition(tempCamPos);
  const dir = getAimDirectionSafe();

  laser.position.copy(tempCamPos);
  laser.position.y -= 0.05;
  laser.lookAt(tempCamPos.clone().add(dir));

  // Raycast to floor plane
  const ray = new THREE.Ray(laser.position.clone(), dir.clone());
  if (ray.intersectPlane(floorPlane, tempHit)) {
    clampToBounds(tempHit);
    ring.position.set(tempHit.x, 0.02, tempHit.z);
    ring.visible = true;

    lastGoodHit.copy(tempHit);

    if (wantTeleport) {
      // Always teleport to LAST VALID hit (never NaN)
      const dest = lastGoodHit.clone();
      clampToBounds(dest);

      if (!Number.isFinite(dest.x) || !Number.isFinite(dest.z)) {
        warn("Teleport blocked (invalid destination) — staying put");
      } else {
        playerRig.position.x = dest.x;
        playerRig.position.z = dest.z;
        ok(`Teleport: ${dest.x.toFixed(2)}, ${dest.z.toFixed(2)}`);
      }
      wantTeleport = false;
    }
  } else {
    // No hit: keep ring at last good position (prevents “click to void”)
    ring.position.set(lastGoodHit.x, 0.02, lastGoodHit.z);
    ring.visible = true;

    if (wantTeleport) {
      warn("Teleport blocked (no floor hit)");
      wantTeleport = false;
    }
  }
}

function updateStickLocomotion(dt){
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
    playerRig.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, playerRig.position.x));
    playerRig.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, playerRig.position.z));
  }

  const now = performance.now() / 1000;
  const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
  if (sx && now - lastSnap > 0.35) {
    playerRig.rotation.y += (sx > 0 ? -1 : 1) * (Math.PI / 4);
    lastSnap = now;
  }

  // trigger = teleport
  const trigger =
    gp.buttons?.[0]?.pressed ||
    gp.buttons?.[1]?.pressed ||
    gp.buttons?.[3]?.pressed;

  if (trigger) wantTeleport = true;
}

ok("Locomotion + teleport (anti-void) ready");

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
  updateStickLocomotion(dt);
  updateLaserAndTeleport();

  renderer.render(scene, camera);
});

ok("Boot complete — floor should ALWAYS be visible. Teleport cannot send you to void now.");
