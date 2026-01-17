// /js/scarlett1/index.js — Scarlett Runtime Spine (ULTIMATE)
// BUILD: SCARLETT_RUNTIME_ULTIMATE_v4_3

const BUILD = "SCARLETT_RUNTIME_ULTIMATE_v4_3";

const log = (...a) => console.log("[scarlett]", ...a);
const warn = (...a) => console.warn("[scarlett]", ...a);
const err = (...a) => console.error("[scarlett]", ...a);

const $ = (id) => document.getElementById(id);

const ui = {
  hud: $("hud"),
  status: $("status"),
  btnEnterVr: $("btnEnterVr"),
  btnHideHud: $("btnHideHud"),
  btnTeleport: $("btnTeleport"),
  btnDiag: $("btnDiag"),
  btnTouchToggle: $("btnTouchToggle"),

  diagPanel: $("diagPanel"),
  btnDiagClose: $("btnDiagClose"),
  btnTestModules: $("btnTestModules"),
  btnSafeMode: $("btnSafeMode"),
  btnResetPlayer: $("btnResetPlayer"),
  btnReload: $("btnReload"),
  btnCopyDiag: $("btnCopyDiag"),
  diagRuntime: $("diagRuntime"),
  diagInput: $("diagInput"),
  diagModules: $("diagModules"),
  diagError: $("diagError"),

  touchControls: $("touchControls"),
  stickLeft: $("stickLeft"),
  stickRight: $("stickRight"),
  btnTouchMenu: $("btnTouchMenu"),
  btnTouchTeleport: $("btnTouchTeleport"),
};

function setStatus(s) {
  if (ui.status) ui.status.textContent = s;
  console.log("[status]", s);
}

function setLastError(e) {
  const txt = e?.stack || e?.message || String(e);
  if (ui.diagError) ui.diagError.textContent = txt;
  console.error("[LAST_ERROR]", e);
}

// Core three only (Quest/Android safe)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { buildWorld } from "./world.js";

// -------------------- Engine State --------------------
let renderer, scene, camera, clock;
let player, head;
let world = null;
let floorMeshes = [];

const state = {
  inXR: false,
  hudHidden: false,
  diagOpen: false,
  teleportEnabled: false,
  safeMode: false,
  touchEnabled: false,
};

let snapTurnCooldown = 0;

// Controllers
const controllers = {
  left: null, right: null,
  leftGamepad: null, rightGamepad: null,
  leftRay: null, rightRay: null,
  teleportMarker: null,
  teleportTarget: null,
};

let teleportAiming = false;

// Touch virtual axes
const touch = {
  left: { active:false, id:null, x:0, y:0 },
  right:{ active:false, id:null, x:0, y:0 },
};

// Module registry (edit in world.js via ctx.modules.enable/disable)
const modules = {
  list: [],          // { id, title, enabled, init, update, dispose, timingMs, error }
  loaded: false,
};

// -------------------- Boot --------------------
boot().catch((e) => {
  err("BOOT FAIL", e);
  setStatus("BOOT FAIL ❌\n" + (e?.stack || e?.message || String(e)));
  setLastError(e);
});

async function boot() {
  setStatus(`booting…\nBUILD=${BUILD}`);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  player = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  player.add(head);
  scene.add(player);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  hookUI();
  hookXR();
  initControllers();
  initTouchControls();

  setStatus(`renderer OK ✅\nBUILD=${BUILD}\nbuilding world…`);

  // Build world (also mounts modules)
  try {
    world = await buildWorld(makeContext());
  } catch (e) {
    err("WORLD BUILD FAIL", e);
    setStatus("WORLD BUILD FAIL ❌\n" + (e?.stack || e?.message || String(e)));
    setLastError(e);
    world = null;
  }

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  setStatus(`ready ✅\nBUILD=${BUILD}\nTeleport: ${state.teleportEnabled ? "ON" : "OFF"}`);
}

function makeContext() {
  return {
    THREE,
    scene,
    player,
    renderer,
    log, warn, err,
    onStatus: (s) => setStatus(s),
    onRegisterFloors: (meshes) => { floorMeshes = meshes || []; },

    // Ultimate diagnostics + module registry helpers
    diag: {
      setLastError,
      mark: (label) => log("[MARK]", label),
    },
    modules: {
      register(def) {
        // def: { id, title, enabled?, init(ctx), update(dt), dispose() }
        modules.list.push({
          id: def.id,
          title: def.title || def.id,
          enabled: def.enabled !== false,
          init: def.init,
          update: def.update,
          dispose: def.dispose,
          timingMs: 0,
          error: null,
        });
      },
      enable(id, on = true) {
        const m = modules.list.find(x => x.id === id);
        if (m) m.enabled = !!on;
      },
      getAll() { return modules.list; },
      clear() { modules.list = []; modules.loaded = false; },
    },
    state,
  };
}

