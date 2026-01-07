// /js/main.js — Scarlett VR Poker (CACHE-PROOF BOOT)
// This file is loaded with ?v=... from index.html every time (no stale caching).
// It loads world.js using the same ?v=...

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));

// Extract v from this module URL (the one index.html imported)
const V = new URL(import.meta.url).searchParams.get("v") || (window.__BUILD_V || "no-v");
log("[main] boot v=" + V);

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  log("[main] renderer ok ✅");

  // VR Button
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  log("[main] VRButton appended ✅");

  // Scene / Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // Always-visible test cube (so you never get “black screen” mystery)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x66ffcc, roughness: 0.4 })
  );
  cube.position.set(0, 1.5, 0);
  scene.add(cube);
  log("[main] cube added ✅");

  // Load world.js with SAME version (cache-proof)
  try {
    const mod = await import(`./world.js?v=${V}`);
    if (mod?.initWorld) {
      world = await mod.initWorld({ THREE, scene, log });
      log("[main] world init ✅");
    } else {
      log("❌ world.js missing initWorld export");
    }
  } catch (e) {
    log("❌ world import/init failed: " + (e?.message || e));
  }

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Loop
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    cube.rotation.y += dt * 0.8;
    cube.rotation.x += dt * 0.4;

    if (world?.tick) world.tick(dt);
    renderer.render(scene, camera);
  });

  // XR support info
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    log("[main] XR immersive-vr supported = " + ok);
  } else {
    log("[main] navigator.xr missing (normal on some Android browsers)");
  }

  log("[main] ready ✅ v=" + V);
}
