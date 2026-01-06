// /js/main.js — Scarlett Poker VR — PERMANENT v1.3
// FIXES:
// - Quest thumbstick axes auto-detect (works whether stick is axes 0/1 OR 2/3)
// - Trigger uses .value (not just .pressed)
// - Works even if handedness is missing (auto-assign left/right by order)
// - Status panel is pinned in front of face (easy to read in VR)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch {}

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

// ---------- Logging (overlay + VR panel) ----------
const logLines = [];
let statusCanvas = null, statusCtx = null, statusTex = null, statusMesh = null;

function pushLine(prefix, msg){
  const line = `${prefix} ${msg}`;
  logLines.push(line);
  if (logLines.length > 28) logLines.shift();
  if (overlay) overlay.textContent = logLines.join("\n");
  console.log(line);
  drawStatusCanvas();
}
const ok=(m)=>pushLine("✅",m);
const warn=(m)=>pushLine("⚠️",m);
const fail=(m)=>pushLine("❌",m);

function drawStatusCanvas(){
  if (!statusCtx) return;
  statusCtx.clearRect(0,0,statusCanvas.width,statusCanvas.height);

  statusCtx.fillStyle = "rgba(0,0,0,0.70)";
  statusCtx.fillRect(0,0,statusCanvas.width,statusCanvas.height);

  statusCtx.fillStyle = "#00ff66";
  statusCtx.font = "32px ui-monospace, Menlo, Consolas, monospace";
  statusCtx.fillText("Scarlett Poker VR — Status", 28, 52);

  statusCtx.font = "24px ui-monospace, Menlo, Consolas, monospace";
  let y = 98;
  for (const line of logLines.slice(-16)){
    statusCtx.fillText(line, 28, y);
    y += 30;
  }

  statusTex.needsUpdate = true;
}

function makeStatusPanel(camera){
  statusCanvas = document.createElement("canvas");
  statusCanvas.width = 1024;
  statusCanvas.height = 512;
  statusCtx = statusCanvas.getContext("2d");

  statusTex = new THREE.CanvasTexture(statusCanvas);
  statusTex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: statusTex, transparent: true });
  const geo = new THREE.PlaneGeometry(1.85, 0.92);

  statusMesh = new THREE.Mesh(geo, mat);

  // PIN IT DIRECTLY IN FRONT OF YOUR FACE
  statusMesh.position.set(0, 0.05, -1.25);
  statusMesh.renderOrder = 9999;
  camera.add(statusMesh);

  drawStatusCanvas();
  ok("VR status panel pinned");
}

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

// Your “perfect sitting height” feel
playerRig.position.y = 0.45;

// Roots
const safeRoot = new THREE.Group(); scene.add(safeRoot);
const worldRoot = new THREE.Group(); scene.add(worldRoot);

// ---------- Safe lights ----------
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.45));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

// Headlamp to guarantee visibility
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

// VR panel
makeStatusPanel(camera);

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

/* ============================================================================
   CONTROLS — QUEST AUTO MAPPER
   - Left stick move
   - Right stick snap
   - Right trigger teleport
   ============================================================================ */

const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const camWorld = new THREE.Vector3();
const dir = new THREE.Vector3();
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
  const r = 0.28;
  const cols = worldData?.colliders || [];
  for (const m of cols) {
    if (!m) continue;
    const box = new THREE.Box3().setFromObject(m);
    if (
      pos.x > box.min.x - r && pos.x < box.max.x + r &&
      pos.z > box.min.z - r && pos.z < box.max.z + r
    ) return true;
  }
  return false;
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

// Laser attached to CAMERA (always visible)
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

// ---------- Gamepad selection ----------
function getInputs(){
  const s = renderer.xr.getSession?.();
  if (!s) return { left:null, right:null, any:[] };

  const any = [];
  let left = null, right = null;

  for (const src of s.inputSources) {
    if (!src?.gamepad) continue;
    any.push({ handedness: src.handedness, gp: src.gamepad });
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }

  // fallback if handedness missing
  if (!left && any[0]) left = any[0].gp;
  if (!right && any[1]) right = any[1].gp;

  return { left, right, any };
}

