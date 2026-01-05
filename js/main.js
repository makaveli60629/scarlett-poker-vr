// js/main.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera } from "./state.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

let renderer, scene, camera, player;
let clock;

export async function boot() {
  const app = document.getElementById("app") || document.body;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + Player rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  setCamera(camera);

  player = new THREE.Group();
  player.name = "playerRig";
  player.position.set(0, 0, 0);
  player.add(camera);
  scene.add(player);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 1.0;
  renderer.xr.enabled = true;

  app.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Build world
  World.build(scene, player);

  // Controls (VR + Desktop fallback)
  Controls.init({ renderer, scene, camera, player });

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
    World.update(dt, camera, player);
    renderer.render(scene, camera);
  });

  console.log("boot() finished");
}

// Auto-boot if imported without calling boot()
boot().catch((e) => console.error(e));
