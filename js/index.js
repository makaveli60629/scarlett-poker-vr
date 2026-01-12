// /js/index.js — Scarlett MASTER INDEX (Wrapper-compatible)
// ✅ Uses /js/three.js wrapper (NO bare imports)
// ✅ Quest thumbstick move + optional turn
// ✅ Desktop WASD + mouse look
// ✅ Android dual-stick overlay
// ✅ Hard spawn in VIP lobby square pad near Spawn Machine
// ✅ Reset buttons + R hotkey

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "FULL-DIAG MASTER 5.1 (VIP Lobby Spawn + Movement All Platforms)";
const log = (...a) => console.log(...a);

log(`[index] runtime start ✅ (${BUILD})`);
log(`[index] THREE.REVISION=${THREE.REVISION ?? "?"}`);

let scene, camera, renderer, player, clock;
let world;

// desktop look
let yaw = 0, pitch = 0;
let pointerLocked = false;

// keyboard movement
let keyAxisX = 0, keyAxisY = 0;
const keys = new Set();

// Android touch sticks
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
};

const MOVE_SPEED = 2.6; // m/s
const TURN_SPEED = 2.0; // rad/s

init();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + PlayerRig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
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

  // GL info (helps debugging)
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      log(`[gl] vendor=${gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)}`);
      log(`[gl] renderer=${gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`);
    }
    log(`[gl] maxTextureSize=${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
  } catch {}

  // Lights (primary)
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(10, 18, 8);
  scene.add(sun);
  log("[lights] installed ✅");

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));
  log("[vr] VRButton appended ✅");

  // Build world
  log("[world] calling World.build() …");
  world = World.build({ THREE, scene, log, BUILD });
  log("[world] build complete ✅");

  // UI + controls
  installHUD();
  installTouchSticks();
  installDesktopControls();

  // Hard spawn: VIP square pad by spawn machine
  resetToVIPLobby();

  // Loop
  clock = new THREE.Clock();
  renderer.setAnimationLoop(tick);

  // Events
  window.addEventListener("resize", onResize);

  renderer.xr.addEventListener("sessionstart", () => {
    log("[XR] sessionstart ✅");
    // In XR, headset controls height; camera local should be 0
    camera.position.set(0, 0, 0);
    // Hard re-spawn so you never start inside table/divot
    resetToVIPLobby();
  });

  renderer.xr.addEventListener("sessionend", () => {
    log("[XR] sessionend ✅");
    // Restore desktop standing height
    camera.position.set(0, 1.65, 0);
  });

  log("[index] ready ✅");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  log(`[gl] resize -> ${window.innerWidth}x${window.innerHeight}`);
}

// ============================
// SPAWNS / RESETS
// ============================
function resetToVIPLobby() {
  const s = World.getSpawn("lobby_vip_A");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);

  if (!renderer.xr.isPresenting) {
    camera.position.set(0, 1.65, 0);
    yaw = player.rotation.y;
    pitch = 0;
  }

  log("[spawn] VIP lobby ✅", s);
}

function resetToLobbyCenter() {
  const s = World.getSpawn("lobby_center");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);

  if (!renderer.xr.isPresenting) {
    camera.position.set(0, 1.65, 0);
    yaw = player.rotation.y;
    pitch = 0;
  }

  log("[spawn] lobby center ✅", s);
}

// ============================
// MOVEMENT CORE
// ============================
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0;
  let turn = 0;

  // 1) XR controllers (Quest)
  if (presenting) {
    const session = renderer.xr.getSession?.();
    if (session) {
      // Collect strongest stick pair across all sources
      let best = { mag: 0, mx: 0, my: 0, tx: 0 };

      for (const src of session.inputSources) {
        const gp = src?.gamepad;
        if (!gp || !gp.axes) continue;

        const a = gp.axes;
        const a0 = a[0] ?? 0, a1 = a[1] ?? 0, a2 = a[2] ?? 0, a3 = a[3] ?? 0;
        const m01 = Math.abs(a0) + Math.abs(a1);
        const m23 = Math.abs(a2) + Math.abs(a3);

        // movement pair = bigger magnitude
        const mx = (m23 > m01) ? a2 : a0;
        const my = (m23 > m01) ? a3 : a1;
        const mag = Math.abs(mx) + Math.abs(my);

        // "other" x axis (optional turn)
        const tx = (m23 > m01) ? a0 : a2;

        if (mag > best.mag) best = { mag, mx, my, tx };
      }

      moveX = best.mx;
      moveY = best.my;
      // gentle turn if present (some devices map right stick here)
      turn = best.tx * 0.85;
    }
  }

  // 2) Android touch sticks (non-XR)
  if (!presenting) {
    moveX += touch.left.x;
    moveY += touch.left.y;
    turn  += touch.right.x;
  }

  // 3) Desktop keyboard (non-XR)
  if (!presenting) {
    moveX += keyAxisX;
    moveY += keyAxisY;
  }

  // deadzones
  moveX = deadzone(moveX, 0.12);
  moveY = deadzone(moveY, 0.12);
  turn  = deadzone(turn,  0.18);

  // Apply turn
  if (turn) {
    if (presenting) {
      player.rotation.y -= turn * TURN_SPEED * dt;
    } else {
      yaw -= turn * TURN_SPEED * dt;
      player.rotation.y = yaw;
    }
  }

  // Apply movement relative to heading
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

  // Desktop look
  if (!presenting) {
    camera.rotation.set(pitch, 0, 0);
    player.rotation.y = yaw;
  }

  renderer.render(scene, camera);
}

function deadzone(v, dz) {
  return Math.abs(v) < dz ? 0 : v;
}

function getHeadingYaw(presenting) {
  if (!presenting) return yaw;

  // XR: use headset yaw
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ============================
// HUD
// ============================
function installHUD() {
  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "9999";
  hud.style.background = "rgba(10,12,18,0.58)";
  hud.style.color = "#e8ecff";
  hud.style.padding = "10px 12px";
  hud.style.borderRadius = "14px";
  hud.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
  hud.style.fontSize = "13px";
  hud.style.userSelect = "none";
  hud.style.backdropFilter = "blur(8px)";
  hud.style.maxWidth = "360px";

  hud.innerHTML = `
    <div style="font-weight:800;margin-bottom:6px;">Scarlett VR Poker</div>
    <div style="opacity:.85;margin-bottom:8px;">${BUILD}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnVip">Spawn VIP Lobby</button>
      <button id="btnLobby">Spawn Lobby Center</button>
      <button id="btnCopy">Copy Debug</button>
    </div>
    <div style="opacity:.7;margin-top:8px;line-height:1.25;">
      Quest: thumbstick move (auto-detect axes) • Android: dual sticks<br/>
      Desktop: click → mouse look • WASD move • R reset
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

  btnVip.onclick = resetToVIPLobby;
  btnLobby.onclick = resetToLobbyCenter;

  btnCopy.onclick = async () => {
    try {
      const text =
`BUILD=${BUILD}
THREE.REVISION=${THREE.REVISION ?? "?"}
xrPresenting=${renderer?.xr?.isPresenting ?? false}
playerPos=${player?.position?.x?.toFixed?.(2)},${player?.position?.y?.toFixed?.(2)},${player?.position?.z?.toFixed?.(2)}
playerYaw=${player?.rotation?.y?.toFixed?.(2)}`;

      await navigator.clipboard.writeText(text);
      log("[HUD] copied ✅");
    } catch (e) {
      log("[HUD] copy failed", e);
    }
  };

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") resetToVIPLobby();
  });
}

// ============================
// DESKTOP CONTROLS
// ============================
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
