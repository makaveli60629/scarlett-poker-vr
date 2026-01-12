// /js/index.js — Scarlett MASTER 6.1 (Permanent)
// ✅ Default import THREE from ./three.js
// ✅ Quest + Android + Desktop movement
// ✅ Diagnostics HUD + Copy + Spawn buttons
// ✅ Clean Mode = HIDE EVERYTHING (HUD + VR button + sticks + bootlog)

import THREE, { VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 6.1 (Clean Mode: Hide Everything + Diagnostics)";
const log = (...a) => console.log(...a);

let scene, camera, renderer, player, clock;

let hud = null, hudBody = null;
let vrBtnEl = null;
let touchWrapEl = null;
let cleanMode = false;

let yaw = 0, pitch = 0;
let pointerLocked = false;

// keyboard
let keyX = 0, keyY = 0;
const keys = new Set();

// touch sticks
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
};

const MOVE_SPEED = 2.6;
const TURN_SPEED = 2.0;

const hudLines = new Map();

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);

  player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);
  player.add(camera);
  camera.position.set(0, 1.65, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // VR button (store handle for clean mode)
  vrBtnEl = VRButton.createButton(renderer);
  document.body.appendChild(vrBtnEl);

  // HUD + controls
  installHUD();
  installDesktopControls();
  installTouchSticks();

  // world
  World.build({ THREE, scene, log, BUILD });

  // spawn
  resetToVIP();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetToVIP();
    writeHUD("xr", "sessionstart ✅");
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
    writeHUD("xr", "sessionend ✅");
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // seed HUD
  writeHUD("build", BUILD);
  writeHUD("secure", String(window.isSecureContext));
  writeHUD("ua", navigator.userAgent);

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  moveTick(dt);
  updateHUD();
  renderer.render(scene, camera);
}

// ======================
// CLEAN MODE (HIDE EVERYTHING)
// ======================
function setCleanMode(on) {
  cleanMode = !!on;

  if (hud) hud.style.display = cleanMode ? "none" : "";
  if (vrBtnEl) vrBtnEl.style.display = cleanMode ? "none" : "";
  if (touchWrapEl) touchWrapEl.style.display = cleanMode ? "none" : "";

  const bootlog = document.getElementById("bootlog");
  if (bootlog) bootlog.style.display = cleanMode ? "none" : "";

  log(cleanMode ? "[ui] CLEAN MODE ✅" : "[ui] UI shown ✅");
}

