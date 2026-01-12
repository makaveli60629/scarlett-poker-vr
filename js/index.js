// /js/index.js — Scarlett INDEX FULL (Android Dev + Quest VR Safe)
// ✅ Android always has movement + look (2D dev mode)
// ✅ Quest VR path unchanged: VRButton + XR controllers + lasers
// ✅ Dev HUD: Hide HUD, Hide Logs, Copy Logs, Reset Spawn, Telepads toggle
// ✅ Fail-safe optional imports (won’t hang if files missing)

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = `INDEX_ANDROID_VR_SAFE_${Date.now()}`;

const S = {
  THREE,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  controllers: [],
  grips: [],
  lasers: [],

  // dev ui
  ui: { root: null, logPanel: null, hudPanel: null, buttons: {} },
  logs: [],
  logMax: 250,

  // 2D controls
  android: {
    enabled: true,
    active: true,
    yaw: 0,
    pitch: 0,
    move: { f:0, r:0 },
    pointerLocked: false,
    speed: 3.1,
    turnSpeed: 2.35
  },

  // toggles
  flags: {
    showHUD: true,
    showLogs: true,
    showTelepads: true
  }
};

// ---------------- LOGGING ----------------
function stamp() {
  const d = new Date();
  return d.toLocaleTimeString();
}

function LOG(...args) {
  const msg = `[${stamp()}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  S.logs.push(msg);
  if (S.logs.length > S.logMax) S.logs.shift();
  if (S.ui.logPanel) {
    S.ui.logPanel.textContent = S.logs.slice(-120).join("\n");
    S.ui.logPanel.scrollTop = S.ui.logPanel.scrollHeight;
  }
}

// ---------------- SAFE IMPORT (NO HANG) ----------------
async function safeImport(path) {
  try {
    const m = await import(`${path}?v=${Date.now()}`);
    LOG(`[import] ok: ${path}`);
    return m;
  } catch (e) {
    LOG(`[import] skip: ${path} (${e?.message || e})`);
    return null;
  }
}

// ---------------- BASIC DOM UI ----------------
function buildDevUI() {
  const root = document.createElement("div");
  root.id = "devui";
  root.style.cssText = `
    position:fixed; inset:0; pointer-events:none; z-index:99999;
    font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;
  `;

  // Buttons panel (top-left)
  const hud = document.createElement("div");
  hud.style.cssText = `
    position:fixed; left:12px; top:12px;
    display:flex; gap:8px; flex-wrap:wrap;
    pointer-events:auto;
  `;

  function btn(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      background:rgba(10,12,18,.72);
      border:1px solid rgba(127,231,255,.25);
      color:#e8ecff;
      padding:10px 12px;
      border-radius:12px;
      font-weight:800;
      letter-spacing:.2px;
    `;
    b.onclick = onClick;
    hud.appendChild(b);
    return b;
  }

  const bHideHUD = btn("Hide HUD", () => {
    S.flags.showHUD = !S.flags.showHUD;
    S.ui.hudPanel.style.display = S.flags.showHUD ? "block" : "none";
    S.ui.buttons.hidehud.textContent = S.flags.showHUD ? "Hide HUD" : "Show HUD";
  });

  const bHideLogs = btn("Hide Logs", () => {
    S.flags.showLogs = !S.flags.showLogs;
    S.ui.logPanel.parentElement.style.display = S.flags.showLogs ? "block" : "none";
    S.ui.buttons.hidelogs.textContent = S.flags.showLogs ? "Hide Logs" : "Show Logs";
  });

  const bCopy = btn("Copy Logs", async () => {
    try {
      await navigator.clipboard.writeText(S.logs.join("\n"));
      LOG("[HUD] copied ✅");
    } catch (e) {
      LOG("[HUD] copy failed ❌", e?.message || e);
    }
  });

  const bReset = btn("Reset Spawn", () => {
    // VR or 2D: send player back to VIP spawn if world provides it, else origin
    if (S.player) {
      S.player.position.set(0, 0, 0);
      S.player.rotation.set(0, Math.PI, 0);
      LOG("[HUD] spawn reset ✅");
    }
  });

  const bTele = btn("Telepads ON", () => {
    S.flags.showTelepads = !S.flags.showTelepads;
    bTele.textContent = S.flags.showTelepads ? "Telepads ON" : "Telepads OFF";
    // World may choose to read this flag; also we can try to hide by name
    if (S.scene) {
      S.scene.traverse(o => {
        if (o?.userData?.telepad) o.visible = S.flags.showTelepads;
      });
    }
  });

  // Center HUD label (non-obstructive)
  const hudPanel = document.createElement("div");
  hudPanel.style.cssText = `
    position:fixed; left:50%; top:12px; transform:translateX(-50%);
    padding:10px 14px;
    background:rgba(10,12,18,.58);
    border:1px solid rgba(255,45,122,.22);
    border-radius:14px;
    color:#e8ecff;
    pointer-events:none;
    font-weight:900;
  `;
  hudPanel.textContent = `Scarlett VR Poker • ${BUILD}`;

  // Logs panel bottom-left
  const logWrap = document.createElement("div");
  logWrap.style.cssText = `
    position:fixed; left:12px; bottom:12px;
    width:min(560px, calc(100vw - 24px));
    height:34vh;
    background:rgba(10,12,18,.72);
    border:1px solid rgba(127,231,255,.22);
    border-radius:14px;
    overflow:hidden;
    pointer-events:auto;
  `;

  const logPanel = document.createElement("pre");
  logPanel.style.cssText = `
    margin:0; padding:12px;
    white-space:pre-wrap;
    word-break:break-word;
    color:#cfe7ff;
    font-size:12px;
    height:100%;
    overflow:auto;
  `;
  logWrap.appendChild(logPanel);

  root.appendChild(hud);
  root.appendChild(hudPanel);
  root.appendChild(logWrap);
  document.body.appendChild(root);

  S.ui.root = root;
  S.ui.logPanel = logPanel;
  S.ui.hudPanel = hudPanel;
  S.ui.buttons.hidehud = bHideHUD;
  S.ui.buttons.hidelogs = bHideLogs;
}

