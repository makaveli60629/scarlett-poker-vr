// js/main.js — Scarlett Poker VR MASTER LOADER (GitHub Pages Safe)

const hub = document.getElementById("hub");
const log = (msg) => hub.textContent += `\n${msg}`;
const ok  = (m) => log(`✅ ${m}`);
const warn= (m) => log(`⚠️ ${m}`);
const err = (m) => log(`❌ ${m}`);

log("Scarlett Poker VR — booting…");

// -------------------- THREE CDN --------------------
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

ok("Three.js CDN loaded");

// -------------------- CORE SCENE --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  300
);

// 👑 YOU ARE TALLER HERE
camera.position.set(0, 1.9, 4);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

ok("Renderer + VRButton ready");

// -------------------- LIGHTING (BRIGHT) --------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.4));

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(8, 14, 6);
scene.add(key);

const fill = new THREE.PointLight(0x88ccff, 0.8, 40);
fill.position.set(-6, 6, 6);
scene.add(fill);

ok("Lighting added");

// -------------------- SAFE MODULE LOADER --------------------
async function loadModule(path, name) {
  try {
    const m = await import(path);
    ok(`Loaded ${name}`);
    return m;
  } catch (e) {
    warn(`Skipped ${name}`);
    console.warn(path, e);
    return null;
  }
}

// -------------------- LOAD ALL YOUR FILES --------------------
const modules = {};

const moduleList = [
  // CORE
  ["./world.js", "world.js"],
  ["./controls.js", "controls.js"],
  ["./ui.js", "ui.js"],
  ["./audio.js", "audio.js"],
  ["./lights_pack.js", "lights_pack.js"],
  ["./xr_rig_fix.js", "xr_rig_fix.js"],
  ["./xr_locomotion.js", "xr_locomotion.js"],

  // GAME
  ["./poker_simulation.js", "poker_simulation.js"],
  ["./poker.js", "poker.js"],
  ["./hands.js", "hands.js"],
  ["./cards.js", "cards.js"],
  ["./dealer_blinds.js", "dealer_blinds.js"],
  ["./pot.js", "pot.js"],
  ["./tournament.js", "tournament.js"],

  // AVATARS / BOTS
  ["./avatar_basic.js", "avatar_basic.js"],
  ["./boss_bots.js", "boss_bots.js"],
  ["./bots.js", "bots.js"],

  // WORLD OBJECTS
  ["./table.js", "table.js"],
  ["./chair.js", "chair.js"],
  ["./water_fountain.js", "water_fountain.js"],
  ["./spectator_rail.js", "spectator_rail.js"],
  ["./solid_walls.js", "solid_walls.js"],
  ["./teleport_machine.js", "teleport_machine.js"],

  // STORE
  ["./store.js", "store.js"],
  ["./store_kiosk.js", "store_kiosk.js"],
  ["./shop_catalog.js", "shop_catalog.js"],
  ["./shop_ui.js", "shop_ui.js"],

  // UI / SYSTEM
  ["./vr_ui_panel.js", "vr_ui_panel.js"],
  ["./watch_ui.js", "watch_ui.js"],
  ["./notify.js", "notify.js"],
  ["./leaderboard.js", "leaderboard.js"],

  // STATE
  ["./state.js", "state.js"],
  ["./state_v62.js", "state_v62.js"],
  ["./room_manager.js", "room_manager.js"],
  ["./inventory.js", "inventory.js"],
  ["./interactions.js", "interactions.js"],
  ["./input.js", "input.js"],
  ["./textures.js", "textures.js"],
  ["./event_chips.js", "event_chips.js"],
  ["./furniture_pack.js", "furniture_pack.js"],
  ["./crown.js", "crown.js"],
  ["./crown_system.js", "crown_system.js"],
  ["./core_bridge.js", "core_bridge.js"],
];

for (const [path, name] of moduleList) {
  modules[name] = await loadModule(path, name);
}

// -------------------- WORLD BUILD --------------------
let worldData = null;

if (modules["world.js"]?.World) {
  worldData = modules["world.js"].World.build(scene, player);
  ok("World built");
} else {
  warn("World not available");
}

// -------------------- CONTROLS --------------------
if (modules["controls.js"]?.Controls) {
  modules["controls.js"].Controls.init({
    renderer,
    camera,
    player,
    colliders: worldData?.colliders ?? [],
    bounds: worldData?.bounds ?? null,
    spawn: worldData?.spawn ?? new THREE.Vector3(0,0,6)
  });
  ok("Controls.init OK");
} else {
  warn("Controls missing");
}

// -------------------- UI --------------------
modules["ui.js"]?.UI?.init?.(scene, camera);
ok("UI init OK");

// -------------------- GAME --------------------
modules["poker_simulation.js"]?.PokerSimulation?.build?.({});
ok("PokerSimulation built");

// -------------------- RENDER LOOP --------------------
renderer.setAnimationLoop(() => {
  modules["controls.js"]?.Controls?.update?.(0.016);
  renderer.render(scene, camera);
});

ok("Boot complete. Enter VR.");
