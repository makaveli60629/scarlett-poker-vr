// /js/index.js — Scarlett INDEX_MASTER (FULL + Crash-proof)
// ✅ Always builds a visible world (no black void)
// ✅ VRButton + XR supported
// ✅ Android dev controls (touch move/look) + desktop WASD
// ✅ Controllers ready + right laser ray
// ✅ Calls World.init() reliably with fallback

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const BUILD = `INDEX_MASTER_${Date.now()}`;

// ---------- HUD / LOG ----------
const HUD = (() => {
  const state = { lines: [], max: 220 };
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  const timeStr = () => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ampm}`;
  };

  const root = document.createElement("div");
  root.id = "hud";
  root.style.cssText = `
    position:fixed; left:0; top:0; right:0; pointer-events:none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    z-index: 9999;
  `;

  const panelTop = document.createElement("div");
  panelTop.style.cssText = `
    position:fixed; left:16px; top:16px; width:min(760px, calc(100vw - 32px));
    background:rgba(10,12,18,.78); border:1px solid rgba(255,255,255,.08);
    border-radius:14px; box-shadow:0 14px 45px rgba(0,0,0,.5);
    color:#e8ecff; padding:12px 12px 10px 12px; pointer-events:auto;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-weight:800; letter-spacing:.5px; margin-bottom:8px;";
  title.textContent = `Scarlett — ${BUILD}`;

  const buttons = document.createElement("div");
  buttons.style.cssText = "display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;";

  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      pointer-events:auto; cursor:pointer;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      color:#e8ecff; border-radius:12px; padding:8px 10px;
      font-weight:700;
    `;
    return b;
  };

  const btnHide = mkBtn("Hide HUD");
  const btnCopy = mkBtn("Copy Logs");
  const btnResetSpawn = mkBtn("Reset Spawn");
  const btnResetHand = mkBtn("Reset Hand");
  const btnLaser = mkBtn("Left Laser:OFF");

  buttons.append(btnHide, btnCopy, btnResetSpawn, btnResetHand, btnLaser);

  const mini = document.createElement("div");
  mini.style.cssText = "opacity:.9; font-size:12px; line-height:1.25; white-space:pre-wrap;";

  panelTop.append(title, buttons, mini);
  root.append(panelTop);
  document.body.append(root);

  let visible = true;
  let leftLaser = false;

  btnHide.onclick = () => {
    visible = !visible;
    panelTop.style.display = visible ? "block" : "none";
  };

  btnCopy.onclick = async () => {
    const text = state.lines.join("\n");
    try { await navigator.clipboard.writeText(text); log("[HUD] copied ✅"); }
    catch { log("[HUD] copy failed ❌"); }
  };

  const hooks = {
    onResetSpawn: null,
    onResetHand: null,
    onToggleLeftLaser: null
  };

  btnResetSpawn.onclick = () => hooks.onResetSpawn?.();
  btnResetHand.onclick = () => hooks.onResetHand?.();
  btnLaser.onclick = () => {
    leftLaser = !leftLaser;
    btnLaser.textContent = `Left Laser:${leftLaser ? "ON" : "OFF"}`;
    hooks.onToggleLeftLaser?.(leftLaser);
  };

  function log(line) {
    const s = `[${timeStr()}] ${line}`;
    state.lines.push(s);
    if (state.lines.length > state.max) state.lines.splice(0, state.lines.length - state.max);
    // show last ~10 lines
    mini.textContent = state.lines.slice(-10).join("\n");
    console.log(s);
  }

  return { log, hooks };
})();

const LOG = (msg) => HUD.log(msg);

// ---------- BOOT ----------
LOG(`[index] runtime start ✅ build=${BUILD}`);
LOG(`[env] href=${location.href}`);
LOG(`[env] secureContext=${window.isSecureContext}`);
LOG(`[env] ua=${navigator.userAgent}`);
LOG(`[env] navigator.xr=${!!navigator.xr}`);

// ---------- THREE SETUP ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 800);
camera.position.set(0, 1.65, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
document.body.style.margin = "0";
document.body.style.background = "#000";
document.body.appendChild(renderer.domElement);

LOG("[index] three init ✅");

// VR Button
try {
  document.body.appendChild(VRButton.createButton(renderer));
  LOG("[index] VRButton appended ✅");
} catch (e) {
  LOG("[index] VRButton failed ❌ " + (e?.message || e));
}

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// ---------- CONTROLLERS ----------
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  gripLeft: renderer.xr.getControllerGrip(0),
  gripRight: renderer.xr.getControllerGrip(1)
};
player.add(controllers.left, controllers.right, controllers.gripLeft, controllers.gripRight);
LOG("[index] controllers ready ✅");

// ---------- LASER (RAY) ----------
function makeLaser(color = 0x7fe7ff) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  line.name = "laser";
  line.scale.z = 12;
  return line;
}

const rightLaser = makeLaser(0x7fe7ff);
controllers.right.add(rightLaser);
LOG("[laser] attached -> right host=PerspectiveCamera");

// optional left laser toggle
let leftLaser = null;
HUD.hooks.onToggleLeftLaser = (on) => {
  if (on) {
    if (!leftLaser) leftLaser = makeLaser(0xff2d7a);
    controllers.left.add(leftLaser);
    LOG("[laser] attached -> left");
  } else {
    if (leftLaser && leftLaser.parent) leftLaser.parent.remove(leftLaser);
    LOG("[laser] left removed");
  }
};

// ---------- ANDROID / DESKTOP DEV CONTROLS ----------
const DevControls = (() => {
  const keys = {};
  let yaw = 0, pitch = 0;
  let move = { x: 0, z: 0 };
  let look = { x: 0, y: 0 };

  // desktop
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  // touch sticks (simple)
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

    const setNub = (dx, dy) => {
      nub.style.transform = `translate(${dx - 27}px, ${dy - 27}px)`;
    };

    const reset = () => {
      active = false;
      setNub(70, 70);
      if (side === "left") move = { x: 0, z: 0 };
      else look = { x: 0, y: 0 };
    };

    el.addEventListener("pointerdown", (e) => {
      active = true;
      sx = e.clientX;
      sy = e.clientY;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;

      const r = 52;
      const clx = Math.max(-r, Math.min(r, dx));
      const cly = Math.max(-r, Math.min(r, dy));
      setNub(70 + clx, 70 + cly);

      if (side === "left") {
        move.x = clx / r;
        move.z = cly / r;
      } else {
        look.x = clx / r;
        look.y = cly / r;
      }
    });
    el.addEventListener("pointerup", reset);
    el.addEventListener("pointercancel", reset);
    reset();
  };

  // only show touch sticks on mobile
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    makeStick("left");   // move
    makeStick("right");  // look
  }

  function update(dt) {
    const speed = 2.5; // m/s
    const rotSpeed = 1.8;

    // desktop WASD
    let mx = 0, mz = 0;
    if (keys["KeyA"]) mx -= 1;
    if (keys["KeyD"]) mx += 1;
    if (keys["KeyW"]) mz -= 1;
    if (keys["KeyS"]) mz += 1;

    // merge mobile stick
    mx += move.x;
    mz += move.z;

    // look
    yaw += (-look.x) * rotSpeed * dt;
    pitch += (-look.y) * rotSpeed * dt;
    pitch = Math.max(-1.1, Math.min(1.1, pitch));

    player.rotation.y = yaw;
    camera.rotation.x = pitch;

    // move in player-space
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

// HUD reset hooks
HUD.hooks.onResetSpawn = () => {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  camera.position.set(0, 1.65, 4);
  camera.rotation.set(0, 0, 0);
  LOG("[index] reset spawn ✅");
};
HUD.hooks.onResetHand = () => {
  // placeholder for future hand reset systems
  LOG("[index] reset hand ✅ (placeholder)");
};

// ---------- WORLD INIT (THE FIX) ----------
(async function bootWorld() {
  try {
    LOG("[index] calling world.init() …");
    await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: (m) => LOG(m),
      BUILD
    });
    LOG("[index] world init ✅");
  } catch (e) {
    LOG("[index] world init failed ❌ " + (e?.message || e));
    // Hard fallback: never black
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.2);
    scene.add(hemi);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x20222b, roughness: 1, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    LOG("[index] fallback world added ✅");
  }
})();

// ---------- RENDER LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  DevControls.update(dt);
  World.update?.(dt);

  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
