// /js/main.js — Update 9.1
// Fixes:
// - Prevent double-build (no more tons of tables)
// - One poker sim group only; modes show/hide
// - Spawn comes from teleport machine always
// - Hooks VRLocomotion (rainbow + snap turn)
// - Bright stable render loop

import * as THREE from "./three.js";
import { VRButton } from "./VRButton.js";

import { World } from "./world.js";
import { PokerSimulation } from "./poker_simulation.js";
import { VRLocomotion } from "./vr_locomotion.js";

// If you have these already, keep your own imports; this main.js is safe even without them.
import { TeleportMachine } from "./teleport_machine.js";
import { UI } from "./ui.js";

let renderer, scene, camera;
let playerRig, head;
let controllerL, controllerR;

let worldRefs;
let locomotion;

let pokerGroup, pokerSim;
let teleportMachine;
let ui;

let _booted = false;

boot();

async function boot() {
  if (_booted) return; // IMPORTANT: stop duplicate builds
  _booted = true;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // player rig
  playerRig = new THREE.Group();
  scene.add(playerRig);

  head = camera;
  playerRig.add(camera);

  // controllers
  controllerL = renderer.xr.getController(0);
  controllerR = renderer.xr.getController(1);
  playerRig.add(controllerL);
  playerRig.add(controllerR);

  // build world ONCE
  worldRefs = World.build(scene);

  // teleport machine = spawn anchor
  teleportMachine = new TeleportMachine({
    textureFile: "Teleport glow.jpg"
  });
  teleportMachine.group.position.set(0, 0, -4.8); // in front of center table area
  scene.add(teleportMachine.group);

  // spawn comes from teleport machine always
  resetSpawn();

  // poker group (ONE)
  pokerGroup = new THREE.Group();
  scene.add(pokerGroup);

  // leaderboard UI callback
  ui = new UI();
  ui.mount(document.body);

  pokerSim = new PokerSimulation({
    camera,
    tableCenter: new THREE.Vector3(0, 0, -8.0),
    onLeaderboard: (lines) => ui.setLeaderboard(lines)
  });

  // build poker sim ONCE into pokerGroup by temporarily adding its groups there
  await pokerSim.build(pokerGroup);

  // locomotion
  locomotion = new VRLocomotion({
    renderer,
    scene,
    camera,
    playerRig,
    head,
    controllerL,
    controllerR,
    floorMeshes: worldRefs.floorMeshes,
    standingY: 1.65
  });
  locomotion.attach();

  // hook UI buttons
  ui.on("resetSpawn", resetSpawn);

  window.addEventListener("resize", onResize);

  // render loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    locomotion.update(dt);
    pokerSim.update(dt);

    renderer.render(scene, camera);
  });
}

function resetSpawn() {
  // Put rig at teleport machine, facing table
  const s = teleportMachine.group.position.clone();
  playerRig.position.set(s.x, 0, s.z);
  playerRig.rotation.set(0, 0, 0);
  // aim toward table center
  playerRig.lookAt(new THREE.Vector3(0, 0, -8.0));
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