// -------------------- UI / Diag --------------------
function hookUI() {
  ui.btnHideHud?.addEventListener("click", () => {
    state.hudHidden = !state.hudHidden;
    ui.hud.style.display = state.hudHidden ? "none" : "block";
    ui.btnHideHud.textContent = state.hudHidden ? "Show HUD" : "Hide HUD";
  });

  ui.btnTeleport?.addEventListener("click", () => {
    state.teleportEnabled = !state.teleportEnabled;
    ui.btnTeleport.textContent = state.teleportEnabled ? "Teleport: ON" : "Teleport: OFF";
  });

  ui.btnDiag?.addEventListener("click", () => toggleDiag());
  ui.btnDiagClose?.addEventListener("click", () => toggleDiag(false));

  ui.btnTouchToggle?.addEventListener("click", () => {
    state.touchEnabled = !state.touchEnabled;
    ui.touchControls.style.display = state.touchEnabled ? "block" : "none";
    ui.btnTouchToggle.textContent = state.touchEnabled ? "Touch: ON" : "Touch: OFF";
  });

  ui.btnTestModules?.addEventListener("click", () => {
    updateDiag(true);
    setStatus("MODULE TEST ✅\n(see Diagnostics panel)");
  });

  ui.btnSafeMode?.addEventListener("click", async () => {
    // SAFE MODE: disable all modules and rebuild world base
    state.safeMode = !state.safeMode;
    setStatus(`SAFE MODE ${state.safeMode ? "ON" : "OFF"}\nrebuilding world…`);

    try {
      // Dispose modules/world if present
      try { if (world?.dispose) world.dispose(); } catch {}
      world = await buildWorld(makeContext());
      setStatus(`SAFE MODE ${state.safeMode ? "ON" : "OFF"} ✅\nBUILD=${BUILD}`);
    } catch (e) {
      setStatus(`SAFE MODE rebuild failed ❌\n${e?.message || String(e)}`);
      setLastError(e);
    }
  });

  ui.btnResetPlayer?.addEventListener("click", () => resetPlayer());
  ui.btnReload?.addEventListener("click", () => location.reload());

  ui.btnCopyDiag?.addEventListener("click", async () => {
    const txt = buildDiagDump();
    try {
      await navigator.clipboard.writeText(txt);
      setStatus("Diagnostics copied ✅");
    } catch {
      setStatus("Copy failed ❌ (clipboard blocked)");
    }
  });

  // Manual Enter VR (no VRButton dependency)
  ui.btnEnterVr?.addEventListener("click", async () => {
    try {
      if (!navigator.xr) { setStatus("WebXR not available ❌"); return; }
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok) { setStatus("immersive-vr not supported ❌"); return; }

      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
      });
      await renderer.xr.setSession(session);
      setStatus("XR session requested ✅");
    } catch (e) {
      setStatus("Enter VR failed ❌\n" + (e?.message || String(e)));
      setLastError(e);
    }
  });
}

function toggleDiag(force) {
  state.diagOpen = typeof force === "boolean" ? force : !state.diagOpen;
  ui.diagPanel.style.display = state.diagOpen ? "block" : "none";
  if (state.diagOpen) updateDiag(true);
}

function updateDiag(force = false) {
  if (!state.diagOpen && !force) return;

  const rt = {
    build: BUILD,
    href: location.href,
    secureContext: window.isSecureContext,
    ua: navigator.userAgent,
    xr: !!navigator.xr,
    inXR: state.inXR,
    teleport: state.teleportEnabled,
    touch: state.touchEnabled,
    safeMode: state.safeMode,
    floors: floorMeshes.length,
  };
  ui.diagRuntime.textContent = JSON.stringify(rt, null, 2);

  const input = {
    left: gamepadSummary(controllers.leftGamepad),
    right: gamepadSummary(controllers.rightGamepad),
    touch: {
      left: { x: touch.left.x, y: touch.left.y, active: touch.left.active },
      right:{ x: touch.right.x, y: touch.right.y, active: touch.right.active },
    },
  };
  ui.diagInput.textContent = JSON.stringify(input, null, 2);

  const mod = modules.list.map(m => ({
    id: m.id,
    title: m.title,
    enabled: m.enabled,
    timingMs: Math.round(m.timingMs),
    error: m.error ? (m.error.message || String(m.error)) : null,
  }));
  ui.diagModules.textContent = JSON.stringify(mod, null, 2);
}

