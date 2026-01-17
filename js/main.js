import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { World } from './world.js';
import { UI } from './ui.js';
import { Diag } from './diag.js';
import { XRInput } from './xr_input.js';
import { Teleport } from './teleport.js';

const BUILD = 'SCARLETT1_RUNTIME_SURGICAL_v4_4';

const APP_STATE = {
  build: BUILD,
  three: true,
  xr: false,
  renderer: false,
  world: false,
  inXR: false,

  teleportEnabled: false,
  touchOn: false,

  // controller status
  left: { connected:false, gamepad:false },
  right:{ connected:false, gamepad:false },

  floors: [], // teleport raycast targets
};

window.APP_STATE = APP_STATE;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
camera.position.set(0, 1.6, 3.0);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
APP_STATE.renderer = true;

document.body.appendChild(renderer.domElement);

// VRButton (real XR entry)
const vrBtn = VRButton.createButton(renderer);
vrBtn.style.display = 'none'; // we use our own button, but this stays in DOM
document.body.appendChild(vrBtn);

// Basic clock
const clock = new THREE.Clock();

// World
const world = World.build({ scene, camera, renderer, APP_STATE });
APP_STATE.world = true;

// Systems
const diag = Diag.create(APP_STATE);
const ui = UI.create(APP_STATE, diag);
const xrInput = XRInput.create({ scene, renderer, camera, APP_STATE, diag });
const teleport = Teleport.create({ scene, renderer, camera, APP_STATE, diag });

// Register teleport floors from World
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
    // programmatically click VRButton
    // Some browsers require a direct user gesture; this is called from button click -> OK.
    vrBtn.click();
  },
  onToggleHUD: () => ui.toggleHUD(),
  onToggleTeleport: () => {
    APP_STATE.teleportEnabled = !APP_STATE.teleportEnabled;
    ui.refreshButtons();
    diag.log(`[teleport] ${APP_STATE.teleportEnabled ? 'ON' : 'OFF'}`);
  },
  onToggleDiag: () => ui.toggleDiagPanel(),
  onPanic: () => {
    diag.log('[PANIC] resetting world pose + states');
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

  // Update subsystems
  xrInput.update(dt);
  teleport.update(dt);
  world.update(dt);

  // Update diag panel (lightweight)
  diag.tick(dt);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Boot logs
diag.log(`[status] booting…`);
diag.log(`BUILD=${BUILD}`);
diag.log(`[status] renderer OK ✅`);
diag.log(`[status] building world…`);
diag.log(`[status] world ready ✅`);
ui.refreshButtons();
diag.setModuleTest();
