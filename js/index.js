// /js/index.js — FULL MASTER (Quest-safe + Android/2D controls + HUD)
// ✅ render loop starts immediately (prevents Quest 3-dots)
// ✅ world loads async AFTER loop is running (no top-level await)
// ✅ XR: controllers + lasers supported by world.js
// ✅ Android/2D: on-screen joystick + swipe-look (only when NOT in XR)
// ✅ Desktop: WASD + mouse drag look (only when NOT in XR)

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

// Auto-hide DOM HUD in VR (prevents floating DOM in face)
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  Mobile2D.setEnabled(false);
  log("[xr] sessionstart ✅ HUD hidden, 2D controls disabled");
});
renderer.xr.addEventListener("sessionend", () => {
  setHUDVisible(true);
  Mobile2D.setEnabled(true);
  log("[xr] sessionend ✅ HUD shown, 2D controls enabled");
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

// ============================
// 2D ANDROID / MOBILE CONTROLS
// ============================
// ✅ Only active when NOT in XR
// ✅ Left joystick = move (forward/back/strafe)
// ✅ Right-side swipe = look (yaw + pitch)
// ✅ Desktop: WASD + mouse-drag look
const Mobile2D = (() => {
  const state = {
    enabled: true,
    uiBuilt: false,

    // joystick
    leftId: null,
    leftCenter: { x: 0, y: 0 },
    leftVec: { x: 0, y: 0 }, // -1..1

    // look touch
    rightId: null,
    lookDX: 0,
    lookDY: 0,
    lastTouchPos: new Map(), // id -> {x,y}

    // desktop
    keys: new Set(),
    mouseDown: false,
    mouseDX: 0,
    mouseDY: 0,

    // tuning
    moveSpeed: 2.8,
    strafeSpeed: 2.6,
    lookSpeed: 0.0022,
    pitchMin: -1.15,
    pitchMax: 1.15,

    // refs
    wrap: null,
    joy: null,
    nub: null,
    hint: null,
  };

  function setEnabled(on) {
    state.enabled = !!on;
    if (state.wrap) state.wrap.style.display = state.enabled ? "block" : "none";
    if (!state.enabled) {
      state.leftId = null;
      state.rightId = null;
      state.leftVec.x = 0; state.leftVec.y = 0;
      state.lookDX = 0; state.lookDY = 0;
      state.mouseDX = 0; state.mouseDY = 0;
      state.lastTouchPos.clear();
      setNub(0, 0);
    }
  }

  function setNub(nx, ny) {
    if (!state.nub) return;
    const maxPx = 44;
    const tx = nx * maxPx;
    const ty = ny * maxPx;
    state.nub.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px)`;
  }

  function buildUI(logFn) {
    if (state.uiBuilt) return;
    state.uiBuilt = true;

    const wrap = document.createElement("div");
    wrap.id = "mobile2d";
    wrap.style.cssText = `
      position: fixed; inset: 0; z-index: 9998;
      user-select: none; -webkit-user-select: none;
      touch-action: none;
      display: block;
    `;
    document.body.appendChild(wrap);

    const joy = document.createElement("div");
    joy.id = "joyL";
    joy.style.cssText = `
      position: absolute; left: 18px; bottom: 18px;
      width: 140px; height: 140px; border-radius: 999px;
      background: rgba(102,204,255,0.10);
      border: 2px solid rgba(102,204,255,0.28);
      box-shadow: 0 0 18px rgba(102,204,255,0.12);
      pointer-events: auto;
    `;
    wrap.appendChild(joy);

    const nub = document.createElement("div");
    nub.id = "joyNub";
    nub.style.cssText = `
      position: absolute; left: 50%; top: 50%;
      width: 56px; height: 56px; border-radius: 999px;
      transform: translate(-50%, -50%);
      background: rgba(102,204,255,0.22);
      border: 2px solid rgba(102,204,255,0.45);
      pointer-events: none;
    `;
    joy.appendChild(nub);

    const hint = document.createElement("div");
    hint.textContent = "Left: MOVE • Right: LOOK";
    hint.style.cssText = `
      position:absolute; left: 14px; top: 10px;
      padding: 8px 10px;
      font: 700 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      letter-spacing: 0.4px;
      color: rgba(200,211,255,0.88);
      background: rgba(5,7,13,0.55);
      border: 1px solid rgba(102,204,255,0.22);
      border-radius: 10px;
      pointer-events: none;
    `;
    wrap.appendChild(hint);

    state.wrap = wrap;
    state.joy = joy;
    state.nub = nub;
    state.hint = hint;

    // Touch
    wrap.addEventListener("touchstart", (e) => {
      if (!state.enabled) return;
      const w = window.innerWidth;

      for (const t of Array.from(e.changedTouches)) {
        const x = t.clientX, y = t.clientY;

        // left side -> joystick
        if (x < w * 0.45 && state.leftId === null) {
          state.leftId = t.identifier;
          state.leftCenter.x = x;
          state.leftCenter.y = y;
          state.leftVec.x = 0;
          state.leftVec.y = 0;

          // position joystick base under finger (visual)
          const clampedLeft = Math.max(12, Math.min(x - 70, w - 152));
          const clampedBottom = Math.max(12, Math.min((window.innerHeight - y) - 70, window.innerHeight - 152));
          joy.style.left = `${clampedLeft}px`;
          joy.style.bottom = `${clampedBottom}px`;
          setNub(0, 0);
          continue;
        }

        // right side -> look
        if (x >= w * 0.45 && state.rightId === null) {
          state.rightId = t.identifier;
          state.lastTouchPos.set(t.identifier, { x, y });
          continue;
        }
      }

      e.preventDefault();
    }, { passive: false });

    wrap.addEventListener("touchmove", (e) => {
      if (!state.enabled) return;

      for (const t of Array.from(e.changedTouches)) {
        const x = t.clientX, y = t.clientY;

        if (t.identifier === state.leftId) {
          const dx = x - state.leftCenter.x;
          const dy = y - state.leftCenter.y;
          const max = 60;
          const nx = Math.max(-1, Math.min(1, dx / max));
          const ny = Math.max(-1, Math.min(1, dy / max));
          state.leftVec.x = nx;
          state.leftVec.y = ny;
          setNub(nx, ny);
        }

        if (t.identifier === state.rightId) {
          const last = state.lastTouchPos.get(t.identifier);
          if (last) {
            state.lookDX += (x - last.x);
            state.lookDY += (y - last.y);
            last.x = x; last.y = y;
          } else {
            state.lastTouchPos.set(t.identifier, { x, y });
          }
        }
      }

      e.preventDefault();
    }, { passive: false });

    wrap.addEventListener("touchend", (e) => {
      if (!state.enabled) return;

      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === state.leftId) {
          state.leftId = null;
          state.leftVec.x = 0;
          state.leftVec.y = 0;
          setNub(0, 0);
        }
        if (t.identifier === state.rightId) {
          state.rightId = null;
          state.lastTouchPos.delete(t.identifier);
        }
      }

      e.preventDefault();
    }, { passive: false });

    wrap.addEventListener("touchcancel", (e) => {
      state.leftId = null;
      state.rightId = null;
      state.leftVec.x = 0;
      state.leftVec.y = 0;
      state.lastTouchPos.clear();
      setNub(0, 0);
      e.preventDefault();
    }, { passive: false });

    // Desktop keyboard
    window.addEventListener("keydown", (e) => state.keys.add(String(e.key).toLowerCase()));
    window.addEventListener("keyup", (e) => state.keys.delete(String(e.key).toLowerCase()));

    // Desktop mouse drag look
    renderer.domElement.addEventListener("mousedown", (e) => {
      if (!state.enabled) return;
      if (renderer.xr.isPresenting) return;
      state.mouseDown = true;
      state.mouseDX = 0;
      state.mouseDY = 0;
      e.preventDefault();
    });
    window.addEventListener("mouseup", () => { state.mouseDown = false; });
    window.addEventListener("mousemove", (e) => {
      if (!state.enabled) return;
      if (!state.mouseDown) return;
      if (renderer.xr.isPresenting) return;
      state.mouseDX += e.movementX || 0;
      state.mouseDY += e.movementY || 0;
    });

    logFn?.("[2d] mobile joystick + swipe-look ready ✅");
  }

  function apply(dt) {
    if (!state.enabled) return;
    if (renderer.xr.isPresenting) return;

    // movement vector
    let mx = 0, mz = 0;

    // touch joystick
    mx += state.leftVec.x * state.strafeSpeed;
    mz += state.leftVec.y * state.moveSpeed; // +down is forward-ish; we invert below

    // keyboard WASD
    const k = state.keys;
    if (k.has("w")) mz -= state.moveSpeed;
    if (k.has("s")) mz += state.moveSpeed;
    if (k.has("a")) mx -= state.strafeSpeed;
    if (k.has("d")) mx += state.strafeSpeed;

    // apply movement relative to yaw
    if (mx !== 0 || mz !== 0) {
      const yaw = player.rotation.y;

      // joystick Y: dragging up gives ny negative, so invert so up = forward
      // (for touch: state.leftVec.y positive means finger moved down)
      const forward = -mz;
      const strafe = mx;

      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      const vx = (strafe * cos + forward * sin) * dt;
      const vz = (forward * cos - strafe * sin) * dt;

      player.position.x += vx;
      player.position.z += vz;
    }

    // apply look (touch + mouse)
    const dx = state.lookDX + state.mouseDX;
    const dy = state.lookDY + state.mouseDY;

    if (dx !== 0 || dy !== 0) {
      player.rotation.y -= dx * state.lookSpeed;

      // pitch on camera (clamped)
      const pitch = camera.rotation.x - dy * state.lookSpeed;
      camera.rotation.x = Math.max(state.pitchMin, Math.min(state.pitchMax, pitch));
    }

    // decay / reset deltas each frame
    state.lookDX = 0;
    state.lookDY = 0;
    state.mouseDX = 0;
    state.mouseDY = 0;
  }

  return { buildUI, apply, setEnabled };
})();

// Build 2D controls UI immediately (only shows when not in XR)
Mobile2D.buildUI(log);
Mobile2D.setEnabled(true);

// --- IMPORTANT: START THE RENDER LOOP IMMEDIATELY ---
let worldApi = null;
let worldReady = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  try {
    // 2D controls (Android/desktop) only when NOT in XR
    Mobile2D.apply(dt);

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
    $("#btnRoomPoker")?.addEventListener("click", () => worldApi?.setRoom?.("poker"));

  } catch (e) {
    log("[world] init ❌", String(e?.stack || e));
  }
})();
