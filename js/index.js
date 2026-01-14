import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { Controls } from "./core/controls.js";
import { World } from "./js/world.js";

const S = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
  renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }),
  player: new THREE.Group(),
  clock: new THREE.Clock()
};

async function init() {
  S.renderer.setPixelRatio(window.devicePixelRatio);
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.xr.enabled = true;
  
  // Set a background color so "Black" isn't the default (fixes black screen confusion)
  S.scene.background = new THREE.Color(0x0a1020); 
  document.body.appendChild(S.renderer.domElement);
  document.body.appendChild(VRButton.createButton(S.renderer));

  // Camera Rigging
  S.scene.add(S.player);
  S.player.add(S.camera);
  
  // Reset spawn point: Facing the table from a distance
  S.player.position.set(0, 1.6, 8); 

  // Lighting: Add immediately so the world isn't black
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  S.scene.add(ambient);

  // START RENDER LOOP FIRST (Critical for Quest Stability)
  S.renderer.setAnimationLoop(tick);

  // Initialize your modules
  try {
    Controls.init({ THREE, renderer: S.renderer, camera: S.camera, player: S.player, scene: S.scene });
    await World.init({ THREE, scene: S.scene, renderer: S.renderer, camera: S.camera, player: S.player });
  } catch (e) {
    console.error("Module Init Failed:", e);
  }

  // Vision Correction on Start
  S.renderer.xr.addEventListener('sessionstart', () => {
    setTimeout(() => { S.player.lookAt(0, 0, 0); }, 800);
  });
}

function tick() {
  const dt = S.clock.getDelta();
  if (Controls && Controls.update) Controls.update(dt);
  S.renderer.render(S.scene, S.camera);
}

init();
