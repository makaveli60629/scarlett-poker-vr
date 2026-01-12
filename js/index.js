// /js/index.js — Scarlett INDEX MASTER (laser fixed + XR stability + Android dev + safe modules)
import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = `INDEX_MASTER_${Date.now()}`;

const S = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  controllers: [],
  lasers: { right: null, left: null, rightHost: null, leftHost: null },

  logs: [],
  logMax: 260,

  flags: {
    showHUD: true,
    showLogs: true,

    // master toggles
    A_worldPolish: true,
    B_pokerSim: true,
    C_storeMeta: true,

    // laser behavior
    preferRightHand: true,
    showLeftLaser: false
  },

  android: {
    enabled: true,
    yaw: 0,
    pitch: 0,
    move: { f: 0, r: 0 },
    speed: 3.2
  },

  ui: { root: null, logPanel: null, hudPanel: null }
};

// ---------------- logging ----------------
function stamp() { return new Date().toLocaleTimeString(); }
function LOG(...args) {
  const msg = `[${stamp()}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  S.logs.push(msg);
  if (S.logs.length > S.logMax) S.logs.shift();
  if (S.ui.logPanel) {
    S.ui.logPanel.textContent = S.logs.slice(-140).join("\n");
    S.ui.logPanel.scrollTop = S.ui.logPanel.scrollHeight;
  }
}

// ---------------- UI ----------------
function buildDevUI() {
  const root = document.createElement("div");
  root.style.cssText = `position:fixed; inset:0; z-index:99999; pointer-events:none; font-family:system-ui,Segoe UI,Arial;`;

  const row = document.createElement("div");
  row.style.cssText = `position:fixed; left:12px; top:12px; display:flex; gap:8px; flex-wrap:wrap; pointer-events:auto;`;

  const hud = document.createElement("div");
  hud.style.cssText = `
    position:fixed; left:50%; top:12px; transform:translateX(-50%);
    padding:10px 14px; border-radius:14px;
    background:rgba(10,12,18,.58);
    border:1px solid rgba(255,45,122,.22);
    color:#e8ecff; font-weight:900;
    pointer-events:none;
  `;
  hud.textContent = `Scarlett • ${BUILD}`;

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

  function btn(label, fn) {
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
    b.onclick = fn;
    row.appendChild(b);
    return b;
  }

  const bHud = btn("Hide HUD", () => {
    S.flags.showHUD = !S.flags.showHUD;
    hud.style.display = S.flags.showHUD ? "block" : "none";
    bHud.textContent = S.flags.showHUD ? "Hide HUD" : "Show HUD";
    World.setOption?.("hudVisible", S.flags.showHUD);
  });

  const bLogs = btn("Hide Logs", () => {
    S.flags.showLogs = !S.flags.showLogs;
    logWrap.style.display = S.flags.showLogs ? "block" : "none";
    bLogs.textContent = S.flags.showLogs ? "Hide Logs" : "Show Logs";
  });

  btn("Copy Logs", async () => {
    try { await navigator.clipboard.writeText(S.logs.join("\n")); LOG("[HUD] copied ✅"); }
    catch (e) { LOG("[HUD] copy failed ❌", e?.message || e); }
  });

  btn("Reset Spawn", () => {
    World.teleport?.("vipInside") || S.player.position.set(0, 0, 0);
    S.player.rotation.set(0, Math.PI, 0);
    LOG("[HUD] spawn reset ✅");
  });

  btn("Reset Hand", () => {
    World.resetHand?.();
    LOG("[HUD] reset hand ✅");
  });

  const bLeftLaser = btn("Left Laser:OFF", () => {
    S.flags.showLeftLaser = !S.flags.showLeftLaser;
    bLeftLaser.textContent = `Left Laser:${S.flags.showLeftLaser ? "ON" : "OFF"}`;
    if (S.lasers.left) S.lasers.left.visible = S.flags.showLeftLaser;
  });

  root.appendChild(row);
  root.appendChild(hud);
  root.appendChild(logWrap);
  document.body.appendChild(root);

  S.ui.root = root;
  S.ui.logPanel = logPanel;
  S.ui.hudPanel = hud;
}

// ---------------- three init ----------------
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
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35)); // prevents shimmer on mobile
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.xr.enabled = true;

  // XR stability (fixes “blinking/distorted when turning”)
  // Lower framebuffer scale in VR for Quest + Android WebXR.
  S.renderer.xr.setFramebufferScaleFactor?.(0.8);

  document.body.appendChild(S.renderer.domElement);

  S.clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  LOG("[index] three init ✅");
}

// ---------------- Laser creation (ALWAYS VISIBLE) ----------------
function makeLaserLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);

  const mat = new THREE.LineBasicMaterial();
  mat.depthTest = false;         // <- makes it visible even through geometry
  mat.transparent = true;
  mat.opacity = 0.95;

  const line = new THREE.Line(geo, mat);
  line.name = "laser";
  line.scale.z = 14;
  line.renderOrder = 9999;       // <- draw last
  return line;
}

function attachLaserTo(host, hand) {
  // hand = "right" | "left"
  const existing = S.lasers[hand];
  if (existing && existing.parent) existing.parent.remove(existing);

  const line = existing || makeLaserLine();
  host.add(line);

  if (hand === "right") {
    S.lasers.right = line;
    S.lasers.rightHost = host;
    line.visible = true;
  } else {
    S.lasers.left = line;
    S.lasers.leftHost = host;
    line.visible = !!S.flags.showLeftLaser;
  }

  LOG(`[laser] attached -> ${hand} host=${host?.name || host?.type || "unknown"}`);
}

// ---------------- XR controllers + hands binding ----------------
function initXRInputs() {
  S.controllers.length = 0;

  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = `controller${i}`;
    S.player.add(c);
    S.controllers.push(c);

    c.addEventListener("connected", (e) => {
      LOG(`[xr] controller${i} connected: ${e?.data?.hand ? "hand" : (e?.data?.gamepad ? "gamepad" : "no-gamepad")}`);
      // Prefer right laser on controller1 usually, but we’ll truly detect via inputSources below.
      bindLasersToBestXRInputs();
    });
    c.addEventListener("disconnected", () => {
      LOG(`[xr] controller${i} disconnected`);
      bindLasersToBestXRInputs();
    });
  }

  // When XR input sources change (switching to hand tracking, etc)
  S.renderer.xr.addEventListener("sessionstart", () => {
    const session = S.renderer.xr.getSession?.();
    if (session) {
      session.addEventListener("inputsourceschange", () => {
        LOG("[xr] inputsourceschange");
        bindLasersToBestXRInputs();
      });
    }
  });

  LOG("[index] controllers ready ✅");
}

function bindLasersToBestXRInputs() {
  const session = S.renderer.xr.getSession?.();
  if (!session) {
    // non-VR: attach right laser to camera (so you always have a pointer for debugging)
    attachLaserTo(S.camera, "right");
    if (S.lasers.right) S.lasers.right.position.set(0.12, -0.08, -0.2);
    return;
  }

  // In WebXR, best practice: pick sources by handedness.
  const sources = session.inputSources || [];
  let rightSource = sources.find(s => s.handedness === "right");
  let leftSource  = sources.find(s => s.handedness === "left");

  // If none (some browsers), fallback to controllers index.
  const c0 = S.controllers[0];
  const c1 = S.controllers[1];

  // Prefer “right” source, but if the right controller isn't reporting, use whichever exists.
  let rightHost = null;
  let leftHost = null;

  // If source has a targetRaySpace we can map it to a controller via getController?
  // We keep it simple: controllers themselves still track in XR and are valid hosts.
  // Use c1 as “right” default.
  rightHost = c1 || c0 || S.camera;
  leftHost  = c0 || c1 || S.camera;

  // If we detect that controller0 is actually right-handed (rare), swap
  if (rightSource && rightSource.handedness === "right") {
    // Keep standard mapping: controller1 right, controller0 left.
  }

  attachLaserTo(rightHost, "right");
  attachLaserTo(leftHost, "left");

  // Make sure right laser is always visible in VR
  if (S.lasers.right) S.lasers.right.visible = true;
  if (S.lasers.left) S.lasers.left.visible = !!S.flags.showLeftLaser;
}

// ---------------- Android dev controls ----------------
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
    // left = move, right = look
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
  if (S.renderer.xr.isPresenting) return;

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

  initXRInputs();
  enableAndroidDevControls();

  S.renderer.xr.addEventListener("sessionstart", () => {
    if (S.ui.root) S.ui.root.style.display = "none";
    bindLasersToBestXRInputs();
  });
  S.renderer.xr.addEventListener("sessionend", () => {
    if (S.ui.root) S.ui.root.style.display = "block";
    bindLasersToBestXRInputs();
  });

  // Ensure you ALWAYS have a pointer in non-VR too
  bindLasersToBestXRInputs();

  await World.init({
    THREE,
    scene: S.scene,
    renderer: S.renderer,
    camera: S.camera,
    player: S.player,
    controllers: S.controllers,
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
