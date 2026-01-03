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
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);

  // ---------- SPAWN AREA ----------
  camera.position.set(0, 1.6, 8); // safe spawn, away from walls/tables
  camera.lookAt(0, 1.6, 0);

  // ---------- Renderer ----------
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // ---------- World Setup ----------
  setupWorld(scene, camera);

  // ---------- Controllers ----------
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);

  controller1.addEventListener('selectstart', () => moveForward = true);
  controller1.addEventListener('selectend', () => moveForward = false);

  controller2.addEventListener('selectstart', () => snapTurnRight = true);
  controller2.addEventListener('selectend', () => snapTurnRight = false);

  scene.add(controller1);
  scene.add(controller2);

  window.addEventListener('resize', onWindowResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // ---------- Movement ----------
  if(moveForward) camera.position.z -= 0.03;
  if(snapTurnRight){
    camera.rotation.y -= THREE.MathUtils.degToRad(45);
    snapTurnRight=false;
  }

  renderer.render(scene, camera);
}

function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
