// Quest-friendly CDN (more reliable than unpkg in headset)
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
    log("Booting…");
    log(`UA: ${navigator.userAgent}`);

    // Quick WebGL capability check
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2", { antialias: true }) ||
      testCanvas.getContext("webgl", { antialias: true });

    if (!gl) {
      log("WEBGL CONTEXT FAILED: getContext(webgl/webgl2) returned null.");
      showFallback();
      return;
    }
    log(`WebGL OK: ${gl.getParameter(gl.VERSION)}`);

    initThree();
    animate();

    // After renderer is attached, confirm canvas exists & has size
    setTimeout(() => {
      const c = renderer?.domElement;
      if (!c) {
        log("Renderer canvas missing (renderer.domElement not present).");
        showFallback();
        return;
      }
      const rect = c.getBoundingClientRect();
      log(`Canvas size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);

      // If canvas is zero-sized, CSS/layout is hiding it
      if (rect.width < 10 || rect.height < 10) {
        log("Canvas is effectively hidden (near-zero size). CSS/layout issue.");
        showFallback();
      }
    }, 600);
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
  camera.position.set(0, 1.6, 3);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // safer on Quest
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  log("Renderer attached.");

  // Strong lights so “black due to lighting” can’t happen
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(6, 10, 6);
  scene.add(sun);

  // Always-visible debug objects
  const grid = new THREE.GridHelper(30, 30);
  scene.add(grid);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x00ff99 })
  );
  cube.position.set(0, 1.4, -2);
  scene.add(cube);

  // Player group
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Build world (your rooms/pads/store)
  World.build(scene, playerGroup);
  log("World.build OK.");

  // UI + controls
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });
  controls = initControls({ renderer, scene, playerGroup, world: World });
  log("UI/Controls OK.");

  // VR Button
  try {
    const vrBtn = VRButton.createButton(renderer);
    vrBtn.style.position = "fixed";
    vrBtn.style.bottom = "16px";
    vrBtn.style.right = "16px";
    vrBtn.style.zIndex = "99999";
    vrBtn.style.transform = "scale(1.15)";
    document.body.appendChild(vrBtn);
    log("VRButton added (click ENTER VR in headset).");
  } catch (e) {
    log(`VRButton failed (non-fatal): ${e?.message || e}`);
  }

  window.addEventListener("resize", onResize);
}

function animate() {
  renderer.setAnimationLoop(() => {
    try {
      controls?.update();
      ui?.update();
      renderer.render(scene, camera);
    } catch (err) {
      log(`RENDER ERROR: ${err?.message || err}`);
      showFallback();
      renderer.setAnimationLoop(null);
    }
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  log("Resized.");
}
