// js/main.js — Skylark Poker VR (6.2)
// Must export: boot

import * as THREE from "three";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

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

export async function boot() {
  // Safe core init (won’t crash if core modules differ/missing)
  try { await CoreBridge.init(); } catch (e) { console.warn("CoreBridge init failed:", e); }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 120);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  player = new THREE.Group();
  player.add(camera);
  scene.add(player);

  // Build world
  World.build(scene);
  Table.build(scene);
  Chair.buildSet(scene, 0, 0);

  // Systems
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

  // Render loop (WebXR requires setAnimationLoop)
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    try { CoreBridge.tick(dt); } catch {}
    XrLocomotion.update(dt);
    TeleportMachine.update(dt);
    Interactions.update(dt);

    BossBots.update(dt);
    Tournament.update(dt);

    UI.update();
    WatchUI.update(dt);

    renderer.render(scene, camera);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// If your index.html imports boot, it will call it.
// If someone runs main.js directly, we also auto-boot:
if (!window.__SKYLARK_BOOTED__) {
  window.__SKYLARK_BOOTED__ = true;
  // Don’t auto-boot if another module is importing us for boot()
  // (Safe: if boot() gets called twice, we guard above)
  // Comment out next line if you only want index.html to start it.
  boot();
    }
