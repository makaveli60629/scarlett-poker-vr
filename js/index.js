// /js/index.js
// SCARLETT VR POKER — MASTER INDEX
// BUILD: INDEX_FULL_v15_5
// WORLD + MOVEMENT ENABLED

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { buildWorld } from "./world.js";

const BUILD = "INDEX_FULL_v15_5";
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
   ENV LOG
------------------------------------------------- */
log("href=", location.href);
log("secureContext=", window.isSecureContext);
log("ua=", navigator.userAgent);
log("navigator.xr=", !!navigator.xr);

/* -------------------------------------------------
   RENDERER
------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

/* -------------------------------------------------
   SCENE & CAMERA
------------------------------------------------- */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  200
);

/* -------------------------------------------------
   PLAYER RIG (DO NOT MOVE CAMERA DIRECTLY)
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
   BUILD WORLD (CRITICAL)
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
   DIAGNOSTICS
------------------------------------------------- */
log(
  "isXR=" + renderer.xr.isPresenting,
  "sceneChildren=" + scene.children.length,
  "hasWorld=" + ctx.hasWorld,
  "rig=" + rig.position.toArray()
);

/* -------------------------------------------------
   BASIC LOCOMOTION STATE
------------------------------------------------- */
const move = {
  forward: 0
};

/* -------------------------------------------------
   ANDROID TOUCH MOVE (DRAG UP/DOWN)
------------------------------------------------- */
let touchStartY = 0;

window.addEventListener("touchstart", e => {
  touchStartY = e.touches[0].clientY;
});

window.addEventListener("touchmove", e => {
  const dy = e.touches[0].clientY - touchStartY;
  move.forward = -dy * 0.002;
});

window.addEventListener("touchend", () => {
  move.forward = 0;
});

/* -------------------------------------------------
   RESIZE
------------------------------------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* -------------------------------------------------
   RENDER LOOP + MOVEMENT
------------------------------------------------- */
renderer.setAnimationLoop(() => {
  if (move.forward !== 0) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    rig.position.addScaledVector(dir, move.forward);
  }

  renderer.render(scene, camera);
});
