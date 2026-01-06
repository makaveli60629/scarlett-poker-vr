// js/main.js — Scarlett Poker VR — WORLD+RIG BOOT v10 (GitHub Pages safe)
// - Always shows VRButton
// - Loads world.js FIRST and uses its returned spawn/bounds
// - No double-floors (prevents blinking / void issues)
// - Adds a headlamp for extra visibility in VR
// - Uses VRRig for movement/laser/teleport/height lock

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { VRRig } from "./vr_rig.js";
import { World } from "./world.js";

const hubEl = document.getElementById("hub");
const logs = [];
function hub(msg) {
  logs.push(msg);
  while (logs.length > 22) logs.shift();
  if (hubEl) hubEl.textContent = logs.join("\n");
  console.log(msg);
}
const ok = (m) => hub(`✅ ${m}`);
const warn = (m) => hub(`⚠️ ${m}`);
const fail = (m) => hub(`❌ ${m}`);

hub("Scarlett Poker VR — booting…");

// ---------- Core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
scene.fog = new THREE.Fog(0x05070b, 4, 80);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
ok("VRButton added");

// Player rig group
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Headlamp (insurance against “black world”)
const headlamp = new THREE.PointLight(0xffffff, 2.8, 90);
camera.add(headlamp);
ok("Headlamp on camera");

// ---------- Build WORLD (your v10 file) ----------
let worldData = null;

try {
  worldData = World.build(scene, player);
  ok("world.js built");
} catch (e) {
  fail("world.js build crashed — check console");
  console.error(e);
}

// Apply spawn (NEVER center table)
if (worldData?.spawn) {
  player.position.set(worldData.spawn.x, 0, worldData.spawn.z);
  ok(`Spawn set to pad (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
} else {
  // safe fallback spawn
  player.position.set(0, 0, 10);
  warn("Spawn fallback used");
}

// Face toward center/table
player.rotation.y = Math.PI;

// ---------- VR RIG ----------
const rig = VRRig.create({ renderer, scene, camera, player, hub });
ok("VRRig created");

// Apply bounds from world (correct room limits)
if (worldData?.bounds?.min && worldData?.bounds?.max) {
  rig.setBounds({
    minX: worldData.bounds.min.x,
    maxX: worldData.bounds.max.x,
    minZ: worldData.bounds.min.z,
    maxZ: worldData.bounds.max.z,
  });
  ok("Bounds applied from world");
} else {
  rig.setBounds({ minX: -15.5, maxX: 15.5, minZ: -15.5, maxZ: 15.5 });
  warn("Bounds fallback used");
}

// Height lock: keeps “standing view” even if you sit
// Adjust this number anytime (1.78–1.90 typical)
rig.setHeightLock(1.80, true);
ok("Height lock enabled");

// ---------- Diagnostics summary ----------
hub("");
ok(`Pads: ${worldData?.pads?.length ?? 0}`);
ok(`Colliders: ${worldData?.colliders?.length ?? 0}`);
ok("Enter VR");

// ---------- Render loop ----------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  rig.update(dt);
  renderer.render(scene, camera);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
