// /js/index.js — ScarlettVR Prime 10.0 DRIVER (FULL)
// ✅ Three.js via CDN (module)
// ✅ VRButton + optional manual XR
// ✅ Hands Only (no controller models)
// ✅ Android dual sticks (move+look)
// ✅ HUD toggle + Copy logs
// ✅ Loads World orchestrator

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";

const pad = (n) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const LOG_BUF = [];
function log(m) {
  const line = `[${now()}] ${m}`;
  LOG_BUF.push(line);
  if (LOG_BUF.length > 260) LOG_BUF.splice(0, LOG_BUF.length - 260);
  console.log(line);

  const el = document.getElementById("hud-log");
  if (el) el.textContent = LOG_BUF.slice(-120).join("\n");

  if (typeof window.__HTML_LOG === "function") {
    try { window.__HTML_LOG(line); } catch {}
  }
}

function setStatus(t) {
  if (typeof window.__SET_BOOT_STATUS === "function") {
    try { window.__SET_BOOT_STATUS(t); } catch {}
  }
}

// --- ensure minimal HUD exists even if index.html is minimal ---
function ensureHUD() {
  let hud = document.getElementById("hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    hud.style.cssText = `
      position:fixed; left:10px; top:10px; z-index:9999;
      background:rgba(0,0,0,0.55); color:#fff; padding:10px;
      font:12px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      max-width: 92vw; border-radius:10px;
    `;
    document.body.appendChild(hud);
  }

  let logEl = document.getElementById("hud-log");
  if (!logEl) {
    logEl = document.createElement("pre");
    logEl.id = "hud-log";
    logEl.style.cssText = `white-space:pre-wrap; margin:8px 0 0 0; max-height: 40vh; overflow:auto;`;
    hud.appendChild(logEl);
  }

  // control row
  let row = document.getElementById("hud-row");
  if (!row) {
    row = document.createElement("div");
    row.id = "hud-row";
    row.style.cssText = `display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;`;
    hud.insertBefore(row, hud.firstChild);
  }

  function btn(id, text) {
    let b = document.getElementById(id);
    if (!b) {
      b = document.createElement("button");
      b.id = id;
      b.textContent = text;
      b.style.cssText = `
        padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.25);
        background:rgba(20,25,40,0.7); color:#fff;
      `;
      row.appendChild(b);
    }
    return b;
  }

  const bHide = btn("btnHud", "HUD");
  const bCopy = btn("btnCopy", "COPY LOG");
  const bHand = btn("btnNewHand", "NEW HAND");

  const rooms = [
    ["btnLobby","LOBBY","lobby"],
    ["btnPoker","POKER","poker"],
    ["btnStore","STORE","store"],
    ["btnScorpion","SCORPION","scorpion"],
    ["btnSpectate","SPECTATE","spectate"],
  ];
  for (const [id,label] of rooms) btn(id, label);

  // manual XR (optional)
  let enterVrBtn = document.getElementById("enterVrBtn");
  if (!enterVrBtn) {
    enterVrBtn = btn("enterVrBtn", "ENTER VR");
  }

  // UI hooks for DebugHUD
  window.SCARLETT_UI = window.SCARLETT_UI || {};
  window.SCARLETT_UI.setPerf = (s) => {};
  window.SCARLETT_UI.setHealth = (s) => {};
  window.SCARLETT_UI.setRoom = (s) => {};
  window.SCARLETT_UI.setPos = (s) => {};
  window.SCARLETT_UI.setXR = (s) => {};
  window.SCARLETT_UI.setBots = (s) => {};

  // HUD toggle
  let hudOn = true;
  function toggleHUD(force) {
    hudOn = (typeof force === "boolean") ? force : !hudOn;
    hud.style.display = hudOn ? "block" : "none";
  }

  bHide.onclick = () => toggleHUD();
  bCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(LOG_BUF.join("\n"));
      log("[hud] copied ✅");
    } catch {
      log("[hud] copy failed ⚠️ (clipboard blocked)");
    }
  };

  // allow keyboard H toggle
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "h") toggleHUD();
  });

  return { hud, toggleHUD };
}

const { toggleHUD } = ensureHUD();

log(`[index] Prime 10.0 start ✅ base=${window.SCARLETT_BASE || "/"}`);
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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 600);
camera.position.set(0, 1.6, 2.0);

// Player rig
const player = new THREE.Group();
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// fallback light
{
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 10, 4);
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

// Manual XR button (backup)
document.getElementById("enterVrBtn")?.addEventListener("click", async () => {
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const sessionInit = {
      optionalFeatures: [
        "local-floor","bounded-floor","local","viewer",
        "hand-tracking","layers","dom-overlay"
      ],
      domOverlay: { root: document.body }
    };
    const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
    await renderer.xr.setSession(session);
    log("[index] manual XR session start ✅");
  } catch (e) {
    log(`[index] manual XR failed ❌ ${e?.message || String(e)}`);
  }
});

// ---------- Desktop debug look/move (fallback) ----------
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
  if (renderer.xr.isPresenting) return;
  input.dragging = true;
  input.lastX = e.clientX;
  input.lastY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});

renderer.domElement.addEventListener("pointerup", () => { input.dragging = false; });

renderer.domElement.addEventListener("pointermove", (e) => {
  if (renderer.xr.isPresenting) return;
  if (!input.dragging) return;
  const dx = e.clientX - input.lastX;
  const dy = e.clientY - input.lastY;
  input.lastX = e.clientX;
  input.lastY = e.clientY;
  input.yaw -= dx * 0.003;
  input.pitch -= dy * 0.003;
  input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch));
});

const v3 = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function applyWASD(dt) {
  if (renderer.xr.isPresenting) return;

  // look
  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;

  const speed = input.keys.has("shift") ? 4.5 : 2.2;

  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0; forward.normalize();

  right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0; right.normalize();

  v3.set(0, 0, 0);
  if (input.keys.has("w")) v3.add(forward);
  if (input.keys.has("s")) v3.sub(forward);
  if (input.keys.has("a")) v3.sub(right);
  if (input.keys.has("d")) v3.add(right);
  if (input.keys.has("q")) v3.y -= 1;
  if (input.keys.has("e")) v3.y += 1;

  if (v3.lengthSq() > 0) {
    v3.normalize().multiplyScalar(speed * dt);
    player.position.add(v3);
  }
}

// ---------- Load World ----------
let world = null;

(async () => {
  try {
    setStatus("loading world…");
    log("[index] init world…");

    world = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      log
    });

    log("[index] world init ✅");
    setStatus("ready ✅");
  } catch (e) {
    log(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setStatus("world failed ❌");
    toggleHUD(true);
  }
})();

// ---------- Animate ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    applyWASD(dt);
    world?.tick?.(dt, t / 1000);
  } catch (e) {
    log(`[index] tick error ❌ ${e?.message || String(e)}`);
  }

  renderer.render(scene, camera);
});
