// /js/index.js — Scarlett SAFE ENTRY (UPLOAD-PROOF)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

const log = (...a) => console.log("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

let renderer, scene, camera, player;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.6, 2);

  player = new THREE.Group();
  player.add(camera);
  scene.add(player);

  Controls.init({ THREE, renderer, scene, camera, player, log });

  World.init({ THREE, scene, renderer, camera, player, log });

  let last = 0;
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    Controls.update?.(dt);
    World.update?.(dt, t);

    renderer.render(scene, camera);
  });

  log("INIT OK ✅");
}

try {
  init();
} catch (e) {
  err("INIT FAILED ❌", e);
}
