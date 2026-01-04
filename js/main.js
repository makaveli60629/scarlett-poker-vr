import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";
import { initAudio } from "./audio.js"; // ✅ NEW

const logEl = document.getElementById("log");
function log(msg) {
  console.log(msg);
  if (!logEl) return;
  logEl.textContent = (logEl.textContent + "\n" + msg).slice(-2000);
}

let renderer, scene, camera, playerGroup, controls, ui, audio;

boot().catch((e) => {
  console.error(e);
  log("FATAL: " + (e?.message || e));
});

async function boot() {
  log("Booting…");

  // ---------- Scene ----------
  scene = new THREE.Scene();

  // ---------- Camera + player group ----------
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // ---------- Renderer ----------
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Base light (world adds more)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.65));

  // ---------- Build world ----------
  World.build(scene, playerGroup);
  log("World.build OK.");

  // ---------- UI ----------
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });
  log("UI OK.");

  // ---------- Controls ----------
  controls = initControls({
    renderer,
    scene,
    camera,
    playerGroup,
    world: World,
    ui,
    onTeleport: (where) => log("Teleport: " + where)
  });
  log("Controls OK.");

  // ---------- VR Button ----------
  document.body.appendChild(VRButton.createButton(renderer));
  log("VRButton added.");

  // =========================================================
  // ✅ BACKGROUND MUSIC (YOUR FILE: assets/lobby_ambience.mp3)
  // =========================================================
  audio = initAudio({
    url: "./assets/lobby_ambience.mp3",
    volume: 0.35,
    loop: true
  });
  log("Audio ready — tap/click once to start (browser rule).");

  // Browsers require a user gesture to start audio:
  const tryEnableAudio = async () => {
    const ok = await audio.enable();
    log(ok ? "Audio started." : "Audio blocked — tap again.");
    if (ok) {
      window.removeEventListener("pointerdown", tryEnableAudio);
      window.removeEventListener("touchstart", tryEnableAudio);
    }
  };

  window.addEventListener("pointerdown", tryEnableAudio, { passive: true });
  window.addEventListener("touchstart", tryEnableAudio, { passive: true });

  // Quest: entering VR often counts as a gesture; try again on XR start
  renderer.xr.addEventListener("sessionstart", () => {
    audio.enable().then((ok) => log(ok ? "Audio started in VR." : "Audio blocked in VR — pull trigger once."));
  });

  // ---------- Resize ----------
  window.addEventListener("resize", onResize);
  onResize();

  // ---------- Render loop ----------
  renderer.setAnimationLoop(() => {
    try {
      controls?.update?.();
      ui?.update?.();
      renderer.render(scene, camera);
    } catch (e) {
      console.error(e);
      log("Loop error: " + (e?.message || e));
    }
  });

  log("Running.");
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  log(`Resized ${w}x${h}`);
}
