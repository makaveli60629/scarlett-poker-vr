import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { initControls } from "./controls.js";
import { initUI } from "./ui.js";

let scene, camera, renderer, playerGroup;
let controls, ui;

const playerRadius = 0.35;

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

  // Player group (teleport/collision moves this)
  playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // baseline light
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  // build world
  World.build(scene, playerGroup);

  // ui + teleport controls
  ui = initUI({ scene, camera, renderer, world: World, playerGroup });

  controls = initControls({
    renderer,
    scene,
    playerGroup,
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
  resolveCollisions();
  ui?.update();
  renderer.render(scene, camera);
}

function resolveCollisions() {
  // simple sphere vs expanded AABB in XZ plane
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
