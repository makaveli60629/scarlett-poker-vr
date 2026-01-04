import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";

const logEl = document.getElementById("log");
const fallbackEl = document.getElementById("fallback");
function log(msg) {
  if (!logEl) return;
  logEl.textContent += `\n${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}
function showFallback() {
  if (fallbackEl) fallbackEl.style.display = "grid";
}

window.addEventListener("error", (e) => {
  log(`ERROR: ${e.message}`);
  log(`AT: ${e.filename}:${e.lineno}:${e.colno}`);
  showFallback();
});
window.addEventListener("unhandledrejection", (e) => {
  log(`PROMISE REJECTION: ${e.reason?.message || e.reason || "unknown"}`);
  showFallback();
});

let scene, camera, renderer, playerGroup;
let controls, ui;

boot();

async function boot() {
  try {
    log("Loading…");
    log("Booting…");

    // WebGL test
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) {
      log("WEBGL CONTEXT FAILED.");
      showFallback();
      return;
    }
    log(`WebGL OK: ${gl.getParameter(gl.VERSION)}`);

    initThree();
    animate();

    setTimeout(() => {
      const rect = renderer.domElement.getBoundingClientRect();
      log(`Canvas size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }, 500);
  } catch (err) {
    log(`FATAL: ${err?.message || err}`);
    showFallback();
    console.error(err);
  }
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // safer for Quest/mobile
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  log("Renderer attached.");

  // Player rig
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Build your world
  World.build(scene, playerGroup);
  log("World.build OK.");

  // UI (includes wrist menu in VR + phone HUD)
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });
  log("UI OK.");

  // Controls (VR teleport + phone joystick/look)
  controls = initControls({
    renderer,
    scene,
    camera,
    playerGroup,
    world: World,
    ui,
    onTeleport: (where) => log(`Teleport: ${where}`)
  });
  log("Controls OK.");

  // VR Button
  try {
    const vrBtn = VRButton.createButton(renderer);
    vrBtn.style.position = "fixed";
    vrBtn.style.bottom = "16px";
    vrBtn.style.right = "16px";
    vrBtn.style.zIndex = "99999";
    document.body.appendChild(vrBtn);
    log("VRButton added (ENTER VR in headset).");
  } catch (e) {
    log(`VRButton failed (non-fatal): ${e?.message || e}`);
  }

  window.addEventListener("resize", onResize);
}

function animate() {
  renderer.setAnimationLoop(() => {
    controls?.update();
    ui?.update();
    renderer.render(scene, camera);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  log("Resized.");
}
