// /js/index.js — FULL FIX: no 3-dots load screen (Quest)
// ✅ starts render loop immediately
// ✅ loads world async AFTER loop is running
// ✅ avoids top-level await
// ✅ catches render errors + prints to HUD
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const BUILD = `INDEX_${Date.now()}`;
const $ = (sel) => document.querySelector(sel);

const hud = $("#hud");
const hudToggle = $("#hudToggle");
const hudlog = $("#hudlog");

function log(...args) {
  const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  if (hudlog) {
    hudlog.textContent += msg + "\n";
    hudlog.scrollTop = hudlog.scrollHeight;
  }
}

function setHUDVisible(on) {
  if (!hud || !hudToggle) return;
  hud.style.display = on ? "block" : "none";
  hudToggle.style.display = on ? "none" : "block";
}

$("#btnToggleHUD")?.addEventListener("click", () => setHUDVisible(false));
hudToggle?.addEventListener("click", () => setHUDVisible(true));

log(`[index] boot ✅ build=${BUILD}`);
log(`[env] secureContext=${window.isSecureContext}`);
log(`[env] ua=${navigator.userAgent}`);
log(`[env] navigator.xr=${!!navigator.xr}`);

const app = document.getElementById("app");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
app.appendChild(renderer.domElement);

// Scene + Camera + Rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);

const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);
camera.position.set(0, 1.65, 3.5);

// Controllers
const controllers = {
  c0: renderer.xr.getController(0),
  c1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
player.add(controllers.c0, controllers.c1, controllers.g0, controllers.g1);

// VR Button
document.body.appendChild(VRButton.createButton(renderer));
log("[index] VRButton appended ✅");

// Auto-hide DOM HUD in VR (prevents that floating “highlight thing”)
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  log("[xr] sessionstart ✅ HUD hidden");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  log("[xr] sessionend ✅ HUD shown");
});

// Recenter
$("#btnRecenter")?.addEventListener("click", () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 3.5);
  camera.rotation.set(0, 0, 0);
  log("[hud] recenter ✅");
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- IMPORTANT: START THE RENDER LOOP IMMEDIATELY ---
// This prevents Quest from getting stuck on the Oculus loader.
let worldApi = null;
let worldReady = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  try {
    // keep rendering even if world hasn't loaded yet
    if (worldReady && worldApi?.update) worldApi.update(dt, t);
    renderer.render(scene, camera);
  } catch (e) {
    log("[FATAL] render loop crashed:", String(e?.stack || e));
    // If loop crashes, Quest will show 3 dots forever — keep loop alive:
    try { renderer.render(scene, camera); } catch {}
  }
});

log("[index] render loop started ✅");

// Load world async AFTER loop is running
(async () => {
  try {
    log("[world] importing…");
    const mod = await import(`./world.js?v=${BUILD}`);
    log("[world] import ✅");

    log("[world] init…");
    worldApi = await mod.World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD });
    worldReady = true;
    log("[world] init ✅");

    // Room buttons
    $("#btnRoomLobby")?.addEventListener("click", () => worldApi?.setRoom?.("lobby"));
    $("#btnRoomStore")?.addEventListener("click", () => worldApi?.setRoom?.("store"));
    $("#btnRoomScorpion")?.addEventListener("click", () => worldApi?.setRoom?.("scorpion"));
    $("#btnRoomSpectate")?.addEventListener("click", () => worldApi?.setRoom?.("spectate"));

  } catch (e) {
    log("[world] init ❌", String(e?.stack || e));
  }
})();
