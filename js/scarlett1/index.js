// /js/scarlett1/index.js
// SCARLETT1 — Modular Entry Spine (FULL)
// - Creates renderer + XR session
// - Delegates EVERYTHING else to world orchestrator

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { createWorldOrchestrator } from "./world.js";

const BUILD = "SCARLETT1_MODULAR_FULL_v1";
const log = (...a) => console.log("[scarlett1/index]", ...a);
const err = (...a) => console.error("[scarlett1/index]", ...a);

let renderer, scene, camera;
let playerRig, head;
let clock;
let xrSession = null;

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);
  camera.position.set(0, 1.6, 2.5);

  playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  scene.add(playerRig);

  head = new THREE.Group();
  head.name = "Head";
  playerRig.add(head);
  head.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // baseline lighting (world module can add more)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x101020, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.55);
  dir.position.set(4, 8, 2);
  scene.add(dir);

  // Orchestrator (modules live here)
  const World = createWorldOrchestrator({ THREE, scene, renderer, camera, playerRig, head });

  // XR controllers (THREE objects + lasers) created once here and handed to World
  const controllers = installControllers(renderer, playerRig);
  World.setControllers(controllers);

  // XR session hooks → delegated to World
  renderer.xr.addEventListener("sessionstart", () => {
    xrSession = renderer.xr.getSession();
    World.onXRSessionStart(xrSession);
    log("XR sessionstart ✅");
  });

  renderer.xr.addEventListener("sessionend", () => {
    World.onXRSessionEnd();
    xrSession = null;
    log("XR sessionend ✅");
  });

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(() => loop(World));

  log("runtime start ✅ build=", BUILD);
}

function loop(World) {
  const dt = Math.min(clock.getDelta(), 0.033);
  World.tick(dt);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Controllers + lasers (pure visuals + ray origin). No input mapping here.
function installControllers(renderer, playerRig) {
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  c0.name = "XRController0";
  c1.name = "XRController1";
  playerRig.add(c0);
  playerRig.add(c1);

  function addLaser(ctrl, color) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = "Laser";
    line.scale.z = 6.0;
    ctrl.add(line);
  }

  addLaser(c0, 0xff66ff);
  addLaser(c1, 0x66aaff);

  return { c0, c1 };
    }
