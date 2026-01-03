import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { setupWorld } from './world.js';

let camera, scene, renderer;
let moveForward = false;
let snapTurnLeft = false;
let snapTurnRight = false;

init();
animate();

function init() {
  // ---------- Scene ----------
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010); // fallback background

  // ---------- Camera ----------
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Safe spawn area
  camera.position.set(0, 1.6, 8); // clear area, not inside walls/floor
  camera.lookAt(0, 1.6, 0);

  // ---------- Renderer ----------
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // ---------- World Setup ----------
  try {
    setupWorld(scene, camera);
  } catch (err) {
    console.error("Error initializing world.js:", err);
  }

  // ---------- VR Controllers ----------
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);

  // Controller1 triggers forward movement
  controller1.addEventListener('selectstart', () => moveForward = true);
  controller1.addEventListener('selectend', () => moveForward = false);

  // Controller2 triggers snap turn right (45 deg)
  controller2.addEventListener('selectstart', () => snapTurnRight = true);
  controller2.addEventListener('selectend', () => snapTurnRight = false);

  // Add controllers to scene
  scene.add(controller1);
  scene.add(controller2);

  // ---------- Window Resize ----------
  window.addEventListener('resize', onWindowResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // ---------- VR Movement ----------
  if (moveForward) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // prevent flying
    camera.position.add(direction.multiplyScalar(0.03)); // move forward slowly
  }

  if (snapTurnRight) {
    camera.rotation.y -= THREE.MathUtils.degToRad(45); // snap 45 deg
    snapTurnRight = false;
  }

  if (snapTurnLeft) {
    camera.rotation.y += THREE.MathUtils.degToRad(45); // snap 45 deg
    snapTurnLeft = false;
  }

  renderer.render(scene, camera);
}

// ---------- Handle Window Resize ----------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
      }
