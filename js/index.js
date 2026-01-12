// /js/index.js — Scarlett MASTER 6.5 (FULL)
// ✅ Permanent: uses default THREE import from ./three.js (no bare "three" anywhere)
// ✅ Quest: thumbstick locomotion + 45° snap-turn + laser + floor teleport ring + trigger teleports
// ✅ Android: dual touch sticks (move + turn)
// ✅ Desktop: WASD + mouse look (pointer lock)
// ✅ HUD: Welcome + Diagnostics + Copy + Spawn buttons
// ✅ Clean Mode: HIDE EVERYTHING (HUD + VR button + touch sticks + bootlog)

import THREE, { VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 6.5 (Laser Teleport + 45° Snap Turn + VIP Spawn + HUD Pack)";
const log = (...a) => console.log(...a);

let scene, camera, renderer, player, clock;

// UI handles
let hud = null, hudBody = null;
let vrBtnEl = null;
let touchWrapEl = null;
let cleanMode = false;

// desktop look
let yaw = 0, pitch = 0;
let pointerLocked = false;

// keyboard move
let keyX = 0, keyY = 0;
const keys = new Set();

// touch sticks
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
};

const MOVE_SPEED = 2.6;

// Snap turn config (Quest)
let snapCooldown = 0;
const SNAP_ANGLE = Math.PI / 4; // 45°
const SNAP_DEAD = 0.75;
const SNAP_COOLDOWN = 0.22;

// HUD data
const hudLines = new Map();

// Teleport laser state
let tp = {
  raycaster: null,
  marker: null,
  c0: null,
  c1: null,
  tmpM: null,
  tmpO: null,
  tmpD: null,
  hit: null,
  installed: false,
  enabled: true
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

  // VR button (store handle for clean mode)
  vrBtnEl = VRButton.createButton(renderer);
  document.body.appendChild(vrBtnEl);

  // HUD + controls
  installHUD();
  installDesktopControls();
  installTouchSticks();

  // World
  World.build({ THREE, scene, log, BUILD });

  // Teleport laser (Quest)
  installTeleportLaser();

  // Spawn in VIP (pink) facing table (world sets yaw)
  resetToVIP();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetToVIP();
    writeHUD("xr", "sessionstart ✅");
    showWelcome("Welcome to Scarlett VR Poker — VIP Spawn Active");
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

  // Seed HUD
  writeHUD("build", BUILD);
  writeHUD("secure", String(window.isSecureContext));
  writeHUD("ua", navigator.userAgent);
  writeHUD("controls", "Quest: LeftStick=Move, RightStick=SnapTurn 45°, Trigger=Teleport | H=Hide UI");

  showWelcome("Scarlett VR Poker — Loading VIP Lobby…");

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);

  moveTick(dt);
  updateTeleportLaser();
  updateHUD(dt);

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

  if (!renderer.xr.isPresenting) {
    yaw = player.rotation.y;
    pitch = 0;
  }

  writeHUD("spawn", `VIP (${s.x.toFixed(2)}, ${s.z.toFixed(2)}) facing table`);
}

