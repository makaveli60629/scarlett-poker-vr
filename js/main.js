// /js/main.js — Scarlett Poker VR — VR Button "Hard Lock" Build
// Works on GitHub Pages as long as file paths exist and are HTTPS.

// ---------- IMPORTS (GitHub Pages safe) ----------
import * as THREE from '../three.js'; // <-- use your local wrapper if you have it
// If you do NOT have ../three.js, then use:  import * as THREE from './three.module.js';
// (But keep it local, not from "three" npm.)

import { VRButton } from '../jsm/webxr/VRButton.js';

// Optional but helpful: OrbitControls for desktop testing
import { OrbitControls } from '../jsm/controls/OrbitControls.js';

// ---------- BASIC BOOT ----------
console.log('[BOOT] main.js loaded');
console.log('[BOOT] location:', window.location.href);
console.log('[BOOT] secure context:', window.isSecureContext);
console.log('[BOOT] navigator.xr exists:', !!navigator.xr);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);
camera.position.set(0, 1.6, 3);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ✅ REQUIRED for VR button to appear
renderer.xr.enabled = true;

// Attach canvas first
document.body.appendChild(renderer.domElement);

// ✅ REQUIRED for VR button to appear
try {
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  console.log('[XR] VRButton appended:', btn);
} catch (e) {
  console.error('[XR] Failed to create/append VRButton:', e);
}

// Extra: show XR availability
if (navigator.xr?.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
    console.log('[XR] immersive-vr supported:', supported);
  }).catch((err) => {
    console.warn('[XR] isSessionSupported error:', err);
  });
} else {
  console.warn('[XR] navigator.xr.isSessionSupported not available');
}

// ---------- LIGHTING (so you don’t load into darkness) ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 4);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// ---------- FLOOR ----------
const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 1.0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------- SIMPLE “TABLE” PLACEHOLDER (so you see something) ----------
const tableGroup = new THREE.Group();
tableGroup.position.set(0, 0.8, 0);
scene.add(tableGroup);

const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.2, 0.12, 64),
  new THREE.MeshStandardMaterial({ color: 0x0b6b3a, roughness: 0.9 })
);
tableTop.castShadow = true;
tableTop.receiveShadow = true;
tableGroup.add(tableTop);

const tableBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.45, 0.8, 32),
  new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 1.0 })
);
tableBase.position.y = -0.46;
tableBase.castShadow = true;
tableBase.receiveShadow = true;
tableGroup.add(tableBase);

// ---------- CONTROLS (desktop testing only) ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0);
controls.update();

// ---------- RESIZE ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- XR CAMERA “SPAWN” GROUP ----------
const player = new THREE.Group();
player.position.set(0, 0, 3); // safe spawn
scene.add(player);
player.add(camera);

// ---------- ANIMATION LOOP ----------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
