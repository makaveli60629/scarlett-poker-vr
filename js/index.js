// /js/index.js — Scarlett MASTER 7.0 (VIP CUBE SPAWN + XR CLEAN MODE + laser/ring fix)

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER 7.0 (VIP Cube Spawn + Full World Restore + XR Clean Mode)";
const log = (...a) => console.log(...a);

let scene, camera, renderer, player, clock;

// UI
let hud, hudBody, vrBtnEl;
let cleanMode = false;

// Welcome
let welcomeEl = null, welcomeT = 0;
const hudLines = new Map();

// Movement
const MOVE_SPEED = 2.6;
let snapCooldown = 0;
const SNAP_ANGLE = Math.PI / 4;
const SNAP_DEAD = 0.75;
const SNAP_COOLDOWN = 0.22;

// Teleport / laser
const tp = {
  enabled: true,
  raycaster: null,
  marker: null,
  c0: null,
  c1: null,
  line0: null,
  line1: null,
  hit: null,
  tmpM: null,
  tmpO: null,
  tmpD: null,
};

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);

  player = new THREE.Group();
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

  // Build full world
  World.build({ THREE, scene, log, BUILD });

  // Install laser/teleport after world
  installTeleportLaser();

  // Spawn VIP cube immediately
  resetToVIPCube();

  renderer.xr.addEventListener("sessionstart", () => {
    camera.position.set(0, 0, 0);

    // IMPORTANT: hide HUD/bootlog in XR so you don’t see “rings stuck in center”
    setCleanMode(true);

    resetToVIPCube();
    showWelcome("VIP Cube Spawn ✅ Facing Table");
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
    setCleanMode(false);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  writeHUD("build", BUILD);
  writeHUD("controls", "Quest: LStick move, RStick 45° snap, Trigger teleport | H toggles UI");

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  moveTick(dt);
  updateTeleport(dt);
  updateHUD(dt);
  renderer.render(scene, camera);
}

// --------------------
// SPAWN (VIP CUBE ONLY)
// --------------------
function resetToVIPCube() {
  const s = World.getSpawn("vip_cube");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  writeHUD("spawn", "vip_cube (permanent)");
}

// --------------------
// MOVEMENT (XR)
// --------------------
function moveTick(dt) {
  if (!renderer.xr.isPresenting) return;

  let moveX = 0, moveY = 0, turn = 0;
  const session = renderer.xr.getSession?.();
  if (session) {
    let best = { mag: 0, mx: 0, my: 0, tx: 0 };

    for (const src of session.inputSources) {
      const gp = src?.gamepad;
      if (!gp?.axes) continue;
      const a = gp.axes;
      const a0 = a[0] ?? 0, a1 = a[1] ?? 0, a2 = a[2] ?? 0, a3 = a[3] ?? 0;
      const m01 = Math.abs(a0) + Math.abs(a1);
      const m23 = Math.abs(a2) + Math.abs(a3);

      const mx = (m23 > m01) ? a2 : a0;
      const my = (m23 > m01) ? a3 : a1;
      const tx = (m23 > m01) ? a0 : a2;

      const mag = Math.abs(mx) + Math.abs(my);
      if (mag > best.mag) best = { mag, mx, my, tx };
    }

    moveX = dz(best.mx, 0.12);
    moveY = dz(best.my, 0.12);
    turn  = dz(best.tx, 0.18);
  }

  // 45° snap turn
  snapCooldown -= dt;
  if (snapCooldown <= 0) {
    if (turn > SNAP_DEAD) { player.rotation.y -= SNAP_ANGLE; snapCooldown = SNAP_COOLDOWN; }
    if (turn < -SNAP_DEAD){ player.rotation.y += SNAP_ANGLE; snapCooldown = SNAP_COOLDOWN; }
  }

  // move relative to heading
  if (moveX || moveY) {
    const heading = getHeadingYaw();
    const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const r = new THREE.Vector3(f.z, 0, -f.x);

    const v = new THREE.Vector3()
      .addScaledVector(r, moveX)
      .addScaledVector(f, moveY);

    if (v.lengthSq() > 0.00001) {
      v.normalize().multiplyScalar(MOVE_SPEED * dt);
      player.position.add(v);
    }
  }
}

function dz(v, d) { return Math.abs(v) < d ? 0 : v; }
function getHeadingYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// --------------------
// TELEPORT / LASER (fix “stuck in center”)
// --------------------
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();

  // marker ring (hidden unless valid hit)
  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.92 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  // controllers
  tp.c0 = renderer.xr.getController(0);
  tp.c1 = renderer.xr.getController(1);
  scene.add(tp.c0, tp.c1);

  // laser lines (OFF until controller “connected” event)
  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  tp.line0 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity: 0.95 }));
  tp.line0.scale.z = 12;
  tp.line0.visible = false;
  tp.c0.add(tp.line0);

  tp.line1 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity: 0.95 }));
  tp.line1.scale.z = 12;
  tp.line1.visible = false;
  tp.c1.add(tp.line1);

  // Properly bind controller connection state
  tp.c0.addEventListener("connected", (e) => { tp.c0.userData.src = e.data; tp.line0.visible = true; });
  tp.c1.addEventListener("connected", (e) => { tp.c1.userData.src = e.data; tp.line1.visible = true; });
  tp.c0.addEventListener("disconnected", () => { tp.c0.userData.src = null; tp.line0.visible = false; });
  tp.c1.addEventListener("disconnected", () => { tp.c1.userData.src = null; tp.line1.visible = false; });

  const doTeleport = () => {
    if (!tp.enabled || !tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
  };

  tp.c0.addEventListener("selectstart", doTeleport);
  tp.c1.addEventListener("selectstart", doTeleport);
}

