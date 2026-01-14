// /js/index.js — Scarlett SAFE ENTRY v12.1 (FULL)
// ✅ Upload-proof (short)
// ✅ Hides loader automatically once world starts
// ✅ Keeps Controls + World stable on Quest/Android/Desktop

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";
import { Controls } from "./controls.js";

const log = (...a) => console.log("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

let renderer, scene, camera, player;

function hideAnyLoader() {
  // Try common ids first
  const ids = ["loader", "loading", "boot", "overlay"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  // Also hide any full-screen element that contains "Loading Scarlett"
  for (const el of Array.from(document.querySelectorAll("div"))) {
    const txt = (el.textContent || "").toLowerCase();
    if (txt.includes("loading scarlett")) el.style.display = "none";
  }
}

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));
  log("VRButton ✅");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 2);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // INIT CONTROLS
  try {
    Controls.init({ THREE, renderer, scene, camera, player, log });
    log("Controls init ✅");
  } catch (e) {
    err("Controls init FAILED ❌", e);
  }

  // INIT WORLD
  Promise.resolve()
    .then(() => World.init({ THREE, scene, renderer, camera, player, log }))
    .then(() => {
      log("World init ✅");
      hideAnyLoader(); // <-- PERMANENT: loader will not trap you anymore
    })
    .catch((e) => err("World init FAILED ❌", e));

  // LOOP
  let last = 0;
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    try { Controls.update?.(dt); } catch {}
    try { World.update?.(dt, t); } catch {}

    renderer.render(scene, camera);
  });

  log("INIT OK ✅");
}

try {
  init();
} catch (e) {
  err("INIT FAILED ❌", e);
          }
