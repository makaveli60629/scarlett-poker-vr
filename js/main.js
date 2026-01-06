// /js/main.js — Scarlett Poker VR — Permanent Core + Controllers + No-ZFighting Floor
// GitHub Pages + Oculus Browser SAFE

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

const overlay = document.getElementById("overlay");
const println = (t) => { overlay.textContent += `\n${t}`; console.log(t); };
const ok = (t) => println(`✅ ${t}`);
const warn = (t) => println(`⚠️ ${t}`);
const fail = (t) => println(`❌ ${t}`);

overlay.textContent = "Scarlett Poker VR — booting…";
ok("Three.js CDN loaded");

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
scene.background = new THREE.Color(0x1b2028);
scene.fog = new THREE.Fog(0x1b2028, 6, 90);

const player = new THREE.Group();
scene.add(player);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
camera.position.set(0, 0, 0); // XR drives camera
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
renderer.toneMappingExposure = 1.9;

renderer.setClearColor(0x1b2028, 1);
document.body.appendChild(renderer.domElement);

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

// Oculus warm-up
document.body.addEventListener("click", () => {
  renderer.xr.enabled = true;
}, { once: true });

// -------------------------
// Lighting (BRIGHTER)
// -------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 2.4);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(8, 14, 6);
scene.add(key);

const fillA = new THREE.PointLight(0xffffff, 1.3, 80);
fillA.position.set(-10, 7, 10);
scene.add(fillA);

const fillB = new THREE.PointLight(0xffffff, 1.2, 80);
fillB.position.set(10, 7, -10);
scene.add(fillB);

// Headlight on player (guaranteed visibility)
const headLight = new THREE.PointLight(0xffffff, 2.2, 22);
headLight.position.set(0, 1.6, 0);
player.add(headLight);

ok("Lighting applied");

// -------------------------
// Safety floor (ANTI BLINK / ANTI Z-FIGHT)
// Put it slightly BELOW the real floor and use polygonOffset.
// -------------------------
const safetyFloorMat = new THREE.MeshStandardMaterial({
  color: 0x151820,
  roughness: 1,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
const safetyFloor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), safetyFloorMat);
safetyFloor.rotation.x = -Math.PI / 2;
safetyFloor.position.y = -0.06; // below world floor => no flicker
scene.add(safetyFloor);
ok("Safety floor placed below world floor");

// -------------------------
// Controllers (VISIBLE MODELS)
// -------------------------
const controllerModelFactory = new XRControllerModelFactory();

// controller 0/1 = left/right (usually)
const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);
scene.add(controller0);
scene.add(controller1);

const grip0 = renderer.xr.getControllerGrip(0);
grip0.add(controllerModelFactory.createControllerModel(grip0));
scene.add(grip0);

const grip1 = renderer.xr.getControllerGrip(1);
grip1.add(controllerModelFactory.createControllerModel(grip1));
scene.add(grip1);

ok("Controller models attached");

// -------------------------
// Safe module loader (HUB)
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

// Core
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
// Build World + Spawn
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
    warn("World build missing — fallback spawn used");
  }
} catch (e) {
  fail(`World build failed: ${e?.message || e}`);
}

player.position.set(spawn.x, 0.01, spawn.z);
ok("Spawned on teleport pad");

// -------------------------
// Controls (height lock + laser-teleport targeting)
// -------------------------
const lockedEye = Number(qs("eye", 1.72)); // your desired permanent seated eye height
try {
  if (ControlsMod?.Controls?.init) {
    ControlsMod.Controls.init({
      renderer,
      camera,
      player,
      // pass controllers + grips so you can see / raycast
      controllers: { left: controller0, right: controller1 },
      grips: { left: grip0, right: grip1 },
      // collision
      colliders: worldData?.colliders || [],
      bounds: worldData?.bounds || null,
      // height lock
      lockHeight: true,
      targetEyeHeight: lockedEye,
      baseY: 0.01,
      // floor plane for raycast
      floorY: 0.0,
    });
    ok(`Controls.init OK (eye locked @ ${lockedEye.toFixed(2)}m)`);
  } else {
    warn("Controls missing init()");
  }
} catch (e) {
  fail(`Controls init failed: ${e?.message || e}`);
}

// Boost on XR start (Quest dims sometimes)
renderer.xr.addEventListener("sessionstart", () => {
  ok("XR session started — boost");
  renderer.toneMappingExposure = 2.05;
  ambient.intensity = 1.0;
  hemi.intensity = 2.7;
  key.intensity = 2.2;
  headLight.intensity = 2.5;
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  try { ControlsMod?.Controls?.update?.(dt); } catch {}
  renderer.render(scene, camera);
});

ok("Boot complete — press ENTER VR");
