import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";

let scene, camera, renderer, playerGroup;
let controls, ui;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Player group (move this for teleport)
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Basic ambient
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  // Build world
  World.build(scene, playerGroup);

  // UI
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });

  // Controls (Teleport + laser)
  controls = initControls({
    renderer,
    scene,
    playerGroup,
    camera,
    world: World,
    onTeleport: (where) => console.log("Teleported:", where)
  });

  window.addEventListener("resize", onWindowResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  controls?.update();
  ui?.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
