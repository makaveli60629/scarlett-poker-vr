// /js/index.js — Scarlett Runtime (FULL) v1.2
// ✅ Three.js via CDN (module)
// ✅ VRButton + XR init
// ✅ Android touch look + WASD flycam (debug)
// ✅ Imports world via relative path
// ✅ Logs to HUD + exposes safe hooks

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js"; // IMPORTANT: relative import

const pad = (n) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const out = [];
function log(m) {
  const line = `[${now()}] ${m}`;
  out.push(line);
  console.log(line);

  const el = document.getElementById("hud-log");
  if (el) el.textContent = out.slice(-120).join("\n");

  if (typeof window.__HTML_LOG === "function") {
    try { window.__HTML_LOG(line); } catch {}
  }
}

function setStatus(t) {
  if (typeof window.__SET_BOOT_STATUS === "function") {
    try { window.__SET_BOOT_STATUS(t); } catch {}
  }
}

log(`[index] runtime start ✅ base=${window.SCARLETT_BASE || "/"}`);
setStatus("index init…");

// ---------- Renderer / Scene / Camera ----------
const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 500);
camera.position.set(0, 1.6, 2.0);

// Player rig so XR can move it cleanly
const player = new THREE.Group();
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// lights (basic fallback even if world fails)
{
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 8, 4);
  scene.add(dir);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- VR Button ----------
try {
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  log("[index] VRButton appended ✅");
} catch (e) {
  log(`[index] VRButton failed ❌ ${e?.message || String(e)}`);
}

// Optional: manual Enter VR button in HUD
const enterVrBtn = document.getElementById("enterVrBtn");
enterVrBtn?.addEventListener("click", async () => {
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const sessionInit = {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers", "dom-overlay"],
      domOverlay: { root: document.body }
    };
    const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
    renderer.xr.setSession(session);
    log("[index] manual XR session start ✅");
  } catch (e) {
    log(`[index] manual XR failed ❌ ${e?.message || String(e)}`);
  }
});

// ---------- Android / Desktop Debug Controls ----------
const input = {
  keys: new Set(),
  dragging: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0
};

window.addEventListener("keydown", (e) => input.keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => input.keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener("pointerdown", (e) => {
  // only for non-XR debug look
  if (renderer.xr.isPresenting) return;
  input.dragging = true;
  input.lastX = e.clientX;
  input.lastY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});

renderer.domElement.addEventListener("pointerup", () => {
  input.dragging = false;
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (renderer.xr.isPresenting) return;
  if (!input.dragging) return;

  const dx = e.clientX - input.lastX;
  const dy = e.clientY - input.lastY;
  input.lastX = e.clientX;
  input.lastY = e.clientY;

  // touch look
  input.yaw -= dx * 0.003;
  input.pitch -= dy * 0.003;
  input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch));
});

// ---------- World Load ----------
let worldApi = null;

(async () => {
  try {
    setStatus("loading world…");
    log("[index] importing + init world…");

    // Your world.js should export World.init({ ... }) safely
    worldApi = await World.init?.({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers: null,
      log,
      BUILD: Date.now()
    });

    log("[index] world init ✅");
    setStatus("ready");
  } catch (e) {
    log(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setStatus("world failed ❌ (see log)");
  }
})();

// ---------- Animate ----------
const v3 = new THREE.Vector3();
const forward = new THREE.Vector3();

function updateDebugControls(dt) {
  if (renderer.xr.isPresenting) return;

  // apply look
  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;

  const speed = input.keys.has("shift") ? 4.5 : 2.2;

  // WASD move in facing direction (flat)
  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();

  const right = v3.set(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  right.normalize();

  const move = v3.set(0, 0, 0);
  if (input.keys.has("w")) move.add(forward);
  if (input.keys.has("s")) move.sub(forward);
  if (input.keys.has("a")) move.sub(right);
  if (input.keys.has("d")) move.add(right);
  if (input.keys.has("q")) move.y -= 1;
  if (input.keys.has("e")) move.y += 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.position.add(move);
  }
}

let last = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    updateDebugControls(dt);
    worldApi?.tick?.(dt);
  } catch (e) {
    log(`[index] tick error ❌ ${e?.message || String(e)}`);
  }

  renderer.render(scene, camera);
});
