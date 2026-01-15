// /js/scarlett1/index.js — Scarlett 1.0 Permanent Spine (FORCED CDN THREE)
// ✅ Always renders a stub world (never black void)
// ✅ Android move/look (touch) works even if modules fail
// ✅ Quest/Oculus lasers + thumbstick locomotion
// ✅ Safe module loader (modules.json) so modules can’t crash the core

import { makeHUD } from "./spine_hud.js";
import { makeDiag } from "./spine_diag.js";
import { makeXR } from "./spine_xr.js";
import { makeAndroid } from "./spine_android.js";
import { makeSafeModules } from "./spine_modules.js";
import { buildStubWorld } from "./spine_world_stub.js";

async function loadThree(log) {
  // FORCED CDN (ESM) — do NOT use local /js/three.js to avoid non-ESM issues
  const cdn = "https://unpkg.com/three@0.158.0/build/three.module.js";
  log("THREE import (FORCED CDN):", cdn);
  return await import(cdn);
}

export async function start(ctx) {
  const { V, ROOT, log } = ctx;

  // ---- HUD ----
  makeHUD({ log });

  // ---- THREE ----
  const THREE = await loadThree(log);

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // ---- Scene / Camera / Rig ----
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

  // ---- Lights (stable baseline) ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(3, 6, 2);
  scene.add(dir);

  // ---- Always-on Stub World (permanent fallback) ----
  const stubWorld = buildStubWorld({ THREE, scene, log });
  rig.position.copy(stubWorld.spawn);
  rig.lookAt(stubWorld.tableCenter.x, stubWorld.tableCenter.y, stubWorld.tableCenter.z);

  // ---- Diagnostics ----
  const diag = makeDiag({ log });

  // ---- Controls ----
  const android = makeAndroid({ THREE, rig, camera, log });
  const xr = makeXR({ THREE, scene, renderer, rig, camera, log });

  // ---- Safe Modules ----
  // IMPORTANT: ROOT points to /js/ (from boot.js)
  // modules.json is in /js/scarlett1/modules.json (relative to this file)
  const modules = makeSafeModules({
    ROOT,
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

  await modules.loadList(`./modules.json?v=${V}`);

  // ---- Resize ----
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Render Loop ----
  const clock = new THREE.Clock();
  let firstFrame = true;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    if (firstFrame) {
      firstFrame = false;
      log("frame tick ✅ (render loop running)");
    }

    // Stub world anim (ring pulse)
    stubWorld.update?.(dt);

    // Update controls
    xr.update(dt);
    android.update(dt);

    // Update safe-loaded modules (if any enabled)
    modules.update(dt);

    // Update diagnostics overlay
    diag.update({
      dt,
      renderer,
      rig,
      xr,
      android,
      modules
    });

    renderer.render(scene, camera);
  });

  // Debug handle
  window.__SCARLETT1__ = { THREE, scene, renderer, camera, rig, stubWorld, android, xr, modules };

  log("Scarlett 1.0 Spine running ✅ (stub world active)");
}
