// /index.js — ScarlettVR Ultimate Modular Boot
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./js/world.js";
import { Controls } from "./core/controls.js";

const S = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
  renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }),
  player: new THREE.Group(),
  clock: new THREE.Clock()
};

async function init() {
  // 1. Renderer Setup
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.setPixelRatio(window.devicePixelRatio);
  S.renderer.xr.enabled = true;
  document.body.appendChild(S.renderer.domElement);
  document.body.appendChild(VRButton.createButton(S.renderer));

  // 2. Rigging the Player
  S.scene.add(S.player);
  S.player.add(S.camera);
  
  // Set initial spawn behind the table
  S.player.position.set(0, 0, 7);

  // 3. Initialize Modules
  // We pass the core objects so modules can "attach" themselves
  await World.init({ THREE, scene: S.scene });
  Controls.init({ 
    renderer: S.renderer, 
    camera: S.camera, 
    player: S.player, 
    scene: S.scene 
  });

  // 4. VR Orientation Fix (The 180° Turn)
  S.renderer.xr.addEventListener('sessionstart', () => {
    console.log("XR Session Started: Calibrating Orientation...");
    // Forces the player to face (0,0,0) which is the table center
    S.player.position.set(0, 0, 7); 
    S.player.rotation.set(0, Math.PI, 0); // 180-degree flip
  });

  // 5. Immediate Render Loop
  S.renderer.setAnimationLoop(() => {
    const dt = S.clock.getDelta();
    const t = S.clock.getElapsedTime();

    // Update Movement & Snap-turning logic
    Controls.update(dt);
    
    // Update World animations (breathing bots, etc.)
    if (World.update) World.update(dt, t);

    S.renderer.render(S.scene, S.camera);
  });

  // Handle Window Resize
  window.addEventListener('resize', () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Kickstart the engine
init().catch(err => console.error("ScarlettVR Boot Error:", err));
