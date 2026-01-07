// ================================
// Scarlet VR Poker — main.js
// Quest + GitHub Pages SAFE
// ================================

// Import THREE + VRButton from CDN (NO bare "three" imports)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

// Basic logging helper (shows in your hub debug if present)
const log = (msg) => {
  console.log("[ScarletVR]", msg);
  if (window.__hubLog) window.__hubLog("[ScarletVR] " + msg);
};

log("main.js booting");

// ================================
// Scene / Camera / Renderer
// ================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// ================================
// VR Button (forced visible)
// ================================
const vrButton = VRButton.createButton(renderer);
vrButton.style.position = "fixed";
vrButton.style.right = "14px";
vrButton.style.bottom = "14px";
vrButton.style.zIndex = "99999";
document.body.appendChild(vrButton);

log("VRButton added");

// ================================
// Lighting (prevents black screen)
// ================================
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemi.position.set(0, 20, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

log("Lights added");

// ================================
// Simple Ground (visual proof)
// ================================
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.8,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// Center marker
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x33ff66 })
);
marker.position.y = 0.2;
scene.add(marker);

log("Test geometry added");

// ================================
// Resize handling
// ================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================================
// Animation Loop
// ================================
renderer.setAnimationLoop(() => {
  marker.rotation.y += 0.01;
  renderer.render(scene, camera);
});

log("Render loop running");

// ================================
// XR sanity check
// ================================
if (navigator.xr) {
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
    log(ok ? "immersive-vr supported" : "immersive-vr NOT supported");
  });
} else {
  log("navigator.xr missing");
}
