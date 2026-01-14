// /js/index.js — Scarlett VR Poker Boot (FULL) — Quest Cache-Bust + Build Overlay
import * as THREE from "./three.module.js";

// ✅ Cache-bust EVERYTHING that matters on Quest:
import { BUILD } from "./build.js?v=SCARLETT_CTRL_FIX_2026_01_13_001";
import { World } from "./world.js?v=SCARLETT_CTRL_FIX_2026_01_13_001";
import { Control } from "./control.js?v=SCARLETT_CTRL_FIX_2026_01_13_001";
import { VRButton } from "./VRButton.js?v=SCARLETT_CTRL_FIX_2026_01_13_001";

const log = (...a) => console.log(...a);

let scene, camera, renderer;
let playerRig;
let overlay;

boot();

async function boot() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // ✅ Player rig
  playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.add(camera);
  scene.add(playerRig);

  // ✅ Build overlay (so we KNOW what Quest loaded)
  overlay = makeBuildOverlay(BUILD.ID);
  document.body.appendChild(overlay);

  // ✅ INIT CONTROLS FIRST (Quest likes this ordering)
  Control.init({
    THREE,
    renderer,
    camera,
    playerRig,
    log,
  });

  // ✅ Build world
  await World.init({
    THREE,
    scene,
    renderer,
    camera,
    player: playerRig,
    controllers: null,
    log,
    BUILD: BUILD.ID
  });

  // ✅ Spawn fix (higher + closer to center circle)
  Control.setSpawn(0, 1.65, 2.2, Math.PI);

  // ✅ VR button last
  document.body.appendChild(VRButton.createButton(renderer));

  window.addEventListener("resize", onResize);
  onResize();

  log("[index] boot ✅", BUILD.ID);

  // ✅ animation loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    Control.update(dt);
    renderer.render(scene, camera);

    // keep overlay updated
    overlay.querySelector("#build_id").textContent = BUILD.ID;
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function makeBuildOverlay(id) {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.padding = "8px 10px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "12px";
  el.style.borderRadius = "10px";
  el.style.zIndex = "99999";
  el.style.pointerEvents = "none";
  el.innerHTML = `BUILD: <span id="build_id">${id}</span>`;
  return el;
               }
