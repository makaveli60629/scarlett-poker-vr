// Scarlett Poker VR — Main Loader (GitHub + Oculus Safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const log = (msg) => overlay.textContent += msg + "\n";
const ok = (msg) => log("✔ " + msg);
const warn = (msg) => log("⚠ " + msg);

log("Scarlett Poker VR — booting...\n");

ok("Three.js CDN loaded");

// -----------------------------
// Renderer / Scene / Camera
// -----------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 3, 60);

const player = new THREE.Group();
scene.add(player);

// 👤 TALLER PLAYER (IMPORTANT)
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.75, 0); // ← taller eye height
player.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

ok("Renderer + VRButton ready");

// -----------------------------
// LIGHTING (BRIGHT)
// -----------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.4));

const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(6, 12, 6);
scene.add(sun);

ok("Lighting added");

// -----------------------------
// MODULE LOADER (SAFE)
// -----------------------------
const modules = {};
const load = async (file) => {
  try {
    const m = await import(`./${file}?v=${Date.now()}`);
    modules[file] = m;
    ok(`Loaded ${file}`);
    return m;
  } catch (e) {
    warn(`Skipped ${file}`);
    return null;
  }
};

// -----------------------------
// LOAD ALL MODULES
// -----------------------------
await load("world.js");
await load("controls.js");
await load("ui.js");
await load("audio.js");
await load("lights_pack.js");
await load("xr_rig_fix.js");
await load("xr_locomotion.js");
await load("poker_simulation.js");

// optional / non-fatal
await load("poker.js");
await load("hands.js");
await load("cards.js");
await load("dealer_blinds.js");
await load("pot.js");
await load("boss_bots.js");
await load("water_fountain.js");
await load("spectator_rail.js");
await load("solid_walls.js");
await load("shop_catalog.js");
await load("shop_ui.js");
await load("notify.js");
await load("state.js");
await load("state_v62.js");

// -----------------------------
// WORLD BUILD + SPAWN FIX
// -----------------------------
let worldData = null;

if (modules["world.js"]?.World) {
  worldData = modules["world.js"].World.build(scene, player);
  ok("World built");

  // 🚨 CRITICAL FIX: FORCE SPAWN ON TELEPORT PAD
  if (worldData?.spawn) {
    player.position.copy(worldData.spawn);
    player.position.y = 0;
    ok("Player spawned on lobby teleport pad");
  } else {
    player.position.set(0, 0, 10);
    warn("World spawn missing — fallback used");
  }
}

// -----------------------------
// CONTROLS
// -----------------------------
if (modules["controls.js"]?.Controls) {
  modules["controls.js"].Controls.init({
    renderer,
    camera,
    player,
    colliders: worldData?.colliders || [],
    bounds: worldData?.bounds || null,
    spawn: worldData?.spawn || null
  });
  ok("Controls.init OK");
}

// -----------------------------
// UI
// -----------------------------
if (modules["ui.js"]?.UI) {
  modules["ui.js"].UI.init(scene, camera);
  ok("UI.init OK");
}

// -----------------------------
// AUDIO
// -----------------------------
modules["audio.js"]?.Audio?.init?.();
ok("Audio init OK");

// -----------------------------
// XR RIG FIX
// -----------------------------
modules["xr_rig_fix.js"]?.apply?.(player);
ok("XR rig fix applied");

// -----------------------------
// POKER SIMULATION
// -----------------------------
modules["poker_simulation.js"]?.PokerSimulation?.build?.({});
ok("PokerSimulation built");

// -----------------------------
// RESIZE
// -----------------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// -----------------------------
// LOOP
// -----------------------------
renderer.setAnimationLoop(() => {
  modules["controls.js"]?.Controls?.update?.(renderer.clock?.getDelta?.() || 0);
  renderer.render(scene, camera);
});

log("\n✔ Boot complete.\nENTER VR");
