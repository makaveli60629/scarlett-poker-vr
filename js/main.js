// js/main.js — Scarlett XR Orchestrated Runtime v4.6
import * as THREE from 'three';
import { Diag } from './diag.js';
import { UI } from './ui.js';
import { XRInput } from './xr_input.js';
import { Teleport } from './teleport.js';
import { Locomotion } from './locomotion.js';
import { World } from './world.js';

const APP_STATE = {
  build: 'SCARLETT1_RUNTIME_ORCHESTRATED_v4_6',
  three: true,
  xr: !!navigator.xr,
  renderer: false,
  world: false,
  floors: 0,
  inXR: false,
  teleportEnabled: false,
  touchOn: false,
  fps: 0,
  left: { connected:false, gamepad:false },
  right: { connected:false, gamepad:false },
};
window.APP_STATE = APP_STATE;

let scene, camera, renderer, clock;
let playerRig;
let xrInput, teleport, locomotion;
let floors = [];

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 120);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  APP_STATE.renderer = true;
  Diag.log('[status] booting…');
  Diag.log(`BUILD=${APP_STATE.build}`);
  Diag.log('[status] renderer OK ✅');

  // Player rig (everything parents under this so teleport/move affects controllers & rays)
  playerRig = new THREE.Group();
  playerRig.position.set(0, 0, 0);
  scene.add(playerRig);

  // Camera sits under rig
  playerRig.add(camera);

  // Build world
  Diag.log('[status] building world…');
  const built = World.build({ scene, playerRig, diag: Diag });
  floors = built.floors || [];
  APP_STATE.world = true;
  APP_STATE.floors = floors.length;
  Diag.log('[status] world ready ✅');

  // XR Input + locomotion + teleport
  xrInput = XRInput.create({ renderer, scene, playerRig, diag: Diag });
  locomotion = Locomotion.create({ camera, playerRig, xrInput, diag: Diag });
  teleport = Teleport.create({ renderer, scene, camera, playerRig, floors, xrInput, diag: Diag });

  // UI wiring
  UI.bind({
    onEnterVR: enterVR,
    onToggleTeleport: () => {
      const v = teleport.toggle();
      APP_STATE.teleportEnabled = v;
      xrInput.setRayVisible(v);
      return v;
    },
    onToggleDiag: () => Diag.toggle(),
  });

  // Default: rays hidden until teleport enabled
  xrInput.setRayVisible(false);

  window.addEventListener('resize', onResize);

  // Main loop
  renderer.setAnimationLoop(loop);

  Diag.log('[status] MODULE TEST ✅');
}

async function enterVR() {
  try {
    if (!navigator.xr) {
      Diag.log('[XR] navigator.xr missing');
      return;
    }
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers']
    });
    await renderer.xr.setSession(session);
    APP_STATE.inXR = true;
    Diag.log('[XR] requestSession ✅');
  } catch (e) {
    Diag.log('[XR] requestSession FAILED: ' + (e?.message || e));
  }
}

let fpsAcc = 0, fpsFrames = 0;
function loop() {
  const dt = clock.getDelta();
  xrInput.update();

  // Mirror controller state
  APP_STATE.left.connected = xrInput.left.connected;
  APP_STATE.left.gamepad = xrInput.left.gamepad;
  APP_STATE.right.connected = xrInput.right.connected;
  APP_STATE.right.gamepad = xrInput.right.gamepad;

  // Update locomotion and teleport
  locomotion.update(dt);
  teleport.update();

  // FPS
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) {
    APP_STATE.fps = Math.round(fpsFrames / fpsAcc);
    fpsAcc = 0; fpsFrames = 0;
  }

  Diag.tick(APP_STATE);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
