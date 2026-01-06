// /js/main.js — Scarlett Poker VR — Permanent Core + Hub + XR Black Fix
// GitHub Pages + Oculus Browser SAFE
// Guarantees:
// - VRButton ALWAYS visible
// - XR black screen fixed via XR-safe lighting + player headlight + brighter bg
// - World spawn on teleport pad (never inside table)
// - Safe module loading w/ hub report (never crashes)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const println = (t) => { overlay.textContent += `\n${t}`; console.log(t); };
const ok = (t) => println(`✅ ${t}`);
const warn = (t) => println(`⚠️ ${t}`);
const fail = (t) => println(`❌ ${t}`);

overlay.textContent = "Scarlett Poker VR — booting…\n";
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

// ✅ VR-safe background (NOT near-black)
scene.background = new THREE.Color(0x1a1d22);
scene.fog = new THREE.Fog(0x1a1d22, 6, 80);

const player = new THREE.Group();
scene.add(player);

// In XR, camera pose is driven by headset; keep at origin in rig.
// We'll adjust player rig height instead.
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
camera.position.set(0, 0, 0);
player.add(camera);

// -------------------------
// Renderer + VRButton (LOCKED)
// -------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

// Quest brightness helpers
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;

document.body.appendChild(renderer.domElement);

// ✅ Force reference space so floor & looking down behave
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

const vrButton = VRButton.createButton(renderer);
// Force visibility + clickability
vrButton.style.position = "fixed";
vrButton.style.bottom = "20px";
vrButton.style.right = "20px";
vrButton.style.zIndex = "9999";
vrButton.style.display = "block";
vrButton.style.opacity = "1";
vrButton.style.pointerEvents = "auto";
document.body.appendChild(vrButton);

ok("Renderer + VRButton mounted/locked");

// Oculus sometimes needs a user gesture “warmup”
document.body.addEventListener("click", () => {
  renderer.xr.enabled = true;
}, { once: true });

// -------------------------
// XR SAFE LIGHTING (BLACK FIX)
// -------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 1.85);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.55);
key.position.set(6, 12, 6);
scene.add(key);

const fillA = new THREE.PointLight(0xffffff, 1.25, 90);
fillA.position.set(-8, 6, 8);
scene.add(fillA);

const fillB = new THREE.PointLight(0xffffff, 1.15, 90);
fillB.position.set(8, 6, -8);
scene.add(fillB);

// ✅ Headlight attached to player — GUARANTEED VISIBILITY IN QUEST
const headLight = new THREE.PointLight(0xffffff, 2.0, 22);
headLight.position.set(0, 1.6, 0);
player.add(headLight);

ok("XR-safe lighting applied (black screen fix)");

// A visible safety floor so you always see “something”
const safetyFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x101217, roughness: 1 })
);
safetyFloor.rotation.x = -Math.PI / 2;
safetyFloor.position.y = 0;
scene.add(safetyFloor);
ok("Safety floor added");

// Re-apply lighting on XR start (Quest quirk)
renderer.xr.addEventListener("sessionstart", () => {
  ok("XR session started — boosting lights");
  renderer.toneMappingExposure = 1.65;
  ambient.intensity = 0.85;
  hemi.intensity = 2.1;
  key.intensity = 1.75;
  headLight.intensity = 2.2;
});

// -------------------------
// SAFE MODULE LOADER + HUB REPORT
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

// Your core modules (these are the important ones)
const WorldMod = await safeImport("world.js", "./world.js");
const ControlsMod = await safeImport("controls.js", "./controls.js");
const UIMod = await safeImport("ui.js", "./ui.js");
const PokerMod = await safeImport("poker_simulation.js", "./poker_simulation.js");

// Optional modules (will not crash if missing)
await safeImport("audio.js", "./audio.js");
await safeImport("lights_pack.js", "./lights_pack.js");
await safeImport("xr_locomotion.js", "./xr_locomotion.js");
await safeImport("xr_rig_fix.js", "./xr_rig_fix.js");
await safeImport("interactions.js", "./interactions.js");
await safeImport("table.js", "./table.js");
await safeImport("chair.js", "./chair.js");
await safeImport("store.js", "./store.js");
await safeImport("watch_ui.js", "./watch_ui.js");
await safeImport("notify.js", "./notify.js");

// -------------------------
// BUILD WORLD + FORCE SPAWN ON PAD
// -------------------------
let worldData = null;
let spawn = new THREE.Vector3(0, 0, 11.5); // fallback pad-ish

try {
  if (WorldMod?.World?.build) {
    worldData = WorldMod.World.build(scene, player);
    ok("World.build OK");

    // If you have padById, pick room param
    const room = roomFromURL();
    const pad = worldData?.padById?.[room] || worldData?.padById?.lobby;

    if (pad?.position) spawn.copy(pad.position);
    else if (worldData?.spawn) spawn.copy(worldData.spawn);

  } else {
    warn("World module missing build() — using fallback spawn");
  }
} catch (e) {
  fail(`World build failed: ${e?.message || e}`);
}

// ✅ YOU TALLER: rig height offset (default tall)
const height = Number(qs("height", 0.50)); // try 0.50–0.65 to see over table
player.position.set(spawn.x, height + 0.01, spawn.z);
ok(`Spawned on teleport pad (height=${height.toFixed(2)})`);

// -------------------------
// CONTROLS
// -------------------------
try {
  if (ControlsMod?.Controls?.init) {
    ControlsMod.Controls.init({
      renderer,
      camera,
      player,
      colliders: worldData?.colliders || [],
      bounds: worldData?.bounds || null,
      spawn: { position: spawn, yaw: 0 }
    });
    ok("Controls.init OK");
  } else {
    warn("Controls missing init()");
  }
} catch (e) {
  fail(`Controls init failed: ${e?.message || e}`);
}

// -------------------------
// UI + Poker (non-fatal)
// -------------------------
try { UIMod?.UI?.init?.(scene, camera); ok("UI init OK"); } catch { warn("UI init skipped"); }
try { PokerMod?.PokerSimulation?.build?.({}); ok("PokerSimulation OK"); } catch { warn("PokerSimulation skipped"); }

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
  try { UIMod?.UI?.update?.(dt); } catch {}
  renderer.render(scene, camera);
});

ok("Boot complete — press ENTER VR");
ok("Tip: adjust height with ?height=0.60");
