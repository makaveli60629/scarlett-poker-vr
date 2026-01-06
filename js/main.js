// /js/main.js — Scarlett Poker VR — Permanent Core (GitHub + Quest Safe)
// - VRButton ALWAYS visible
// - Safe module loader + hub logs
// - World spawn uses padById[room] or lobby
// - Passes colliders/bounds into Controls
// - Brighter lighting + exposure for Quest

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const println = (t) => { overlay.textContent += `\n${t}`; console.log(t); };
const ok = (t) => println(`✅ ${t}`);
const warn = (t) => println(`⚠️ ${t}`);
const fail = (t) => println(`❌ ${t}`);

overlay.textContent = "Scarlett Poker VR — booting…";
ok("Three.js CDN loaded");

// -------------------------
// URL helpers
// -------------------------
function qs(name, fallback) {
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get(name);
    if (v == null || v === "") return fallback;
    if (typeof fallback === "number") {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return v;
  } catch {
    return fallback;
  }
}
function roomFromURL() {
  const room = String(qs("room", "lobby")).toLowerCase();
  return ["lobby","vip","store","tournament"].includes(room) ? room : "lobby";
}

// -------------------------
// Scene / Player / Camera
// -------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d22);
scene.fog = new THREE.Fog(0x1a1d22, 6, 90);

const player = new THREE.Group();
scene.add(player);

// XR camera is driven by headset; keep local at origin in rig
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
camera.position.set(0, 0, 0);
player.add(camera);

// -------------------------
// Renderer + VRButton (LOCKED)
// -------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

// Quest brightness helpers
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;

renderer.setClearColor(0x1a1d22, 1);
document.body.appendChild(renderer.domElement);

// Prefer floor reference space (Quest)
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

const vrButton = VRButton.createButton(renderer);
vrButton.style.position = "fixed";
vrButton.style.bottom = "20px";
vrButton.style.right = "20px";
vrButton.style.zIndex = "999999";
vrButton.style.display = "block";
vrButton.style.opacity = "1";
vrButton.style.pointerEvents = "auto";
document.body.appendChild(vrButton);

ok("Renderer + VRButton mounted/locked");

// Oculus warm-up gesture safety
document.body.addEventListener("click", () => {
  renderer.xr.enabled = true;
}, { once: true });

// -------------------------
// Lighting (BRIGHTER + NICER)
// -------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 2.2);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(8, 14, 6);
scene.add(key);

// Ceiling ring lights around table area (adds “casino” feel)
const ceilingLights = [];
function addCeilingLight(x, z, intensity = 1.15) {
  const p = new THREE.PointLight(0xffffff, intensity, 60);
  p.position.set(x, 7.2, z);
  scene.add(p);
  ceilingLights.push(p);
}
addCeilingLight(0, 0, 1.35);
addCeilingLight(8, 0, 1.1);
addCeilingLight(-8, 0, 1.1);
addCeilingLight(0, 8, 1.1);
addCeilingLight(0, -8, 1.1);

// Player headlight (guarantees visibility)
const headLight = new THREE.PointLight(0xffffff, 2.0, 22);
headLight.position.set(0, 1.6, 0);
player.add(headLight);

ok("Lighting applied");

// Safety floor (in case any world floor fails)
const safetyFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshStandardMaterial({ color: 0x101217, roughness: 1 })
);
safetyFloor.rotation.x = -Math.PI / 2;
safetyFloor.position.y = 0;
scene.add(safetyFloor);

// Boost on XR start (Quest sometimes dims on sessionstart)
renderer.xr.addEventListener("sessionstart", () => {
  ok("XR session started — boost");
  renderer.toneMappingExposure = 1.95;
  ambient.intensity = 0.95;
  hemi.intensity = 2.5;
  key.intensity = 2.1;
  headLight.intensity = 2.3;
  ceilingLights.forEach(l => l.intensity *= 1.08);
});

// -------------------------
// SAFE MODULE LOADER
// -------------------------
const modules = {};
async function safeImport(label, relPath) {
  try {
    const m = await import(`${relPath}?v=${Date.now()}`);
    modules[label] = m;
    ok(`Loaded ${label}`);
    return m;
  } catch (e) {
    modules[label] = null;
    warn(`Skipped ${label}`);
    console.warn(`Failed import: ${label} -> ${relPath}`, e);
    return null;
  }
}

// Core modules you actually rely on
const WorldMod = await safeImport("world.js", "./world.js");
const ControlsMod = await safeImport("controls.js", "./controls.js");
await safeImport("ui.js", "./ui.js");
await safeImport("poker_simulation.js", "./poker_simulation.js");

// Optional (non-fatal)
await safeImport("interactions.js", "./interactions.js");
await safeImport("table.js", "./table.js");
await safeImport("chair.js", "./chair.js");
await safeImport("store.js", "./store.js");
await safeImport("watch_ui.js", "./watch_ui.js");

// -------------------------
// BUILD WORLD + SPAWN ON PAD
// -------------------------
let worldData = null;
let spawn = new THREE.Vector3(0, 0, 11.5);

try {
  if (WorldMod?.World?.build) {
    worldData = WorldMod.World.build(scene, player);
    ok("World.build OK");

    const room = roomFromURL();
    const pad = worldData?.padById?.[room] || worldData?.padById?.lobby;

    if (pad?.position) spawn.copy(pad.position);
    else if (worldData?.spawn) spawn.copy(worldData.spawn);
  } else {
    warn("World build missing — using fallback spawn");
  }
} catch (e) {
  fail(`World build failed: ${e?.message || e}`);
}

// Spawn XZ; Y will be controlled by Controls height-lock
player.position.set(spawn.x, 0.01, spawn.z);
ok("Spawned on teleport pad");

// -------------------------
// CONTROLS (height locked here permanently)
// -------------------------
const lockedEye = Number(qs("eye", 1.72)); // lock in-game eye height (standing/sitting same)
try {
  if (ControlsMod?.Controls?.init) {
    ControlsMod.Controls.init({
      renderer,
      camera,
      player,
      colliders: worldData?.colliders || [],
      bounds: worldData?.bounds || null,
      spawn: { position: spawn, yaw: 0 },
      // 🔒 Height lock settings
      lockHeight: true,
      targetEyeHeight: lockedEye,
      baseY: 0.01
    });
    ok(`Controls.init OK (eye locked @ ${lockedEye.toFixed(2)}m)`);
  } else {
    warn("Controls missing init()");
  }
} catch (e) {
  fail(`Controls init failed: ${e?.message || e}`);
}

// -------------------------
// RESIZE
// -------------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// -------------------------
// LOOP
// -------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  try { ControlsMod?.Controls?.update?.(dt); } catch {}
  renderer.render(scene, camera);
});

ok("Boot complete — press ENTER VR");
ok("Tip: adjust eye height later with ?eye=1.80");
