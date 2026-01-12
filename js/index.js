// /js/index.js — Scarlett INDEX_MASTER v3
// ✅ Dynamic-import world.js (cache-bust)
// ✅ XR thumbsticks: robust mapping via XRSession.inputSources (supports axes 0/1 and 2/3)
// ✅ Right stick: forward/back + strafe (45° works naturally). Also snap-turn on X axis.
// ✅ Left stick: left/right strafe + forward/back move (as requested)
// ✅ Teleport: pinch/select/squeeze + rainbow curved arc + landing ring marker
// ✅ Desktop WASD + Android touch sticks when NOT in XR
// ✅ Hard fallback world if world fails

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";

const BUILD = `INDEX_MASTER_${Date.now()}`;

// ---------------- HUD / LOG ----------------
const HUD = (() => {
  const state = { lines: [], max: 360 };
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  const timeStr = () => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ampm}`;
  };

  const root = document.createElement("div");
  root.style.cssText = `position:fixed; inset:0; pointer-events:none; font-family:ui-monospace,Menlo,Consolas,monospace; z-index:9999;`;

  const panel = document.createElement("div");
  panel.style.cssText = `
    position:fixed; left:16px; top:16px; width:min(860px, calc(100vw - 32px));
    background:rgba(10,12,18,.78); border:1px solid rgba(255,255,255,.08);
    border-radius:14px; box-shadow:0 14px 45px rgba(0,0,0,.5);
    color:#e8ecff; padding:12px; pointer-events:auto;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-weight:900; letter-spacing:.3px; margin-bottom:8px;";
  title.textContent = `Scarlett — ${BUILD}`;

  const row = document.createElement("div");
  row.style.cssText = "display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;";

  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      pointer-events:auto; cursor:pointer;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      color:#e8ecff; border-radius:12px;
      padding:8px 10px; font-weight:800;
    `;
    return b;
  };

  const btnHide = mkBtn("Hide HUD");
  const btnCopy = mkBtn("Copy Logs");
  const btnResetSpawn = mkBtn("Reset Spawn");
  const btnLeftLaser = mkBtn("Left Laser:OFF");

  row.append(btnHide, btnCopy, btnResetSpawn, btnLeftLaser);

  const mini = document.createElement("div");
  mini.style.cssText = "opacity:.92; font-size:12px; line-height:1.25; white-space:pre-wrap;";

  panel.append(title, row, mini);
  root.append(panel);
  document.body.append(root);

  let visible = true;
  let leftLaserOn = false;

  const hooks = { onResetSpawn: null, onToggleLeftLaser: null };

  btnHide.onclick = () => { visible = !visible; panel.style.display = visible ? "block" : "none"; };
  btnCopy.onclick = async () => {
    const text = state.lines.join("\n");
    try { await navigator.clipboard.writeText(text); log("[HUD] copied ✅"); }
    catch { log("[HUD] copy failed ❌"); }
  };
  btnResetSpawn.onclick = () => hooks.onResetSpawn?.();

  btnLeftLaser.onclick = () => {
    leftLaserOn = !leftLaserOn;
    btnLeftLaser.textContent = `Left Laser:${leftLaserOn ? "ON" : "OFF"}`;
    hooks.onToggleLeftLaser?.(leftLaserOn);
  };

  function log(line) {
    const s = `[${timeStr()}] ${line}`;
    state.lines.push(s);
    if (state.lines.length > state.max) state.lines.splice(0, state.lines.length - state.max);
    mini.textContent = state.lines.slice(-12).join("\n");
    console.log(s);
  }

  return { log, hooks };
})();
const LOG = (m) => HUD.log(m);

// ---------------- BOOT LOGS ----------------
LOG(`[index] runtime start ✅ build=${BUILD}`);
LOG(`[env] href=${location.href}`);
LOG(`[env] secureContext=${window.isSecureContext}`);
LOG(`[env] ua=${navigator.userAgent}`);
LOG(`[env] navigator.xr=${!!navigator.xr}`);

// ---------------- THREE SETUP ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 1500);
camera.position.set(0, 1.65, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;

document.body.style.margin = "0";
document.body.style.background = "#000";
document.body.appendChild(renderer.domElement);

LOG("[index] three init ✅");

// ---------------- VR BUTTON ----------------
try {
  document.body.appendChild(VRButton.createButton(renderer));
  LOG("[index] VRButton appended ✅");
} catch (e) {
  LOG("[index] VRButton failed ❌ " + (e?.message || e));
}

// ---------------- PLAYER RIG ----------------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// ---------------- CONTROLLERS ----------------
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  gripLeft: renderer.xr.getControllerGrip(0),
  gripRight: renderer.xr.getControllerGrip(1),
};
player.add(controllers.left, controllers.right, controllers.gripLeft, controllers.gripRight);
LOG("[index] controllers ready ✅");

// ---------------- LASERS ----------------
function makeLaser(color) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 14;
  line.name = "laser";
  return line;
}
const rightLaser = makeLaser(0x7fe7ff);
controllers.right.add(rightLaser);
LOG("[laser] attached -> right host=PerspectiveCamera");

let leftLaser = null;
HUD.hooks.onToggleLeftLaser = (on) => {
  if (on) {
    if (!leftLaser) leftLaser = makeLaser(0xff2d7a);
    controllers.left.add(leftLaser);
    LOG("[laser] attached -> left");
  } else {
    if (leftLaser?.parent) leftLaser.parent.remove(leftLaser);
    LOG("[laser] left removed");
  }
};

// ---------------- NON-XR DEV CONTROLS (Android + Desktop) ----------------
const DevControls = (() => {
  const keys = {};
  let yaw = 0, pitch = 0;
  let move = { x: 0, z: 0 };
  let look = { x: 0, y: 0 };

  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  const makeStick = (side) => {
    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed; bottom:18px; ${side === "left" ? "left:18px" : "right:18px"};
      width:140px; height:140px; border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.10);
      pointer-events:auto; touch-action:none;
    `;
    const nub = document.createElement("div");
    nub.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:54px; height:54px; border-radius:999px;
      transform:translate(-50%,-50%);
      background:rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.14);
    `;
    el.appendChild(nub);
    document.body.appendChild(el);

    let active = false;
    let sx = 0, sy = 0;

    const setNub = (dx, dy) => { nub.style.transform = `translate(${dx - 27}px, ${dy - 27}px)`; };
    const reset = () => {
      active = false; setNub(70, 70);
      if (side === "left") move = { x: 0, z: 0 };
      else look = { x: 0, y: 0 };
    };

    el.addEventListener("pointerdown", (e) => { active = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const r = 52;
      const clx = Math.max(-r, Math.min(r, dx));
      const cly = Math.max(-r, Math.min(r, dy));
      setNub(70 + clx, 70 + cly);
      if (side === "left") { move.x = clx / r; move.z = cly / r; }
      else { look.x = clx / r; look.y = cly / r; }
    });
    el.addEventListener("pointerup", reset);
    el.addEventListener("pointercancel", reset);
    reset();
  };

  if (isMobile) { makeStick("left"); makeStick("right"); }

  function update(dt) {
    if (renderer.xr.isPresenting) return;

    const speed = 2.9;
    const rotSpeed = 1.8;

    let mx = 0, mz = 0;
    if (keys["KeyA"]) mx -= 1;
    if (keys["KeyD"]) mx += 1;
    if (keys["KeyW"]) mz -= 1;
    if (keys["KeyS"]) mz += 1;

    mx += move.x;
    mz += move.z;

    yaw += (-look.x) * rotSpeed * dt;
    pitch += (-look.y) * rotSpeed * dt;
    pitch = Math.max(-1.1, Math.min(1.1, pitch));

    player.rotation.y = yaw;
    camera.rotation.x = pitch;

    const v = new THREE.Vector3(mx, 0, mz);
    if (v.lengthSq() > 0.0001) {
      v.normalize().multiplyScalar(speed * dt);
      v.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
      player.position.add(v);
    }
  }

  return { update };
})();
LOG("[android] dev controls ready ✅");

// ---------------- XR INPUT (ROBUST) ----------------
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const up = new THREE.Vector3(0,1,0);

let WorldRef = null;

// Pull gamepad axes from XRSession inputSources (most reliable across Quest builds)
function getXRGamepads() {
  const session = renderer.xr.getSession?.();
  if (!session) return { left: null, right: null };

  let left = null, right = null;
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }
  return { left, right };
}

function pickAxes(gp) {
  // Supports common layouts:
  // - (0,1) = stick
  // - (2,3) = stick
  // We'll choose the pair with the bigger magnitude.
  if (!gp?.axes || gp.axes.length < 2) return { x: 0, y: 0 };
  const a01 = { x: gp.axes[0] ?? 0, y: gp.axes[1] ?? 0 };
  const a23 = { x: gp.axes[2] ?? 0, y: gp.axes[3] ?? 0 };
  const m01 = a01.x*a01.x + a01.y*a01.y;
  const m23 = a23.x*a23.x + a23.y*a23.y;
  return (m23 > m01 && (gp.axes.length >= 4)) ? a23 : a01;
}

function dz(v, dead=0.14) { return Math.abs(v) < dead ? 0 : v; }

// ---------------- TELEPORT MARKER + RAINBOW ARC ----------------
let teleportMarker = null;
let arcLine = null;
let arcPoints = [];
let canTeleport = false;

function ensureTeleportVisuals() {
  if (!teleportMarker) {
    const geo = new THREE.RingGeometry(0.18, 0.28, 40);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    teleportMarker = new THREE.Mesh(geo, mat);
    teleportMarker.rotation.x = -Math.PI / 2;
    teleportMarker.visible = false;
    scene.add(teleportMarker);
  }

  if (!arcLine) {
    const N = 48;
    arcPoints = new Array(N).fill(0).map(() => new THREE.Vector3());
    const geo = new THREE.BufferGeometry().setFromPoints(arcPoints);

    // Rainbow gradient via vertex colors
    const colors = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const c = new THREE.Color().setHSL(0.85 * (1 - t), 1.0, 0.55); // purple->red-ish rainbow
      colors[i*3+0] = c.r;
      colors[i*3+1] = c.g;
      colors[i*3+2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    arcLine = new THREE.Line(geo, mat);
    arcLine.frustumCulled = false;
    scene.add(arcLine);
  }
}

function rayFromController(ctrl) {
  tmpMat.identity().extractRotation(ctrl.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
  tmpPos.setFromMatrixPosition(ctrl.matrixWorld);
  raycaster.set(tmpPos, tmpDir);
}

function updateTeleportPreview() {
  ensureTeleportVisuals();

  if (!renderer.xr.isPresenting || !WorldRef?.colliders?.length) {
    teleportMarker.visible = false;
    arcLine.visible = false;
    canTeleport = false;
    return;
  }

  rayFromController(controllers.right);
  const hits = raycaster.intersectObjects(WorldRef.colliders, true);

  if (!hits?.length) {
    teleportMarker.visible = false;
    arcLine.visible = false;
    canTeleport = false;
    return;
  }

  const hit = hits[0];
  const target = hit.point.clone();
  target.y = Math.max(target.y, 0) + 0.01;

  teleportMarker.position.copy(target);
  teleportMarker.visible = true;

  // Curved arc (parabola): start at controller, end at target, elevated midpoint
  const start = tmpPos.clone();
  const end = target.clone();

  const dist = start.distanceTo(end);
  const lift = Math.min(3.5, 0.8 + dist * 0.18);

  const mid = start.clone().lerp(end, 0.5);
  mid.y += lift;

  const N = arcPoints.length;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Quadratic Bezier
    const a = start.clone().lerp(mid, t);
    const b = mid.clone().lerp(end, t);
    arcPoints[i].copy(a.lerp(b, t));
  }
  arcLine.geometry.setFromPoints(arcPoints);
  arcLine.visible = true;
  canTeleport = true;
}

function doTeleportNow() {
  if (!canTeleport || !teleportMarker?.visible) return;
  player.position.x = teleportMarker.position.x;
  player.position.z = teleportMarker.position.z;
  player.position.y = 0;
  LOG("[teleport] ✅");
}

// Teleport events (controllers + hand pinch maps to select on some runtimes)
controllers.right.addEventListener("selectstart", doTeleportNow);
controllers.right.addEventListener("squeezestart", doTeleportNow);

// ---------------- XR LOCOMOTION (YOUR REQUESTED FEEL) ----------------
let lastTurn = 0;

function updateXRLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const { left: gpL, right: gpR } = getXRGamepads();

  const L = pickAxes(gpL);
  const R = pickAxes(gpR);

  // Deadzone
  const lx = dz(L.x), ly = dz(L.y);
  const rx = dz(R.x), ry = dz(R.y);

  // You asked:
  // - Right controller: forward/back + 45° (so: move forward/back + strafe from stick X)
  // - Left controller: left/right for strafe + also allow forward/back for comfort
  // We'll combine both sticks into one movement vector (smooth).
  const strafe = (lx * 0.85) + (rx * 0.85);
  const forward = (-ly * 1.0) + (-ry * 1.0); // negative because stick up is -Y

  const speed = 2.25;
  tmpV.set(strafe, 0, forward);

  if (tmpV.lengthSq() > 0.0002) {
    tmpV.normalize().multiplyScalar(speed * dt);
    tmpV.applyAxisAngle(up, player.rotation.y);
    player.position.add(tmpV);
  }

  // Snap turn from RIGHT stick X if pushed hard and not moving much
  const now = performance.now() / 1000;
  if (Math.abs(rx) > 0.72 && (now - lastTurn) > 0.22) {
    player.rotation.y += (rx > 0 ? -1 : 1) * (Math.PI / 8);
    lastTurn = now;
    LOG("[turn] snap");
  }
}

// ---------------- HUD RESET ----------------
HUD.hooks.onResetSpawn = () => {
  player.position.set(0, 0, 12.5);
  player.rotation.set(0, Math.PI, 0);
  camera.position.set(0, 1.65, 0);
  camera.rotation.set(0, 0, 0);
  LOG("[index] reset spawn ✅");
};

// ---------------- WORLD BOOT ----------------
(async function bootWorld() {
  try {
    LOG("[index] world boot start …");
    const url = new URL("./world.js", import.meta.url);
    url.searchParams.set("v", Date.now());

    const mod = await import(url.toString());
    WorldRef = mod?.World;

    if (!WorldRef?.init) {
      LOG("[index] world.js loaded but World.init missing ❌");
      LOG("[index] exports=" + Object.keys(mod || {}).join(","));
      return;
    }

    LOG("[index] calling world.init() …");
    await WorldRef.init({ THREE, scene, renderer, camera, player, controllers, log: (m) => LOG(m), BUILD });
    LOG("[index] world init ✅");

  } catch (e) {
    LOG("[index] world init failed ❌ " + (e?.message || e));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.6);
    scene.add(hemi);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x20222b, roughness: 1, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    LOG("[index] fallback world added ✅");
  }
})();

// ---------------- LOOP ----------------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  DevControls.update(dt);
  updateXRLocomotion(dt);
  updateTeleportPreview();

  WorldRef?.update?.(dt);
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
