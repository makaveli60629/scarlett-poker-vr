// /js/scarlett1/index.js — SCARLETT1 RUNTIME (ULTIMATE DIAG)
// BUILD: SCARLETT1_RUNTIME_ULT_DIAG_v4_3

const BUILD = "SCARLETT1_RUNTIME_ULT_DIAG_v4_3";

const $ = (id) => document.getElementById(id);

const ui = {
  hud: $("hud"),
  status: $("status"),
  btnEnterVr: $("btnEnterVr"),
  btnHideHud: $("btnHideHud"),
  btnTeleport: $("btnTeleport"),
  btnDiag: $("btnDiag"),
  diagPanel: $("diagPanel"),
  btnDiagClose: $("btnDiagClose"),
  btnTestModules: $("btnTestModules"),
  btnResetPlayer: $("btnResetPlayer"),
  btnReload: $("btnReload"),
  btnCopyLogs: $("btnCopyLogs"),
  btnClearLogs: $("btnClearLogs"),
  btnPanicClose: $("btnPanicClose"),
  diagControllers: $("diagControllers"),
  diagModules: $("diagModules"),
  diagLogs: $("diagLogs"),
};

function setStatus(s) {
  if (ui.status) ui.status.textContent = s;
  console.log("[status]", s);
}

// ----- log capture (surgical debugging) -----
const LOG_MAX = 180;
const logBuf = [];
function pushLog(line) {
  logBuf.push(line);
  if (logBuf.length > LOG_MAX) logBuf.shift();
  if (ui.diagLogs) ui.diagLogs.textContent = logBuf.join("\n");
}
(function patchConsole(){
  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origErr = console.error.bind(console);

  console.log = (...a) => { origLog(...a); pushLog(formatLine("LOG", a)); };
  console.warn = (...a) => { origWarn(...a); pushLog(formatLine("WRN", a)); };
  console.error = (...a) => { origErr(...a); pushLog(formatLine("ERR", a)); };
})();
function formatLine(tag, args) {
  const t = new Date().toISOString().slice(11,19);
  return `[${t}] ${tag} ${args.map(safeStr).join(" ")}`;
}
function safeStr(v) {
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

// ----- imports -----
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { buildWorld } from "./world.js";

// ----- runtime state -----
let renderer, scene, camera, clock;
let player, head;
let world = null;
let floorMeshes = [];
let teleportEnabled = false;
let snapTurnCooldown = 0;

const state = {
  inXR: false,
  diagOpen: false,
  hudHidden: false,
};

// Controller objects (Quest + Android + WebXR)
const controllers = {
  left: null,
  right: null,
  leftGamepad: null,
  rightGamepad: null,
  leftRay: null,
  rightRay: null,
  teleportMarker: null,
  teleportTarget: null,
};

boot().catch((e) => {
  console.error("RUNTIME BOOT FAIL", e);
  setStatus("RUNTIME BOOT FAIL ❌\n" + (e?.stack || e?.message || String(e)));
});

async function boot() {
  setStatus(`booting…\nBUILD=${BUILD}`);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  player = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  player.add(head);
  scene.add(player);

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

  setStatus(`renderer OK ✅\nBUILD=${BUILD}\nbuilding world…`);

  try {
    world = await buildWorld({
      THREE,
      scene,
      player,
      renderer,
      onRegisterFloors: (meshes) => { floorMeshes = meshes || []; },
      onStatus: (s) => setStatus(s),
      log: (...a) => console.log("[world]", ...a),
      warn: (...a) => console.warn("[world]", ...a),
      err: (...a) => console.error("[world]", ...a),
    });
  } catch (e) {
    console.error("WORLD BUILD FAIL", e);
    setStatus("WORLD BUILD FAIL ❌\n" + (e?.stack || e?.message || String(e)));
    world = null;
  }

  // Render initial module list
  renderModuleList();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  setStatus(
    `ready ✅\nBUILD=${BUILD}\nTeleport: ${teleportEnabled ? "ON" : "OFF"}\nEnter VR uses requestSession (no VRButton)`
  );
}

// ---------------- UI / DIAG ----------------
function hookUI() {
  ui.btnHideHud?.addEventListener("click", () => {
    state.hudHidden = !state.hudHidden;
    ui.hud.style.display = state.hudHidden ? "none" : "block";
    ui.btnHideHud.textContent = state.hudHidden ? "Show HUD" : "Hide HUD";
  });

  ui.btnTeleport?.addEventListener("click", () => {
    teleportEnabled = !teleportEnabled;
    ui.btnTeleport.textContent = teleportEnabled ? "Teleport: ON" : "Teleport: OFF";
  });

  ui.btnDiag?.addEventListener("click", () => toggleDiag());
  ui.btnDiagClose?.addEventListener("click", () => toggleDiag(false));
  ui.btnPanicClose?.addEventListener("click", () => {
    // hard close even if something weird happens
    state.diagOpen = false;
    if (ui.diagPanel) ui.diagPanel.style.display = "none";
  });

  ui.btnTestModules?.addEventListener("click", () => {
    const summary = {
      three: !!THREE,
      xr: !!navigator.xr,
      renderer: !!renderer,
      world: !!world,
      floors: floorMeshes.length,
      inXR: state.inXR,
      build: BUILD,
    };
    setStatus("MODULE TEST ✅\n" + Object.entries(summary).map(([k,v]) => `${k}=${v}`).join("\n"));
    renderModuleList();
  });

  ui.btnResetPlayer?.addEventListener("click", () => resetPlayer());
  ui.btnReload?.addEventListener("click", () => location.reload());

  ui.btnCopyLogs?.addEventListener("click", async () => {
    const text = logBuf.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("logs copied ✅");
    } catch {
      // fallback: show in status
      setStatus("copy failed ❌\n(clipboard blocked)");
    }
  });

  ui.btnClearLogs?.addEventListener("click", () => {
    logBuf.length = 0;
    if (ui.diagLogs) ui.diagLogs.textContent = "";
    setStatus("logs cleared ✅");
  });

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
      console.error("Enter VR failed", e);
      setStatus("Enter VR failed ❌\n" + (e?.message || String(e)));
    }
  });
}

