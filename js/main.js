// js/main.js — Skylark Poker VR 8.0 Core Boot (single-boot guard)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { State } from "./state.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";
import { XRLocomotion } from "./xr_locomotion.js";

let __booted = false;

export async function boot() {
  if (__booted) {
    console.warn("boot() already ran; skipping.");
    return;
  }
  __booted = true;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25; // brighter for Quest
  renderer.xr.enabled = true;

  // Mount
  const mount = document.getElementById("app") || document.body;
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene / Camera / Rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 120);
  const rig = new THREE.Group();
  rig.name = "player_rig";
  rig.add(camera);
  scene.add(rig);

  // Build world
  World.build(scene, rig);

  // Controls & locomotion
  Controls.init(renderer, scene, rig, camera);
  XRLocomotion.init(renderer, scene, rig, camera);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  let last = performance.now();
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    Controls.update(dt);
    XRLocomotion.update(dt);

    World.update(dt, camera);

    renderer.render(scene, camera);
  });

  State.set("boot_ok", true);
  console.log("Skylark Poker VR 8.0 boot finished.");
}
