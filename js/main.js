// /js/main.js — Scarlett Poker VR — PERMANENT v1.1 (VR-visible diagnostics panel)
// Safe grid + cube ALWAYS. Loads ./world.js. Shows errors IN VR via 3D panel.

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
function pushLine(prefix, msg){
  const line = `${prefix} ${msg}`;
  logLines.push(line);
  if (logLines.length > 24) logLines.shift();

  if (overlay) overlay.textContent = logLines.join("\n");
  console.log(line);

  // Update VR panel text if exists
  if (statusCanvas) drawStatusCanvas();
}
const ok   = (m)=>pushLine("✅", m);
const warn = (m)=>pushLine("⚠️", m);
const fail = (m)=>pushLine("❌", m);

if (overlay) overlay.textContent = "Scarlett Poker VR — booting…";

// ---------- Core ----------
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

try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference: local-floor"); }
catch { warn("Reference set failed (ok)"); }

const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// Height feel lock
playerRig.position.y = 0.45;

// Roots
const safeRoot = new THREE.Group();
scene.add(safeRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

// ---------- Safe scene (never black) ----------
safeRoot.add(new THREE.AmbientLight(0xffffff, 0.45));
safeRoot.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(15, 25, 10);
safeRoot.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.0, 40);
camera.add(headlamp);

const safeFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(120,120),
  new THREE.MeshBasicMaterial({ color: 0x2b2f38 })
);
safeFloor.rotation.x = -Math.PI/2;
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

ok("Safe grid + cube loaded");

// ---------- VR visible status panel ----------
let statusCanvas = null;
let statusCtx = null;
let statusTex = null;
let statusMesh = null;

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

makeStatusPanel();

// ---------- Spawn safe ----------
playerRig.position.set(0, playerRig.position.y, 8);
ok("Safe spawn set");

// ---------- Load world.js ----------
let worldData = null;
try {
  const mod = await import("./world.js?v=2026"); // cache-bust
  if (!mod?.World?.build) throw new Error("World.build missing export");
  worldData = mod.World.build(worldRoot, playerRig);
  ok("world.js imported + built");

  if (worldData?.spawn) {
    playerRig.position.x = worldData.spawn.x;
    playerRig.position.z = worldData.spawn.z;
    ok(`Spawn -> (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
  } else {
    warn("World returned no spawn");
  }
} catch (e) {
  fail(`world.js failed: ${e?.message || e}`);
  warn("Check path: /js/world.js (case-sensitive) — open it directly in browser.");
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
      optionalFeatures: ["local-floor","bounded-floor","hand-tracking","layers"]
    });
    await renderer.xr.setSession(session);
    ok("XR session started");
  } catch (e) {
    fail(`ENTER VR failed: ${e?.message || e}`);
  }
}
enterVrBtn?.addEventListener("click", ()=>{ ok("ENTER VR clicked"); manualEnterVR(); });

// ---------- Minimal move/snap so you’re never stuck ----------
let lastSnap = 0;
function getLeftGamepad(){
  const s = renderer.xr.getSession?.();
  if (!s) return null;
  let best = null;
  for (const src of s.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") return src.gamepad;
    best = src.gamepad;
  }
  return best;
}

function clampToBounds(pos){
  const b = worldData?.bounds;
  if (b?.min && b?.max){
    pos.x = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
    pos.z = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
  } else {
    pos.x = THREE.MathUtils.clamp(pos.x, -32, 32);
    pos.z = THREE.MathUtils.clamp(pos.z, -32, 32);
  }
}

let lastT = performance.now();
renderer.setAnimationLoop(()=>{
  const t = performance.now();
  const dt = Math.min(0.05, (t - lastT)/1000);
  lastT = t;

  const gp = getLeftGamepad();
  if (gp){
    const ax0 = gp.axes?.[0] ?? 0;
    const ax1 = gp.axes?.[1] ?? 0;
    const ax2 = gp.axes?.[2] ?? 0;

    const dead = 0.15;
    const mx = Math.abs(ax0) > dead ? ax0 : 0;
    const mz = Math.abs(ax1) > dead ? ax1 : 0;

    if (mx || mz){
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

      playerRig.position.addScaledVector(right, mx * 2.1 * dt);
      playerRig.position.addScaledVector(fwd, -mz * 2.1 * dt);
      clampToBounds(playerRig.position);
    }

    const now = t/1000;
    const sx = Math.abs(ax2) > 0.6 ? ax2 : 0;
    if (sx && now - lastSnap > 0.35){
      playerRig.rotation.y += (sx > 0 ? -1 : 1) * (Math.PI/4);
      lastSnap = now;
    }
  }

  renderer.render(scene, camera);
});
