// js/main.js — Minimal Stable Boot (won’t blank-screen)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera } from "./state.js";

// Optional modules — only import if they exist in your repo
// If any of these files are missing, comment that import out.
import { World } from "./world.js";
import { Interactions } from "./interactions.js";

// If you have these, keep them; otherwise comment them out.
import { BossTable } from "./boss_table.js";
import { Leaderboard } from "./leaderboard.js";
import { Audio } from "./audio.js";

let renderer, scene, camera, clock;
let playerGroup;

function ensureAppRoot() {
  let app = document.getElementById("app");
  if (!app) {
    app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
  }
  return app;
}

function addBasicLight(s) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.9);
  s.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(4, 8, 3);
  dir.castShadow = false;
  s.add(dir);
}

function addFallbackFloor(s) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  s.add(floor);
}

function safeCall(label, fn) {
  try { return fn(); }
  catch (e) { console.warn(label + " failed:", e); return null; }
}

export async function boot() {
  // Prevent double-boot
  if (window.__SKYLARK_BOOTED__) return;
  window.__SKYLARK_BOOTED__ = true;

  const app = ensureAppRoot();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 4);
  setCamera(camera);

  playerGroup = new THREE.Group();
  playerGroup.position.set(0, 0, 0);
  playerGroup.add(camera);
  scene.add(playerGroup);

  addBasicLight(scene);
  addFallbackFloor(scene);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  // Add VR button if supported
  document.body.appendChild(VRButton.createButton(renderer));

  // Build world if your module exists
  safeCall("World.build", () => World?.build?.(scene, playerGroup));

  // Optional: add boss table + rail (won’t crash if the zone system exists)
  safeCall("BossTable.build", () => BossTable?.build?.(scene));

  // Optional: leaderboard
  safeCall("Leaderboard.build", () => Leaderboard?.build?.(scene));

  // Optional: interactions init
  safeCall("Interactions.init", () => Interactions?.init?.(renderer, scene, camera));

  // Optional: audio (usually needs user gesture to actually play)
  safeCall("Audio.init", async () => {
    await Audio?.init?.("assets/lobby_ambience.mp3", 0.35);
    // Don’t force play here; let your menu or first trigger press start it.
  });

  clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    safeCall("Interactions.update", () => Interactions?.update?.(dt));
    safeCall("Leaderboard.update", () => Leaderboard?.update?.(dt, camera, null));

    renderer.render(scene, camera);
  });
}

// Auto-run if imported without calling boot()
boot().catch(err => {
  console.error("boot failed:", err);
  throw err;
});
