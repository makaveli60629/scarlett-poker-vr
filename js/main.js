// /js/main.js — Scarlett Poker VR — PERMANENT v1.2
// - Loads world.js (walls/table/chairs/pads)
// - Quest-safe movement:
//   Left stick = move, Right stick = 45° snap turn, Trigger = teleport
// - Bounds clamp from world.js, anti-void rescue
// - VRButton + manual ENTER VR + VR status panel

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch {}

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

const logLines = [];
let statusCanvas = null, statusCtx = null, statusTex = null, statusMesh = null;

function drawStatusCanvas(){
  if (!statusCtx) return;
  statusCtx.clearRect(0,0,statusCanvas.width,statusCanvas.height);

  statusCtx.fillStyle = "rgba(0,0,0,0.55)";
  statusCtx.fillRect(0,0,statusCanvas.width,statusCanvas.height);

  statusCtx.fillStyle = "#00ff66";
  statusCtx.font = "28px monospace";
  statusCtx.fillText("Scarlett Poker VR — Status", 28, 52);

  statusCtx.font = "22px monospace";
  let y = 96;
  for (const line of logLines.slice(-18)){
    statusCtx.fillText(line, 28, y);
    y += 26;
  }
  statusTex.needsUpdate = true;
}

function pushLine(prefix, msg){
  const line = `${prefix} ${msg}`;
  logLines.push(line);
  if (logLines.length > 28) logLines.shift();
  if (overlay) overlay.textContent = logLines.join("\n");
  console.log(line);
  if (statusCanvas) drawStatusCanvas();
}
const ok=(m)=>pushLine("✅",m);
const warn=(m)=>pushLine("⚠️",m);
const fail=(m)=>pushLine("❌",m);

if (overlay) overlay.textContent = "Scarlett Poker VR — booting…";

// ---------- Core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.3;
document.body.appendChild(renderer.domElement);
ok("Renderer ready");

try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference: local-floor"); }
catch { warn("Reference set failed (ok)"); }

// Player rig
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height feel lock (your “perfect sitting height”)
playerRig.position.y = 0.45;

// Roots
const safeRoot = new THREE.Group();
scene.add(safeRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

// ---------- Safe lights ----------
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.45));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.0, 40);
camera.add(headlamp);

// Safe floor + grid + cube
const safeFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(120,120),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
safeFloor.rotation.x = -Math.PI/2;
safeFloor.position.y = 0;
safeRoot.add(safeFloor);

const grid = new THREE.GridHelper(120, 120, 0x00ff66, 0x1f2a3a);
grid.position.y = 0.02;
safeRoot.add(grid);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.35,0.35,0.35),
  new THREE.MeshStandardMaterial({ color:0x00ff66, emissive:0x00ff66, emissiveIntensity:0.8 })
);
cube.position.set(0, 1.35, 6.8);
safeRoot.add(cube);

ok("Safe scene loaded");

// ---------- VR status panel ----------
function makeStatusPanel(){
  statusCanvas = document.createElement("canvas");
  statusCanvas.width = 1024;
  statusCanvas.height = 512;
  statusCtx = statusCanvas.getContext("2d");
  statusTex = new THREE.CanvasTexture(statusCanvas);
  statusTex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: statusTex, transparent: true });
  const geo = new THREE.PlaneGeometry(1.6, 0.8);
  statusMesh = new THREE.Mesh(geo, mat);
  statusMesh.position.set(0, 1.6, -2.2);
  camera.add(statusMesh);

  drawStatusCanvas();
  ok("VR status panel attached");
}
makeStatusPanel();

