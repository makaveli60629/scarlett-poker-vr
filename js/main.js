/**
 * ===========================================================
 * FILE: /js/main.js
 * PROJECT: Scarlett Poker VR — New Update 1.0 (PERMANENT BOOT)
 *
 * PURPOSE:
 *  - Single source of truth for boot order
 *  - Always-on diagnostics (HUD + console)
 *  - Android: on-screen movement + action + menu
 *  - Quest: controller support stays enabled
 *
 * IMPORTANT RULE:
 *  - index.html loads ONLY this file
 *  - this file decides what other modules run
 *
 * HOW TO USE DEV MODES:
 *  - Add ?dev=1 to URL for extra logs
 *  - Add ?touch=1 to force touch controls
 * ===========================================================
 */

import * as THREE from './three.js';
import { VRButton } from './VRButton.js';

// We will use your existing modules if present
import { World } from './world.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';

// Optional modules: safe import helper (if you have it)
let SafeImport = null;
try { SafeImport = await import('./safe_import.js'); } catch (e) { /* optional */ }

const qs = new URLSearchParams(location.search);
const DEV = qs.get('dev') === '1';
const FORCE_TOUCH = qs.get('touch') === '1';

// DOM
const hud = document.getElementById('hud');
const toastEl = document.getElementById('toast');
const touchLayer = document.getElementById('touchControls');
const btnDev = document.getElementById('btnDev');
const btnTouch = document.getElementById('btnTouch');

function hudSet(txt) {
  if (!hud) return;
  hud.innerHTML = `<div class="t">Scarlett Poker VR — New Update 1.0</div>${txt}`;
}
function toast(msg, ms = 1600) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.style.display = 'none', ms);
}

function log(...a) { console.log('[BOOT]', ...a); }
function warn(...a) { console.warn('[BOOT]', ...a); }
function err(...a) { console.error('[BOOT]', ...a); }

window.addEventListener('error', (e) => {
  err('window.error', e.message);
  hudSet(`❌ ERROR:\n${e.message}\n${e.filename || ''}:${e.lineno || ''}`);
});
window.addEventListener('unhandledrejection', (e) => {
  err('unhandledrejection', e.reason);
  hudSet(`❌ PROMISE ERROR:\n${String(e.reason)}`);
});

const isLikelyAndroid = /Android/i.test(navigator.userAgent);
const isLikelyQuest = /OculusBrowser|Quest/i.test(navigator.userAgent);

btnDev?.addEventListener('click', () => {
  const u = new URL(location.href);
  u.searchParams.set('dev', DEV ? '0' : '1');
  location.href = u.toString();
});
btnTouch?.addEventListener('click', () => {
  const u = new URL(location.href);
  u.searchParams.set('touch', FORCE_TOUCH ? '0' : '1');
  location.href = u.toString();
});

// -----------------------------------------------------------
// RENDERER / SCENE / CAMERA / CLOCK
// -----------------------------------------------------------
const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// VR Button (Quest)
app.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200);
camera.position.set(0, 1.6, 3);

// Player Group (rig root)
const player = new THREE.Group();
player.name = 'PLAYER_RIG';
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

const clock = new THREE.Clock();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------------------------------------
// INPUT STATE (unifies Android + Keyboard + XR buttons)
// -----------------------------------------------------------
const input = {
  moveX: 0, moveZ: 0,
  turn: 0,
  action: false,
  menu: false,
  // for UI display
  mode: 'UNKNOWN',
};

function setTouchEnabled(enabled) {
  if (!touchLayer) return;
  touchLayer.style.display = enabled ? 'block' : 'none';
}

function bindTouchButtons() {
  if (!touchLayer) return;

  const active = new Set();

  const setKey = (k, down) => {
    if (down) active.add(k);
    else active.delete(k);

    // movement
    input.moveX = (active.has('right') ? 1 : 0) + (active.has('left') ? -1 : 0);
    input.moveZ = (active.has('forward') ? 1 : 0) + (active.has('back') ? -1 : 0);

    // turning
    input.turn = (active.has('turnR') ? -1 : 0) + (active.has('turnL') ? 1 : 0);

    // action/menu (momentary)
    input.action = active.has('action');
    input.menu = active.has('menu');
  };

  const btns = touchLayer.querySelectorAll('button[data-key]');
  btns.forEach((b) => {
    const key = b.getAttribute('data-key');
    const down = (ev) => { ev.preventDefault(); setKey(key, true); };
    const up = (ev) => { ev.preventDefault(); setKey(key, false); };

    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
}

function bindKeyboard() {
  const held = new Set();
  window.addEventListener('keydown', (e) => {
    held.add(e.code);
    if (e.code === 'KeyM') input.menu = true;
    if (e.code === 'Space') input.action = true;
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    if (e.code === 'KeyM') input.menu = false;
    if (e.code === 'Space') input.action = false;
  });

  const apply = () => {
    const left  = held.has('KeyA') || held.has('ArrowLeft');
    const right = held.has('KeyD') || held.has('ArrowRight');
    const up    = held.has('KeyW') || held.has('ArrowUp');
    const down  = held.has('KeyS') || held.has('ArrowDown');
    input.moveX = (right ? 1 : 0) + (left ? -1 : 0);
    input.moveZ = (up ? 1 : 0) + (down ? -1 : 0);

    const q = held.has('KeyQ');
    const e = held.has('KeyE');
    input.turn = (q ? 1 : 0) + (e ? -1 : 0);
  };

  // call every frame via update loop
  return apply;
}

// XR button mapping (Quest controllers)
function readXRButtons() {
  // Use WebXR gamepad mapping if available
  const session = renderer.xr.getSession();
  if (!session) return;

  let action = false;
  let menu = false;

  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp) continue;

    // Common mapping:
    // buttons[0] trigger, buttons[1] squeeze/grip, buttons[3] / buttons[4] etc vary
    const b = gp.buttons || [];

    const trigger = b[0]?.pressed;
    const grip = b[1]?.pressed;

    // Menu is not always exposed; we map "A/X" style buttons as menu fallback.
    const ax = b[4]?.pressed || b[5]?.pressed || b[3]?.pressed;

    action = action || !!(trigger || grip);
    menu = menu || !!ax;
  }

  input.action = action;
  input.menu = menu;
}

