// /js/index.js — Scarlett Quest-Stable Entry (FULL) v12.0
// ✅ Three.js via CDN (GitHub Pages safe)
// ✅ Uses your Controls.js + World.js
// ✅ Real dt (no fixed 0.016)
// ✅ Strong diagnostics + never “silent hang”
// ✅ Works on Quest + Android + Desktop

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

log("runtime start ✅");
log(`href=${location.href}`);
log(`secureContext=${window.isSecureContext}`);
log(`ua=${navigator.userAgent}`);
log(`navigator.xr=${!!navigator.xr}`);

let renderer, scene, camera, player;

function hideLoader() {
  const el = document.getElementById("loader");
  if (el) el.style.display = "none";
}
function showLoader(msg) {
  const el = document.getElementById("loader");
  const hint = document.getElementById("loaderHint");
  if (el) el.style.display = "flex";
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
  log("renderer ✅");
}

function makeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  log("scene ✅");
}

function makeRig() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 2.5);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  log("PlayerRig ✅");
}

function installVRButton() {
  try {
    document.body.appendChild(
      VRButton.createButton(renderer, {
        optionalFeatures: [
          "local-floor",
          "bounded-floor",
          "local",
          "viewer",
          "hand-tracking",
          "layers",
          "dom-overlay",
          "anchors",
          "hit-test",
          "plane-detection",
          "mesh-detection",
          "light-estimation"
        ],
        domOverlay: { root: document.body }
      })
    );
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

function installGlobalErrorHooks() {
  window.addEventListener("error", (e) => {
    err("window.error ❌", e?.message || e);
    showLoader("Error ❌ (see console / BOOT log)");
  });
  window.addEventListener("unhandledrejection", (e) => {
    err("unhandledrejection ❌", e?.reason?.message || e?.reason || e);
    showLoader("Promise error ❌ (see console / BOOT log)");
  });
}

async function init() {
  installGlobalErrorHooks();
  showLoader("Initializing…");

  makeRenderer();
  makeScene();
  makeRig();
  installVRButton();

  // Start rendering immediately so Quest never looks “stuck”
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - (renderer.__lastT || t)) / 1000);
    renderer.__lastT = t;

    try { Controls.update?.(dt); } catch (e) { /* keep loop alive */ }
    try { World.update?.(dt, t); } catch (e) { /* keep loop alive */ }

    renderer.render(scene, camera);
  });

  // Controls
  showLoader("Loading controls…");
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
    showLoader("Controls failed ❌ (see console / BOOT log)");
    return;
  }

  // World
  showLoader("Loading world…");
  try {
    await World.init({
      THREE, scene, renderer, camera, player,
      controllers: Controls.getControllers?.() || null,
      log: (...a) => console.log("[world]", ...a)
    });
    log("World init ✅");
  } catch (e) {
    err("World init FAILED ❌", e);
    showLoader("World failed ❌ (see console / BOOT log)");
    return;
  }

  hideLoader();
  log("Init complete ✅");
}

init().catch((e) => {
  err("init fatal ❌", e);
  showLoader("Fatal init error ❌ (see console / BOOT log)");
});
```0
