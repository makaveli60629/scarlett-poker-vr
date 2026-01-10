// /js/main.js — Scarlett VR Poker Hybrid 1.0 (FULL)
// ✅ VRButton appended FIRST (so you always see it even if world crashes)
// ✅ Works on Quest + Desktop + Android (touch look + 2-finger move fallback)
// ✅ Calls world.update(dt) safely
//
// Assumes you have:
// - /js/three.js wrapper that exports THREE (your existing setup)
// - /js/three/examples/jsm/webxr/VRButton.js (local copy)
// - /js/world.js (provided below)

import * as THREE from "./three.js";
import { VRButton } from "./three/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const BUILD = new URLSearchParams(location.search).get("v") || `${Date.now()}`;
const hudStatus = (msg) => {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
};
const log = (...a) => console.log(...a);

log("BOOT v=" + BUILD);
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + !!navigator.xr);

hudStatus("Initializing renderer…");

// --- Renderer (create first so VRButton can be appended immediately)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// --- VR Button (append BEFORE anything else)
try {
  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "14px";
  btn.style.bottom = "14px";
  btn.style.zIndex = "999999";
  btn.style.borderRadius = "14px";
  btn.style.fontWeight = "800";
  btn.style.padding = "12px 14px";
  document.body.appendChild(btn);
  log("[main] VRButton appended ✅");
  hudStatus("VRButton ready. Loading world…");
} catch (e) {
  console.error("[main] VRButton failed:", e);
  hudStatus("VRButton failed (check console). Loading world anyway…");
}

// --- Scene + camera + player rig
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 12, 75);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
camera.position.set(0, 1.65, 4);

const player = new THREE.Group();
player.name = "player_rig";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// Soft ambient so you never get “black screen” during partial loads
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 0.65));
const d = new THREE.DirectionalLight(0xffffff, 0.75);
d.position.set(10, 18, 6);
scene.add(d);

// --- Controllers (XR)
const controllers = {
  left: null,
  right: null,
  grips: [],
  update() {}
};

function initControllers() {
  try {
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    c0.name = "controller0";
    c1.name = "controller1";
    player.add(c0);
    player.add(c1);

    controllers.left = c0;
    controllers.right = c1;

    // quick visual pointer
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
    const ray0 = new THREE.Line(rayGeom, rayMat); ray0.scale.z = 6;
    const ray1 = new THREE.Line(rayGeom, rayMat.clone()); ray1.scale.z = 6;

    c0.add(ray0);
    c1.add(ray1);

    log("[main] controllers ready ✅");
  } catch (e) {
    console.warn("[main] controllers init failed:", e);
  }
}
initControllers();

// --- Desktop + Android fallback controls (no Oculus required)
const input = {
  keys: new Set(),
  yaw: 0,
  pitch: 0,
  lookActive: false,
  lastX: 0,
  lastY: 0,

  touchMode: {
    active: false,
    oneFinger: false,
    twoFinger: false,
    last: { x: 0, y: 0 },
    last2: { x: 0, y: 0 },
    move: new THREE.Vector2(0, 0)
  }
};

