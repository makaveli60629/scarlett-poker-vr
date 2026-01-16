// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL SAFE) — unblocks loader + shows scene
// Goal: eliminate black screen + keep diagnostics alive.
// This file MUST exist because /js/scarlett1/index.js imports "./world.js"

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createWorldOrchestrator() {
  console.log("[world] world.js reached ✅");

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.02,
    250
  );
  camera.position.set(0, 1.65, 3.2);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // --- Lights (safe defaults) ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(8, 12, 6);
  scene.add(key);

  // --- Debug floor (so you always see *something*) ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // --- Debug marker ---
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x33ffff, roughness: 0.5, metalness: 0.1 })
  );
  cube.position.set(0, 1.25, 0);
  scene.add(cube);

  // --- Resize ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Render loop (never black) ---
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  console.log("[world] running ✅");

  return { scene, camera, renderer };
}
