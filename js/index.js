// /js/index.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

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

log(`[index] boot ✅ build=${BUILD}`);
log(`[env] secureContext=${window.isSecureContext}`);
log(`[env] ua=${navigator.userAgent}`);
log(`[env] navigator.xr=${!!navigator.xr}`);

const app = document.getElementById("app");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// XR optional features
renderer.xr.setReferenceSpaceType("local-floor");

// Scene + Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);

// PlayerRig: we move this for locomotion (desktop + mobile)
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);
camera.position.set(0, 1.65, 3.5);

// Controllers (XR)
const controllers = {
  c0: renderer.xr.getController(0),
  c1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
player.add(controllers.c0, controllers.c1, controllers.g0, controllers.g1);

// Desktop/Mobile look controls (simple)
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

let isPointerDown = false;
let lastX = 0, lastY = 0;
let yaw = 0, pitch = 0;

renderer.domElement.addEventListener("pointerdown", (e) => {
  isPointerDown = true;
  lastX = e.clientX; lastY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener("pointerup", () => { isPointerDown = false; });
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!isPointerDown) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;

  yaw -= dx * 0.0035;
  pitch -= dy * 0.0035;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));

  camera.rotation.set(pitch, yaw, 0, "YXZ");
}, { passive: true });

// Mobile touch joystick (very simple)
let touchMove = { active:false, id:null, sx:0, sy:0, dx:0, dy:0 };
window.addEventListener("touchstart", (e) => {
  // left side touch = move
  for (const t of e.changedTouches) {
    if (t.clientX < window.innerWidth * 0.45 && !touchMove.active) {
      touchMove.active = true;
      touchMove.id = t.identifier;
      touchMove.sx = t.clientX;
      touchMove.sy = t.clientY;
      touchMove.dx = 0; touchMove.dy = 0;
      break;
    }
  }
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (!touchMove.active) return;
  for (const t of e.changedTouches) {
    if (t.identifier === touchMove.id) {
      touchMove.dx = (t.clientX - touchMove.sx) / 90;
      touchMove.dy = (t.clientY - touchMove.sy) / 90;
      touchMove.dx = Math.max(-1, Math.min(1, touchMove.dx));
      touchMove.dy = Math.max(-1, Math.min(1, touchMove.dy));
      break;
    }
  }
}, { passive: true });
window.addEventListener("touchend", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === touchMove.id) {
      touchMove.active = false;
      touchMove.id = null;
      touchMove.dx = 0; touchMove.dy = 0;
    }
  }
}, { passive: true });

// VR Button
const vrBtn = VRButton.createButton(renderer);
document.body.appendChild(vrBtn);
log("[index] VRButton appended ✅");

// HUD actions
$("#btnEnterVR").onclick = async () => {
  // VRButton handles the session; this is just UX
  log("[hud] Use the VR button (or headset prompt) to enter VR.");
};
$("#btnRecenter").onclick = () => {
  // recenter by resetting rig yaw and position
  player.position.set(0, 0, 0);
  yaw = 0; pitch = 0;
  camera.rotation.set(0,0,0);
  camera.position.set(0, 1.65, 3.5);
  log("[hud] recenter ✅");
};

function setHUDVisible(on) {
  hud.style.display = on ? "block" : "none";
  hudToggle.style.display = on ? "none" : "block";
}
$("#btnToggleHUD").onclick = () => { setHUDVisible(false); log("[hud] hidden"); };
hudToggle.onclick = () => { setHUDVisible(true); log("[hud] shown"); };

let world = null;

(async () => {
  try {
    world = await World.init({
      THREE, scene, renderer, camera, player, controllers, log, BUILD
    });
    log("[world] init ✅");
  } catch (e) {
    log("[world] init ❌", String(e?.stack || e));
  }
})();

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

// Animate loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  // Desktop/Mobile locomotion when NOT in XR
  if (!renderer.xr.isPresenting) {
    const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 5.4 : 2.6;

    // WASD
    let x = 0, z = 0;
    if (keys.has("KeyW")) z -= 1;
    if (keys.has("KeyS")) z += 1;
    if (keys.has("KeyA")) x -= 1;
    if (keys.has("KeyD")) x += 1;

    // Mobile touch move
    if (touchMove.active) {
      x += touchMove.dx;
      z += touchMove.dy;
    }

    const len = Math.hypot(x, z);
    if (len > 0.0001) {
      x /= len; z /= len;

      // move relative to camera yaw
      const yrot = yaw;
      const cos = Math.cos(yrot), sin = Math.sin(yrot);
      const mx = x * cos - z * sin;
      const mz = x * sin + z * cos;

      player.position.x += mx * speed * dt;
      player.position.z += mz * speed * dt;
    }
  }

  world?.update?.(dt, t);

  renderer.render(scene, camera);
});
