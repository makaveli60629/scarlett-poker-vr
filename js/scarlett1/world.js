// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR — FULL BRIDGE
// Purpose: central orchestrator, diagnostics-safe, minimal assumptions

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// Core / spine
import "./boot.js";
import "./probe.js";

// XR / controls
import "./controls_xr.js";
import "./android_controls.js";

// Diagnostics / HUD
import "./spine_diag.js";
import "./spine_hud.js";
import "./spine_android.js";

// World composition
import "./mod_world_upgrade.js";

// Optional world parts (lazy-safe)
try { await import("./world_parts/index.js"); } catch {}

export function createWorldOrchestrator() {
  console.log("[world] orchestrator booting…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 250);
  camera.position.set(0, 1.65, 3.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // Lights (safe defaults)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(8, 12, 6);
  scene.add(key);

  // Safe spawn floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  console.log("[world] running ✅");

  return { scene, camera, renderer };
}