function resetToLobby() {
  const s = World.getSpawn("lobby_center");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);

  if (!renderer.xr.isPresenting) {
    yaw = player.rotation.y;
    pitch = 0;
  }

  writeHUD("spawn", `Lobby (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
}

// ======================
// MOVEMENT
// ======================
function moveTick(dt) {
  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0, turn = 0;

  if (presenting) {
    // XR sticks (Quest)
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

        // pick stronger stick as move
        const mx = (m23 > m01) ? a2 : a0;
        const my = (m23 > m01) ? a3 : a1;
        const mag = Math.abs(mx) + Math.abs(my);

        // other stick X becomes turn input
        const tx = (m23 > m01) ? a0 : a2;

        if (mag > best.mag) best = { mag, mx, my, tx, axes: a.slice(0, 6) };
      }

      moveX = best.mx;
      moveY = best.my;
      turn  = best.tx;

      writeHUD("axes", best.axes.map(v => (v ?? 0).toFixed(2)).join(", "));
      writeHUD("inputs", `XR sources=${session.inputSources?.length ?? 0}`);
    }
  } else {
    // Android + Desktop
    moveX += touch.left.x + keyX;
    moveY += touch.left.y + keyY;
    turn  += touch.right.x;
  }

  moveX = deadzone(moveX, 0.12);
  moveY = deadzone(moveY, 0.12);
  turn  = deadzone(turn,  0.18);

  // Turning
  if (presenting) {
    // 45° snap-turn on right stick
    snapCooldown -= dt;
    if (snapCooldown <= 0) {
      if (turn > SNAP_DEAD) {
        player.rotation.y -= SNAP_ANGLE;
        snapCooldown = SNAP_COOLDOWN;
      } else if (turn < -SNAP_DEAD) {
        player.rotation.y += SNAP_ANGLE;
        snapCooldown = SNAP_COOLDOWN;
      }
    }
  } else {
    // smooth turn for phone/desktop
    if (turn) {
      yaw -= turn * 2.0 * dt;
      player.rotation.y = yaw;
    }
  }

  // Move relative to heading
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
// TELEPORT LASER (Quest)
// ======================
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();

  // marker ring
  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 48),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  // controllers
  tp.c0 = renderer.xr.getController(0);
  tp.c1 = renderer.xr.getController(1);
  scene.add(tp.c0, tp.c1);

  // laser lines
  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });

  const line0 = new THREE.Line(geo, mat);
  line0.scale.z = 12;
  tp.c0.add(line0);

  const line1 = new THREE.Line(geo, mat.clone());
  line1.scale.z = 12;
  tp.c1.add(line1);

  // teleport on trigger (select)
  const doTeleport = () => {
    if (!tp.enabled || !tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
    writeHUD("tp", `teleport -> ${tp.hit.x.toFixed(2)}, ${tp.hit.z.toFixed(2)}`);
  };

  tp.c0.addEventListener("selectstart", doTeleport);
  tp.c1.addEventListener("selectstart", doTeleport);

  tp.installed = true;
  writeHUD("tp", "laser ✅ (Trigger teleports)");
}

function updateTeleportLaser() {
  if (!tp.installed || !tp.enabled) return;
  if (!renderer.xr.isPresenting || !tp.raycaster) {
    if (tp.marker) tp.marker.visible = false;
    return;
  }

  const floors = World.getFloors ? World.getFloors() : [];
  tp.hit = null;

  // prefer right then left
  const controllers = [tp.c1, tp.c0];

  for (const c of controllers) {
    if (!c) continue;

    tp.tmpM.identity().extractRotation(c.matrixWorld);
    tp.tmpO.setFromMatrixPosition(c.matrixWorld);
    tp.tmpD.set(0, 0, -1).applyMatrix4(tp.tmpM).normalize();

    tp.raycaster.set(tp.tmpO, tp.tmpD);
    const hits = tp.raycaster.intersectObjects(floors, true);
    if (hits && hits.length) {
      const p = hits[0].point;
      tp.hit = p;
      tp.marker.position.set(p.x, p.y + 0.02, p.z);
      tp.marker.visible = true;
      return;
    }
  }

  tp.marker.visible = false;
}

// ======================
// HUD (Welcome + Diagnostics)
// ======================
let welcomeEl = null;
let welcomeT = 0;

function showWelcome(text) {
  if (!welcomeEl) {
    welcomeEl = document.createElement("div");
    welcomeEl.style.position = "fixed";
    welcomeEl.style.left = "50%";
    welcomeEl.style.top = "14px";
    welcomeEl.style.transform = "translateX(-50%)";
    welcomeEl.style.zIndex = "99999";
    welcomeEl.style.background = "rgba(10,12,18,0.66)";
    welcomeEl.style.color = "#e8ecff";
    welcomeEl.style.border = "1px solid rgba(127,231,255,0.25)";
    welcomeEl.style.borderRadius = "14px";
    welcomeEl.style.padding = "10px 14px";
    welcomeEl.style.backdropFilter = "blur(8px)";
    welcomeEl.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    welcomeEl.style.fontSize = "13px";
    welcomeEl.style.fontWeight = "700";
    welcomeEl.style.userSelect = "none";
    document.body.appendChild(welcomeEl);
  }
  welcomeEl.textContent = text;
  welcomeEl.style.opacity = "1";
  welcomeT = 6.0; // seconds
}

function installHUD() {
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "99998";
  hud.style.maxWidth = "440px";
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
      <div style="font-weight:900;">Scarlett VR Poker</div>
      <button id="btnClean">HIDE EVERYTHING</button>
    </div>

    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnVip">Spawn VIP</button>
      <button id="btnLobby">Spawn Lobby</button>
      <button id="btnCopy">Copy</button>
      <button id="btnTp">Teleport: ON</button>
    </div>

    <div id="hudBody" style="margin-top:10px;opacity:.92;line-height:1.35;white-space:pre-wrap;"></div>
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

  hud.querySelector("#btnVip").onclick = () => { resetToVIP(); showWelcome("VIP Spawn (Pink) — Facing Table"); };
  hud.querySelector("#btnLobby").onclick = () => { resetToLobby(); showWelcome("Lobby Spawn"); };

  hud.querySelector("#btnCopy").onclick = async () => {
    const txt = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      writeHUD("copy", "copied ✅");
      showWelcome("Diagnostics copied ✅");
    } catch {
      writeHUD("copy", "copy failed ❌");
      showWelcome("Copy failed ❌");
    }
  };

  hud.querySelector("#btnTp").onclick = () => {
    tp.enabled = !tp.enabled;
    hud.querySelector("#btnTp").textContent = tp.enabled ? "Teleport: ON" : "Teleport: OFF";
    showWelcome(tp.enabled ? "Teleport enabled" : "Teleport disabled");
  };

  hud.querySelector("#btnClean").onclick = () => {
    setCleanMode(!cleanMode);
    showWelcome(cleanMode ? "Clean Mode ON (UI hidden)" : "UI visible");
  };

  // hotkeys
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "r") resetToVIP();
    if (k === "h") setCleanMode(!cleanMode);
    if (k === "t") tp.enabled = !tp.enabled;
  });
}

function writeHUD(key, value) {
  hudLines.set(key, value);
}

function updateHUD(dt) {
  // welcome fade
  if (welcomeEl && welcomeT > 0) {
    welcomeT -= dt;
    if (welcomeT <= 0) welcomeEl.style.opacity = "0";
    else if (welcomeT < 1.2) welcomeEl.style.opacity = String(Math.max(0, welcomeT / 1.2));
  }

  if (cleanMode) return;

  writeHUD("mode", renderer.xr.isPresenting ? "XR" : "2D");
  writeHUD("pos", `${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`);
  writeHUD("yaw", `${player.rotation.y.toFixed(2)}`);
  writeHUD("snap", `45° (cooldown ${(Math.max(0,snapCooldown)).toFixed(2)}s)`);

  if (hudBody) hudBody.textContent = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
}

// ======================
// DESKTOP CONTROLS (WASD + MOUSE LOOK)
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
