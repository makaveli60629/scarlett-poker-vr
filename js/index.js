// /js/index.js — Scarlett XR Entry (SAFE for GitHub Pages)
// CDN Three.js + Controls + World
// No top-level await (GitHub Pages friendly)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

log("runtime start");
log(`href=${location.href}`);
log(`secureContext=${window.isSecureContext}`);
log(`ua=${navigator.userAgent}`);
log(`navigator.xr=${!!navigator.xr}`);

let renderer, scene, camera;
let player;
let controllers = null;

function makeRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
}

function makeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
}

function makeCameraRig() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.6, 2.5);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);
}

function installVRButton() {
  try {
    document.body.appendChild(VRButton.createButton(renderer));
  } catch (e) {
    warn("VRButton failed:", e);
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

async function init() {
  makeRenderer();
  makeScene();
  makeCameraRig();
  installVRButton();

  Controls.init({
    THREE,
    renderer,
    scene,
    camera,
    player,
    log: (...a) => console.log("[ctrl]", ...a)
  });

  controllers = Controls.getControllers?.() || null;

  await World.init({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers,
    log: (...a) => console.log("[world]", ...a)
  });

  renderer.setAnimationLoop((t) => {
    Controls.update?.(0.016);
    World.update?.(0.016);
    renderer.render(scene, camera);
  });

  log("XR running ✅");
}

init().catch((e) => err("init failed ❌", e));
