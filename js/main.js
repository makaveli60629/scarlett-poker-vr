// /js/main.js — Scarlet VR Poker — Oculus GitHub Build
// HARD-LOCKED VR BUTTON (Quest Browser compatible)

// ---------- IMPORTS ----------
import * as THREE from '../three.js';
import { VRButton } from '../jsm/webxr/VRButton.js';

// ---------- BOOT LOGS ----------
console.log('[Scarlet VR Poker] main.js loaded');
console.log('[XR] secure context:', window.isSecureContext);
console.log('[XR] navigator.xr exists:', !!navigator.xr);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);
camera.position.set(0, 1.6, 3);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ✅ REQUIRED FOR VR
renderer.xr.enabled = true;

// Attach canvas
document.body.appendChild(renderer.domElement);

// ---------- VR BUTTON (CRITICAL) ----------
try {
  const vrButton = VRButton.createButton(renderer);
  document.body.appendChild(vrButton);
  console.log('[XR] VRButton injected successfully');
} catch (err) {
  console.error('[XR] VRButton FAILED:', err);
}

// ---------- XR SUPPORT CHECK ----------
if (navigator.xr?.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr')
    .then(supported => {
      console.log('[XR] immersive-vr supported:', supported);
    })
    .catch(err => {
      console.warn('[XR] support check error:', err);
    });
} else {
  console.warn('[XR] navigator.xr.isSessionSupported missing');
}

// ---------- LIGHTING ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 10, 5);
sun.castShadow = true;
scene.add(sun);

// ---------- FLOOR ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------- TABLE PLACEHOLDER ----------
const table = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.2, 0.12, 64),
  new THREE.MeshStandardMaterial({ color: 0x0b6b3a })
);
table.position.y = 0.8;
table.castShadow = true;
scene.add(table);

// ---------- RESIZE ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- RENDER LOOP ----------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