// -----------------------------------------------------------
// BOOT ORDER
// -----------------------------------------------------------
hudSet([
  `UA: ${navigator.userAgent}`,
  `XR: ${navigator.xr ? 'true' : 'false'}`,
  `Mode Guess: ${isLikelyQuest ? 'Quest' : (isLikelyAndroid ? 'Android' : 'Desktop')}`,
  `DEV: ${DEV ? 'ON' : 'OFF'}`,
].join('\n'));

log('Boot start', { DEV, FORCE_TOUCH, isLikelyAndroid, isLikelyQuest });

bindTouchButtons();
const applyKeyboard = bindKeyboard();

// Decide touch mode
const useTouch = FORCE_TOUCH || (isLikelyAndroid && !isLikelyQuest);
setTouchEnabled(useTouch);
input.mode = useTouch ? 'ANDROID_TOUCH' : (isLikelyQuest ? 'QUEST_XR' : 'DESKTOP');
toast(useTouch ? 'Touch controls enabled' : 'Touch controls off');

// Build world (your current world.js)
let worldCtx = null;
try {
  worldCtx = World?.build?.({
    THREE,
    scene,
    renderer,
    player,
    camera,
    dev: DEV,
    log,
    warn,
  }) || {};
  log('World built');
} catch (e) {
  err('World.build failed', e);
  hudSet(`❌ World.build failed:\n${String(e?.message || e)}`);
}

// Controls (your controls.js) — we pass unified input
let controlsCtx = null;
try {
  controlsCtx = Controls?.init?.({
    THREE,
    scene,
    renderer,
    player,
    camera,
    input,
    dev: DEV,
    log,
    warn,
    // if your controls want it:
    world: worldCtx,
  }) || {};
  log('Controls init ok');
} catch (e) {
  err('Controls.init failed', e);
  hudSet(`❌ Controls.init failed:\n${String(e?.message || e)}`);
}

// UI (your ui.js) — hook menu/action
let uiCtx = null;
try {
  uiCtx = UI?.init?.({
    THREE,
    scene,
    renderer,
    player,
    camera,
    input,
    dev: DEV,
    log,
    warn,
    world: worldCtx,
  }) || {};
  log('UI init ok');
} catch (e) {
  warn('UI.init failed (non-fatal)', e);
}

// -----------------------------------------------------------
// MAIN LOOP
// -----------------------------------------------------------
let frames = 0;
let fps = 0;
let fpsT = 0;

function updateHUD(dt) {
  frames++;
  fpsT += dt;
  if (fpsT >= 0.5) {
    fps = Math.round(frames / fpsT);
    frames = 0;
    fpsT = 0;
  }

  const pos = player.position;
  hudSet([
    `Mode: ${input.mode}   FPS: ${fps}`,
    `Player: x=${pos.x.toFixed(2)} y=${pos.y.toFixed(2)} z=${pos.z.toFixed(2)}`,
    `Move: x=${input.moveX} z=${input.moveZ} turn=${input.turn}`,
    `Action: ${input.action ? '1' : '0'}   Menu: ${input.menu ? '1' : '0'}`,
    `XR Session: ${renderer.xr.getSession() ? 'YES' : 'NO'}`,
    `DEV: ${DEV ? 'ON' : 'OFF'}   TOUCH: ${useTouch ? 'ON' : 'OFF'}`,
  ].join('\n'));
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());

  // Desktop keys
  applyKeyboard?.();

  // Quest buttons (only when in XR session)
  readXRButtons();

  // Let your modules update if they expose tick/update
  try { worldCtx?.tick?.(dt); } catch {}
  try { controlsCtx?.tick?.(dt); } catch {}
  try { uiCtx?.tick?.(dt); } catch {}

  // If your Controls module does nothing, we provide a basic fallback movement:
  if (!controlsCtx?.handlesMovement) {
    const speed = 2.0;          // m/s
    const turnSpeed = 1.8;      // rad/s

    // forward direction (camera yaw)
    const yaw = camera.rotation.y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const move = new THREE.Vector3();
    move.addScaledVector(right, input.moveX);
    move.addScaledVector(forward, input.moveZ);
    if (move.lengthSq() > 0) move.normalize();

    player.position.addScaledVector(move, speed * dt);
    player.rotation.y += input.turn * turnSpeed * dt;
  }

  // Menu toggle hook (one-shot)
  if (input.menu) {
    uiCtx?.toggleMenu?.();
    // prevent rapid spam on touch
    input.menu = false;
  }

  // Action hook (example)
  if (input.action) {
    uiCtx?.onAction?.();
    // keep action held allowed; your UI can debounce
  }

  updateHUD(dt);
  renderer.render(scene, camera);
});

log('Animation loop running ✅');
toast('Boot OK ✅');
