// js/main.js — Scarlett Poker VR — Clean boot using VRRig (permanent)

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
hub("Booting…");

// Core
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
hub("✅ VRButton added");

// Player rig
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Spawn safe
player.position.set(0, 0, 10);

// Lights (never black)
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));

const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(10, 18, 8);
scene.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.4, 70);
camera.add(headlamp);

// Simple world base (you can swap back to your full world.js later)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d2f35, roughness: 0.98, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x1b2636);
grid.position.y = 0.02;
scene.add(grid);

// Table marker
const tableMarker = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 0.10, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9 })
);
tableMarker.position.set(0, 0.95, 0);
scene.add(tableMarker);

hub("✅ World base ready");

// VR Rig (this is now your permanent controller system)
const rig = VRRig.create({ renderer, scene, camera, player, hub });

// Room bounds (match your 34x34-ish room)
rig.setBounds({ minX: -15.5, maxX: 15.5, minZ: -15.5, maxZ: 15.5 });

// Height lock: keep you tall even sitting.
// If you like your current height, keep it. If you want taller, change to 1.82–1.90.
rig.setHeightLock(1.80, true);

hub("✅ VRRig online");

// Loop
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
