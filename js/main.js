// Oculus/Quest-friendly CDN (reliable + HTTPS)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";

let scene, camera, renderer, playerGroup;
let controls, ui;

const playerRadius = 0.35;

const logEl = document.getElementById("log");
function log(msg) {
  if (!logEl) return;
  logEl.textContent = `${logEl.textContent}\n${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}

// Show errors in Oculus (since devtools is painful)
window.addEventListener("error", (e) => {
  log(`ERROR: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener("unhandledrejection", (e) => {
  log(`PROMISE REJECTION: ${e.reason?.message || e.reason || "unknown"}`);
});

try {
  init();
  animate();
  log("Init OK. Rendering…");
} catch (err) {
  log(`FATAL INIT ERROR: ${err?.message || err}`);
  console.error(err);
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VR button should never crash the app
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added.");
  } catch (e) {
    log(`VRButton error (non-fatal): ${e?.message || e}`);
  }

  // Player group moves (teleport/collision)
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Bright baseline lighting (so you can’t get “all black” from lighting)
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 10, 6);
  scene.add(dir);

  // DEBUG VISUALS (you should see these even if your world fails)
  const grid = new THREE.GridHelper(30, 30);
  scene.add(grid);

  const testCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.6 })
  );
  testCube.position.set(0, 1.4, 3.5);
  scene.add(testCube);

  // Build world (rooms/pads/kiosk)
  World.build(scene, playerGroup);
  log("World.build OK.");

  // UI + Controls
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });
  log("UI OK.");

  controls = initControls({
    renderer,
    scene,
    playerGroup,
    world: World,
    onTeleport: (where) => log(`Teleport: ${where}`)
  });
  log("Controls OK.");

  window.addEventListener("resize", onWindowResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  try {
    controls?.update();
    resolveCollisions();
    ui?.update();
    renderer.render(scene, camera);
  } catch (err) {
    log(`RENDER ERROR: ${err?.message || err}`);
    console.error(err);
    // stop loop if it’s hard-crashing repeatedly
    renderer.setAnimationLoop(null);
  }
}

function resolveCollisions() {
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;

  for (const m of World.colliders) {
    if (!m.geometry?.boundingBox) continue;

    const bb = m.geometry.boundingBox.clone();
    bb.applyMatrix4(m.matrixWorld);

    bb.min.x -= playerRadius; bb.min.z -= playerRadius;
    bb.max.x += playerRadius; bb.max.z += playerRadius;

    const inside = (px > bb.min.x && px < bb.max.x && pz > bb.min.z && pz < bb.max.z);
    if (!inside) continue;

    const dxMin = Math.abs(px - bb.min.x);
    const dxMax = Math.abs(bb.max.x - px);
    const dzMin = Math.abs(pz - bb.min.z);
    const dzMax = Math.abs(bb.max.z - pz);
    const min = Math.min(dxMin, dxMax, dzMin, dzMax);

    if (min === dxMin) playerGroup.position.x = bb.min.x;
    else if (min === dxMax) playerGroup.position.x = bb.max.x;
    else if (min === dzMin) playerGroup.position.z = bb.min.z;
    else if (min === dzMax) playerGroup.position.z = bb.max.z;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
