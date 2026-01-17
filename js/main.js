import * as THREE from 'three';

import { World } from './world.js';
import { UI } from './ui.js';
import { Diag } from './diag.js';
import { XRInput } from './xr_input.js';
import { Teleport } from './teleport.js';
import { Locomotion } from './locomotion.js';

export const BUILD = 'SCARLETT1_RUNTIME_SURGICAL_v4_5';

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

// Player rig: teleport & stick locomotion move THIS group.
// In XR, the camera local pose is controlled by the headset; rig offsets set spawn.
const playerRig = new THREE.Group();
playerRig.name = "PLAYER_RIG";
scene.add(playerRig);

// Camera lives inside the rig.
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
camera.position.set(0, 1.6, 0); // non-XR preview height
playerRig.add(camera);

// Spawn offset (prevents spawning inside table in XR)
playerRig.position.set(0, 0, 3.2);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
APP_STATE.renderer = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const diag = Diag.create(APP_STATE);
const ui = UI.create(APP_STATE, diag);

// Build world at origin (table at 0,0,0). Spawn is handled by rig offset above.
const world = World.build({ scene, camera, renderer, APP_STATE, playerRig });
APP_STATE.world = true;

// XR input + controller rays
const xrInput = XRInput.create({ scene, renderer, APP_STATE, diag, playerRig });

// Teleport uses the RIGHT controller ray (falls back to left).
const teleport = Teleport.create({
  scene, renderer, camera, APP_STATE, diag,
  playerRig,
  getController: () => xrInput.ctrlRight || xrInput.ctrlLeft
});

// Stick locomotion (left stick = move; right stick X = snap turn)
const locomotion = Locomotion.create({ renderer, camera, APP_STATE, diag, playerRig });

// Floors for teleport raycast
APP_STATE.floors = world.floors || [];
teleport.setFloors(APP_STATE.floors);

// XR session hooks
APP_STATE.xr = !!navigator.xr;

renderer.xr.addEventListener('sessionstart', () => {
  APP_STATE.inXR = true;
  diag.log('[XR] sessionstart ✅');
  xrInput.onSessionStart();
  teleport.onSessionStart();
  locomotion.onSessionStart();
  ui.onSessionStart();
});

renderer.xr.addEventListener('sessionend', () => {
  APP_STATE.inXR = false;
  APP_STATE.left.gamepad = false;
  APP_STATE.right.gamepad = false;
  diag.log('[XR] sessionend');
  xrInput.onSessionEnd();
  teleport.onSessionEnd();
  locomotion.onSessionEnd();
  ui.onSessionEnd();
});

ui.bind({
  onEnterVR: async () => {
    try {
      if (!navigator.xr) { diag.log('[XR] navigator.xr missing'); return; }
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
    diag.log('[PANIC] reset spawn');
    playerRig.position.set(0, 0, 3.2);
    playerRig.rotation.set(0, 0, 0);
    teleport.reset();
    locomotion.reset();
  },
  onTouch: () => {
    APP_STATE.touchOn = !APP_STATE.touchOn;
    ui.refreshButtons();
    diag.log(`[touch] ${APP_STATE.touchOn ? 'ON' : 'OFF'}`);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  xrInput.update(dt);
  locomotion.update(dt);   // << movement
  teleport.update(dt);
  world.update(dt);

  diag.tick(dt);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

diag.log('[status] booting…');
diag.log(`BUILD=${BUILD}`);
diag.log('[status] renderer OK ✅');
diag.log('[status] building world…');
diag.log('[status] world ready ✅');
ui.refreshButtons();
diag.setModuleTest();
