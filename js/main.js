// /js/main.js — DIAGNOSTIC BOOT (FULL)
// Goal: guarantee we see a 3D cube + debug logs + VRButton.
// If world.js fails, we still render and show the error.

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { initWorld } from "./world.js";

const debugEl = document.getElementById("debug");
const log = (m) => {
  console.log(m);
  if (debugEl) debugEl.textContent = (debugEl.textContent ? debugEl.textContent + "\n" : "") + m;
};

window.addEventListener("error", (e) => log("❌ JS Error: " + (e?.message || e)));
window.addEventListener("unhandledrejection", (e) => log("❌ Promise: " + (e?.reason?.message || e?.reason || e)));

log("[main] boot");

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  log("[main] renderer ok");

  // VR Button
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  log("[main] VRButton appended");

  // Force VR button top
  forceVRButtonOnTop();

  // Scene/camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);
  scene.add(camera);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // ✅ ALWAYS VISIBLE TEST OBJECT
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x66ffcc, roughness: 0.4 })
  );
  cube.position.set(0, 1.5, 0);
  scene.add(cube);
  log("[main] test cube added ✅");

  // Try world init (but don't crash if it fails)
  try {
    world = await initWorld({ THREE, scene, log });
    log("[main] world init ✅");
  } catch (e) {
    log("❌ world init failed: " + (e?.message || e));
  }

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    cube.rotation.y += dt * 0.8;
    cube.rotation.x += dt * 0.4;

    if (world?.tick) world.tick(dt);
    renderer.render(scene, camera);
  });

  // Confirm VRButton existence
  setTimeout(() => {
    const vr = document.getElementById("VRButton");
    log(vr ? "✅ VRButton exists in DOM" : "❌ VRButton NOT found in DOM");
  }, 800);

  log("[main] ready");
}

function forceVRButtonOnTop() {
  const style = document.createElement("style");
  style.textContent = `
    #VRButton, .vr-button, body > button {
      position: fixed !important;
      right: 12px !important;
      bottom: 12px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);

  const keepOnTop = () => {
    const btn = document.getElementById("VRButton") || document.querySelector(".vr-button") || document.querySelector("body > button");
    if (!btn) return;
    if (btn.parentElement !== document.body || document.body.lastElementChild !== btn) {
      document.body.appendChild(btn);
    }
  };

  keepOnTop();
  setInterval(keepOnTop, 500);
}
