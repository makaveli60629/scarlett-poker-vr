// ===============================
// Skylark Poker VR — main.js (6.2 STABLE)
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

// Core systems
import { State } from "./state.js";
import { Controls } from "./controls.js";
import { Interactions } from "./interactions.js";
import { RoomManager } from "./room_manager.js";
import { TeleportMachine } from "./teleport_machine.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { BossBots } from "./boss_bots.js";

// ===============================
// SPAWN SAFETY (FIXES YOUR ERROR)
// ===============================
let spawnGuardTime = 0;
const SPAWN_GUARD_DELAY = 1200; // ms

// ===============================
// THREE CORE
// ===============================
let scene, camera, renderer;
let playerRig;

// ===============================
// INIT
// ===============================
init();
animate();

// ===============================
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    100
  );

  // Player Rig
  playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Lighting (BASE)
  addLighting();

  // Systems
  Controls.init(renderer, camera, playerRig);
  Interactions.init(renderer, scene, camera);
  UI.init(scene, camera);
  Audio.init(scene);

  // Rooms & Teleport
  RoomManager.init(scene);
  TeleportMachine.init(scene, playerRig);

  // Boss Bots (visual only table)
  BossBots.init(scene);

  // SAFE SPAWN
  forceSafeSpawn();

  window.addEventListener("resize", onWindowResize);
}

// ===============================
// SAFE SPAWN — TELEPORT PAD ONLY
// ===============================
function forceSafeSpawn() {
  const now = performance.now();
  if (now - spawnGuardTime < SPAWN_GUARD_DELAY) return;
  spawnGuardTime = now;

  const spawn = TeleportMachine.getSafeSpawn();
  if (!spawn) {
    console.warn("⚠ No teleport pad found — using fallback");
    playerRig.position.set(0, 0, 4);
    return;
  }

  playerRig.position.copy(spawn.position);
  playerRig.rotation.y = spawn.rotationY || 0;
}

// ===============================
// LIGHTING
// ===============================
function addLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const main = new THREE.DirectionalLight(0xffffff, 0.9);
  main.position.set(5, 10, 5);
  scene.add(main);

  // Edge glow effect (subtle)
  const glow = new THREE.PointLight(0x00ffaa, 0.4, 20);
  glow.position.set(0, 3, 0);
  scene.add(glow);
}

// ===============================
// ANIMATE
// ===============================
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  Controls.update();
  Interactions.update();
  renderer.render(scene, camera);
}

// ===============================
// RESIZE
// ===============================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
