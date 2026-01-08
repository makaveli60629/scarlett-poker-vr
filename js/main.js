// /js/main.js — Scarlett VR Poker TEST (VRButton must appear)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const V = new URL(import.meta.url).searchParams.get("v") || Date.now();
log("[main] boot v=" + V);

let renderer, scene, camera;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);
  log("[main] VRButton appended ✅");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const d = new THREE.DirectionalLight(0xffffff, 1.0);
  d.position.set(3, 8, 4);
  scene.add(d);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2bd7ff, emissive: 0x0b3a44, emissiveIntensity: 0.5 })
  );
  box.position.set(0, 1.2, 0);
  scene.add(box);

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    box.rotation.y += 0.01;
    renderer.render(scene, camera);
  });

  log("[main] ready ✅");
}
