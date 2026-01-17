// /js/index.js — ScarlettVR Permanent Spine (FULL)
// Single entry. Loads modules. Owns render loop. No duplicates.

const BUILD = "INDEX_FULL_WORLD_PIP_v1";
const log = (...a) => console.log("[index]", ...a);
const $ = (id) => document.getElementById(id);

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

import { createWorldModule } from "./modules/world_full.js";
import { createLocomotionModule } from "./modules/locomotion_xr.js";
import { createPipModule } from "./modules/pip.js";
import { createUiModule } from "./modules/ui_panel.js";

(async function boot() {
  log("build=", BUILD);

  const app = document.getElementById("app");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;

  app.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090d);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3.2);

  // XR rig so movement is consistent
  const rig = new THREE.Group();
  rig.name = "XR_RIG";
  rig.add(camera);
  scene.add(rig);

  // Controllers
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  controller1.name = "controller1";
  controller2.name = "controller2";
  rig.add(controller1);
  rig.add(controller2);

  const clock = new THREE.Clock();

  const ctx = {
    BUILD,
    THREE,
    scene,
    camera,
    renderer,
    rig,
    controller1,
    controller2,
    now: () => performance.now(),
    dom: {
      hud: $("hud"),
      status: $("status"),
      pipCanvas: $("pip"),
      panel: $("panel"),
      log: $("log"),
      btnHUD: $("btnHUD"),
      btnPIP: $("btnPIP"),
      btnTestModules: $("btnTestModules"),
      btnRespawn: $("btnRespawn"),
      togglePanelKey: "KeyY", // desktop fallback
    },
    // a simple shared bus
    bus: new EventTarget(),
  };

  const MODULES = [
    createUiModule(),
    createWorldModule(),
    createLocomotionModule({ teleportEnabled: true }),
    createPipModule(),
  ];

  // init modules
  for (const m of MODULES) await m.init(ctx);

  // resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  ctx.dom.status.textContent = "ready ✅";

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    for (const m of MODULES) m.update?.(dt, ctx);
    renderer.render(scene, camera);
  });
})();
