// /js/index.js — Scarlett MASTER 6.7 (VIP-only spawn + Laser fix)
// ✅ Laser no longer “stuck in middle” (laser only visible when controller is connected/visible)
// ✅ VIP spawn is permanent (no lobby-center spawn used)
// ✅ Teleport ring works (trigger to teleport)
// ✅ 45° snap turn + move stick
// ✅ HUD + Clean Mode

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 6.7 (VIP Spawn Permanent + Laser Fix + Lights Ready)";
const log = (...a) => console.log(...a);

// WELCOME (declared early; TDZ-safe)
let welcomeEl = null;
let welcomeT = 0;

let scene, camera, renderer, player, clock;

// UI
let hud = null, hudBody = null;
let vrBtnEl = null;
let cleanMode = false;
const hudLines = new Map();

// Desktop look (kept for 2D)
let yaw = 0, pitch = 0;
let pointerLocked = false;
let keyX = 0, keyY = 0;
const keys = new Set();

// Movement
const MOVE_SPEED = 2.6;
let snapCooldown = 0;
const SNAP_ANGLE = Math.PI / 4; // 45°
const SNAP_DEAD = 0.75;
const SNAP_COOLDOWN = 0.22;

// Teleport Laser
const tp = {
  enabled: true,
  installed: false,
  raycaster: null,
  marker: null,
  c0: null,
  c1: null,
  line0: null,
  line1: null,
  tmpM: null,
  tmpO: null,
  tmpD: null,
  hit: null,
};

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);

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

  vrBtnEl = VRButton.createButton(renderer);
  document.body.appendChild(vrBtnEl);

  installHUD();
  installDesktopControls();

  // Build world (includes floors + VIP pad)
  World.build({ THREE, scene, log, BUILD });

  // Teleport laser after world exists
  installTeleportLaser();

  // VIP spawn ONLY (permanent)
  resetToVIP();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);
    resetToVIP();
    writeHUD("xr", "sessionstart ✅");
    showWelcome("VIP Spawn Active ✅");
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

  writeHUD("build", BUILD);
  writeHUD("controls", "Quest: LStick move, RStick 45° snap, Trigger teleport | H = Hide UI");

  showWelcome("Scarlett Poker VR — Loading VIP…");

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

// --------------------
// VIP SPAWN ONLY
// --------------------
function resetToVIP() {
  const s = World.getSpawn("lobby_vip_A"); // permanent
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);

  if (!renderer.xr.isPresenting) {
    yaw = player.rotation.y;
    pitch = 0;
  }
  writeHUD("spawn", "VIP (permanent)");
}

// --------------------
// MOVEMENT
// --------------------
function moveTick(dt) {
  const presenting = renderer.xr.isPresenting;

  let moveX = 0, moveY = 0, turn = 0;

  if (presenting) {
    const session = renderer.xr.getSession?.();
    if (session) {
      let best = { mag: 0, mx: 0, my: 0, tx: 0 };

      for (const src of session.inputSources) {
        const gp = src?.gamepad;
        if (!gp || !gp.axes) continue;
        const a = gp.axes;
        const a0 = a[0] ?? 0, a1 = a[1] ?? 0, a2 = a[2] ?? 0, a3 = a[3] ?? 0;

        const m01 = Math.abs(a0) + Math.abs(a1);
        const m23 = Math.abs(a2) + Math.abs(a3);

        // stronger stick = move
        const mx = (m23 > m01) ? a2 : a0;
        const my = (m23 > m01) ? a3 : a1;

        // other stick X = turn
        const tx = (m23 > m01) ? a0 : a2;

        const mag = Math.abs(mx) + Math.abs(my);
        if (mag > best.mag) best = { mag, mx, my, tx };
      }

      moveX = best.mx;
      moveY = best.my;
      turn = best.tx;
    }
  } else {
    // desktop
    moveX = keyX;
    moveY = keyY;
  }

  moveX = deadzone(moveX, 0.12);
  moveY = deadzone(moveY, 0.12);
  turn  = deadzone(turn, 0.18);

  // turn
  if (presenting) {
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
    if (turn) {
      yaw -= turn * 2.0 * dt;
      player.rotation.y = yaw;
    }
  }

  // move relative to heading
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

  // desktop pitch
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

// --------------------
// TELEPORT LASER (FIXED: no “stuck in middle”)
// --------------------
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();

  // marker ring
  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 48),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.90 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  // controllers
  tp.c0 = renderer.xr.getController(0);
  tp.c1 = renderer.xr.getController(1);
  scene.add(tp.c0, tp.c1);

  // Laser lines (start hidden; only show when controller is actually connected)
  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  tp.line0 = new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent:true, opacity: 0.95 }));
  tp.line0.scale.z = 12;
  tp.line0.visible = false;
  tp.c0.add(tp.line0);

  tp.line1 = new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent:true, opacity: 0.95 }));
  tp.line1.scale.z = 12;
  tp.line1.visible = false;
  tp.c1.add(tp.line1);

  // Connected/disconnected events toggle visibility correctly
  tp.c0.addEventListener("connected", () => { tp.line0.visible = true; });
  tp.c0.addEventListener("disconnected", () => { tp.line0.visible = false; });
  tp.c1.addEventListener("connected", () => { tp.line1.visible = true; });
  tp.c1.addEventListener("disconnected", () => { tp.line1.visible = false; });

  // Teleport on trigger
  const doTeleport = () => {
    if (!tp.enabled || !tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
    writeHUD("tp", `teleport -> ${tp.hit.x.toFixed(2)}, ${tp.hit.z.toFixed(2)}`);
  };
  tp.c0.addEventListener("selectstart", doTeleport);
  tp.c1.addEventListener("selectstart", doTeleport);

  tp.installed = true;
  writeHUD("tp", "laser ✅ (hidden until controller connects)");
}

