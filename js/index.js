// /index.js — ScarlettVR Boot v4.1 (XR-safe + Android controls)
// ✅ Render loop starts immediately (Quest 3-dots prevention)
// ✅ Loads world async after loop
// ✅ Auto-hides HUD in VR
// ✅ Android touch controls are isolated in /core/android_controls.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { AndroidControls } from "./core/android_controls.js";

const BUILD = `INDEX_${Date.now()}`;

// Runtime feature flags (safe to toggle from HUD)
const FLAGS = {
  safeMode: false,
  poker: true,
  bots: true,
  fx: true,
};
window.__SCARLETT_FLAGS = FLAGS;

const $ = (sel) => document.querySelector(sel);

const hud = $("#hud");
const hudToggle = $("#hudToggle");
const hudlog = $("#hudlog");

function safeJson(x){ try { return JSON.stringify(x); } catch { return String(x); } }
function log(...args) {
  const msg = args.map(a => (typeof a === "string" ? a : safeJson(a))).join(" ");
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

// Scene + Rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);

// Rig: yaw on player, pitch on cameraPitch
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);

const cameraPitch = new THREE.Group();
cameraPitch.name = "CameraPitch";
player.add(cameraPitch);
cameraPitch.add(camera);

camera.position.set(0, 1.65, 3.5);

// XR controllers (World uses these for lasers/teleport)
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

// Android controls (2D debug)
const android = AndroidControls.init({
  renderer, player, cameraPitch,
  setHUDVisible,
  log
});

// Auto-hide HUD in XR; disable android controls in XR
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  android.setEnabled(false);
  log("[xr] sessionstart ✅ HUD hidden, android controls disabled");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  android.setEnabled(true);
  log("[xr] sessionend ✅ HUD shown, android controls enabled");
});

// Recenter

// Feature toggles
const btnSafeMode = $("#btnSafeMode");
const btnTogglePoker = $("#btnTogglePoker");
const btnToggleBots = $("#btnToggleBots");
const btnToggleFX = $("#btnToggleFX");
const btnCopyLog = $("#btnCopyLog");

function refreshFlagButtons() {
  if (btnTogglePoker) btnTogglePoker.textContent = `Poker: ${FLAGS.poker ? "ON" : "OFF"}`;
  if (btnToggleBots) btnToggleBots.textContent = `Bots: ${FLAGS.bots ? "ON" : "OFF"}`;
  if (btnToggleFX) btnToggleFX.textContent = `FX: ${FLAGS.fx ? "ON" : "OFF"}`;
  if (btnSafeMode) btnSafeMode.textContent = FLAGS.safeMode ? "Safe Mode: ON" : "Safe Mode";
}
refreshFlagButtons();

btnSafeMode?.addEventListener("click", () => {
  FLAGS.safeMode = !FLAGS.safeMode;
  // In safe mode we force-disable heavy modules
  if (FLAGS.safeMode) { FLAGS.poker = false; FLAGS.bots = false; FLAGS.fx = false; }
  refreshFlagButtons();
  worldApi?.setFlags?.(FLAGS);
  log(`[hud] safeMode=${FLAGS.safeMode} poker=${FLAGS.poker} bots=${FLAGS.bots} fx=${FLAGS.fx}`);
});

btnTogglePoker?.addEventListener("click", () => {
  if (FLAGS.safeMode) return; // locked
  FLAGS.poker = !FLAGS.poker;
  refreshFlagButtons();
  worldApi?.setFlags?.(FLAGS);
  log(`[hud] poker=${FLAGS.poker}`);
});

btnToggleBots?.addEventListener("click", () => {
  if (FLAGS.safeMode) return;
  FLAGS.bots = !FLAGS.bots;
  refreshFlagButtons();
  worldApi?.setFlags?.(FLAGS);
  log(`[hud] bots=${FLAGS.bots}`);
});

btnToggleFX?.addEventListener("click", () => {
  if (FLAGS.safeMode) return;
  FLAGS.fx = !FLAGS.fx;
  refreshFlagButtons();
  worldApi?.setFlags?.(FLAGS);
  log(`[hud] fx=${FLAGS.fx}`);
});

btnCopyLog?.addEventListener("click", async () => {
  try {
    const text = (hudlog?.textContent || "").trim();
    await navigator.clipboard.writeText(text);
    log("[hud] log copied ✅");
  } catch (e) {
    log("[hud] copy failed:", String(e?.message || e));
  }
});

$("#btnRecenter")?.addEventListener("click", () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  cameraPitch.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 3.5);
  log("[hud] recenter ✅");
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop first (Quest stability)
let worldApi = null;
let worldReady = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  try {
    android.update(dt);

    if (worldReady && worldApi?.update) worldApi.update(dt, t);
    renderer.render(scene, camera);
  } catch (e) {
    log("[FATAL] render loop crashed:", String(e?.stack || e));
    try { renderer.render(scene, camera); } catch {}
  }
});
log("[index] render loop started ✅");

// Load world async AFTER loop is running
(async () => {
  try {
    log("[world] importing…");
    const mod = await import(`./js/world.js?v=${BUILD}`);
    log("[world] import ✅");

    log("[world] init…");
    worldApi = await mod.World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD, FLAGS });
    worldApi?.setFlags?.(FLAGS);
    refreshFlagButtons();
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
