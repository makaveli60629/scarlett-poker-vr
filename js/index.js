// /js/index.js — Scarlett Runtime (FULL) v10.7.1
// ✅ Three.js CDN module
// ✅ VRButton + XR init
// ✅ local-floor reference space
// ✅ Camera baseline set to (0,1.6,0) (NOT z=2) to prevent face-ring / rig weirdness
// ✅ World tick loop

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

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
  if (el) el.textContent = out.slice(-140).join("\n");
  if (typeof window.__HTML_LOG === "function") { try { window.__HTML_LOG(line); } catch {} }
}

function setStatus(t) {
  if (typeof window.__SET_BOOT_STATUS === "function") { try { window.__SET_BOOT_STATUS(t); } catch {} }
}

log(`[index] start ✅ href=${location.href}`);
setStatus("index init…");

// ---------- Renderer / Scene / Camera ----------
const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

// Important: floor space
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 500);
// ✅ baseline: no forward z offset (this was causing weird offsets in XR)
camera.position.set(0, 1.6, 0);

const player = new THREE.Group();
player.name = "PLAYER_RIG";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// basic fallback lights
{
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.95);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.95);
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

// Manual Enter VR (if you have a HUD button)
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

// Log session events
renderer.xr.addEventListener("sessionstart", () => log("[xr] sessionstart ✅"));
renderer.xr.addEventListener("sessionend", () => log("[xr] sessionend ✅"));

// ---------- World Load ----------
let worldApi = null;

(async () => {
  try {
    setStatus("loading world…");
    log("[index] init world…");

    worldApi = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      log,
      BUILD: Date.now()
    });

    log("[index] world init ✅");
    setStatus("ready ✅");
  } catch (e) {
    log(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setStatus("world failed ❌");
  }
})();

// ---------- Animate ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    worldApi?.tick?.(dt, t * 0.001);
  } catch (e) {
    log(`[index] tick error ❌ ${e?.message || String(e)}`);
  }

  renderer.render(scene, camera);
});
