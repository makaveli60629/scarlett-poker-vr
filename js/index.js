import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { setupWorld } from './world.js';

let camera, scene, renderer;
let moveForward = false;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010); // fallback color

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 6); // Official spawn area
  camera.lookAt(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Setup world with safe spawn
  setupWorld(scene, camera);

  // Controller for forward movement
  const controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', () => moveForward = true);
  controller1.addEventListener('selectend', () => moveForward = false);
  scene.add(controller1);

  window.addEventListener('resize', onWindowResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  if (moveForward) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    camera.position.add(dir.multiplyScalar(0.03));
  }
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
