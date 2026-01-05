// js/main.js — VIP Room Core Boot (exports boot())

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls, CONTROLS_VERSION } from "./controls.js";
import { setCamera } from "./state.js";

let renderer, scene, camera, playerGroup, clock;

function getAppRoot() {
  return document.getElementById("app") || document.body;
}

function hudLog(line) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent = (el.textContent ? el.textContent + "\n" : "") + line;
}

export async function boot() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.xr.enabled = true;

  getAppRoot().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerGroup";
  scene.add(playerGroup);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 140);
  camera.position.set(0, 1.6, 0);
  playerGroup.add(camera);
  setCamera(camera);

  World.build(scene, playerGroup);

  Controls.init(renderer, camera, playerGroup);

  hudLog("✅ " + CONTROLS_VERSION + " loaded");
  hudLog("Tip: Quest = Enter VR then Left stick move, Right stick snap turn.");
  hudLog("Tip: Phone = touch + drag to move.");

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    Controls.update(dt);
    renderer.render(scene, camera);
  });

  return true;
}
