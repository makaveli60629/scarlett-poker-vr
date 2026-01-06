// /js/main.js — Scarlett Poker VR — Boot (CDN-only)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { PokerSimulation } from "./poker_simulation.js";

// overlay exists in index.html
const overlay = document.getElementById("overlay");
const setText = (t) => { if (overlay) overlay.textContent = t; };

setText("Scarlett Poker VR — loading scene…");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 2, 60);

const player = new THREE.Group();
scene.add(player);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, 3);
player.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.1));

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Build world + controls safely
let colliders = [];
try {
  const out = World.build(scene, player) || {};
  colliders = Array.isArray(out.colliders) ? out.colliders : [];
  if (out.spawn?.isVector3) player.position.copy(out.spawn);
  setText("Scarlett Poker VR — world loaded ✅");
} catch (e) {
  console.warn("World build failed:", e);
  setText("Scarlett Poker VR — world failed (baseline running)");
}

try {
  Controls.init({ renderer, camera, player, colliders });
} catch (e) {
  console.warn("Controls init failed:", e);
}

try {
  PokerSimulation.build({ players: [], bots: [] });
} catch (e) {
  console.warn("PokerSimulation skipped:", e);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
setTimeout(() => setText("✅ Loaded — press Enter VR"), 200);