function buildDiagDump() {
  return [
    "SCARLETT DIAGNOSTICS",
    `time=${new Date().toISOString()}`,
    `build=${BUILD}`,
    `href=${location.href}`,
    `ua=${navigator.userAgent}`,
    `secureContext=${window.isSecureContext}`,
    `navigator.xr=${!!navigator.xr}`,
    `inXR=${state.inXR}`,
    `teleport=${state.teleportEnabled}`,
    `touch=${state.touchEnabled}`,
    `safeMode=${state.safeMode}`,
    "",
    "GAMEPADS:",
    JSON.stringify({ left: gamepadSummary(controllers.leftGamepad), right: gamepadSummary(controllers.rightGamepad) }, null, 2),
    "",
    "MODULES:",
    JSON.stringify(modules.list.map(m => ({
      id: m.id, enabled: m.enabled, timingMs: m.timingMs, error: m.error ? (m.error.stack || m.error.message || String(m.error)) : null
    })), null, 2),
    "",
    "LAST_ERROR:",
    ui.diagError?.textContent || "none"
  ].join("\n");
}

function gamepadSummary(gp) {
  if (!gp) return null;
  const buttons = gp.buttons?.map(b => ({ p: !!b.pressed, v: +b.value.toFixed(3) })) || [];
  const axes = gp.axes?.map(a => +a.toFixed(3)) || [];
  return { id: gp.id || "?", buttons, axes };
}

function resetPlayer() {
  player.position.set(0, 1.6, 14);
  player.rotation.set(0, 0, 0);
  setStatus("player reset ✅");
}

// -------------------- XR + Controllers --------------------
function hookXR() {
  renderer.xr.addEventListener("sessionstart", () => { state.inXR = true; updateDiag(true); });
  renderer.xr.addEventListener("sessionend", () => { state.inXR = false; updateDiag(true); });
}

function initControllers() {
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  scene.add(controllers.left);
  scene.add(controllers.right);

  controllers.left.addEventListener("connected", (e) => onControllerConnected("left", e));
  controllers.right.addEventListener("connected", (e) => onControllerConnected("right", e));
  controllers.left.addEventListener("disconnected", () => (controllers.leftGamepad = null));
  controllers.right.addEventListener("disconnected", () => (controllers.rightGamepad = null));

  controllers.leftRay = makeRay(true);
  controllers.rightRay = makeRay(false);
  controllers.left.add(controllers.leftRay);
  controllers.right.add(controllers.rightRay);

  controllers.teleportMarker = makeTeleportMarker();
  scene.add(controllers.teleportMarker);

  controllers.left.addEventListener("squeezestart", () => onGripStart());
  controllers.right.addEventListener("squeezestart", () => onGripStart());
  controllers.left.addEventListener("squeezeend", () => onGripEnd());
  controllers.right.addEventListener("squeezeend", () => onGripEnd());
}

function onControllerConnected(hand, e) {
  const gp = e?.data?.gamepad || null;
  if (hand === "left") controllers.leftGamepad = gp;
  if (hand === "right") controllers.rightGamepad = gp;
  updateDiag(true);
  setStatus(`controller ${hand} connected ✅\n${gp?.id || ""}`);
}

function makeRay(isLeft) {
  const g = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const m = new THREE.LineBasicMaterial({ transparent:true, opacity: isLeft ? 0.9 : 0.35 });
  const line = new THREE.Line(g, m);
  line.scale.z = 10;
  return line;
}

function makeTeleportMarker() {
  const geo = new THREE.RingGeometry(0.15, 0.22, 32);
  const mat = new THREE.MeshBasicMaterial({ transparent:true, opacity:0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.visible = false;
  return mesh;
}

function onGripStart() {
  if (!state.teleportEnabled) return;
  teleportAiming = true;
}

function onGripEnd() {
  if (!state.teleportEnabled) return;
  teleportAiming = false;
  if (controllers.teleportTarget) {
    const y = player.position.y;
    player.position.set(controllers.teleportTarget.x, y, controllers.teleportTarget.z);
  }
  controllers.teleportTarget = null;
  controllers.teleportMarker.visible = false;
}

// -------------------- Touch Controls (Android) --------------------
function initTouchControls() {
  ui.touchControls.style.display = "none";

  ui.btnTouchMenu.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    toggleDiag();
  });

  ui.btnTouchTeleport.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.teleportEnabled = !state.teleportEnabled;
    ui.btnTeleport.textContent = state.teleportEnabled ? "Teleport: ON" : "Teleport: OFF";
    updateDiag(true);
  });

  bindStick(ui.stickLeft, touch.left);
  bindStick(ui.stickRight, touch.right);
}

function bindStick(el, stickState) {
  const knob = el.querySelector(".knob");
  const radius = 70;

  const setKnob = (x, y) => {
    knob.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    stickState.active = true;
    stickState.id = e.pointerId;
  });

  el.addEventListener("pointermove", (e) => {
    if (!stickState.active || stickState.id !== e.pointerId) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    const len = Math.hypot(dx, dy);
    if (len > radius) {
      dx = (dx / len) * radius;
      dy = (dy / len) * radius;
    }

    stickState.x = +(dx / radius).toFixed(3);
    stickState.y = +(dy / radius).toFixed(3);

    setKnob(dx, dy);
  });

  const end = (e) => {
    if (stickState.id !== e.pointerId) return;
    stickState.active = false;
    stickState.id = null;
    stickState.x = 0; stickState.y = 0;
    setKnob(0, 0);
  };

  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -------------------- Main Loop --------------------
