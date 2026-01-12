// /js/index.js — Scarlett INDEX FULL (A+B+C toggles, Android dev, Quest-safe)
import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = `INDEX_ABC_${Date.now()}`;

const S = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,
  controllers: [],
  grips: [],
  lasers: [],

  logs: [],
  logMax: 250,

  flags: {
    showHUD: true,
    showLogs: true,
    // A/B/C master toggles
    A_worldPolish: true,
    B_pokerSim: true,
    C_storeMeta: true,
  },

  android: {
    active: true,
    yaw: 0,
    pitch: 0,
    move: { f: 0, r: 0 },
    speed: 3.1
  },

  ui: { root: null, logPanel: null, hudPanel: null, buttons: {} }
};

// ---------------- logging ----------------
function stamp() { return new Date().toLocaleTimeString(); }
function LOG(...args) {
  const msg = `[${stamp()}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  S.logs.push(msg);
  if (S.logs.length > S.logMax) S.logs.shift();
  if (S.ui.logPanel) {
    S.ui.logPanel.textContent = S.logs.slice(-130).join("\n");
    S.ui.logPanel.scrollTop = S.ui.logPanel.scrollHeight;
  }
}

// ---------------- UI ----------------
function buildDevUI() {
  const root = document.createElement("div");
  root.style.cssText = `position:fixed; inset:0; z-index:99999; pointer-events:none; font-family:system-ui,Segoe UI,Arial;`;

  const topLeft = document.createElement("div");
  topLeft.style.cssText = `position:fixed; left:12px; top:12px; display:flex; gap:8px; flex-wrap:wrap; pointer-events:auto;`;

  function button(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      background:rgba(10,12,18,.72);
      border:1px solid rgba(127,231,255,.25);
      color:#e8ecff;
      padding:10px 12px;
      border-radius:12px;
      font-weight:900;
    `;
    b.onclick = onClick;
    topLeft.appendChild(b);
    return b;
  }

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
  logPanel.style.cssText = `margin:0; padding:12px; white-space:pre-wrap; word-break:break-word; color:#cfe7ff; font-size:12px; height:100%; overflow:auto;`;
  logWrap.appendChild(logPanel);

  // core buttons
  const bHideHUD = button("Hide HUD", () => {
    S.flags.showHUD = !S.flags.showHUD;
    hudPanel.style.display = S.flags.showHUD ? "block" : "none";
    bHideHUD.textContent = S.flags.showHUD ? "Hide HUD" : "Show HUD";
    World.setOption?.("hudVisible", S.flags.showHUD);
  });

  const bHideLogs = button("Hide Logs", () => {
    S.flags.showLogs = !S.flags.showLogs;
    logWrap.style.display = S.flags.showLogs ? "block" : "none";
    bHideLogs.textContent = S.flags.showLogs ? "Hide Logs" : "Show Logs";
  });

  button("Copy Logs", async () => {
    try { await navigator.clipboard.writeText(S.logs.join("\n")); LOG("[HUD] copied ✅"); }
    catch (e) { LOG("[HUD] copy failed ❌", e?.message || e); }
  });

  button("Reset Spawn", () => {
    World.teleport?.("vipInside") || (S.player.position.set(0, 0, 0));
    S.player.rotation.set(0, Math.PI, 0);
    LOG("[HUD] spawn reset ✅");
  });

  button("Reset Hand", () => {
    World.resetHand?.();
    LOG("[HUD] reset hand ✅");
  });

  // A/B/C toggles
  const bA = button("A:ON", () => {
    S.flags.A_worldPolish = !S.flags.A_worldPolish;
    bA.textContent = `A:${S.flags.A_worldPolish ? "ON" : "OFF"}`;
    World.setOption?.("A_worldPolish", S.flags.A_worldPolish);
  });
  const bB = button("B:ON", () => {
    S.flags.B_pokerSim = !S.flags.B_pokerSim;
    bB.textContent = `B:${S.flags.B_pokerSim ? "ON" : "OFF"}`;
    World.setOption?.("B_pokerSim", S.flags.B_pokerSim);
  });
  const bC = button("C:ON", () => {
    S.flags.C_storeMeta = !S.flags.C_storeMeta;
    bC.textContent = `C:${S.flags.C_storeMeta ? "ON" : "OFF"}`;
    World.setOption?.("C_storeMeta", S.flags.C_storeMeta);
  });

  root.appendChild(topLeft);
  root.appendChild(hudPanel);
  root.appendChild(logWrap);
  document.body.appendChild(root);

  S.ui.root = root;
  S.ui.logPanel = logPanel;
  S.ui.hudPanel = hudPanel;
}

