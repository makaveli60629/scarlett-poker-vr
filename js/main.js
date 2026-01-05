// js/main.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera } from "./state.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

// ---- SINGLETON BOOT GUARD (prevents double-boot on Quest/WebXR) ----
if (!window.__SKYLARK__) window.__SKYLARK__ = {};
const S = window.__SKYLARK__;

export async function boot() {
  // If boot is already running or finished, return the same promise
  if (S.bootPromise) return S.bootPromise;

  S.bootPromise = (async () => {
    // If we already created renderer in a prior boot, bail
    if (S.renderer) return;

    const app = document.getElementById("app") || document.body;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    // Camera + Player rig
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    setCamera(camera);

    const player = new THREE.Group();
    player.name = "playerRig";
    player.position.set(0, 0, 0);
    player.add(camera);
    scene.add(player);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // BRIGHTER (helps Quest)
    renderer.toneMappingExposure = 1.35;

    renderer.xr.enabled = true;

    // Save singletons so we don't recreate them
    S.scene = scene;
    S.camera = camera;
    S.player = player;
    S.renderer = renderer;

    app.appendChild(renderer.domElement);

    // Add VR button ONCE
    if (!S.vrButtonAdded) {
      document.body.appendChild(VRButton.createButton(renderer));
      S.vrButtonAdded = true;
    }

    // Build world ONCE
    World.build(scene, player);

    // Controls ONCE
    Controls.init({ renderer, scene, camera, player });

    // Resize
    if (!S.resizeHooked) {
      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
      S.resizeHooked = true;
    }

    // Animation loop ONCE
    if (!S.loopStarted) {
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.033);
        Controls.update(dt);
        World.update(dt, camera, player);
        renderer.render(scene, camera);
      });
      S.loopStarted = true;
    }

    console.log("boot() finished");
  })();

  return S.bootPromise;
}
