// js/main.js — VIP Room Core boot (stable + GitHub safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setScene, setCamera, setPlayerRig } from "./state.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

let renderer, scene, camera, rig, clock;

function ensureApp() {
  let el = document.getElementById("app");
  if (!el) {
    el = document.createElement("div");
    el.id = "app";
    document.body.appendChild(el);
  }
  return el;
}

export async function boot() {
  if (window.__VIP_CORE_BOOTED__) return;
  window.__VIP_CORE_BOOTED__ = true;

  const app = ensureApp();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  scene = new THREE.Scene();
  setScene(scene);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  setCamera(camera);

  rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);
  setPlayerRig(rig);

  World.build(scene, rig);

  Controls.init(renderer, camera, rig);

  clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    Controls.update(dt);
    renderer.render(scene, camera);
  });
}

// Auto-run
boot().catch((e) => {
  console.error("boot failed:", e);
  throw e;
});
