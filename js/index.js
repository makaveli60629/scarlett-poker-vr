// /js/index.js
// SCARLETT VR POKER — MASTER INDEX
// BUILD: INDEX_FULL_v15_4
// GUARANTEED WORLD BOOT

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { buildWorld } from "./world.js";

const BUILD = "INDEX_FULL_v15_4";
const log = (...a) => console.log("[index]", ...a);

log("BUILD=", BUILD);

/* -------------------------------------------------
   CONTEXT
------------------------------------------------- */
const ctx = {
  world: null,
  hasWorld: false
};

/* -------------------------------------------------
   BASIC ENV LOG
------------------------------------------------- */
log("href=", location.href);
log("secureContext=", window.isSecureContext);
log("ua=", navigator.userAgent);
log("navigator.xr=", !!navigator.xr);

/* -------------------------------------------------
   THREE CORE
------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  200
);

/* -------------------------------------------------
   PLAYER RIG
------------------------------------------------- */
const rig = new THREE.Group();
rig.position.set(0, 1.6, 2);
rig.add(camera);
scene.add(rig);

/* -------------------------------------------------
   VR BUTTON
------------------------------------------------- */
if (navigator.xr) {
  document.body.appendChild(VRButton.createButton(renderer));
  log("VRButton added ✅");
}

/* -------------------------------------------------
   WORLD BUILD (CRITICAL)
------------------------------------------------- */
try {
  ctx.world = buildWorld({
    scene,
    camera,
    rig,
    log
  });

  ctx.hasWorld = true;
  log("world built ✅");

} catch (e) {
  console.error("WORLD BUILD FAILED ❌", e);
  ctx.hasWorld = false;
}

/* -------------------------------------------------
   DIAGNOSTICS (THIS IS WHAT YOU KEEP POSTING)
------------------------------------------------- */
log(
  "isXR=" + renderer.xr.isPresenting,
  "sceneChildren=" + scene.children.length,
  "hasWorld=" + ctx.hasWorld,
  "rig=" + rig.position.toArray()
);

/* -------------------------------------------------
   RESIZE
------------------------------------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* -------------------------------------------------
   RENDER LOOP
------------------------------------------------- */
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
