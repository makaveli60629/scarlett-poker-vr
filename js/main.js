// /js/main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { buildWorld } from './world.js';

const BUILD = Date.now();
const $ = (id) => document.getElementById(id);
$('build').textContent = `v=${BUILD}`;

function log(...args) {
  console.log(...args);
  const el = $('debug');
  const line = args.map(a => (typeof a === 'string' ? a : (a?.message || JSON.stringify(a)))).join(' ');
  el.textContent = (line + "\n" + el.textContent).slice(0, 1600);
}

function setStatus(html, cls) {
  const s = $('status');
  s.className = cls || '';
  s.textContent = html;
}

setStatus('Initializing renderer…', 'warn');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const vrButton = VRButton.createButton(renderer);
$('vrbtn').appendChild(vrButton);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 1.6, 3.2);

const clock = new THREE.Clock();

// Controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1, controller2);

// Simple "laser" so you can see controllers
function addLaser(ctrl) {
  const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const line = new THREE.Line(geom, mat);
  line.name = 'laser';
  line.scale.z = 4;
  ctrl.add(line);
}
addLaser(controller1);
addLaser(controller2);

setStatus('Building world…', 'warn');
const ctx = { jumbos: null };
ctx.jumbos = (await buildWorld({ scene, log })).jumbos;

setStatus('Ready. Press Space (desktop) or Trigger (VR) to start TV.', 'ok');

// ---- Input helpers ----
let started = false;
async function startTVUserGesture() {
  if (started) return;
  started = true;
  setStatus('Starting TV (muted screens; audio on Screen 1)…', 'warn');
  try {
    await ctx.jumbos.startAll();
    setStatus('TV started ✅  (Use 1–4 to pick audio screen; M mute active; N/P channel)', 'ok');
  } catch (e) {
    setStatus('TV start failed (see console).', 'err');
    log('TV start failed:', e);
  }
}

// Desktop keys
addEventListener('keydown', async (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); await startTVUserGesture(); }
  if (!ctx.jumbos) return;
  if (k === 'm') ctx.jumbos.toggleMuteActive();
  if (k === 'n') await ctx.jumbos.nextChannel(ctx.jumbos.activeAudioScreen);
  if (k === 'p') await ctx.jumbos.prevChannel(ctx.jumbos.activeAudioScreen);
  if (k === '1') ctx.jumbos.setActiveAudioScreen(0);
  if (k === '2') ctx.jumbos.setActiveAudioScreen(1);
  if (k === '3') ctx.jumbos.setActiveAudioScreen(2);
  if (k === '4') ctx.jumbos.setActiveAudioScreen(3);
});

// VR controller gestures
controller1.addEventListener('selectstart', startTVUserGesture);
controller2.addEventListener('selectstart', startTVUserGesture);

// Poll gamepads each frame for buttons (Quest controllers)
function pollXRButtons() {
  const s = renderer.xr.getSession();
  if (!s) return;

  for (const src of s.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.buttons) continue;

    // Button mapping varies, but on Quest typically:
    // buttons[0]=trigger, [1]=squeeze/grip, [3]=A/X, [4]=B/Y, thumbstick click often [2]
    const b = gp.buttons;

    // Edge detection
    if (!gp.__prev) gp.__prev = b.map(x => x.pressed);
    const prev = gp.__prev;

    const pressed = (i) => !!b[i] && b[i].pressed;
    const just = (i) => pressed(i) && !prev[i];

    if (just(0)) { startTVUserGesture(); }
    if (!ctx.jumbos) continue;

    // A/X next channel
    if (just(3)) { ctx.jumbos.nextChannel(ctx.jumbos.activeAudioScreen); }
    // B/Y prev channel
    if (just(4)) { ctx.jumbos.prevChannel(ctx.jumbos.activeAudioScreen); }
    // Grip toggle mute
    if (just(1)) { ctx.jumbos.toggleMuteActive(); }
    // Thumbstick click cycle active audio screen
    if (just(2)) { ctx.jumbos.cycleActiveAudio(); }

    gp.__prev = b.map(x => x.pressed);
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

renderer.setAnimationLoop(() => {
  pollXRButtons();

  // Update HUD label (throttled)
  if (!window.__hudT) window.__hudT = 0;
  const now = performance.now();
  if (ctx.jumbos?.screens?.length && (now - window.__hudT) > 250) {
    window.__hudT = now;
    const lines = [];
    for (let i = 0; i < ctx.jumbos.screens.length; i++) {
      lines.push(`Screen ${i + 1}: ${ctx.jumbos.label(i)}`);
    }
    $('debug').textContent = lines.join('\n');
  }

  renderer.render(scene, camera);
});
