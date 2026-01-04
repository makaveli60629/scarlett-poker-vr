// ===============================
// Scarlett Poker VR - main.js
// GitHub Pages + Quest Browser SAFE
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";
import { initAudio } from "./audio.js";

// ---------- Debug Log ----------
const logEl = document.getElementById("log");
function log(msg) {
  console.log(msg);
  if (logEl) {
    logEl.textContent = (logEl.textContent + "\n" + msg).slice(-2000);
  }
}

// ---------- Globals ----------
let renderer, scene, camera, playerGroup;
let controls, ui, audio;

// ---------- Boot ----------
boot().catch(err => {
  console.error(err);
  log("FATAL ERROR: " + err.message);
});

async function boot() {
  log("Booting Scarlett Poker VR…");

  // ---------- Scene ----------
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // ---------- Camera + Player ----------
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    300
  );

  playerGroup = new THREE.Group();
  playerGroup.position.set(0, 0, 5);
  playerGroup.add(camera);
  scene.add(playerGroup);

  // ---------- Renderer ----------
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // ---------- Build World ----------
  World.build(scene, playerGroup);
  log("World loaded.");

  // ---------- Audio ----------
  audio = initAudio({
    url: "./assets/lobby_ambience.mp3",
    volume: 0.35
  });

  log("Audio ready (tap/click or trigger to start).");

  // Browser audio unlock
  const unlockAudio = async () => {
    const ok = await audio.enable();
    log(ok ? "Audio started." : "Audio blocked — try again.");
    if (ok) {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    }
  };

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });

  renderer.xr.addEventListener("sessionstart", () => {
    audio.enable().then(ok =>
      log(ok ? "Audio started in VR." : "Audio blocked in VR — pull trigger.")
    );
  });

  // ---------- UI ----------
  ui = initUI({
    scene,
    camera,
    renderer,
    world: World,
    playerGroup,
    audio
  });

  log("UI initialized.");

  // ---------- Controls ----------
  controls = initControls({
    renderer,
    scene,
    camera,
    playerGroup,
    world: World,
    ui,
    onTeleport: (label) => log("Teleported to: " + label)
  });

  log("Controls initialized.");

  // ---------- VR Button ----------
  document.body.appendChild(VRButton.createButton(renderer));
  log("VR Button added.");

  // ---------- Resize ----------
  window.addEventListener("resize", onResize);
  onResize();

  // ---------- Render Loop ----------
  renderer.setAnimationLoop(() => {
    try {
      controls?.update?.();
      ui?.update?.();
      renderer.render(scene, camera);
    } catch (e) {
      console.error(e);
      log("Render error: " + e.message);
    }
  });

  log("Scarlett Poker VR running.");
}

// ---------- Resize ----------
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
