// /js/main.js — Scarlett Poker VR — Update: Quest SAFE locomotion + teleport + bright fallback
// Guarantees: visible world, VR entry button, movement (stick), laser + teleport, safer spawn.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Try VRButton (optional). We also keep the HTML ENTER VR button.
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
// Renderer / Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e12);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.3;

document.body.appendChild(renderer.domElement);
ok("Renderer ready");

try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference space: local-floor"); }
catch { warn("Reference space set failed (ok)"); }

// --------------------
// Player Rig (move THIS for locomotion)
// --------------------
const playerRig = new THREE.Group();
playerRig.position.set(0, 0, 0);
playerRig.add(camera);
scene.add(playerRig);

// Make you FEEL taller while sitting by dropping the world a bit
const worldRoot = new THREE.Group();
worldRoot.position.y = -0.35; // <-- “height lock feel” (adjust -0.25..-0.55)
scene.add(worldRoot);

// --------------------
// Lights (bright, no-black guarantee)
// --------------------
worldRoot.add(new THREE.AmbientLight(0xffffff, 1.4));
worldRoot.add(new THREE.HemisphereLight(0xffffff, 0x303040, 2.8));

const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(10, 18, 8);
worldRoot.add(key);

const fill = new THREE.PointLight(0xffffff, 1.6, 60);
fill.position.set(-8, 6, 8);
worldRoot.add(fill);

ok("Lighting added (bright)");

// --------------------
// ALWAYS-VISIBLE marker (you already saw this)
// --------------------
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x003311, emissiveIntensity: 1.0 })
);
marker.position.set(0, 1.4, -1.5);
worldRoot.add(marker);
ok("Marker added");

// --------------------
// Fallback Room (if world.js fails)
// --------------------
function buildFallbackRoom() {
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6a6f78,
    roughness: 0.9,
    metalness: 0.05,
    emissive: 0x111111,
    emissiveIntensity: 0.8
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0;
  floor.receiveShadow = false;
  floor.userData.isFloor = true;
  worldRoot.add(floor);

  // Add a subtle grid so the floor NEVER looks “black/blinky”
  const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x223344);
  grid.position.y = 0.01; // avoid z-fighting
  worldRoot.add(grid);

  // Simple walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.95, metalness: 0.02 });
  const h = 10, w = 40, d = 40;

  const wallN = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  wallN.position.set(0, h/2, -d/2);
  worldRoot.add(wallN);

  const wallS = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  wallS.position.set(0, h/2, d/2);
  wallS.rotation.y = Math.PI;
  worldRoot.add(wallS);

  const wallE = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
  wallE.position.set(w/2, h/2, 0);
  wallE.rotation.y = -Math.PI/2;
  worldRoot.add(wallE);

  const wallW = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
  wallW.position.set(-w/2, h/2, 0);
  wallW.rotation.y = Math.PI/2;
  worldRoot.add(wallW);

  ok("Fallback room built");
  return { floor };
}

let floorMesh = null;
let spawnPos = new THREE.Vector3(0, 0, 6); // safe default (not table)
let pads = [];

// --------------------
// Try loading your world.js (uses your pads/spawn if available)
// --------------------
try {
  const mod = await import("./world.js");
  if (mod?.World?.build) {
    const built = mod.World.build(worldRoot, playerRig);
    if (built?.spawn) spawnPos = built.spawn.clone();
    if (built?.pads) pads = built.pads;
    ok("Loaded world.js (custom world built)");
  } else {
    warn("world.js loaded but missing World.build — using fallback room");
    const fb = buildFallbackRoom(); floorMesh = fb.floor;
  }
} catch (e) {
  warn("world.js failed — using fallback room");
  const fb = buildFallbackRoom(); floorMesh = fb.floor;
}

// If world.js built floor, find a floor-like object for ray teleport (best effort)
if (!floorMesh) {
  // pick first mesh tagged isFloor or a PlaneGeometry
  worldRoot.traverse((o) => {
    if (floorMesh) return;
    if (o?.isMesh && (o.userData?.isFloor || o.geometry?.type === "PlaneGeometry")) floorMesh = o;
  });
}
if (!floorMesh) {
  const fb = buildFallbackRoom(); floorMesh = fb.floor;
}

