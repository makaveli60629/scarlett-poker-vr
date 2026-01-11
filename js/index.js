// /js/index.js — Scarlett MASTER INDEX (Quest + Android + Desktop movement + lobby VIP spawn)
// Requires: ./three.module.js (or your local wrapper), ./VRButton.js, ./world.js

import * as THREE from "./three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const BUILD = "MASTER 5.0 (Spawn VIP Lobby + Movement All Platforms)";

const log = (...a) => console.log(...a);

log(`[index] runtime start ✅ (${BUILD})`);
log(`[index] THREE.REVISION=${THREE.REVISION || "?"}`);

let scene, camera, renderer, player;
let clock;
let worldData;

// Desktop look
let yaw = 0, pitch = 0;
let pointerLocked = false;

// Touch sticks (Android)
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
};

init();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + Player Rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);
  player.add(camera);

  // Standing height in non-XR
  camera.position.set(0, 1.65, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lights (primary)
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));
  log("[index] VRButton appended ✅");

  // UI + touch sticks + resets
  installHUD();
  installTouchSticks();
  installDesktopControls();

  // Build world
  log("[world] calling World.build() …");
  worldData = World.build({ THREE, scene, log });
  log("[world] build complete ✅");

  // FORCE SPAWN: VIP lobby pad A (next to spawn machine)
  resetToLobbyVIP();

  // Clock + loop
  clock = new THREE.Clock();
  renderer.setAnimationLoop(tick);

  // Events
  window.addEventListener("resize", onResize);
  renderer.xr.addEventListener("sessionstart", () => {
    log("[XR] sessionstart ✅");
    // In XR, camera height comes from headset, so keep camera local at 0
    camera.position.set(0, 0, 0);
    // Re-apply spawn so you NEVER start in the table by accident
    resetToLobbyVIP();
  });

  log("[index] ready ✅");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================
// HARD SPAWN / RESET FUNCTIONS
// ============================
function resetToLobbyVIP() {
  const s = World.getSpawn("lobby_vip_A");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw || Math.PI, 0);
  if (!renderer.xr.isPresenting) camera.position.set(0, 1.65, 0);
  log("[spawn] lobby VIP ✅", s);
}

function resetToLobbyCenter() {
  const s = World.getSpawn("lobby_center");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw || Math.PI, 0);
  if (!renderer.xr.isPresenting) camera.position.set(0, 1.65, 0);
  log("[spawn] lobby center ✅", s);
}

// ============================
// MOVEMENT (Quest + Android + Desktop)
// ============================
const MOVE_SPEED = 2.4; // m/s
const TURN_SPEED = 1.9; // rad/s

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);

  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0;
  let turn = 0;

  // 1) XR controllers (Quest) — read gamepad axes
  if (presenting) {
    const session = renderer.xr.getSession?.();
    if (session) {
      for (const src of session.inputSources) {
        const gp = src?.gamepad;
        if (!gp || !gp.axes) continue;

        // choose strongest pair
        const a0 = gp.axes[0] ?? 0;
        const a1 = gp.axes[1] ?? 0;
        const a2 = gp.axes[2] ?? 0;
        const a3 = gp.axes[3] ?? 0;
        const m01 = Math.abs(a0) + Math.abs(a1);
        const m23 = Math.abs(a2) + Math.abs(a3);

        const ax = (m23 > m01) ? a2 : a0;
        const ay = (m23 > m01) ? a3 : a1;

        moveX = ax;
        moveY = ay;

        // Some devices expose turn on another stick; if present, use it gently
        if (gp.axes.length >= 4) {
          // attempt: use the "other pair" if it isn't the move pair
          const tx = (m23 > m01) ? a0 : a2;
          if (Math.abs(tx) > Math.abs(turn)) turn = tx;
        }
      }
    }
  }

  // 2) Android touch sticks
  if (!presenting) {
    // left = move, right = turn
    moveX += touch.left.x;
    moveY += touch.left.y;
    turn  += touch.right.x;
  }

  // 3) Desktop keyboard WASD
  if (!presenting) {
    moveX += keyAxisX;
    moveY += keyAxisY;
    // mouse look uses yaw/pitch; turn axis optional
  }

  // deadzones
  moveX = deadzone(moveX, 0.12);
  moveY = deadzone(moveY, 0.12);
  turn  = deadzone(turn,  0.18);

  // Apply turn to rig (XR + mobile)
  if (turn) {
    player.rotation.y -= turn * TURN_SPEED * dt;
  }

  // Move relative to view direction (camera world yaw)
  if (moveX || moveY) {
    const heading = getHeadingYaw();
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const v = new THREE.Vector3()
      .addScaledVector(right, moveX)
      .addScaledVector(forward, moveY);

    if (v.lengthSq() > 0.00001) {
      v.normalize().multiplyScalar(MOVE_SPEED * dt);
      player.position.add(v);
    }
  }

  // Desktop camera pitch/yaw
  if (!presenting) {
    camera.rotation.set(pitch, 0, 0);
    player.rotation.y = yaw;
  }

  renderer.render(scene, camera);
}

function deadzone(v, dz) {
  return Math.abs(v) < dz ? 0 : v;
}

