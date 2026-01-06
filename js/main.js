// js/main.js — Scarlett Poker VR — Permanent Boot (GitHub Pages safe)
// - Always shows VR button
// - Always builds visible world (so no black void)
// - Uses VRRig for movement + laser + teleport + height lock

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { VRRig } from "./vr_rig.js";

const hubEl = document.getElementById("hub");
const logs = [];
function hub(msg) {
  logs.push(msg);
  while (logs.length > 18) logs.shift();
  if (hubEl) hubEl.textContent = logs.join("\n");
  console.log(msg);
}
const ok = (m) => hub(`✅ ${m}`);
const warn = (m) => hub(`⚠️ ${m}`);

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

// Player rig
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Safe spawn (NOT center)
player.position.set(0, 0, 10);
player.rotation.y = Math.PI; // face toward the table area
ok("Spawn set");

// ---------- Lighting (prevents black VR) ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));

const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(10, 18, 8);
scene.add(sun);

// Headlamp attached to camera (helps in VR)
const headlamp = new THREE.PointLight(0xffffff, 2.8, 80);
camera.add(headlamp);
ok("Lights ready");

// ---------- World base (so you ALWAYS see something) ----------
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x2d2f35,
  roughness: 0.98,
  metalness: 0.0,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x1b2636);
grid.position.y = 0.02;
scene.add(grid);

// Simple table marker (visual target)
const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 0.18, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 })
);
tableTop.position.set(0, 0.95, 0);
scene.add(tableTop);

ok("World base ready");

// ---------- VR Rig (your permanent controller system) ----------
const rig = VRRig.create({ renderer, scene, camera, player, hub });

// Bounds (match your room)
rig.setBounds({ minX: -15.5, maxX: 15.5, minZ: -15.5, maxZ: 15.5 });

// Height lock (stable now)
// If you want taller later: set to 1.85 or 1.90
rig.setHeightLock(1.80, true);

ok("VRRig online");

// ---------- Optional: safely try to load your full world.js ----------
(async () => {
  try {
    const mod = await import("./world.js?v=1009");
    if (mod?.World?.build) {
      const res = mod.World.build(scene, player);

      if (res?.bounds) {
        rig.setBounds({
          minX: res.bounds.min.x,
          maxX: res.bounds.max.x,
          minZ: res.bounds.min.z,
          maxZ: res.bounds.max.z,
        });
        ok("World bounds applied");
      }

      if (res?.spawn) {
        player.position.x = res.spawn.x;
        player.position.z = res.spawn.z;
        ok("Spawn moved to world spawn");
      }

      ok("world.js loaded");
    } else {
      warn("world.js missing World.build — skipped");
    }
  } catch (e) {
    warn("world.js failed — using base world");
    console.warn(e);
  }
})();

// ---------- Loop ----------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  rig.update(dt);
  renderer.render(scene, camera);
});

// Resize
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