// Spawn: always on spawnPos (never table center)
playerRig.position.set(spawnPos.x, 0, spawnPos.z);
ok(`Spawn set: (${spawnPos.x.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);

// --------------------
// VRButton injection (optional)
// --------------------
if (VRButton) {
  try {
    const btn = VRButton.createButton(renderer);
    btn.style.position = "fixed";
    btn.style.right = "18px";
    btn.style.bottom = "80px";
    btn.style.zIndex = "2147483647";
    btn.style.display = "block";
    document.body.appendChild(btn);
    ok("VRButton injected");
  } catch (e) {
    warn("VRButton injection failed (manual button still works)");
  }
} else {
  warn("VRButton module blocked — manual ENTER VR only");
}

// --------------------
// Manual ENTER VR (always works if WebXR supported)
// --------------------
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
enterVrBtn?.addEventListener("click", () => { ok("ENTER VR clicked"); manualEnterVR(); });

// --------------------
// Controller Laser + Teleport Ring + Stick Locomotion
// --------------------
const raycaster = new THREE.Raycaster();
const tempMat = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempDir = new THREE.Vector3();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
const laser = new THREE.Line(laserGeo, laserMat);
laser.scale.z = 10;
laser.visible = false;
playerRig.add(laser);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.32, 32),
  new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 1.2, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.visible = false;
worldRoot.add(ring);

// Helpers for input
let lastSnap = 0;
let wantTeleport = false;

function getPrimaryGamepad() {
  const session = renderer.xr.getSession?.();
  if (!session) return null;

  // Prefer left controller for move
  let best = null;

  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") return src.gamepad;
    best = src.gamepad;
  }
  return best;
}

function updateLaserAndTeleport(dt) {
  const session = renderer.xr.getSession?.();
  if (!session) return;

  // Grab any controller pose (use first input source pose direction)
  // We'll use the XR camera as fallback direction if no pose
  let dir = null;

  // Use viewer forward as fallback
  camera.getWorldDirection(tempDir);
  tempDir.normalize();

  // Place laser at camera-ish height slightly forward (works even if controller model missing)
  const camWorld = new THREE.Vector3();
  camera.getWorldPosition(camWorld);

  laser.position.copy(camWorld);
  laser.position.y -= 0.08;
  laser.lookAt(camWorld.clone().add(tempDir));
  laser.visible = true;

  // Ray vs floor plane
  const rayOrigin = laser.position.clone();
  const rayDirection = tempDir.clone();

  const ray = new THREE.Ray(rayOrigin, rayDirection);
  const hit = new THREE.Vector3();
  if (ray.intersectPlane(floorPlane, hit)) {
    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

    if (wantTeleport) {
      playerRig.position.set(hit.x, 0, hit.z);
      wantTeleport = false;
      ok(`Teleported to (${hit.x.toFixed(2)}, ${hit.z.toFixed(2)})`);
    }
  } else {
    ring.visible = false;
  }
}

function updateStickLocomotion(dt) {
  const gp = getPrimaryGamepad();
  if (!gp) return;

  // axes mapping varies. We'll try common patterns.
  const ax0 = gp.axes?.[0] ?? 0;  // left stick x
  const ax1 = gp.axes?.[1] ?? 0;  // left stick y
  const ax2 = gp.axes?.[2] ?? 0;  // right stick x
  const ax3 = gp.axes?.[3] ?? 0;  // right stick y

  // Move (left stick)
  const dead = 0.15;
  const mx = Math.abs(ax0) > dead ? ax0 : 0;
  const mz = Math.abs(ax1) > dead ? ax1 : 0;

  // speed
  const speed = 2.0; // meters/sec
  if (mx || mz) {
    // move relative to camera yaw
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

    const move = new THREE.Vector3()
      .addScaledVector(right, mx)
      .addScaledVector(fwd, -mz)
      .multiplyScalar(speed * dt);

    playerRig.position.add(move);
  }

  // Snap turn (right stick X)
  const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
  const now = performance.now() / 1000;
  if (sx && now - lastSnap > 0.35) {
    const ang = (sx > 0 ? -1 : 1) * (Math.PI / 4); // 45 degrees
    playerRig.rotation.y += ang;
    lastSnap = now;
  }

  // Trigger teleport: use any trigger button
  const triggerPressed =
    (gp.buttons?.[0]?.pressed) || // common
    (gp.buttons?.[1]?.pressed) || // alt
    (gp.buttons?.[3]?.pressed);   // alt
  if (triggerPressed) wantTeleport = true;
}

ok("Locomotion (stick) + laser + teleport ready");

// --------------------
// Resize
// --------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --------------------
// Main loop
// --------------------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  updateStickLocomotion(dt);
  updateLaserAndTeleport(dt);

  renderer.render(scene, camera);
});

ok("Boot complete — ENTER VR and you should SEE floor + move + teleport.");
