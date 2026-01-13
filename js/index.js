// /js/index.js (FULL) — fixes cache + hides DOM HUD in VR
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const BUILD = `INDEX_FULL_${Date.now()}`;

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
  hud.style.display = on ? "block" : "none";
  hudToggle.style.display = on ? "none" : "block";
}

$("#btnToggleHUD").onclick = () => setHUDVisible(false);
hudToggle.onclick = () => setHUDVisible(true);

log(`[index] boot ✅ build=${BUILD}`);
log(`[env] secureContext=${window.isSecureContext}`);
log(`[env] ua=${navigator.userAgent}`);
log(`[env] navigator.xr=${!!navigator.xr}`);

const app = document.getElementById("app");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);

// PlayerRig for locomotion
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);
camera.position.set(0, 1.65, 3.5);

// XR controllers
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

// Auto-hide DOM HUD in VR so it stops floating in your face
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  log("[xr] sessionstart → HUD hidden ✅");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  log("[xr] sessionend → HUD shown ✅");
});

// Recenter
$("#btnRecenter").onclick = () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 3.5);
  camera.rotation.set(0, 0, 0);
  log("[hud] recenter ✅");
};

// Dynamic import World with cache-busting so Quest always loads newest
const { World } = await import(`./world.js?v=${BUILD}`);

let world = null;
try {
  world = await World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD });
  log("[world] init ✅");
} catch (e) {
  log("[world] init ❌", String(e?.stack || e));
}

// room buttons
$("#btnRoomLobby").onclick = () => world?.setRoom?.("lobby");
$("#btnRoomStore").onclick = () => world?.setRoom?.("store");
$("#btnRoomScorpion").onclick = () => world?.setRoom?.("scorpion");
$("#btnRoomSpectate").onclick = () => world?.setRoom?.("spectate");

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  world?.update?.(dt, t);
  renderer.render(scene, camera);
});