function toggleDiag(force) {
  state.diagOpen = typeof force === "boolean" ? force : !state.diagOpen;
  if (ui.diagPanel) ui.diagPanel.style.display = state.diagOpen ? "block" : "none";
  if (state.diagOpen) {
    renderControllersDiag();
    renderModuleList();
  }
}

function renderControllersDiag() {
  const l = controllers.leftGamepad;
  const r = controllers.rightGamepad;

  const lines = [];
  lines.push(`BUILD=${BUILD}`);
  lines.push(`inXR=${state.inXR}`);
  lines.push(`teleportEnabled=${teleportEnabled}`);
  lines.push("");
  lines.push(`[LEFT] connected=${!!controllers.left} gamepad=${!!l}`);
  if (l) {
    lines.push(`buttons=${l.buttons?.length ?? 0} axes=${l.axes?.length ?? 0}`);
    lines.push(`axes=${(l.axes||[]).map(n => (n??0).toFixed(2)).join(", ")}`);
  }
  lines.push("");
  lines.push(`[RIGHT] connected=${!!controllers.right} gamepad=${!!r}`);
  if (r) {
    lines.push(`buttons=${r.buttons?.length ?? 0} axes=${r.axes?.length ?? 0}`);
    lines.push(`axes=${(r.axes||[]).map(n => (n??0).toFixed(2)).join(", ")}`);
  }

  if (ui.diagControllers) ui.diagControllers.textContent = lines.join("\n");
}

function renderModuleList() {
  const items = world?.registry?.items || [];
  if (!ui.diagModules) return;

  if (!world) {
    ui.diagModules.textContent = "world not ready";
    return;
  }

  if (!items.length) {
    ui.diagModules.textContent =
      "No registry found.\nTip: in world.js return { registry } and add registry.add(...) entries.";
    return;
  }

  const out = [];
  out.push(`WORLD REGISTRY (${items.length})`);
  out.push("--------------------------------");
  for (const m of items) {
    const s = (m.status || "ok").toUpperCase();
    out.push(`${s.padEnd(4)}  ${m.id} — ${m.desc}${m.extra ? " | " + m.extra : ""}`);
  }
  ui.diagModules.textContent = out.join("\n");
}

