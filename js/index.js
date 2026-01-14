// /js/index.js — Quest-safe XR Entry v1 (FULL)
// ✅ No top-level await (GitHub Pages friendly)
// ✅ Three.js via jsDelivr (reliable on Quest)
// ✅ Always creates renderer + draws frames (prevents infinite "loading")
// ✅ Calls your existing controls.js + world.js (kept intact)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

let renderer, scene, camera, player;
let inited = false;

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

function showLoader(msg) {
  const loader = document.getElementById("loader");
  const hint = document.getElementById("loaderHint");
  if (loader) loader.style.display = "flex";
  if (hint && msg) hint.textContent = msg;
}

function makeRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
}

function makeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
}

function makeRig() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
  camera.position.set(0, 1.6, 2.5);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);
}

function installVRButton() {
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ✅");
  } catch (e) {
    warn("VRButton failed (non-fatal):", e?.message || e);
  }
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

async function init() {
  log("runtime start ✅");
  log(`href=${location.href}`);
  log(`ua=${navigator.userAgent}`);
  log(`navigator.xr=${!!navigator.xr}`);

  showLoader("Initializing renderer…");

  makeRenderer();
  makeScene();
  makeRig();
  installVRButton();

  // Always start rendering immediately so Quest doesn't look "stuck"
  renderer.setAnimationLoop(() => {
    try { Controls.update?.(0.016); } catch {}
    try { World.update?.(0.016); } catch {}
    renderer.render(scene, camera);
  });

  // Init Controls
  try {
    Controls.init({
      THREE, renderer, scene, camera, player,
      log: (...a) => console.log("[ctrl]", ...a),
      warn: (...a) => console.warn("[ctrl]", ...a),
      err: (...a) => console.error("[ctrl]", ...a)
    });
    log("Controls init ✅");
  } catch (e) {
    err("Controls init FAILED ❌", e);
    showLoader("Controls init failed ❌ (check BOOT log / console)");
    return; // stop here; movement/inputs are critical
  }

  // Init World
  showLoader("Loading world…");
  try {
    await World.init({
      THREE, scene, renderer, camera, player,
      controllers: Controls.getControllers?.() || null,
      log: (...a) => console.log("[world]", ...a),
      BUILD: "QUEST_SAFE"
    });
    log("World init ✅");
  } catch (e) {
    err("World init FAILED ❌", e);
    showLoader("World init failed ❌ (check BOOT log / console)");
    return;
  }

  inited = true;
  hideLoader();
  log("Init complete ✅");
}

init().catch((e) => {
  err("init fatal ❌", e);
  showLoader("Fatal init error ❌ (check BOOT log / console)");
});
