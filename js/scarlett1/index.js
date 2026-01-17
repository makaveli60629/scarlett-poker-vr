// /js/scarlett1/index.js
// SCARLETT1 — AUTHORITATIVE FULL ENTRY (ANDROID TOUCH SAFE + XR SAFE)
// Build: SCARLETT1_AUTHORITATIVE_FULL_v1

import * as THREE from "three";
import { buildWorld } from "../world.js";

const BUILD = "SCARLETT1_AUTHORITATIVE_FULL_v1";

const diagPanel = document.getElementById("diagPanel");
const hud = document.getElementById("hud");
const btnEnterVR = document.getElementById("btnEnterVR");
const btnHideHUD = document.getElementById("btnHideHUD");
const btnTeleport = document.getElementById("btnTeleport");
const btnDiag = document.getElementById("btnDiag");

function dwrite(msg) {
  const s = String(msg);
  console.log(s);
  if (diagPanel) {
    diagPanel.style.display = "block";
    diagPanel.textContent += (diagPanel.textContent ? "\n" : "") + s;
    diagPanel.scrollTop = diagPanel.scrollHeight;
  }
}

dwrite(`[scarlett1] booting… build=${BUILD}`);
dwrite(`[env] href=${location.href}`);
dwrite(`[env] secureContext=${String(window.isSecureContext)}`);
dwrite(`[env] navigator.xr=${String(!!navigator.xr)}`);

// Hard attach flags for any existing checks
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

// ---------- Three basics ----------
const app = document.getElementById("app");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);

// Player rig (move this, not the camera directly)
const player = new THREE.Group();
player.position.set(0, 1.65, 4.5);
player.add(camera);
scene.add(player);

// Lights + world
try {
  buildWorld({ THREE, scene, player, camera, renderer, dwrite });
  dwrite("[world] buildWorld() ✅");
} catch (e) {
  dwrite("[world] buildWorld() ❌ " + (e?.message || e));
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive: true });

// ---------- HUD binding (ANDROID-PROOF) ----------
let teleportOn = false;

function setTeleport(on) {
  teleportOn = !!on;
  btnTeleport.textContent = `Teleport: ${teleportOn ? "ON" : "OFF"}`;
  dwrite(`[hud] teleport=${teleportOn}`);
}

function toggleHUD() {
  const isHidden = hud.style.display === "none";
  hud.style.display = isHidden ? "flex" : "none";
  if (!isHidden) diagPanel.style.display = "none";
}

function toggleDiag() {
  diagPanel.style.display = (diagPanel.style.display === "none" || diagPanel.style.display === "") ? "block" : "none";
}

function bindBtn(el, fn) {
  if (!el) return;
  el.style.pointerEvents = "auto";
  el.style.touchAction = "manipulation";
  el.style.cursor = "pointer";

  const handler = (e) => {
    try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    dwrite(`[hud] pressed ${el.id} via ${e.type}`);
    fn();
  };

  // Capture=true to beat overlays
  ["pointerdown", "pointerup", "touchstart", "touchend", "click"].forEach((evt) => {
    el.addEventListener(evt, handler, { passive: false, capture: true });
  });
}

bindBtn(btnHideHUD, toggleHUD);
bindBtn(btnTeleport, () => setTeleport(!teleportOn));
bindBtn(btnDiag, toggleDiag);

// ---------- XR ----------
async function enterVR() {
  if (!navigator.xr) {
    dwrite("[xr] navigator.xr not available ❌");
    return;
  }
  try {
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    dwrite(`[xr] immersive-vr supported=${supported}`);
    if (!supported) return;

    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers", "dom-overlay"],
      domOverlay: { root: document.body }
    });

    renderer.xr.setSession(session);
    dwrite("[xr] session started ✅");
    session.addEventListener("end", () => dwrite("[xr] session ended"));
  } catch (e) {
    dwrite("[xr] requestSession ❌ " + (e?.message || e));
  }
}
window.__enterVR = enterVR;
bindBtn(btnEnterVR, enterVR);

// ---------- Locomotion (Quest sticks) ----------
let snapCooldown = 0;

function applyLocomotion(dt) {
  // Works in XR AND non-XR (if controllers present)
  const session = renderer.xr.getSession();
  if (!session) return;

  const sources = session.inputSources || [];
  let left = null, right = null;

  for (const s of sources) {
    const gp = s.gamepad;
    if (!gp) continue;
    // Heuristic: handedness
    if (s.handedness === "left") left = gp;
    if (s.handedness === "right") right = gp;
  }

  // Movement: left stick axes[2], axes[3] (Quest)
  if (left && left.axes && left.axes.length >= 4) {
    const axX = left.axes[2] ?? left.axes[0] ?? 0;
    const axY = left.axes[3] ?? left.axes[1] ?? 0;

    const dead = 0.15;
    const mx = Math.abs(axX) > dead ? axX : 0;
    const my = Math.abs(axY) > dead ? axY : 0;

    if (mx || my) {
      const speed = 2.2; // m/s
      const yaw = player.rotation.y;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const rightv  = new THREE.Vector3(1, 0,  0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

      // Note: stick Y forward is typically negative
      player.position.addScaledVector(forward, (-my) * speed * dt);
      player.position.addScaledVector(rightv,  (mx) * speed * dt);
    }
  }

  // Snap turn: right stick X
  if (right && right.axes && right.axes.length >= 4) {
    const rx = right.axes[2] ?? right.axes[0] ?? 0;
    const dead = 0.5;

    snapCooldown -= dt;
    if (snapCooldown <= 0) {
      if (rx > dead) { player.rotation.y -= Math.PI / 6; snapCooldown = 0.25; }
      if (rx < -dead){ player.rotation.y += Math.PI / 6; snapCooldown = 0.25; }
    }
  }

  // Teleport: right trigger (button 0 usually) when Teleport ON
  if (teleportOn && right && right.buttons && right.buttons.length) {
    const trig = right.buttons[0];
    const pressed = !!(trig && (trig.pressed || trig.value > 0.8));
    if (pressed) {
      // Simple "blink" teleport forward 1.5m
      const yaw = player.rotation.y;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      player.position.addScaledVector(forward, 1.5);
      teleportOn = false;
      btnTeleport.textContent = "Teleport: OFF";
      dwrite("[teleport] blink forward ✅");
    }
  }
}

// Menu button HUD toggle (if key events fire)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "ContextMenu") toggleHUD();
});

// ---------- Render loop ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  applyLocomotion(dt);
  renderer.render(scene, camera);
});

dwrite("[status] renderer OK ✅");
dwrite("[status] ready ✅");

// Default diag panel ON so you can see presses immediately
diagPanel.style.display = "block";