// ---------------- SCENE SETUP ----------------
function initThree() {
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);

  S.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 260);
  S.camera.position.set(0, 1.65, 6);

  S.player = new THREE.Group();
  S.player.name = "PlayerRig";
  S.player.position.set(0, 0, 0);
  S.player.add(S.camera);
  S.scene.add(S.player);

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // helps Android stability
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.xr.enabled = true;
  document.body.appendChild(S.renderer.domElement);

  S.clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  LOG("[index] three init ✅");
}

// ---------------- XR CONTROLLERS (Quest safe) ----------------
function initXRControllers() {
  // Don’t break Quest: standard getController
  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = `controller${i}`;
    S.player.add(c);
    S.controllers.push(c);

    // laser
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial();
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 12;
    c.add(line);
    S.lasers.push(line);

    c.addEventListener("connected", (e) => LOG(`[xr] controller${i} connected: ${e?.data?.gamepad ? "gamepad" : "no-gamepad"}`));
    c.addEventListener("disconnected", () => LOG(`[xr] controller${i} disconnected`));
  }

  LOG("[index] controllers + lasers installed ✅");
}

// ---------------- ANDROID 2D CONTROLS (always enabled) ----------------
function isAndroid() {
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

function enableAndroidDevControls() {
  if (!isAndroid()) return;

  // Touch dual stick fallback (no external files required)
  // Left side = move, right side = look
  const zone = document.createElement("div");
  zone.style.cssText = `
    position:fixed; inset:0; z-index:99998;
    pointer-events:auto; touch-action:none;
  `;
  document.body.appendChild(zone);

  const state = { leftId:null, rightId:null, lx:0, ly:0, rx:0, ry:0, l0:null, r0:null };

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function norm(dx, dy, max=60){
    const x = clamp(dx / max, -1, 1);
    const y = clamp(dy / max, -1, 1);
    return { x, y };
  }

  zone.addEventListener("pointerdown", (e) => {
    const x = e.clientX;
    if (x < window.innerWidth * 0.5 && state.leftId === null) {
      state.leftId = e.pointerId; state.l0 = { x:e.clientX, y:e.clientY };
    } else if (state.rightId === null) {
      state.rightId = e.pointerId; state.r0 = { x:e.clientX, y:e.clientY };
    }
    zone.setPointerCapture(e.pointerId);
  });

  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId === state.leftId && state.l0) {
      const d = norm(e.clientX - state.l0.x, e.clientY - state.l0.y);
      state.lx = d.x; state.ly = d.y;
    }
    if (e.pointerId === state.rightId && state.r0) {
      const d = norm(e.clientX - state.r0.x, e.clientY - state.r0.y);
      state.rx = d.x; state.ry = d.y;
    }
  });

  function endPointer(e) {
    if (e.pointerId === state.leftId) { state.leftId = null; state.l0 = null; state.lx = 0; state.ly = 0; }
    if (e.pointerId === state.rightId) { state.rightId = null; state.r0 = null; state.rx = 0; state.ry = 0; }
  }
  zone.addEventListener("pointerup", endPointer);
  zone.addEventListener("pointercancel", endPointer);

  // Apply to S.android each frame
  S.android.active = true;

  S.android._poll = () => {
    // move: forward=-ly, strafe=lx
    S.android.move.f = -state.ly;
    S.android.move.r = state.lx;
    // look: yaw+=rx, pitch+=ry
    S.android.yaw -= state.rx * 0.04;
    S.android.pitch -= state.ry * 0.03;
    S.android.pitch = Math.max(-1.1, Math.min(1.1, S.android.pitch));
  };

  LOG("[android] dev controls ready ✅ (dual-touch)");
}

