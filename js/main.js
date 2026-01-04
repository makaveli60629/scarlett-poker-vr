// js/main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/webxr/VRButton.js';

let scene, camera, renderer;
let started = false;

const statusEl = document.getElementById('status');
const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

try {
  boot();
  animate();
  started = true;
  setStatus('Boot OK ✅  (If you see a floor, we’re good.)');
} catch (err) {
  console.error(err);
  setStatus('BOOT FAILED ❌\n' + (err?.message || String(err)));
}

function boot() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 1.6, 4);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VR button (safe)
  try {
    document.body.appendChild(VRButton.createButton(renderer));
  } catch (e) {
    console.warn('VRButton unavailable:', e);
  }

  // Lights (guaranteed visibility)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 10, 4);
  scene.add(dir);

  // FLOOR (always visible)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Simple “spawn marker” (so you know where center is)
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  marker.position.set(0, 0.01, 0);
  scene.add(marker);

  // A few reference objects
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  box.position.set(0, 0.2, -1.2);
  scene.add(box);

  window.addEventListener('resize', onResize);

  // Safety: show if render loop never starts
  setTimeout(() => {
    if (!started) setStatus('Still loading… (JS may be blocked or cached)');
  }, 2500);
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
