import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";

let scene, camera, renderer, playerGroup;
let controls, ui;

const logEl = document.getElementById("log");
const log = (m) => logEl && (logEl.textContent += `\n${m}`);

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // IMPORTANT: XR enabled, but not forced
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // Always show something (no black screen)
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 10, 5);
  scene.add(sun);

  // Player group
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Debug visuals (you MUST see these)
  const grid = new THREE.GridHelper(20, 20);
  scene.add(grid);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x00ff99, emissive: 0x00ff99 })
  );
  cube.position.set(0, 1.5, -2);
  scene.add(cube);

  // Build world
  World.build(scene, playerGroup);
  log("World loaded");

  // UI & controls (work in desktop + VR)
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });
  controls = initControls({ renderer, scene, playerGroup, world: World });

  // VR BUTTON — REQUIRED USER ACTION
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.bottom = "20px";
  vrBtn.style.right = "20px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);

  log("Press ENTER VR in headset");

  window.addEventListener("resize", onResize);
}

function animate() {
  renderer.setAnimationLoop(() => {
    controls?.update();
    ui?.update();
    renderer.render(scene, camera);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