// ======================
// SPAWNS
// ======================
function resetToVIP() {
  const s = World.getSpawn("lobby_vip_A");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  if (!renderer.xr.isPresenting) { yaw = player.rotation.y; pitch = 0; }
  writeHUD("spawn", `VIP (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
}

function resetToLobby() {
  const s = World.getSpawn("lobby_center");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  if (!renderer.xr.isPresenting) { yaw = player.rotation.y; pitch = 0; }
  writeHUD("spawn", `Lobby (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
}

// ======================
// MOVEMENT
// ======================
function moveTick(dt) {
  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0, turn = 0;

  if (presenting) {
    const session = renderer.xr.getSession?.();
    if (session) {
      let best = { mag: 0, mx: 0, my: 0, tx: 0, axes: [] };
      for (const src of session.inputSources) {
        const gp = src?.gamepad;
        if (!gp || !gp.axes) continue;

        const a = gp.axes;
        const a0 = a[0] ?? 0, a1 = a[1] ?? 0, a2 = a[2] ?? 0, a3 = a[3] ?? 0;
        const m01 = Math.abs(a0) + Math.abs(a1);
        const m23 = Math.abs(a2) + Math.abs(a3);

        const mx = (m23 > m01) ? a2 : a0;
        const my = (m23 > m01) ? a3 : a1;
        const mag = Math.abs(mx) + Math.abs(my);
        const tx = (m23 > m01) ? a0 : a2;

        if (mag > best.mag) best = { mag, mx, my, tx, axes: a.slice(0, 6) };
      }

      moveX = best.mx;
      moveY = best.my;
      turn  = best.tx * 0.85;

      writeHUD("axes", best.axes.map(v => (v ?? 0).toFixed(2)).join(", "));
      writeHUD("inputs", `XR sources=${session.inputSources?.length ?? 0}`);
    }
  } else {
    moveX += touch.left.x + keyX;
    moveY += touch.left.y + keyY;
    turn  += touch.right.x;
  }

  moveX = deadzone(moveX, 0.12);
  moveY = deadzone(moveY, 0.12);
  turn  = deadzone(turn,  0.18);

  if (turn) {
    if (presenting) player.rotation.y -= turn * TURN_SPEED * dt;
    else { yaw -= turn * TURN_SPEED * dt; player.rotation.y = yaw; }
  }

  if (moveX || moveY) {
    const heading = getHeadingYaw(presenting);
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

  if (!presenting) {
    camera.rotation.set(pitch, 0, 0);
    player.rotation.y = yaw;
  }
}

function deadzone(v, dz) { return Math.abs(v) < dz ? 0 : v; }

function getHeadingYaw(presenting) {
  if (!presenting) return yaw;
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ======================
// HUD
// ======================
function installHUD() {
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "99998";
  hud.style.maxWidth = "420px";
  hud.style.background = "rgba(10,12,18,0.62)";
  hud.style.color = "#e8ecff";
  hud.style.border = "1px solid rgba(127,231,255,0.25)";
  hud.style.borderRadius = "14px";
  hud.style.padding = "10px 12px";
  hud.style.backdropFilter = "blur(8px)";
  hud.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
  hud.style.fontSize = "12px";
  hud.style.userSelect = "none";

  hud.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-weight:800;">Scarlett VR Poker</div>
      <button id="btnClean">HIDE EVERYTHING</button>
    </div>

    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnVip">Spawn VIP</button>
      <button id="btnLobby">Spawn Lobby</button>
      <button id="btnCopy">Copy</button>
    </div>

    <div id="hudBody" style="margin-top:10px;opacity:.92;line-height:1.35;white-space:pre-wrap;"></div>
  `;
  document.body.appendChild(hud);

  hudBody = hud.querySelector("#hudBody");

  [...hud.querySelectorAll("button")].forEach(b => {
    b.style.background = "rgba(127,231,255,0.14)";
    b.style.color = "#e8ecff";
    b.style.border = "1px solid rgba(127,231,255,0.35)";
    b.style.borderRadius = "12px";
    b.style.padding = "8px 10px";
    b.style.cursor = "pointer";
  });

  hud.querySelector("#btnVip").onclick = resetToVIP;
  hud.querySelector("#btnLobby").onclick = resetToLobby;

  hud.querySelector("#btnCopy").onclick = async () => {
    const txt = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      writeHUD("copy", "copied ✅");
    } catch {
      writeHUD("copy", "copy failed ❌");
    }
  };

  hud.querySelector("#btnClean").onclick = () => {
    setCleanMode(!cleanMode);
  };

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "r") resetToVIP();
    if (k === "h") setCleanMode(!cleanMode);
  });
}

function writeHUD(key, value) {
  hudLines.set(key, value);
}

function updateHUD() {
  if (cleanMode) return;

  writeHUD("mode", renderer.xr.isPresenting ? "XR" : "2D");
  writeHUD("pos", `${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`);
  writeHUD("yaw", `${player.rotation.y.toFixed(2)}`);

  hudBody.textContent = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
}

// ======================
// DESKTOP CONTROLS
// ======================
function installDesktopControls() {
  addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    updKeys();
  });
  addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
    updKeys();
  });

  function updKeys() {
    keyX = 0; keyY = 0;
    if (keys.has("a")) keyX -= 1;
    if (keys.has("d")) keyX += 1;
    if (keys.has("w")) keyY += 1;
    if (keys.has("s")) keyY -= 1;
  }

  renderer.domElement.addEventListener("click", () => {
    if (renderer.xr.isPresenting) return;
    renderer.domElement.requestPointerLock?.();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = (document.pointerLockElement === renderer.domElement);
  });

  addEventListener("mousemove", (e) => {
    if (!pointerLocked || renderer.xr.isPresenting) return;
    yaw -= (e.movementX || 0) * 0.0022;
    pitch -= (e.movementY || 0) * 0.0020;
    pitch = Math.max(-1.25, Math.min(1.25, pitch));
  });
}

// ======================
// ANDROID TOUCH STICKS
// ======================
function installTouchSticks() {
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "0";
  wrap.style.right = "0";
  wrap.style.bottom = "0";
  wrap.style.height = "48%";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "99997";
  document.body.appendChild(wrap);
  touchWrapEl = wrap;

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
      ui.nub.style.transform =
        `translate(calc(-50% + ${stick.x * 28}px), calc(-50% + ${-stick.y * 28}px))`;
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

  writeHUD("android", "dual-stick ✅");
}
