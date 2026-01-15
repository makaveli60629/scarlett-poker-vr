// /js/scarlett1/index.js — Scarlett 1.0 Permanent Spine (FORCED CDN THREE)
// ✅ One stable entry
// ✅ HUD hide/show + log copy (from spine_hud.js)
// ✅ Android move/look (touch) + Quest lasers/locomotion
// ✅ Safe module loader (modules.json) so broken modules never kill the core

import { makeHUD } from "./spine_hud.js";
import { makeDiag } from "./spine_diag.js";
import { makeXR } from "./spine_xr.js";
import { makeAndroid } from "./spine_android.js";
import { makeSafeModules } from "./spine_modules.js";

async function loadThree(log) {
  // FORCED CDN (ESM) — avoids local non-ESM three.js issues
  const cdn = "https://unpkg.com/three@0.158.0/build/three.module.js";
  log("THREE import (FORCED CDN):", cdn);
  return await import(cdn);
}

export async function start(ctx) {
  const { V, ROOT, log } = ctx;

  // --- HUD (DOM diagnostics overlay) ---
  makeHUD({ log });

  // --- THREE (forced CDN) ---
  const THREE = await loadThree(log);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // --- Scene / Camera / Rig ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.03,
    300
  );

  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Default spawn (safe, neutral). World module can reposition later.
  rig.position.set(0, 1.65, 2.4);
  rig.rotation.set(0, 0, 0);

  // --- Lighting (stable baseline) ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(3, 6, 2);
  scene.add(dir);

  // --- Diagnostics ---
  const diag = makeDiag({ log });

  // --- Controls (both present; only active source drives at a time) ---
  const android = makeAndroid({ THREE, rig, camera, log });
  const xr = makeXR({ THREE, scene, renderer, rig, camera, log });

  // --- Safe Modules Loader ---
  const modules = makeSafeModules({
    ROOT,           // points to /js/
    log,
    THREE,
    scene,
    renderer,
    camera,
    rig,
    diag,
    android,
    xr
  });

  // Load module list from /js/scarlett1/modules.json
  await modules.loadList(`./modules.json?v=${V}`);

  // --- Resize handling ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Render Loop ---
  const clock = new THREE.Clock();

  // Optional: uncomment for one-time confirmation that the loop is running
  // let firstFrame = true;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // Optional: confirm loop tick in logs once
    // if (firstFrame) { firstFrame = false; log("frame tick ✅"); }

    // Update controls
    xr.update(dt);
    android.update(dt);

    // Update safe-loaded modules
    modules.update(dt);

    // Update diagnostics overlay text
    diag.update({
      dt,
      renderer,
      rig,
      xr,
      android,
      modules
    });

    // Render
    renderer.render(scene, camera);
  });

  // Expose a simple debug handle
  window.__SCARLETT1__ = { THREE, scene, renderer, camera, rig, android, xr, modules };

  log("Scarlett 1.0 Spine running ✅");
}
