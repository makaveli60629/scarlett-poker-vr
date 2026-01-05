import * as THREE from "three";
import { World } from "./world.js";
import { Table } from "./table.js";
import { Chair } from "./chair.js";
import { XrLocomotion } from "./xr_locomotion.js";
import { TeleportMachine } from "./teleport_machine.js";
import { Interactions } from "./interactions.js";
import { UI } from "./ui.js";
import { WatchUI } from "./watch_ui.js";
import { Notify } from "./notify.js";
import { RoomManager } from "./room_manager.js";
import { BossBots } from "./boss_bots.js";
import { Tournament } from "./tournament.js";
import { CoreBridge } from "./core_bridge.js";

let scene, camera, renderer, player;
const clock = new THREE.Clock();

await CoreBridge.init();

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 120);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.appendChild(renderer.domElement);

  player = new THREE.Group();
  player.add(camera);
  scene.add(player);

  World.build(scene);
  Table.build(scene);
  Chair.buildSet(scene, 0, 0);

  RoomManager.init();
  BossBots.init(scene);
  Tournament.init();

  XrLocomotion.init(renderer, player, camera);
  TeleportMachine.init(renderer, scene, player);
  Interactions.init(renderer, scene, camera);

  UI.init(scene, camera);
  WatchUI.init(renderer, scene);
  Notify.init();

  window.addEventListener("resize", onResize);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const dt = clock.getDelta();

  // ✅ Core always runs if present
  CoreBridge.tick(dt);

  XrLocomotion.update(dt);
  TeleportMachine.update(dt);
  Interactions.update(dt);

  BossBots.update(dt);
  Tournament.update(dt);

  UI.update();
  WatchUI.update(dt);

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
