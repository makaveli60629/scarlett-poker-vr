// /js/index.js — Scarlett MASTER (Permanent Diagnostics + Controls + HUD Toggle)
// ✅ wrapper-only imports
import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 6.0 (Diagnostics HUD + Quest/Android/Desktop Controls)";
const log = (...a) => console.log(...a);

let scene, camera, renderer, player, clock;
let hud, hudBody, hudVisible = true;

let yaw = 0, pitch = 0;
let pointerLocked = false;

const MOVE_SPEED = 2.6;
const TURN_SPEED = 2.0;

// keyboard
let keyX = 0, keyY = 0;
const keys = new Set();

// touch sticks
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
};

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

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));

  // HUD
  installHUD();

  // World
  World.build({ THREE, scene, log, BUILD });

  // Controls
  installDesktopControls();
  installTouchSticks();

  // Spawn
  resetToVIP();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetToVIP();
    writeHUDLine("xr", "sessionstart ✅");
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
    writeHUDLine("xr", "sessionend ✅");
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);

  // Initial HUD info
  writeHUDLine("build", BUILD);
  writeHUDLine("ua", navigator.userAgent);
  writeHUDLine("secure", String(window.isSecureContext));
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  moveTick(dt);
  updateHUD(dt);
  renderer.render(scene, camera);
}

// ======================
// SPAWNS
// ======================
function resetToVIP() {
  const s = World.getSpawn("lobby_vip_A");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  if (!renderer.xr.isPresenting) {
    yaw = player.rotation.y;
    pitch = 0;
  }
  writeHUDLine("spawn", `VIP (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
}

function resetToLobbyCenter() {
  const s = World.getSpawn("lobby_center");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  if (!renderer.xr.isPresenting) {
    yaw = player.rotation.y;
    pitch = 0;
  }
  writeHUDLine("spawn", `Lobby (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
}

// ======================
// MOVEMENT
// ======================
function moveTick(dt) {
  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0, turn = 0;

  // XR sticks (Quest)
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

      // show live axes (diagnostic)
      writeHUDLine("axes", best.axes.map(v => (v ?? 0).toFixed(2)).join(", "));
    }
  } else {
    // Android sticks + desktop keys
    moveX += touch.left.x + keyX;
    moveY += touch.left.y + keyY;
    turn  += touch.right.x;
  }

  // deadzones
  moveX = dz(moveX, 0.12);
  moveY = dz(moveY, 0.12);
  turn  = dz(turn,  0.18);

  // turning
  if (turn) {
    if (presenting) player.rotation.y -= turn * TURN_SPEED * dt;
    else {
      yaw -= turn * TURN_SPEED * dt;
      player.rotation.y = yaw;
    }
  }

  // movement relative to heading
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

  // desktop look
  if (!presenting) {
    camera.rotation.set(pitch, 0, 0);
    player.rotation.y = yaw;
  }
}

function dz(v, d) { return Math.abs(v) < d ? 0 : v; }

function getHeadingYaw(presenting) {
  if (!presenting) return yaw;
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// ======================
// HUD (Hide/Show + buttons)
// ======================
function installHUD() {
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "99999";
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
      <div style="display:flex;gap:8px;">
        <button id="hudHide">HIDE HUD</button>
      </div>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnVip">Spawn VIP</button>
      <button id="btnLobby">Spawn Lobby</button>
      <button id="btnCopy">Copy</button>
    </div>
    <div id="hudBody" style="margin-top:10px;opacity:.92;line-height:1.35;"></div>
  `;
  document.body.appendChild(hud);

  hudBody = hud.querySelector("#hudBody");

  // style buttons
  [...hud.querySelectorAll("button")].forEach(b => {
    b.style.background = "rgba(127,231,255,0.14)";
    b.style.color = "#e8ecff";
    b.style.border = "1px solid rgba(127,231,255,0.35)";
    b.style.borderRadius = "12px";
    b.style.padding = "8px 10px";
    b.style.cursor = "pointer";
  });

  hud.querySelector("#btnVip").onclick = resetToVIP;
  hud.querySelector("#btnLobby").onclick = resetToLobbyCenter;

  hud.querySelector("#btnCopy").onclick = async () => {
    const txt = getHUDText();
    try {
      await navigator.clipboard.writeText(txt);
      writeHUDLine("copy", "copied ✅");
    } catch {
      writeHUDLine("copy", "copy failed ❌");
    }
  };

  hud.querySelector("#hudHide").onclick = () => {
    hudVisible = !hudVisible;
    if (hudVisible) {
      hudBody.style.display = "";
      hud.querySelector("#hudHide").textContent = "HIDE HUD";
    } else {
      hudBody.style.display = "none";
      hud.querySelector("#hudHide").textContent = "SHOW HUD";
    }
  };

  // hotkeys
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "r") resetToVIP();
    if (k === "h") hud.querySelector("#hudHide").click();
  });
}

const hudLines = new Map();
function writeHUDLine(key, value) {
  hudLines.set(key, value);
}

function updateHUD() {
  if (!hudVisible) return;

  const presenting = renderer.xr.isPresenting;
  const p = player.position;

  writeHUDLine("mode", presenting ? "XR" : "2D");
  writeHUDLine("pos", `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`);
  writeHUDLine("yaw", `${player.rotation.y.toFixed(2)}`);

  const lines = [];
  for (const [k, v] of hudLines.entries()) lines.push(`${k}: ${v}`);
  hudBody.textContent = lines.join("\n");
}

function getHUDText() {
  const lines = [];
  for (const [k, v] of hudLines.entries()) lines.push(`${k}: ${v}`);
  return lines.join("\n");
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
// ANDROID TOUCH STICKS (auto)
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
  wrap.style.zIndex = "99998";
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

  writeHUDLine("android", "dual-stick ✅");
}