function getHeadingYaw() {
  // In XR: camera world orientation matters. In non-XR: player yaw is authoritative.
  if (!renderer.xr.isPresenting) return player.rotation.y;
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ============================
// HUD / BUTTONS
// ============================
function installHUD() {
  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "9999";
  hud.style.background = "rgba(10,12,18,0.55)";
  hud.style.color = "#e8ecff";
  hud.style.padding = "10px 12px";
  hud.style.borderRadius = "14px";
  hud.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
  hud.style.fontSize = "13px";
  hud.style.userSelect = "none";
  hud.style.backdropFilter = "blur(8px)";
  hud.style.maxWidth = "320px";
  hud.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">Scarlett VR Poker — ${BUILD}</div>
    <div style="opacity:.9;margin-bottom:8px;">Reset + Spawn controls</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnVip">Spawn VIP Lobby</button>
      <button id="btnLobby">Spawn Lobby Center</button>
      <button id="btnCopy">Copy Logs</button>
    </div>
    <div style="opacity:.75;margin-top:8px;line-height:1.25;">
      Desktop: click to mouse-look • WASD move • R reset<br/>
      Android: left stick move • right stick turn
    </div>
  `;
  document.body.appendChild(hud);

  const styleBtn = (b) => {
    b.style.background = "rgba(127,231,255,0.14)";
    b.style.color = "#e8ecff";
    b.style.border = "1px solid rgba(127,231,255,0.35)";
    b.style.borderRadius = "12px";
    b.style.padding = "8px 10px";
    b.style.cursor = "pointer";
  };

  const btnVip = hud.querySelector("#btnVip");
  const btnLobby = hud.querySelector("#btnLobby");
  const btnCopy = hud.querySelector("#btnCopy");
  [btnVip, btnLobby, btnCopy].forEach(styleBtn);

  btnVip.onclick = resetToLobbyVIP;
  btnLobby.onclick = resetToLobbyCenter;

  btnCopy.onclick = async () => {
    try {
      const text = "[HUD] copy not wired to your log buffer yet.\nTip: if you want, I can add a full log buffer + copy.";
      await navigator.clipboard.writeText(text);
      log("[HUD] copied ✅");
    } catch (e) {
      log("[HUD] copy failed", e);
    }
  };

  // Keyboard reset
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") resetToLobbyVIP();
  });
}

// ============================
// DESKTOP CONTROLS
// ============================
let keyAxisX = 0, keyAxisY = 0;
const keys = new Set();

function installDesktopControls() {
  window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    updateKeys();
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
    updateKeys();
  });

  function updateKeys() {
    keyAxisX = 0; keyAxisY = 0;
    if (keys.has("a")) keyAxisX -= 1;
    if (keys.has("d")) keyAxisX += 1;
    if (keys.has("w")) keyAxisY += 1;
    if (keys.has("s")) keyAxisY -= 1;
  }

  // click to pointer-lock look
  renderer.domElement.addEventListener("click", () => {
    if (renderer.xr.isPresenting) return;
    renderer.domElement.requestPointerLock?.();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = (document.pointerLockElement === renderer.domElement);
  });

  window.addEventListener("mousemove", (e) => {
    if (!pointerLocked || renderer.xr.isPresenting) return;
    const mx = e.movementX || 0;
    const my = e.movementY || 0;
    yaw -= mx * 0.0022;
    pitch -= my * 0.0020;
    pitch = Math.max(-1.25, Math.min(1.25, pitch));
  });
}

// ============================
// ANDROID TOUCH STICKS
// ============================
function installTouchSticks() {
  // Only show on touch devices
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "0";
  wrap.style.right = "0";
  wrap.style.bottom = "0";
  wrap.style.height = "48%";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "9998";
  document.body.appendChild(wrap);

  const mk = (side) => {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.bottom = "18px";
    el.style.width = "140px";
    el.style.height = "140px";
    el.style.borderRadius = "999px";
    el.style.border = "1px solid rgba(255,255,255,0.18)";
    el.style.background = "rgba(0,0,0,0.10)";
    el.style.pointerEvents = "auto";
    el.style.touchAction = "none";
    if (side === "left") el.style.left = "18px";
    else el.style.right = "18px";
    wrap.appendChild(el);

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "54px";
    nub.style.height = "54px";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.borderRadius = "999px";
    nub.style.background = "rgba(127,231,255,0.18)";
    nub.style.border = "1px solid rgba(127,231,255,0.35)";
    el.appendChild(nub);

    return { el, nub };
  };

  const L = mk("left");
  const R = mk("right");

  const bind = (stick, ui) => {
    ui.el.addEventListener("pointerdown", (e) => {
      stick.id = e.pointerId;
      stick.active = true;
      stick.x0 = e.clientX;
      stick.y0 = e.clientY;
      stick.x = 0; stick.y = 0;
      ui.el.setPointerCapture(e.pointerId);
    });

    ui.el.addEventListener("pointermove", (e) => {
      if (!stick.active || e.pointerId !== stick.id) return;
      const dx = (e.clientX - stick.x0) / 55;
      const dy = (e.clientY - stick.y0) / 55;
      stick.x = Math.max(-1, Math.min(1, dx));
      stick.y = Math.max(-1, Math.min(1, -dy));
      ui.nub.style.transform = `translate(calc(-50% + ${stick.x * 28}px), calc(-50% + ${-stick.y * 28}px))`;
    });

    const end = (e) => {
      if (e.pointerId !== stick.id) return;
      stick.active = false;
      stick.id = null;
      stick.x = 0; stick.y = 0;
      ui.nub.style.transform = "translate(-50%,-50%)";
    };

    ui.el.addEventListener("pointerup", end);
    ui.el.addEventListener("pointercancel", end);
  };

  bind(touch.left, L);
  bind(touch.right, R);

  log("[android] dual-stick ready ✅");
    }
