// /js/scarlett1/world.js
// WORLD (FULL MIN SAFE) — Unblock Loader + Show Scene + Diagnostics

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createWorldOrchestrator() {
  console.log("[world] boot ✅ /js/scarlett1/world.js reached");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 200);
  camera.position.set(0, 1.6, 2.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);
  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(6, 10, 4);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x33ffff, roughness: 0.5, metalness: 0.1 })
  );
  box.position.set(0, 1.2, 0);
  scene.add(box);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  return { scene, camera, renderer };
}