const tmpDir = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const prevPressed = new WeakMap();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);
  snapTurnCooldown = Math.max(0, snapTurnCooldown - dt);

  pollInputs(dt);

  if (state.teleportEnabled && teleportAiming) updateTeleportAim();
  else if (controllers.teleportMarker) controllers.teleportMarker.visible = false;

  // Update modules (isolated)
  for (const m of modules.list) {
    if (!m.enabled) continue;
    if (!m.update) continue;
    try {
      const t0 = performance.now();
      m.update(dt);
      m.timingMs = (m.timingMs * 0.9) + ((performance.now() - t0) * 0.1);
    } catch (e) {
      m.enabled = false;
      m.error = e;
      setLastError(e);
      warn("module disabled due to error:", m.id);
    }
  }

  if (world?.update) {
    try { world.update(dt); } catch (e) { setLastError(e); }
  }

  renderer.render(scene, camera);

  // Slow refresh diag (~4fps) when open
  if (state.diagOpen && (performance.now() % 250 < 16)) updateDiag();
}

function handleEdgeButton(gamepad, index, fn) {
  if (!gamepad?.buttons?.[index]) return;
  let m = prevPressed.get(gamepad);
  if (!m) { m = {}; prevPressed.set(gamepad, m); }
  const was = !!m[index];
  const now = !!gamepad.buttons[index].pressed;
  if (!was && now) fn();
  m[index] = now;
}

function pollInputs(dt) {
  // Touch mode axes override (Android)
  const touchMoveX = state.touchEnabled ? touch.left.x : 0;
  const touchMoveY = state.touchEnabled ? touch.left.y : 0;
  const touchLookX = state.touchEnabled ? touch.right.x : 0;

  const l = controllers.leftGamepad;
  const r = controllers.rightGamepad;

  // Left Y toggles diag (best effort)
  if (l?.buttons?.length) {
    handleEdgeButton(l, 3, () => toggleDiag()); // often Y
    handleEdgeButton(l, 4, () => toggleDiag()); // fallback
  }

  // Movement (right stick OR touch left stick)
  let moveX = 0, moveY = 0;
  if (r?.axes?.length >= 2) {
    const x = r.axes[2] ?? r.axes[0] ?? 0;
    const y = r.axes[3] ?? r.axes[1] ?? 0;
    moveX = x; moveY = y;
  } else if (state.touchEnabled) {
    moveX = touchMoveX;
    moveY = touchMoveY;
  }

  const dz = 0.18;
  const ax = Math.abs(moveX) > dz ? moveX : 0;
  const ay = Math.abs(moveY) > dz ? moveY : 0;

  if (ax || ay) {
    camera.getWorldDirection(tmpDir);
    tmpDir.y = 0; tmpDir.normalize();
    tmpVec.copy(tmpDir).cross(new THREE.Vector3(0,1,0)).normalize();

    const speed = 2.0;
    const move = new THREE.Vector3();
    move.addScaledVector(tmpDir, -ay * speed * dt);
    move.addScaledVector(tmpVec, ax * speed * dt);
    player.position.add(move);
  }

  // Snap turn (left stick OR touch right stick)
  let turnX = 0;
  if (l?.axes?.length >= 2) {
    turnX = l.axes[2] ?? l.axes[0] ?? 0;
  } else if (state.touchEnabled) {
    turnX = touchLookX;
  }

  const dzTurn = 0.35;
  if (snapTurnCooldown === 0 && Math.abs(turnX) > dzTurn) {
    const dir = turnX > 0 ? -1 : 1;
    player.rotation.y += dir * (Math.PI / 4);
    snapTurnCooldown = 0.28;
  }
}

function updateTeleportAim() {
  const originObj = controllers.right || controllers.left;
  if (!originObj) return;

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0,0,-1);

  originObj.getWorldPosition(origin);
  dir.applyQuaternion(originObj.getWorldQuaternion(new THREE.Quaternion())).normalize();

  raycaster.set(origin, dir);
  raycaster.far = 20;

  const hits = raycaster.intersectObjects(floorMeshes, true);
  if (hits.length) {
    const p = hits[0].point;
    controllers.teleportTarget = p;
    controllers.teleportMarker.position.copy(p);
    controllers.teleportMarker.visible = true;
  } else {
    controllers.teleportTarget = null;
    controllers.teleportMarker.visible = false;
  }
          }
