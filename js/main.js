// /js/main.js — Scarlett Poker VR — MAIN (Quest WebXR + Android DEV button) — PERMANENT

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { VRRig } from "./vr_rig.js";
import { DevMode } from "./dev_mode.js";

// ---------------- HUD ----------------
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
scene.background = new THREE.Color(0x07080b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
camera.position.set(0, 1.7, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// 🔥 DARK FIX: force tone mapping + exposure
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;

renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
HUB.ok("Renderer ready");

// ---------------- VR Button (Quest) ----------------
try {
  document.body.appendChild(VRButton.createButton(renderer));
  HUB.ok("VRButton added");
} catch (e) {
  HUB.warn("VRButton unavailable here");
}

// ---------------- Guaranteed Lights (even if world fails) ----------------
// These are “always on” so you never get a black void.
const baseAmbient = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(baseAmbient);

const baseHemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.05);
baseHemi.position.set(0, 30, 0);
scene.add(baseHemi);

const baseSun = new THREE.DirectionalLight(0xffffff, 2.2);
baseSun.position.set(18, 30, 14);
scene.add(baseSun);

const headlamp = new THREE.PointLight(0xffffff, 1.9, 25);
camera.add(headlamp);
scene.add(camera);
HUB.ok("Baseline lights + headlamp enabled");

// ---------------- Player Root ----------------
const playerGroup = new THREE.Group();
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

// collect floor meshes
floorMeshes = [];
scene.traverse((o) => {
  if (o?.userData?.isFloor) floorMeshes.push(o);
});

// Spawn to pad
if (worldData?.spawn) {
  playerGroup.position.x = worldData.spawn.x;
  playerGroup.position.z = worldData.spawn.z;
  HUB.ok(`Spawn set to pad (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);
}

// ---------------- DEV MODE toggle button (Android/desktop) ----------------
function addDevButton() {
  const btn = document.createElement("button");
  btn.id = "enterDevBtn";
  btn.textContent = "ENTER DEV (Android)";
  btn.style.position = "fixed";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = 99999;
  btn.style.padding = "14px 16px";
  btn.style.borderRadius = "14px";
  btn.style.border = "1px solid rgba(0,255,170,0.55)";
  btn.style.background = "rgba(0,0,0,0.55)";
  btn.style.color = "rgba(0,255,170,0.95)";
  btn.style.fontFamily = "ui-monospace, Menlo, Monaco, Consolas, monospace";
  btn.style.fontSize = "13px";
  btn.style.cursor = "pointer";

  btn.onclick = () => {
    DevMode.forceEnable(true);
    DevMode.init({
      onTeleport: (pt) => devTeleportFromScreen(pt.x, pt.y),
    });
    HUB.ok("DEV MODE ON (buttons + movement)");
    btn.remove();
  };

  document.body.appendChild(btn);
}

// dev teleport raycast
function devTeleportFromScreen(x, y) {
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

  if (worldData?.bounds) {
    p.x = Math.max(worldData.bounds.min.x, Math.min(worldData.bounds.max.x, p.x));
    p.z = Math.max(worldData.bounds.min.z, Math.min(worldData.bounds.max.z, p.z));
  }

  playerGroup.position.x = p.x;
  playerGroup.position.z = p.z;
  HUB.ok(`Dev teleport -> (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
}

// Add the Android dev button anytime we are NOT presenting XR
addDevButton();

// ---------------- VRRig (Quest laser/ring) ----------------
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

    VRRig.setHeightLock(true, 1.80);
    VRRig.create(renderer, scene, camera, playerGroup, HUB);
    rigReady = true;
    HUB.ok("VRRig created");
  }
} catch (e) {
  HUB.warn("VRRig failed: " + (e?.message || e));
}

// ---------------- Dev movement application ----------------
function applyDevMovement(dt) {
  const axes = DevMode.getAxes();
  const moveSpeed = 3.2;
  const turnSpeed = 1.8;

  playerGroup.rotation.y -= axes.turnX * turnSpeed * dt;

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);

  const v = new THREE.Vector3();
  v.addScaledVector(forward, axes.moveY * moveSpeed * dt);
  v.addScaledVector(right, axes.moveX * moveSpeed * dt);

  playerGroup.position.add(v);

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

// ---------------- Loop ----------------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (rigReady) {
    try { VRRig.update(renderer); } catch {}
  }

  // DEV MODE active only when not in XR
  if (DevMode.enabled() && !renderer.xr.isPresenting) {
    applyDevMovement(dt);
  }

  renderer.render(scene, camera);
});

HUB.ok("Boot complete");