// ---------------- XR + Controllers ----------------
function hookXR() {
  renderer.xr.addEventListener("sessionstart", () => {
    state.inXR = true;
    setStatus(`XR session started ✅\nBUILD=${BUILD}`);
  });
  renderer.xr.addEventListener("sessionend", () => {
    state.inXR = false;
    setStatus(`XR session ended.\nBUILD=${BUILD}`);
  });
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

  setStatus(
    `controller ${hand} connected ✅\n` +
    `Teleport: ${teleportEnabled ? "ON" : "OFF"}\n` +
    `Left Y: menu • Right stick move • Left stick snap`
  );

  renderControllersDiag();
}

function makeRay(isLeft) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const m = new THREE.LineBasicMaterial({ transparent: true, opacity: isLeft ? 0.9 : 0.35 });
  const line = new THREE.Line(g, m);
  line.scale.z = 10;
  return line;
}

function makeTeleportMarker() {
  const geo = new THREE.RingGeometry(0.15, 0.22, 32);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

let teleportAiming = false;
function onGripStart() { if (teleportEnabled) teleportAiming = true; }
function onGripEnd() {
  if (!teleportEnabled) return;
  teleportAiming = false;
  if (controllers.teleportTarget) {
    const y = player.position.y;
    player.position.set(controllers.teleportTarget.x, y, controllers.teleportTarget.z);
    setStatus(`teleport ✅\n${controllers.teleportTarget.x.toFixed(2)}, ${controllers.teleportTarget.z.toFixed(2)}`);
  }
  controllers.teleportTarget = null;
  controllers.teleportMarker.visible = false;
}

// ---------------- Movement + Teleport ----------------
const tmpDir = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const prevPressed = new WeakMap();

function handleEdgeButton(gamepad, index, fn) {
  if (!gamepad?.buttons?.[index]) return;
  let m = prevPressed.get(gamepad);
  if (!m) { m = {}; prevPressed.set(gamepad, m); }
  const was = !!m[index];
  const now = !!gamepad.buttons[index].pressed;
  if (!was && now) fn();
  m[index] = now;
}

function pollGamepads(dt) {
  const l = controllers.leftGamepad;
  const r = controllers.rightGamepad;

  // Left Y toggles diag (best-effort)
  if (l?.buttons?.length) {
    handleEdgeButton(l, 3, () => toggleDiag()); // typical Y
    handleEdgeButton(l, 4, () => toggleDiag()); // fallback
  }

  // Right stick move
  if (r?.axes?.length >= 2) {
    const x = r.axes[2] ?? r.axes[0] ?? 0;
    const y = r.axes[3] ?? r.axes[1] ?? 0;

    const dz = 0.18;
    const ax = Math.abs(x) > dz ? x : 0;
    const ay = Math.abs(y) > dz ? y : 0;

    if (ax || ay) {
      camera.getWorldDirection(tmpDir);
      tmpDir.y = 0;
      tmpDir.normalize();

      tmpVec.copy(tmpDir).cross(new THREE.Vector3(0,1,0)).normalize();

      const speed = 2.0;
      const move = new THREE.Vector3();
      move.addScaledVector(tmpDir, -ay * speed * dt);
      move.addScaledVector(tmpVec, ax * speed * dt);
      player.position.add(move);
    }
  }

  // Left stick snap turn 45
  if (l?.axes?.length >= 2) {
    const lx = l.axes[2] ?? l.axes[0] ?? 0;
    const dz = 0.35;
    if (snapTurnCooldown === 0 && Math.abs(lx) > dz) {
      const dir = lx > 0 ? -1 : 1;
      player.rotation.y += dir * (Math.PI / 4);
      snapTurnCooldown = 0.28;
    }
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

// ---------------- Frame loop ----------------
function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);
  snapTurnCooldown = Math.max(0, snapTurnCooldown - dt);

  pollGamepads(dt);

  if (teleportEnabled && teleportAiming) updateTeleportAim();
  else if (controllers.teleportMarker) controllers.teleportMarker.visible = false;

  if (world?.update) world.update(dt);

  if (state.diagOpen) renderControllersDiag();

  renderer.render(scene, camera);
}

// ---------------- misc ----------------
function resetPlayer() {
  player.position.set(0, 1.6, 14);
  player.rotation.set(0, 0, 0);
  setStatus("player reset ✅");
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
