import * as THREE from 'three';

import { World } from './world.js';
import { UI } from './ui.js';
import { Diag } from './diag.js';
import { XRInput } from './xr_input.js';
import { Teleport } from './teleport.js';

export const BUILD = 'SCARLETT1_RUNTIME_SURGICAL_v4_4';

const APP_STATE = {
  build: BUILD,
  three: true,
  xr: false,
  renderer: false,
  world: false,
  inXR: false,

  teleportEnabled: false,
  touchOn: false,

  left: { connected:false, gamepad:false },
  right:{ connected:false, gamepad:false },

  floors: []
};

window.APP_STATE = APP_STATE;
window.BUILD = BUILD;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// IMPORTANT: Create a player rig so teleport moves the rig (not the XR camera)
const playerRig = new THREE.Group();
playerRig.name = "PLAYER_RIG";
scene.add(playerRig);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
camera.position.set(0, 1.6, 3.0);
playerRig.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
APP_STATE.renderer = true;

document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// Systems
const diag = Diag.create(APP_STATE);
const ui = UI.create(APP_STATE, diag);

// World
const world = World.build({ scene, camera, renderer, APP_STATE, playerRig });
APP_STATE.world = true;

// XR Input + Teleport
const xrInput = XRInput.create({ scene, renderer, camera, APP_STATE, diag });
const teleport = Teleport.create({ scene, renderer, camera, APP_STATE, diag, playerRig });

// Floors for teleport
APP_STATE.floors = world.floors || [];
teleport.setFloors(APP_STATE.floors);

// XR session hooks
APP_STATE.xr = !!navigator.xr;

renderer.xr.addEventListener('sessionstart', () => {
  APP_STATE.inXR = true;
  diag.log('[XR] sessionstart ✅');
  xrInput.onSessionStart();
  teleport.onSessionStart();
  ui.onSessionStart();
});

renderer.xr.addEventListener('sessionend', () => {
  APP_STATE.inXR = false;
  APP_STATE.left.gamepad = false;
  APP_STATE.right.gamepad = false;
  diag.log('[XR] sessionend');
  xrInput.onSessionEnd();
  teleport.onSessionEnd();
  ui.onSessionEnd();
});

// UI wiring
ui.bind({
  onEnterVR: async () => {
    // Quest-safe: requestSession directly (programmatic VRButton click can be blocked)
    try {
      if (!navigator.xr) {
        diag.log('[XR] navigator.xr missing');
        return;
      }
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers']
      });
      await renderer.xr.setSession(session);
      diag.log('[XR] requestSession ✅');
    } catch (e) {
      diag.log('[XR] requestSession FAILED: ' + (e?.message || e));
    }
  },
  onToggleHUD: () => ui.toggleHUD(),
  onToggleTeleport: () => {
    APP_STATE.teleportEnabled = !APP_STATE.teleportEnabled;
    ui.refreshButtons();
    diag.log(`[teleport] ${APP_STATE.teleportEnabled ? 'ON' : 'OFF'}`);
  },
  onToggleDiag: () => ui.toggleDiagPanel(),
  onPanic: () => {
    diag.log('[PANIC] resetting rig + states');
    world.reset();
    teleport.reset();
    xrInput.reset();
  },
  onTouch: () => {
    APP_STATE.touchOn = !APP_STATE.touchOn;
    ui.refreshButtons();
    diag.log(`[touch] ${APP_STATE.touchOn ? 'ON' : 'OFF'}`);
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main loop
function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  xrInput.update(dt);
  teleport.update(dt);
  world.update(dt);

  diag.tick(dt);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Boot logs
diag.log('[status] booting…');
diag.log(`BUILD=${BUILD}`);
diag.log('[status] renderer OK ✅');
diag.log('[status] building world…');
diag.log('[status] world ready ✅');
ui.refreshButtons();
diag.setModuleTest();