function updateTeleport() {
  if (!renderer.xr.isPresenting || !tp.enabled) {
    tp.marker.visible = false;
    tp.hit = null;
    return;
  }

  // Only raycast if a controller is truly connected
  const cands = [];
  if (tp.c1?.userData?.src && tp.line1?.visible) cands.push(tp.c1);
  if (tp.c0?.userData?.src && tp.line0?.visible) cands.push(tp.c0);

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

    if (hits?.length) {
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
// HUD (auto hidden in XR)
// --------------------
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
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
      <div style="font-weight:900;">Scarlett VR Poker</div>
      <button id="btnHide">HIDE</button>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="btnSpawn">Spawn VIP Cube</button>
      <button id="btnTp">Teleport: ON</button>
    </div>
    <div id="hudBody" style="margin-top:10px;white-space:pre-wrap;opacity:.92;"></div>
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

  hud.querySelector("#btnSpawn").onclick = () => resetToVIPCube();

  hud.querySelector("#btnTp").onclick = () => {
    tp.enabled = !tp.enabled;
    hud.querySelector("#btnTp").textContent = tp.enabled ? "Teleport: ON" : "Teleport: OFF";
  };

  hud.querySelector("#btnHide").onclick = () => setCleanMode(true);

  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "h") setCleanMode(!cleanMode);
    if (e.key.toLowerCase() === "r") resetToVIPCube();
  });
}

function setCleanMode(on) {
  cleanMode = !!on;
  if (hud) hud.style.display = cleanMode ? "none" : "";
  if (vrBtnEl) vrBtnEl.style.display = cleanMode ? "none" : "";
  const bootlog = document.getElementById("bootlog");
  if (bootlog) bootlog.style.display = cleanMode ? "none" : "";
}

function writeHUD(k, v) { hudLines.set(k, v); }

function updateHUD(dt) {
  if (welcomeEl && welcomeT > 0) {
    welcomeT -= dt;
    if (welcomeT <= 0) welcomeEl.style.opacity = "0";
    else if (welcomeT < 1.2) welcomeEl.style.opacity = String(Math.max(0, welcomeT / 1.2));
  }

  if (cleanMode) return;

  writeHUD("mode", renderer.xr.isPresenting ? "XR" : "2D");
  writeHUD("spawn", "VIP cube (permanent)");
  writeHUD("tp", tp.enabled ? "ON" : "OFF");

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
