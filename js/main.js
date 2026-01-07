// /js/main.js — Scarlett Poker VR — MAIN (Quest WebXR + Android Dev Mode) — PERMANENT
// GitHub Pages safe: uses CDN three.module.js + local modules.
// Requirements:
//  - /js/world.js exporting World.build(scene, playerGroup) -> { spawn, colliders, bounds, pads, padById, floorY }
//  - /js/vr_rig.js exporting VRRig (for Quest teleport laser/ring)
//  - /js/dev_mode.js exporting DevMode (for Android 2D dev controls)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { VRRig } from "./vr_rig.js";
import { DevMode } from "./dev_mode.js";

// ---------------- HUD (green boot log) ----------------
const HUB = (() => {
  const el = document.getElementById("hub");
  const add = (txt) => { if (el) el.textContent += txt + "\n"; };
  return {
    ok: (t) => add("✅ " + t),
    warn: (t) => add("⚠️ " + t),
    err: (t) => add("❌ " + t),
  };
})();

// ---------------- Scene / Renderer ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.7, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
HUB.ok("Renderer ready");

// VRButton ALWAYS present (Quest needs it)
try {
  document.body.appendChild(VRButton.createButton(renderer));
  HUB.ok("VRButton added");
} catch (e) {
  HUB.warn("VRButton unavailable (non-secure origin or browser limitation)");
}

// Headlamp so you never go full black
const headlamp = new THREE.PointLight(0xffffff, 1.2, 18);
camera.add(headlamp);
scene.add(camera);
HUB.ok("Headlamp on camera");

// Player root (we move this)
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

// ---------------- Build World ----------------
let worldData = null;
let floorMeshes = [];
try {
  worldData = World.build(scene, playerGroup);
  HUB.ok("world.js built");
} catch (e) {
  HUB.err("world.js failed: " + (e?.message || e));
}

// collect floor meshes tagged by world.js
floorMeshes = scene.children.filter(o => o?.userData?.isFloor === true);

// Spawn to pad if world gave us one
if (worldData?.spawn) {
  playerGroup.position.x = worldData.spawn.x;
  playerGroup.position.z = worldData.spawn.z;
  HUB.ok(`Spawn set to pad (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
}

// ---------------- Quest Rig (laser/ring/teleport) ----------------
let rigReady = false;
try {
  if (worldData) {
    VRRig.setWorldRefs({
      floors: floorMeshes,
      colliders: worldData.colliders || [],
      bounds: worldData.bounds || null,
      pads: worldData.pads || [],
      floorY: worldData.floorY ?? 0
    });

    VRRig.setHeightLock(true, 1.80); // locked height
    VRRig.create(renderer, scene, camera, playerGroup, HUB);
    rigReady = true;
    HUB.ok("VRRig created");
  }
} catch (e) {
  HUB.warn("VRRig failed: " + (e?.message || e));
}

// ---------------- Android/Desktop Dev Mode ----------------
const dev = DevMode.init({
  onTeleport: ({ x, y }) => {
    // raycast from screen point to floor
    if (!floorMeshes.length) return;

    const ndc = new THREE.Vector2(
      (x / innerWidth) * 2 - 1,
      -(y / innerHeight) * 2 + 1
    );

    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(floorMeshes, true);
    if (!hits.length) return;

    const p = hits[0].point;
    // respect bounds if available
    if (worldData?.bounds) {
      p.x = Math.max(worldData.bounds.min.x, Math.min(worldData.bounds.max.x, p.x));
      p.z = Math.max(worldData.bounds.min.z, Math.min(worldData.bounds.max.z, p.z));
    }
    playerGroup.position.x = p.x;
    playerGroup.position.z = p.z;
    HUB.ok(`Dev teleport -> (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  }
});

if (dev.enabled) HUB.ok("DevMode enabled (Android/desktop)");

// ---------------- Simple Dev Movement ----------------
function applyDevMovement(dt) {
  const axes = DevMode.getAxes();
  const moveSpeed = 3.2;   // m/s
  const turnSpeed = 1.7;   // rad/s

  // rotate playerGroup
  playerGroup.rotation.y -= axes.turnX * turnSpeed * dt;

  // forward/right in player space
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);

  const v = new THREE.Vector3();
  v.addScaledVector(forward, axes.moveY * moveSpeed * dt);
  v.addScaledVector(right, axes.moveX * moveSpeed * dt);

  playerGroup.position.add(v);

  // clamp to bounds
  if (worldData?.bounds) {
    playerGroup.position.x = Math.max(worldData.bounds.min.x, Math.min(worldData.bounds.max.x, playerGroup.position.x));
    playerGroup.position.z = Math.max(worldData.bounds.min.z, Math.min(worldData.bounds.max.z, playerGroup.position.z));
  }
}

// ---------------- Resize ----------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------- Main loop ----------------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // Quest rig update (laser + ring + height lock)
  if (rigReady) {
    try { VRRig.update(renderer); } catch {}
  }

  // DevMode movement if enabled and NOT presenting XR
  if (DevMode.enabled() && !renderer.xr.isPresenting) {
    applyDevMovement(dt);
  }

  renderer.render(scene, camera);
});
HUB.ok("Boot complete");
