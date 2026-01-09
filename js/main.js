// /js/main.js — Scarlett VR Poker (Boot + Controls + World)
// HARD FIX: if world.setFlag is missing, polyfill it so main never crashes.

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { World } from "./world.js?v=" + encodeURIComponent(window.__BUILD_V || Date.now().toString());

function log(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

const v = window.__BUILD_V || Date.now().toString();

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.7, 6);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Minimal lighting so you never get “black room”
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(6, 10, 5);
scene.add(sun);

// Controllers placeholder (your other modules can enhance later)
const controllers = {
  left: null,
  right: null,
  grips: [],
};
try {
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  scene.add(controllers.left);
  scene.add(controllers.right);
} catch {}

const world = World.init({ THREE, scene, renderer, camera, player, controllers, log });

// ✅ POLYFILL: the exact crash you have
if (typeof world.setFlag !== "function") {
  log("[main] ⚠️ world.setFlag missing — polyfilling");
  world.flags = world.flags || { teleport:true, move:true, snap:true, hands:true };
  world.setFlag = (k, val) => { world.flags[k] = !!val; };
}
if (typeof world.getFlag !== "function") {
  world.getFlag = (k) => !!world.flags?.[k];
}

// default flags (safe)
world.setFlag("teleport", true);
world.setFlag("move", true);
world.setFlag("snap", true);
world.setFlag("hands", true);

// --- VR Button ---
const btn = VRButton.createButton(renderer);
document.body.appendChild(btn);

// Allow your HUD “Enter VR” button to trigger VR
window.addEventListener("scarlett-enter-vr", () => {
  try { btn.click(); log("[main] enter-vr forwarded to VRButton"); } catch {}
});

// Recenter hook
window.addEventListener("scarlett-recenter", () => {
  log("[main] recenter");
  if (typeof world.standPlayerInLobby === "function") world.standPlayerInLobby();
  else player.position.set(0, 1.7, 6);
});

// Flags from HUD
window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

// Touch dock movement (Android)
const touch = { f:0, b:0, l:0, r:0, turnL:0, turnR:0 };
window.addEventListener("scarlett-touch", (e) => {
  const d = e?.detail || {};
  touch.f = d.f||0; touch.b = d.b||0; touch.l = d.l||0; touch.r = d.r||0;
  touch.turnL = d.turnL||0; touch.turnR = d.turnR||0;
});

// Keyboard (desktop debug)
const keys = {};
addEventListener("keydown", (e)=> keys[e.code]=true);
addEventListener("keyup", (e)=> keys[e.code]=false);

function getMoveIntent(){
  let x = 0, z = 0;
  if (keys["KeyW"]) z += 1;
  if (keys["KeyS"]) z -= 1;
  if (keys["KeyA"]) x -= 1;
  if (keys["KeyD"]) x += 1;

  // touch dock
  z += touch.f ? 1 : 0;
  z -= touch.b ? 1 : 0;
  x -= touch.l ? 1 : 0;
  x += touch.r ? 1 : 0;

  return { x, z };
}

function getTurnIntent(){
  let t = 0;
  if (keys["KeyQ"]) t += 1;
  if (keys["KeyE"]) t -= 1;
  t += touch.turnL ? 1 : 0;
  t -= touch.turnR ? 1 : 0;
  return t;
}

let lastT = performance.now();
function animate(t){
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  // Turn
  const turn = getTurnIntent();
  const snap = world.getFlag("snap");
  if (turn) {
    if (snap) {
      // 45° snap
      world._snapCooldown = (world._snapCooldown || 0) - dt;
      if (world._snapCooldown <= 0) {
        const step = THREE.MathUtils.degToRad(45) * Math.sign(turn);
        player.rotation.y += step;
        world._snapCooldown = 0.22;
      }
    } else {
      // smooth
      player.rotation.y += turn * dt * 1.6;
    }
  } else {
    world._snapCooldown = 0;
  }

  // Move
  if (world.getFlag("move")) {
    const { x, z } = getMoveIntent();
    if (x || z) {
      const v2 = new THREE.Vector2(x, z);
      if (v2.length() > 1) v2.normalize();

      const speed = 2.0; // m/s
      const dir = new THREE.Vector3(v2.x, 0, -v2.y);
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

  // World update hook
  try { world.update(dt); } catch {}

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

log("[main] boot ✅ v=" + v);
window.__SCARLETT_WORLD = world;
