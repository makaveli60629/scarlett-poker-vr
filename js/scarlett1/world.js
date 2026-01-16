// /js/scarlett1/world.js
// SCARLETT1 WORLD (SAFE FULL) — guarantees scene + never black
// This is the bridge file your loader requires.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createWorldOrchestrator({ trace = false } = {}) {
  console.log("[world] world.js reached ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.02,
    250
  );
  camera.position.set(0, 1.65, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(8, 12, 6);
  scene.add(key);

  // Debug floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Debug cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x33ffff, roughness: 0.5, metalness: 0.1 })
  );
  cube.position.set(0, 1.25, 0);
  scene.add(cube);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Loop
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  if (trace) console.log("[world] running ✅", { scene, camera, renderer });

  return { scene, camera, renderer };
}
