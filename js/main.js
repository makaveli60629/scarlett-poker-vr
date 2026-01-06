// /js/main.js — Scarlett Poker VR — Full Stable Boot (World + Controllers + Movement)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

const overlay = document.getElementById("overlay");
const setText = (t) => { if (overlay) overlay.textContent = t; };

setText("Scarlett Poker VR — booting…");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 2, 70);

const player = new THREE.Group();
scene.add(player);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
camera.position.set(0, 1.65, 3);
player.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Build world
let colliders = [];
let bounds = null;

try {
  setText("Scarlett Poker VR — building world…");
  const out = World.build(scene, player) || {};
  colliders = Array.isArray(out.colliders) ? out.colliders : [];
  bounds = out.bounds || null;

  if (out.spawn?.isVector3) player.position.copy(out.spawn);
  player.rotation.y = 0; // face forward

  setText("Scarlett Poker VR — world ready ✅");
} catch (e) {
  console.warn("World build failed:", e);
  setText("Scarlett Poker VR — world failed (baseline running)");
}

// --- Controller visuals (so you can SEE controllers) ---
function addControllerModel(ctrl, colorHex) {
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.10, 10),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.1 })
  );
  grip.rotation.x = Math.PI / 2;
  ctrl.add(grip);

  const ray = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-2)]),
    new THREE.LineBasicMaterial({ color: colorHex })
  );
  ray.name = "ray";
  ray.visible = true;
  ctrl.add(ray);
}

const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
player.add(c0);
player.add(c1);
addControllerModel(c0, 0x2bd7ff);
addControllerModel(c1, 0xff2bd6);

// Controls init (movement + teleport + snap turn)
try {
  Controls.init({
    renderer,
    camera,
    player,
    colliders,
    bounds,
    controllers: { c0, c1 }
  });
} catch (e) {
  console.warn("Controls init failed:", e);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((t) => {
  Controls.update(1/90); // simple fixed dt (stable on Quest)
  renderer.render(scene, camera);
});

setTimeout(() => setText("✅ Loaded — press Enter VR"), 200);
