// js/main.js — VIP Room Core Boot (exports boot())

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { setCamera } from "./state.js";

let renderer, scene, camera, playerGroup, clock;

function getAppRoot() {
  return document.getElementById("app") || document.body;
}

export async function boot() {
  // Scene
  scene = new THREE.Scene();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.xr.enabled = true;

  getAppRoot().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Player rig
  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerGroup";
  scene.add(playerGroup);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 120);
  camera.position.set(0, 1.6, 0);
  playerGroup.add(camera);
  setCamera(camera);

  // Build world (spawns playerGroup safely)
  World.build(scene, playerGroup);

  // Controls
  Controls.init(renderer, camera, playerGroup, scene);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Loop
  clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    Controls.update(dt);
    renderer.render(scene, camera);
  });

  return true;
    }
