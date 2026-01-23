import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initRepoAssets } from './assets.js';
import { initRepoAudio } from './audio.js';
import { createSunkenPokerSystem } from './world.js';

import { createHandTracker } from './modules/hands.js';
import { createSeatingController } from './modules/seating.js';
import { createNetHooks } from './modules/net_hooks.js';
import { applyScorpionVariant } from './modules/scorpion_room.js';

const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.style.display = 'none', 1400);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);
scene.fog = new THREE.Fog(0x0b0f18, 10, 80);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 8);
camera.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const d = new THREE.DirectionalLight(0xffffff, 1.2);
d.position.set(5, 10, 6);
scene.add(d);

const overlay = document.getElementById('overlay');
const bar = document.getElementById('bar');
const status = document.getElementById('status');

const { assets } = initRepoAssets({
  onProgress: ({ itemsLoaded, itemsTotal }) => {
    const p = itemsTotal ? (itemsLoaded / itemsTotal) * 100 : 0;
    bar.style.width = p.toFixed(1) + '%';
    status.textContent = `Loading assets… ${itemsLoaded}/${itemsTotal}`;
  },
  onComplete: () => {
    const t0 = performance.now();
    const timer = setInterval(() => {
      const ok = !!assets.cardAtlasJson;
      const waited = performance.now() - t0;
      status.textContent = ok ? 'Assets loaded.' : `Loading card atlas… ${Math.round(waited)}ms`;
      if (ok || waited > 2500) {
        clearInterval(timer);
        overlay.style.display = 'none';
        if (!ok) toast('Card atlas JSON not found — check path!');
        start();
      }
    }, 120);
  }
});

let pokerSystem = null;
let audio = null;
let handTracker = null;
let seating = null;
let net = null;
let scorpionOff = null;
let teleportOn = true;

function resetToSpawn() {
  camera.position.set(0, 1.6, 8);
  camera.lookAt(0, 1.2, 0);
  toast('Spawn reset');
}

function diagnostics() {
  const info = {
    href: location.href,
    secureContext: window.isSecureContext,
    ua: navigator.userAgent,
    xr: !!navigator.xr,
    sceneChildren: scene.children.length,
    atlasJson: !!assets.cardAtlasJson,
    poker: !!pokerSystem,
  };
  console.log('=== SCARLETT DIAGNOSTICS (UPDATE 4.0 FULL 5 MODULES) ===');
  console.table(info);
  toast('Diagnostics → console');
}

function toggleHud() {
  const hud = document.getElementById('hud');
  hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
}

async function enterVR() {
  if (!navigator.xr) {
    toast('WebXR not available');
    return;
  }
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor','bounded-floor','hand-tracking'],
      requiredFeatures: ['local-floor']
    });
    renderer.xr.setSession(session);
    toast('Entered VR');
  } catch (e) {
    console.warn(e);
    toast('Enter VR failed');
  }
}

function toggleTeleport() {
  teleportOn = !teleportOn;
  document.getElementById('btnTeleport').textContent = `Teleport: ${teleportOn ? 'ON' : 'OFF'}`;
  toast(`Teleport ${teleportOn ? 'ON' : 'OFF'}`);
  window.dispatchEvent(new CustomEvent('scarlett:teleport_toggle', { detail: { enabled: teleportOn } }));
}

function start() {
  handTracker = createHandTracker(renderer);
  audio = initRepoAudio({ camera, scene, assets });
  audio.startAmbient();

  pokerSystem = createSunkenPokerSystem({ scene, renderer, assets, audio, handTracker });
  seating = createSeatingController({ cameraOrRig: camera, pokerSystem, toast });
  net = createNetHooks({ roomId: 'scarlett', playerId: 'local' });

  window.addEventListener('scarlett:shoe_touch', () => {
    net.emit('deal_request', { seat: seating?.seat ?? 0 });
    pokerSystem.debug.dealTwoToSeat(seating?.seat ?? 0);
  });

  document.getElementById('btnEnterVR').onclick = enterVR;
  document.getElementById('btnTeleport').onclick = toggleTeleport;
  document.getElementById('btnReset').onclick = resetToSpawn;
  document.getElementById('btnSeat').onclick = () => seating.toggle();
  document.getElementById('btnDiag').onclick = diagnostics;
  document.getElementById('btnHideHud').onclick = toggleHud;
  document.getElementById('btnDemoDeal').onclick = () => pokerSystem.debug.dealTwoToSeat(seating?.seat ?? 0);
  document.getElementById('btnScorpion').onclick = () => {
    if (!scorpionOff) scorpionOff = applyScorpionVariant({ scene, pokerSystem, textureLoader: new THREE.TextureLoader(), toast });
    else { scorpionOff(); scorpionOff = null; }
  };

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    pokerSystem.update();
    renderer.render(scene, camera);
  });

  toast('Update 4.0 FULL loaded');
}
