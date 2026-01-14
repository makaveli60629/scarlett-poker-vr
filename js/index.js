// /js/index.js
// SCARLETT VR POKER — PERMANENT SPINE
// BUILD: INDEX_FULL_v16_0
// DO NOT REWRITE — ONLY EXTEND

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { VRButton } from "./VRButton.js";
import { buildWorld } from "./world.js";

/* =================================================
   LOGGING
================================================= */
const BUILD = "INDEX_FULL_v16_0";
const log = (...a) => console.log("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

log("BUILD=", BUILD);
log("href=", location.href);
log("secureContext=", window.isSecureContext);
log("ua=", navigator.userAgent);
log("navigator.xr=", !!navigator.xr);

/* =================================================
   STATE
================================================= */
const state = {
  xr: false,
  uiVisible: true,
  move: { fwd: 0, turn: 0 },
  fps: 0
};

/* =================================================
   RENDERER
================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

/* =================================================
   SCENE / CAMERA / RIG
================================================= */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 500);

const rig = new THREE.Group();
rig.position.set(0, 1.6, 2);
rig.add(camera);
scene.add(rig);

/* =================================================
   VR BUTTON
================================================= */
if (navigator.xr) {
  document.body.appendChild(VRButton.createButton(renderer));
}

/* =================================================
   WORLD (LOCKED)
================================================= */
let world = null;
try {
  world = buildWorld({ scene, camera, rig, log });
  log("world built ✅");
} catch (e) {
  err("WORLD BUILD FAILED ❌", e);
}

/* =================================================
   CONTROLLERS (QUEST / OCULUS)
================================================= */
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  const g = renderer.xr.getControllerGrip(i);

  g.add(controllerModelFactory.createControllerModel(g));
  scene.add(g);
  scene.add(c);

  // Laser
  const laserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -10)
  ]);
  const laserMat = new THREE.LineBasicMaterial({
    color: i === 0 ? 0xff00ff : 0x00ffff
  });
  const laser = new THREE.Line(laserGeo, laserMat);
  c.add(laser);

  controllers.push({ c, g, laser });
}

/* =================================================
   XR INPUT (JOYSTICKS)
================================================= */
renderer.xr.addEventListener("sessionstart", () => {
  state.xr = true;
});

renderer.xr.addEventListener("sessionend", () => {
  state.xr = false;
});

function pollXRInput() {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const src of session.inputSources) {
    if (!src.gamepad) continue;
    const gp = src.gamepad;

    // Left stick forward/back
    if (gp.axes.length >= 2) {
      state.move.fwd = -gp.axes[1] * 0.05;
      state.move.turn = -gp.axes[0] * 0.03;
    }
  }
}

/* =================================================
   ANDROID TOUCH CONTROLS
================================================= */
let touchStart = null;

window.addEventListener("touchstart", e => {
  if (!state.uiVisible) return;
  touchStart = e.touches[0];
});

window.addEventListener("touchmove", e => {
  if (!touchStart || !state.uiVisible) return;
  const t = e.touches[0];
  const dy = t.clientY - touchStart.clientY;
  state.move.fwd = -dy * 0.002;
});

window.addEventListener("touchend", () => {
  touchStart = null;
  state.move.fwd = 0;
});

/* =================================================
   UI OVERLAY (DIAGNOSTICS + CONTROLS)
================================================= */
const ui = document.createElement("div");
ui.style.cssText = `
position:fixed;left:0;top:0;width:100%;
color:#0f0;background:rgba(0,0,0,0.6);
font:12px monospace;z-index:10;padding:6px;
`;
document.body.appendChild(ui);

const toggleBtn = document.createElement("button");
toggleBtn.textContent = "HIDE UI";
toggleBtn.onclick = () => {
  state.uiVisible = !state.uiVisible;
  ui.style.display = state.uiVisible ? "block" : "none";
};
ui.appendChild(toggleBtn);

const diag = document.createElement("pre");
ui.appendChild(diag);

/* =================================================
   LOOP
================================================= */
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  state.fps = Math.round(1000 / (now - last));
  last = now;

  pollXRInput();

  // Move forward
  if (state.move.fwd !== 0) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    rig.position.addScaledVector(dir, state.move.fwd);
  }

  // Turn
  if (state.move.turn !== 0) {
    rig.rotation.y += state.move.turn;
  }

  diag.textContent = `
BUILD: ${BUILD}
XR: ${state.xr}
FPS: ${state.fps}
Rig: ${rig.position.x.toFixed(2)}, ${rig.position.y.toFixed(2)}, ${rig.position.z.toFixed(2)}
Scene children: ${scene.children.length}
World: ${!!world}
  `.trim();

  renderer.render(scene, camera);
});

/* =================================================
   RESIZE
================================================= */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