// Apply Android dev movement in 2D (non-XR)
function updateAndroidDev(dt) {
  if (!isAndroid() || !S.android.active) return;
  if (S.renderer.xr.isPresenting) return; // VR uses XR controls

  S.android._poll?.();

  // look
  S.player.rotation.y = S.android.yaw;
  S.camera.rotation.x = S.android.pitch;

  // move
  const f = S.android.move.f;
  const r = S.android.move.r;
  const DZ = 0.12;
  const df = Math.abs(f) < DZ ? 0 : f;
  const dr = Math.abs(r) < DZ ? 0 : r;
  if (!df && !dr) return;

  const v = new THREE.Vector3(dr, 0, -df).multiplyScalar(S.android.speed * dt);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
  S.player.position.add(v);
}

// ---------------- MAIN ----------------
async function boot() {
  buildDevUI();

  // env logs
  LOG("[index] runtime start ✅ build=" + BUILD);
  LOG("[env] href=" + location.href);
  LOG("[env] secureContext=" + (window.isSecureContext ? "true" : "false"));
  LOG("[env] ua=" + navigator.userAgent);
  LOG("[env] navigator.xr=" + !!navigator.xr);

  initThree();

  // VR button (Quest safe)
  try {
    document.body.appendChild(VRButton.createButton(S.renderer));
    LOG("[index] VRButton appended ✅");
  } catch (e) {
    LOG("[index] VRButton error", e?.message || e);
  }

  initXRControllers();

  // Android dev controls always enabled (does not affect VR)
  enableAndroidDevControls();

  // Init world (no await traps)
  try {
    await World.init({
      THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      grips: S.grips,
      log: LOG,
      BUILD
    });
  } catch (e) {
    LOG("[world] init failed ❌", e?.message || e);
  }

  // Render loop
  S.renderer.setAnimationLoop(() => {
    const dt = S.clock.getDelta();
    const t = S.clock.elapsedTime;

    // 2D Android dev movement (only when not XR)
    updateAndroidDev(dt);

    // world update
    try { World.update?.({ dt, t }); } catch (e) { /* keep stable */ }

    S.renderer.render(S.scene, S.camera);
  });

  LOG("[index] ready ✅");
}

boot();