// Automatically choose which axes pair is the thumbstick
function readStick(gp){
  if (!gp?.axes) return { x:0, y:0 };
  const a = gp.axes;

  const x01 = a[0] ?? 0, y01 = a[1] ?? 0;
  const x23 = a[2] ?? 0, y23 = a[3] ?? 0;

  // Pick the pair with bigger magnitude (handles Quest differences)
  const mag01 = Math.abs(x01) + Math.abs(y01);
  const mag23 = Math.abs(x23) + Math.abs(y23);

  if (mag23 > mag01) return { x:x23, y:y23 };
  return { x:x01, y:y01 };
}

function triggerValue(gp){
  if (!gp?.buttons) return 0;
  // On Quest: trigger commonly buttons[0].value
  const b0 = gp.buttons[0]?.value ?? (gp.buttons[0]?.pressed ? 1 : 0);
  const b1 = gp.buttons[1]?.value ?? (gp.buttons[1]?.pressed ? 1 : 0);
  // pick strongest
  return Math.max(b0, b1);
}

// Movement state
let wantTeleport = false;
let snapCooldown = 0;
let debugTimer = 0;

function updateControls(dt){
  const { left, right, any } = getInputs();
  if (!left && !right) return;

  // Debug (every 1.5 seconds) so we can SEE axes changing on Quest
  debugTimer -= dt;
  if (debugTimer <= 0) {
    debugTimer = 1.5;
    const ls = readStick(left);
    const rs = readStick(right);
    const tv = triggerValue(right || left);
    ok(`GP: L(${ls.x.toFixed(2)},${ls.y.toFixed(2)}) R(${rs.x.toFixed(2)},${rs.y.toFixed(2)}) Trig:${tv.toFixed(2)} src:${any.map(x=>x.handedness||"na").join(",")}`);
  }

  // Move uses LEFT controller stick (fallback to right if left missing)
  const moveGp = left || right;
  const { x:mxRaw, y:mzRaw } = readStick(moveGp);

  const dead = 0.14;
  const mx = Math.abs(mxRaw) > dead ? mxRaw : 0;
  const mz = Math.abs(mzRaw) > dead ? mzRaw : 0;

  if (mx || mz) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();

    const rightDir = new THREE.Vector3()
      .crossVectors(fwd, new THREE.Vector3(0,1,0))
      .normalize()
      .multiplyScalar(-1);

    const step = 2.2 * dt;

    const next = playerRig.position.clone();
    next.addScaledVector(rightDir, mx * step);
    next.addScaledVector(fwd, -mz * step);

    boundsClamp(next);

    if (!collidesXZ(next)) {
      playerRig.position.x = next.x;
      playerRig.position.z = next.z;
    }
  }

  // Snap turn uses RIGHT controller stick X (fallback to moveGp)
  snapCooldown = Math.max(0, snapCooldown - dt);
  const turnGp = right || moveGp;
  const { x:txRaw } = readStick(turnGp);
  if (snapCooldown <= 0 && Math.abs(txRaw) > 0.65) {
    playerRig.rotation.y += (txRaw > 0 ? -1 : 1) * (Math.PI/4);
    snapCooldown = 0.28;
  }

  // Teleport uses TRIGGER VALUE
  const tv = triggerValue(turnGp);
  if (tv > 0.70) wantTeleport = true;
}

function updateAimAndTeleport(){
  camera.getWorldPosition(camWorld);
  camera.getWorldDirection(dir);
  dir.y = 0;
  if (dir.length() < 0.001) dir.set(0,0,-1);
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

ok("Controls installed (Quest auto-mapper)");

// ---------- Resize + Loop ----------
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
  updateControls(dt);
  updateAimAndTeleport();

  renderer.render(scene, camera);
});
