// /js/main.js — CDN DIAGNOSTIC (FULL)
// No local imports. No world.js. This is to prove rendering + VRButton works.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));

log("[main] module loaded ✅");

let renderer, scene, camera;
const clock = new THREE.Clock();

init();

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  log("[main] renderer ok ✅");

  // VR Button
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  log("[main] VRButton appended ✅");

  // Make sure button stays on top
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);

  // Spinning cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x66ffcc, roughness: 0.4 })
  );
  cube.position.set(0, 1.5, 0);
  scene.add(cube);
  log("[main] cube added ✅ (you should SEE it)");

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    cube.rotation.y += dt * 0.8;
    cube.rotation.x += dt * 0.4;
    renderer.render(scene, camera);
  });

  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    log("[main] XR immersive-vr supported = " + ok);
  } else {
    log("[main] navigator.xr missing");
  }

  setTimeout(() => {
    const vr = document.getElementById("VRButton");
    log(vr ? "✅ VRButton exists in DOM" : "❌ VRButton NOT found in DOM");
  }, 700);
}
