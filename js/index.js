// /js/index.js — ScarlettVR Prime 10.0 DRIVER (FULL) v10.5
// ✅ Three.js via CDN (module)
// ✅ VRButton + Manual Enter VR (with dom-overlay + hand-tracking)
// ✅ Always-on Diagnostics HUD hooks (hide/show + copy log)
// ✅ Android/Touch: UISticks overlay works (touchAction fixed)
// ✅ Hands-only (no controller models) + Lasers via XRHands (hand + gaze fallback)
// ✅ Calls World.init() and runs world.tick(dt,t)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";

const BUILD = Date.now();

// -------------------- HUD HELPERS --------------------
const pad2 = (n) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const OUT = [];
function hudLog(line) {
  const msg = `[${now()}] ${line}`;
  OUT.push(msg);
  console.log(msg);

  const el = document.getElementById("hud-log");
  if (el) el.textContent = OUT.slice(-160).join("\n");

  // Optional hook from your HTML boot page
  if (typeof window.__HTML_LOG === "function") {
    try { window.__HTML_LOG(msg); } catch {}
  }
}

function setBootStatus(t) {
  if (typeof window.__SET_BOOT_STATUS === "function") {
    try { window.__SET_BOOT_STATUS(t); } catch {}
  }
}

// HUD toggle/hide logic
function ensureHudWiring() {
  const hud = document.getElementById("hud");
  const btnToggleHud = document.getElementById("btnToggleHud");
  const btnCopyLog = document.getElementById("btnCopyLog");

  if (btnToggleHud && hud) {
    btnToggleHud.addEventListener("click", () => {
      const hidden = hud.classList.toggle("hud-hidden");
      hudLog(`[hud] ${hidden ? "hidden" : "shown"} ✅`);
    });
  }

  if (btnCopyLog) {
    btnCopyLog.addEventListener("click", async () => {
      try {
        const txt = OUT.join("\n");
        await navigator.clipboard.writeText(txt);
        hudLog("[hud] copied ✅");
      } catch (e) {
        hudLog(`[hud] copy failed ⚠️ ${e?.message || String(e)}`);
      }
    });
  }
}

// -------------------- APP / RENDERER --------------------
hudLog(`[index] Prime 10.0 start ✅ base=${window.SCARLETT_BASE || "/"} build=${BUILD}`);
setBootStatus("index init…");

const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

app.appendChild(renderer.domElement);

// IMPORTANT: allow UI sticks + prevent browser gestures stealing touch
renderer.domElement.style.touchAction = "none";
renderer.domElement.style.userSelect = "none";

// Scene/camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 800);
camera.position.set(0, 1.6, 2.0);

// Player rig
const player = new THREE.Group();
player.name = "PLAYER_RIG";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// Fallback lights (world also adds lights)
{
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(5, 12, 6);
  scene.add(dir);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------- VR ENTRY --------------------
function installVRButton() {
  try {
    const btn = VRButton.createButton(renderer);
    btn.style.zIndex = "999999";
    document.body.appendChild(btn);
    hudLog("[index] VRButton appended ✅");
  } catch (e) {
    hudLog(`[index] VRButton failed ❌ ${e?.message || String(e)}`);
  }
}

async function requestXRSessionManual() {
  if (!navigator.xr) throw new Error("navigator.xr missing");
  const sessionInit = {
    optionalFeatures: [
      "local-floor",
      "bounded-floor",
      "hand-tracking",
      "layers",
      "dom-overlay",
      "hit-test"
    ],
    domOverlay: { root: document.body }
  };
  const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
  renderer.xr.setSession(session);
  return session;
}

function wireManualEnterVR() {
  const enterVrBtn = document.getElementById("enterVrBtn");
  if (!enterVrBtn) return;

  enterVrBtn.addEventListener("click", async () => {
    try {
      await requestXRSessionManual();
      hudLog("[index] manual XR session start ✅");
    } catch (e) {
      hudLog(`[index] manual XR failed ❌ ${e?.message || String(e)}`);
    }
  });
}

installVRButton();
wireManualEnterVR();
ensureHudWiring();

// -------------------- DESKTOP DEBUG (optional) --------------------
const debugInput = {
  keys: new Set(),
  dragging: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0
};

window.addEventListener("keydown", (e) => debugInput.keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => debugInput.keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (renderer.xr.isPresenting) return;
  debugInput.dragging = true;
  debugInput.lastX = e.clientX;
  debugInput.lastY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});

renderer.domElement.addEventListener("pointerup", () => {
  debugInput.dragging = false;
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (renderer.xr.isPresenting) return;
  if (!debugInput.dragging) return;
  const dx = e.clientX - debugInput.lastX;
  const dy = e.clientY - debugInput.lastY;
  debugInput.lastX = e.clientX;
  debugInput.lastY = e.clientY;
  debugInput.yaw -= dx * 0.003;
  debugInput.pitch -= dy * 0.003;
  debugInput.pitch = Math.max(-1.2, Math.min(1.2, debugInput.pitch));
});

const v3 = new THREE.Vector3();
const forward = new THREE.Vector3();

function updateDesktopDebug(dt) {
  if (renderer.xr.isPresenting) return;

  player.rotation.y = debugInput.yaw;
  camera.rotation.x = debugInput.pitch;

  const speed = debugInput.keys.has("shift") ? 4.5 : 2.2;

  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0; forward.normalize();

  const right = v3.set(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0; right.normalize();

  const move = v3.set(0, 0, 0);
  if (debugInput.keys.has("w")) move.add(forward);
  if (debugInput.keys.has("s")) move.sub(forward);
  if (debugInput.keys.has("a")) move.sub(right);
  if (debugInput.keys.has("d")) move.add(right);
  if (debugInput.keys.has("q")) move.y -= 1;
  if (debugInput.keys.has("e")) move.y += 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.position.add(move);
  }
}

// -------------------- WORLD INIT --------------------
let worldApi = null;

(async () => {
  try {
    setBootStatus("loading world…");
    hudLog("[index] init world…");

    worldApi = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      log: hudLog,
      BUILD
    });

    hudLog("[index] world init ✅");
    setBootStatus("ready ✅");
  } catch (e) {
    hudLog(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setBootStatus("world failed ❌");
  }
})();

// -------------------- ANIMATE LOOP --------------------
let last = performance.now();

renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    updateDesktopDebug(dt);
    worldApi?.tick?.(dt, t / 1000);
  } catch (e) {
    hudLog(`[index] tick error ❌ ${e?.message || String(e)}`);
  }

  renderer.render(scene, camera);
});
