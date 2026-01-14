// /js/index.js — Scarlett XR Entry (FULL, stable)
// ✅ Uses CDN Three.js (fixes ./three.module.js 404)
// ✅ Imports World + VRButton + optional build.js
// ✅ Imports Controls from ./controls.js (fixes control.js 404)
// ✅ Clean XR loop + diagnostics

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

// Optional build info (safe if missing)
let BUILD = "DEV";
try {
  const mod = await import("./build.js");
  BUILD = mod?.BUILD || mod?.default?.BUILD || mod?.default || BUILD;
} catch (e) {
  // ok
}

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

log(`runtime start ✅ build=${BUILD}`);
log(`href=${location.href}`);
log(`secureContext=${window.isSecureContext}`);
log(`ua=${navigator.userAgent}`);
log(`navigator.xr=${!!navigator.xr}`);

let renderer, scene, camera;
let player;
let controllers = null;

function makeRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  log("three init ✅");
}

function makeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
}

function makeCameraRig() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.6, 2.5);

  // Player rig so we can move whole world-relative
  player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 0);
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
    log("VRButton appended ✅");
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
  makeRenderer();
  makeScene();
  makeCameraRig();
  installVRButton();

  // Controls (movement + turn)
  try {
    Controls.init({
      THREE,
      renderer,
      scene,
      camera,
      player,
      log: (...a) => console.log("[ctrl]", ...a),
      warn: (...a) => console.warn("[ctrl]", ...a),
      err: (...a) => console.error("[ctrl]", ...a)
    });
    log("Controls init ✅");
  } catch (e) {
    err("Controls init FAILED ❌", e);
  }

  // World
  try {
    controllers = Controls.getControllers?.() || null;
    await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: (...a) => console.log("[world]", ...a),
      BUILD
    });
    log("World init ✅");
  } catch (e) {
    err("World init FAILED ❌", e);
  }

  // Animation loop
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - (renderer.__lastT || t)) / 1000);
    renderer.__lastT = t;

    try {
      Controls.update?.(dt);
    } catch (e) {
      // keep running
    }

    try {
      World.update?.(dt);
    } catch (e) {
      // keep running
    }

    renderer.render(scene, camera);
  });

  log("XR loop ✅");
}

init().catch((e) => err("init fatal ❌", e));