function updateTeleportLaser() {
  if (!tp.installed || !tp.enabled) return;

  // Only operate in XR
  if (!renderer.xr.isPresenting) {
    tp.marker.visible = false;
    return;
  }

  // CRITICAL FIX:
  // If controller isn't visible/connected, do NOT render marker/hits from origin.
  const cands = [];
  if (tp.c1?.visible && tp.line1?.visible) cands.push(tp.c1);
  if (tp.c0?.visible && tp.line0?.visible) cands.push(tp.c0);

  if (!cands.length) {
    tp.marker.visible = false;
    tp.hit = null;
    return;
  }

  const floors = World.getFloors ? World.getFloors() : [];
  tp.hit = null;

  for (const c of cands) {
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

// --------------------
// HUD + CLEAN MODE
// --------------------
function installHUD() {
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.zIndex = "99998";
  hud.style.maxWidth = "480px";
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
      <button id="btnTp">Teleport: ON</button>
      <button id="btnCopy">Copy Log</button>
    </div>

    <div id="hudBody" style="margin-top:10px;opacity:.92;line-height:1.35;white-space:pre-wrap;"></div>
  `;
  document.body.appendChild(hud);
  hudBody = hud.querySelector("#hudBody");

  // Style buttons
  [...hud.querySelectorAll("button")].forEach(b => {
    b.style.background = "rgba(127,231,255,0.14)";
    b.style.color = "#e8ecff";
    b.style.border = "1px solid rgba(127,231,255,0.35)";
    b.style.borderRadius = "12px";
    b.style.padding = "8px 10px";
    b.style.cursor = "pointer";
  });

  hud.querySelector("#btnVip").onclick = () => { resetToVIP(); showWelcome("VIP Spawn ✅"); };

  hud.querySelector("#btnTp").onclick = () => {
    tp.enabled = !tp.enabled;
    hud.querySelector("#btnTp").textContent = tp.enabled ? "Teleport: ON" : "Teleport: OFF";
    showWelcome(tp.enabled ? "Teleport enabled" : "Teleport disabled");
  };

  hud.querySelector("#btnCopy").onclick = async () => {
    const txt = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
    try { await navigator.clipboard.writeText(txt); showWelcome("Copied ✅"); }
    catch { showWelcome("Copy failed ❌"); }
  };

  hud.querySelector("#btnClean").onclick = () => {
    cleanMode = !cleanMode;
    setCleanMode(cleanMode);
    showWelcome(cleanMode ? "Clean Mode ON" : "Clean Mode OFF");
  };

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "h") setCleanMode(!(cleanMode = !cleanMode));
    if (k === "r") resetToVIP();
  });
}

function setCleanMode(on) {
  if (hud) hud.style.display = on ? "none" : "";
  if (vrBtnEl) vrBtnEl.style.display = on ? "none" : "";
  const bootlog = document.getElementById("bootlog");
  if (bootlog) bootlog.style.display = on ? "none" : "";
}

function writeHUD(k, v) { hudLines.set(k, v); }

function updateHUD(dt) {
  // welcome fade
  if (welcomeEl && welcomeT > 0) {
    welcomeT -= dt;
    if (welcomeT <= 0) welcomeEl.style.opacity = "0";
    else if (welcomeT < 1.2) welcomeEl.style.opacity = String(Math.max(0, welcomeT / 1.2));
  }

  if (cleanMode) return;

  writeHUD("mode", renderer.xr.isPresenting ? "XR" : "2D");
  writeHUD("pos", `${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)}`);
  writeHUD("laser", tp.enabled ? "ON" : "OFF");
  writeHUD("walls", "tall ✅ (jumbotron-ready)");

  if (hudBody) hudBody.textContent = [...hudLines.entries()].map(([k,v]) => `${k}: ${v}`).join("\n");
}

function showWelcome(text) {
  if (!document.body) return;
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
    welcomeEl.style.pointerEvents = "none";
    document.body.appendChild(welcomeEl);
  }
  welcomeEl.textContent = text;
  welcomeEl.style.opacity = "1";
  welcomeT = 5.5;
}

// --------------------
// Desktop controls (kept)
// --------------------
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