// ---------------- scene ----------------
function initThree() {
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);

  S.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 260);
  S.camera.position.set(0, 1.65, 6);

  S.player = new THREE.Group();
  S.player.name = "PlayerRig";
  S.player.add(S.camera);
  S.scene.add(S.player);

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // stability
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

// ---------------- XR controllers (Quest-safe) ----------------
function initXRControllers() {
  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = `controller${i}`;
    S.player.add(c);
    S.controllers.push(c);

    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
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

// ---------------- Android dev controls (dual-touch) ----------------
function isAndroid() { return /Android/i.test(navigator.userAgent || ""); }

function enableAndroidDevControls() {
  if (!isAndroid()) return;

  const zone = document.createElement("div");
  zone.style.cssText = `position:fixed; inset:0; z-index:99998; pointer-events:auto; touch-action:none;`;
  document.body.appendChild(zone);

  const st = { leftId:null, rightId:null, l0:null, r0:null, lx:0, ly:0, rx:0, ry:0 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (dx, dy, max=60) => ({ x: clamp(dx/max, -1, 1), y: clamp(dy/max, -1, 1) });

  zone.addEventListener("pointerdown", (e) => {
    const x = e.clientX;
    if (x < innerWidth * 0.5 && st.leftId === null) { st.leftId = e.pointerId; st.l0 = {x:e.clientX,y:e.clientY}; }
    else if (st.rightId === null) { st.rightId = e.pointerId; st.r0 = {x:e.clientX,y:e.clientY}; }
    zone.setPointerCapture(e.pointerId);
  });

  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId === st.leftId && st.l0) {
      const d = norm(e.clientX - st.l0.x, e.clientY - st.l0.y);
      st.lx = d.x; st.ly = d.y;
    }
    if (e.pointerId === st.rightId && st.r0) {
      const d = norm(e.clientX - st.r0.x, e.clientY - st.r0.y);
      st.rx = d.x; st.ry = d.y;
    }
  });

  const end = (e) => {
    if (e.pointerId === st.leftId) { st.leftId=null; st.l0=null; st.lx=0; st.ly=0; }
    if (e.pointerId === st.rightId) { st.rightId=null; st.r0=null; st.rx=0; st.ry=0; }
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);

  S.android._poll = () => {
    S.android.move.f = -st.ly;
    S.android.move.r = st.lx;
    S.android.yaw -= st.rx * 0.04;
    S.android.pitch -= st.ry * 0.03;
    S.android.pitch = Math.max(-1.1, Math.min(1.1, S.android.pitch));
  };

  LOG("[android] dev controls ready ✅");
}

function updateAndroidDev(dt) {
  if (!isAndroid()) return;
  if (S.renderer.xr.isPresenting) return; // VR owns movement

  S.android._poll?.();

  S.player.rotation.y = S.android.yaw;
  S.camera.rotation.x = S.android.pitch;

  const DZ = 0.12;
  const f = Math.abs(S.android.move.f) < DZ ? 0 : S.android.move.f;
  const r = Math.abs(S.android.move.r) < DZ ? 0 : S.android.move.r;
  if (!f && !r) return;

  const v = new THREE.Vector3(r, 0, -f).multiplyScalar(S.android.speed * dt);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
  S.player.position.add(v);
}

// ---------------- BOOT ----------------
async function boot() {
  buildDevUI();

  LOG("[index] runtime start ✅ build=" + BUILD);
  LOG("[env] href=" + location.href);
  LOG("[env] secureContext=" + (window.isSecureContext ? "true" : "false"));
  LOG("[env] ua=" + navigator.userAgent);
  LOG("[env] navigator.xr=" + !!navigator.xr);

  initThree();

  try {
    document.body.appendChild(VRButton.createButton(S.renderer));
    LOG("[index] VRButton appended ✅");
  } catch (e) {
    LOG("[index] VRButton error", e?.message || e);
  }

  initXRControllers();
  enableAndroidDevControls();

  // Hide dev UI during VR session to avoid obstruction
  S.renderer.xr.addEventListener("sessionstart", () => { if (S.ui.root) S.ui.root.style.display = "none"; });
  S.renderer.xr.addEventListener("sessionend", () => { if (S.ui.root) S.ui.root.style.display = "block"; });

  await World.init({
    THREE,
    scene: S.scene,
    renderer: S.renderer,
    camera: S.camera,
    player: S.player,
    controllers: S.controllers,
    grips: S.grips,
    log: LOG,
    BUILD,
    options: { ...S.flags }
  });

  S.renderer.setAnimationLoop(() => {
    const dt = S.clock.getDelta();
    const t = S.clock.elapsedTime;

    updateAndroidDev(dt);
    World.update?.({ dt, t });

    S.renderer.render(S.scene, S.camera);
  });

  LOG("[index] ready ✅");
}

boot();
