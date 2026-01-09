// /js/main.js — Scarlett VR Poker (SAFE PARSE BOOT)
// Static imports only. No dynamic import URL concatenation.
// Includes polyfills so main never crashes if world.js is missing methods.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { World } from "./world.js";

function emitLog(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

const BUILD_V = window.__BUILD_V || Date.now().toString();

// ---------- Renderer / Scene ----------
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

const player = new THREE.Group();
player.position.set(0, 1.7, 6);
player.add(camera);
scene.add(player);

// Baseline lights (prevents black screen even if world modules fail)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(7, 11, 6);
scene.add(sun);

// Controllers placeholders
const controllers = { left: null, right: null };
try {
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  scene.add(controllers.left);
  scene.add(controllers.right);
} catch {}

// ---------- World ----------
const world = World.init({ THREE, scene, renderer, camera, player, controllers, log: emitLog });

// ✅ Polyfills so main NEVER crashes again
world.flags = world.flags || { teleport: true, move: true, snap: true, hands: true };

if (typeof world.setFlag !== "function") {
  emitLog("[main] ⚠️ world.setFlag missing — polyfilled");
  world.setFlag = (k, v) => { world.flags[k] = !!v; };
}
if (typeof world.getFlag !== "function") {
  world.getFlag = (k) => !!world.flags?.[k];
}
if (typeof world.update !== "function") {
  world.update = () => {};
}

// apply defaults
world.setFlag("teleport", true);
world.setFlag("move", true);
world.setFlag("snap", true);
world.setFlag("hands", true);

// ---------- VR Button ----------
const vrBtn = VRButton.createButton(renderer);
document.body.appendChild(vrBtn);

// Hook HUD “Enter VR”
window.addEventListener("scarlett-enter-vr", () => {
  try { vrBtn.click(); emitLog("[main] enter-vr forwarded"); } catch {}
});

// Hook HUD toggles
window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

// Recenter
window.addEventListener("scarlett-recenter", () => {
  emitLog("[main] recenter");
  if (typeof world.standPlayerInLobby === "function") world.standPlayerInLobby();
  else player.position.set(0, 1.7, 6);
});

// ---------- Input (Android dock + keyboard) ----------
const touch = { f:0, b:0, l:0, r:0, turnL:0, turnR:0 };
window.addEventListener("scarlett-touch", (e) => {
  const d = e?.detail || {};
  touch.f = d.f || 0;
  touch.b = d.b || 0;
  touch.l = d.l || 0;
  touch.r = d.r || 0;
  touch.turnL = d.turnL || 0;
  touch.turnR = d.turnR || 0;
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

function moveIntent(){
  let x = 0, z = 0;

  // keyboard
  if (keys.KeyW) z += 1;
  if (keys.KeyS) z -= 1;
  if (keys.KeyA) x -= 1;
  if (keys.KeyD) x += 1;

  // touch dock
  if (touch.f) z += 1;
  if (touch.b) z -= 1;
  if (touch.l) x -= 1;
  if (touch.r) x += 1;

  return { x, z };
}

function turnIntent(){
  let t = 0;

  // keyboard Q/E
  if (keys.KeyQ) t += 1;
  if (keys.KeyE) t -= 1;

  // touch dock
  if (touch.turnL) t += 1;
  if (touch.turnR) t -= 1;

  return t;
}

// ---------- Loop ----------
let last = performance.now();
let snapCooldown = 0;

function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Turn
  const t = turnIntent();
  const snap = world.getFlag("snap");
  if (t) {
    if (snap) {
      snapCooldown -= dt;
      if (snapCooldown <= 0) {
        const step = THREE.MathUtils.degToRad(45) * Math.sign(t);
        player.rotation.y += step;
        snapCooldown = 0.22;
      }
    } else {
      player.rotation.y += t * dt * 1.65; // smooth
      snapCooldown = 0;
    }
  } else {
    snapCooldown = 0;
  }

  // Move
  if (world.getFlag("move")) {
    const { x, z } = moveIntent();
    if (x || z) {
      const v = new THREE.Vector2(x, z);
      if (v.length() > 1) v.normalize();

      const speed = 2.0;
      const dir = new THREE.Vector3(v.x, 0, -v.y);
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);

      const from = player.position.clone();
      const to = from.clone().addScaledVector(dir, speed * dt);

      if (typeof world.resolvePlayerCollision === "function") {
        const fixed = world.resolvePlayerCollision(from, to);
        player.position.copy(fixed);
      } else {
        player.position.copy(to);
      }
    }
  }

  // Update hooks
  try { world.update(dt); } catch {}

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(loop);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for debugging
window.__SCARLETT_WORLD = world;

emitLog("[main] boot ✅ v=" + BUILD_V);