addEventListener("keydown", (e) => input.keys.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => input.keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener("mousedown", (e) => {
  input.lookActive = true;
  input.lastX = e.clientX;
  input.lastY = e.clientY;
});
addEventListener("mouseup", () => (input.lookActive = false));
addEventListener("mousemove", (e) => {
  if (!input.lookActive) return;
  const dx = e.clientX - input.lastX;
  const dy = e.clientY - input.lastY;
  input.lastX = e.clientX;
  input.lastY = e.clientY;

  input.yaw -= dx * 0.0022;
  input.pitch -= dy * 0.0020;
  input.pitch = Math.max(-1.25, Math.min(1.25, input.pitch));
});

renderer.domElement.addEventListener("touchstart", (e) => {
  input.touchMode.active = true;
  if (e.touches.length === 1) {
    input.touchMode.oneFinger = true;
    input.touchMode.twoFinger = false;
    input.touchMode.last.x = e.touches[0].clientX;
    input.touchMode.last.y = e.touches[0].clientY;
  } else if (e.touches.length >= 2) {
    input.touchMode.oneFinger = false;
    input.touchMode.twoFinger = true;
    input.touchMode.last.x = e.touches[0].clientX;
    input.touchMode.last.y = e.touches[0].clientY;
    input.touchMode.last2.x = e.touches[1].clientX;
    input.touchMode.last2.y = e.touches[1].clientY;
  }
}, { passive: false });

renderer.domElement.addEventListener("touchmove", (e) => {
  if (!input.touchMode.active) return;

  if (e.touches.length === 1 && input.touchMode.oneFinger) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - input.touchMode.last.x;
    const dy = y - input.touchMode.last.y;
    input.touchMode.last.x = x;
    input.touchMode.last.y = y;

    input.yaw -= dx * 0.0032;
    input.pitch -= dy * 0.0030;
    input.pitch = Math.max(-1.25, Math.min(1.25, input.pitch));
  }

  if (e.touches.length >= 2 && input.touchMode.twoFinger) {
    // 2-finger drag -> move
    const x1 = e.touches[0].clientX, y1 = e.touches[0].clientY;
    const x2 = e.touches[1].clientX, y2 = e.touches[1].clientY;
    const cx = (x1 + x2) * 0.5;
    const cy = (y1 + y2) * 0.5;

    const lastCx = (input.touchMode.last.x + input.touchMode.last2.x) * 0.5;
    const lastCy = (input.touchMode.last.y + input.touchMode.last2.y) * 0.5;

    const dx = cx - lastCx;
    const dy = cy - lastCy;

    input.touchMode.last.x = x1; input.touchMode.last.y = y1;
    input.touchMode.last2.x = x2; input.touchMode.last2.y = y2;

    // scale for movement
    input.touchMode.move.x = THREE.MathUtils.clamp(dx * 0.0025, -0.25, 0.25);
    input.touchMode.move.y = THREE.MathUtils.clamp(dy * 0.0025, -0.25, 0.25);
  }

  e.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener("touchend", () => {
  input.touchMode.active = false;
  input.touchMode.oneFinger = false;
  input.touchMode.twoFinger = false;
  input.touchMode.move.set(0, 0);
}, { passive: true });

renderer.domElement.addEventListener("dblclick", () => {
  input.yaw = 0;
  input.pitch = 0;
});

// Apply look to player/camera in non-XR
function applyNonXRLook() {
  // Only do this when NOT in XR presenting
  if (renderer.xr.isPresenting) return;
  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;
}

// Simple locomotion when NOT in XR
function applyNonXRMove(dt) {
  if (renderer.xr.isPresenting) return;

  const speed = (input.keys.has("shift") ? 4.8 : 2.8);
  const v = new THREE.Vector3();

  if (input.keys.has("w") || input.keys.has("arrowup")) v.z -= 1;
  if (input.keys.has("s") || input.keys.has("arrowdown")) v.z += 1;
  if (input.keys.has("a") || input.keys.has("arrowleft")) v.x -= 1;
  if (input.keys.has("d") || input.keys.has("arrowright")) v.x += 1;

  // touch 2-finger move
  if (input.touchMode.twoFinger) {
    v.x += input.touchMode.move.x * 5.0;
    v.z += input.touchMode.move.y * 5.0;
  }

  if (v.lengthSq() < 1e-6) return;
  v.normalize().multiplyScalar(speed * dt);

  // rotate movement by player yaw
  const yaw = player.rotation.y;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const dx = v.x * cos - v.z * sin;
  const dz = v.x * sin + v.z * cos;

  player.position.x += dx;
  player.position.z += dz;

  // keep grounded
  player.position.y = 0;
}

// --- Resize
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- Boot world (guarded so VR button survives any crash)
let world = null;

(async () => {
  try {
    hudStatus("Loading world modules…");
    world = await World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD });
    hudStatus("World ready ✅");
    log("[main] world init ✅");
  } catch (e) {
    console.error("[main] world init error:", e);
    hudStatus("World failed (check console). VR button should still show.");
  }
})();

// --- Render loop
let last = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  applyNonXRLook();
  applyNonXRMove(dt);

  try { world?.update?.(dt); } catch (e) { console.warn("[main] world.update error:", e); }
  renderer.render(scene, camera);
});