// ---------- Load world.js ----------
let worldData = null;
try {
  const mod = await import("./world.js?v=2026");
  if (!mod?.World?.build) throw new Error("World.build missing export");
  worldData = mod.World.build(worldRoot, playerRig);
  ok("world.js imported + built");

  if (worldData?.spawn) {
    playerRig.position.x = worldData.spawn.x;
    playerRig.position.z = worldData.spawn.z;
    ok(`Spawn -> (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
  } else {
    warn("World returned no spawn (using safe)");
    playerRig.position.set(0, playerRig.position.y, 8);
  }
} catch (e) {
  fail(`world.js failed: ${e?.message || e}`);
  warn("Continuing safe-only");
  playerRig.position.set(0, playerRig.position.y, 8);
}

// ---------- VR buttons ----------
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

async function manualEnterVR(){
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) throw new Error("immersive-vr not supported");
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures:["local-floor","bounded-floor","hand-tracking","layers"]
    });
    await renderer.xr.setSession(session);
    ok("XR session started");
  } catch (e) {
    fail(`ENTER VR failed: ${e?.message || e}`);
  }
}
enterVrBtn?.addEventListener("click", ()=>{ ok("ENTER VR clicked"); manualEnterVR(); });

// ============================================================================
// CONTROLS (Quest-safe): Move + Snap Turn + Teleport with ring + laser
// ============================================================================
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const camWorld = new THREE.Vector3();

const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const hit = new THREE.Vector3();
let lastGood = new THREE.Vector3(playerRig.position.x, 0, playerRig.position.z);

function boundsClamp(pos){
  const b = worldData?.bounds;
  if (b?.min && b?.max) {
    pos.x = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
    pos.z = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
  } else {
    pos.x = THREE.MathUtils.clamp(pos.x, -32, 32);
    pos.z = THREE.MathUtils.clamp(pos.z, -32, 32);
  }
}

function collidesXZ(pos){
  // simple player radius collision vs colliders
  const r = 0.28;
  const cols = worldData?.colliders || [];
  for (const m of cols) {
    if (!m?.geometry) continue;
    // compute a fresh box from object each frame (safe; small scene)
    const box = new THREE.Box3().setFromObject(m);
    if (
      pos.x > box.min.x - r && pos.x < box.max.x + r &&
      pos.z > box.min.z - r && pos.z < box.max.z + r
    ) return true;
  }
  return false;
}

function getGamepads(){
  const s = renderer.xr.getSession?.();
  if (!s) return { left:null, right:null };
  let left = null, right = null;
  for (const src of s.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }
  // fallback: if we didn't get handedness, pick any
  if (!left && !right) {
    for (const src of s.inputSources) {
      if (src?.gamepad) { left = src.gamepad; break; }
    }
  }
  return { left, right };
}

// Laser (attached to camera so it’s always “on you”, not on pads)
const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]),
  new THREE.LineBasicMaterial({ color: 0x00ff66 })
);
laser.scale.z = 12;
camera.add(laser);

// Teleport ring
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.position.set(playerRig.position.x, 0.02, playerRig.position.z);
safeRoot.add(ring);

let wantTeleport = false;
let snapCooldown = 0;

function updateAimAndRing(){
  camera.getWorldPosition(camWorld);
  camera.getWorldDirection(tmpDir);
  tmpDir.y = 0;
  if (tmpDir.length() < 0.001) tmpDir.set(0,0,-1);
  tmpDir.normalize();

  // ray from camera forward to floor
  const ray = new THREE.Ray(camWorld.clone(), tmpDir.clone());
  if (ray.intersectPlane(floorPlane, hit)) {
    boundsClamp(hit);
    ring.position.set(hit.x, 0.02, hit.z);
    lastGood.copy(hit);

    if (wantTeleport) {
      const dest = lastGood.clone();
      boundsClamp(dest);
      // block teleport into colliders
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

function updateMove(dt){
  const { left, right } = getGamepads();
  if (!left && !right) return;

  // Move: LEFT stick
  const gpMove = left || right;
  const ax = gpMove.axes?.[0] ?? 0;
  const ay = gpMove.axes?.[1] ?? 0;
  const dead = 0.14;

  const mx = Math.abs(ax) > dead ? ax : 0;
  const mz = Math.abs(ay) > dead ? ay : 0;

  if (mx || mz) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();

    const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

    const step = 2.2 * dt;

    tmpV.copy(playerRig.position);
    tmpV.addScaledVector(rightDir, mx * step);
    tmpV.addScaledVector(fwd, -mz * step);

    boundsClamp(tmpV);

    // collision check
    if (!collidesXZ(tmpV)) {
      playerRig.position.x = tmpV.x;
      playerRig.position.z = tmpV.z;
    }
  }

  // Snap turn: RIGHT stick X if available (else axes[2] on same pad)
  snapCooldown = Math.max(0, snapCooldown - dt);
  const gpTurn = right || left;
  const tx = gpTurn.axes?.[2] ?? 0;
  if (snapCooldown <= 0 && Math.abs(tx) > 0.65) {
    playerRig.rotation.y += (tx > 0 ? -1 : 1) * (Math.PI/4);
    snapCooldown = 0.28;
  }

  // Teleport: trigger press
  const trig = (gpTurn.buttons?.[0]?.pressed || gpTurn.buttons?.[1]?.pressed || gpTurn.buttons?.[3]?.pressed);
  if (trig) wantTeleport = true;
}

function rescueVoid(){
  if (!Number.isFinite(playerRig.position.x) || !Number.isFinite(playerRig.position.z) ||
      Math.abs(playerRig.position.x) > 5000 || Math.abs(playerRig.position.z) > 5000) {
    warn("VOID detected — rescue to spawn");
    const s = worldData?.spawn || new THREE.Vector3(0,0,8);
    playerRig.position.x = s.x;
    playerRig.position.z = s.z;
  }
}

ok("Controls installed (move/snap/teleport)");

// ---------- Loop ----------
addEventListener("resize", () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT)/1000);
  lastT = now;

  rescueVoid();
  updateMove(dt);
  updateAimAndRing();

  renderer.render(scene, camera);
});
