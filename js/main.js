// js/main.js — VIP Room Core Boot
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

let renderer, scene, camera;
let playerGroup;
let clock;

export async function boot() {
  // Scene
  scene = new THREE.Scene();

  // Camera + player rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 120);
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;

  document.getElementById("app")?.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Build world
  World.build(scene, playerGroup);

  // Controls
  Controls.init({ renderer, camera, playerGroup });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Loop
  clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);

    Controls.update(dt);
    World.update?.(dt, playerGroup);

    renderer.render(scene, camera);
  });
}
