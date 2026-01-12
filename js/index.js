// /js/index.js — Scarlett MASTER XR v2 (RIGHT LASER + HANDS + GRIPS + STABLE)
// ✅ Right-hand laser anchored to controller GRIP (fixes "laser stuck in center")
// ✅ Visible controller models (hands) + XR hand tracking models (if supported)
// ✅ Left stick move/strafe, Right stick smooth turn
// ✅ Y toggles World menu
// ✅ Diagnostics + COPY LOG + Manual Enter VR
// ❗ No bare "three" imports. Uses ./three.js wrapper + unpkg example modules.

import { THREE, VRButton } from "./three.js";

const BUILD = `SCARLETT_INDEX_MASTER_V2_${Date.now()}`;

// -------------------- DIAGNOSTICS UI --------------------
const LogBuf = [];
let UI = null;

function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }
function LOG(...a) {
  const s = a.map(v => (typeof v === "string" ? v : safeJson(v))).join(" ");
  console.log(s);
  LogBuf.push(s);
  if (LogBuf.length > 1600) LogBuf.shift();
  if (UI?.log) {
    UI.log.textContent = LogBuf.slice(-280).join("\n");
    UI.log.scrollTop = UI.log.scrollHeight;
  }
}

function btnStyle(kind) {
  const base = "padding:8px 10px;border-radius:12px;font-weight:900;cursor:pointer;";
  if (kind === "aqua") return base + "background:rgba(127,231,255,.14);color:#dff8ff;border:1px solid rgba(127,231,255,.35);";
  if (kind === "pink") return base + "background:rgba(255,45,122,.14);color:#ffe1ec;border:1px solid rgba(255,45,122,.35);";
  return base + "background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);";
}

function makeDiagUI() {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed; left:10px; top:10px; z-index:999999;
    width:min(640px, calc(100vw - 20px));
    background:rgba(10,12,18,.82); color:#e8ecff;
    border:1px solid rgba(127,231,255,.22);
    border-radius:14px; padding:10px;
    box-shadow:0 18px 60px rgba(0,0,0,.45);
    backdrop-filter: blur(10px);
    font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  `;
  const row = document.createElement("div");
  row.style.cssText = "display:flex; gap:8px; align-items:center; flex-wrap:wrap;";

  const title = document.createElement("div");
  title.textContent = "Scarlett VR Poker — Diagnostics";
  title.style.cssText = "font-weight:900; opacity:.95; margin-right:auto;";

  const btnCopy = document.createElement("button");
  btnCopy.textContent = "COPY LOG";
  btnCopy.style.cssText = btnStyle("aqua");
  btnCopy.onclick = async () => {
    const text = LogBuf.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      LOG("[HUD] copied ✅");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      LOG("[HUD] copied (fallback) ✅");
    }
  };

  const btnHide = document.createElement("button");
  btnHide.textContent = "HIDE";
  btnHide.style.cssText = btnStyle("dim");

  const btnEnter = document.createElement("button");
  btnEnter.textContent = "ENTER VR (MANUAL)";
  btnEnter.style.cssText = btnStyle("pink");

  const pre = document.createElement("pre");
  pre.style.cssText = `
    margin:10px 0 0 0; padding:10px; border-radius:12px;
    background:rgba(0,0,0,.30); border:1px solid rgba(255,255,255,.08);
    max-height:40vh; overflow:auto; white-space:pre-wrap;
  `;

  btnHide.onclick = () => {
    pre.style.display = (pre.style.display === "none") ? "block" : "none";
  };

  row.appendChild(title);
  row.appendChild(btnCopy);
  row.appendChild(btnHide);
  row.appendChild(btnEnter);
  wrap.appendChild(row);
  wrap.appendChild(pre);
  document.body.appendChild(wrap);

  return { wrap, log: pre, btnEnter };
}

UI = makeDiagUI();

LOG(`[index] runtime start ✅ build=${BUILD}`);
LOG(`[env] href=${location.href}`);
LOG(`[env] secureContext=${window.isSecureContext}`);
LOG(`[env] ua=${navigator.userAgent}`);
LOG(`[env] navigator.xr=${!!navigator.xr}`);

// -------------------- STATE --------------------
const S = {
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock(),
  player: new THREE.Group(),
  rig: new THREE.Group(),

  // controllers + grips + hands
  controllers: [],
  grips: [],
  hands: [],

  world: null,
  hudRoot: null,

  inXR: false,
  lastButtons: { y: false },

  // optional factories
  XRControllerModelFactory: null,
  XRHandModelFactory: null,
};

function initThree() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#05060a";

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  S.renderer.setSize(innerWidth, innerHeight);
  S.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  S.renderer.xr.enabled = true;

  // Quest stability
  S.renderer.xr.setFoveation?.(1.0);

  document.body.appendChild(S.renderer.domElement);

  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);
  S.scene.fog = new THREE.Fog(0x05060a, 10, 180);

  S.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300);

  // IMPORTANT: camera is inside rig; player moves rig
  S.rig.add(S.camera);
  S.player.add(S.rig);
  S.scene.add(S.player);

  addEventListener("resize", () => {
    S.camera.aspect = innerWidth / innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(innerWidth, innerHeight);
  });

  LOG("[index] three init ✅");
}

function initVRButtons() {
  try {
    const b = VRButton.createButton(S.renderer);
    b.style.position = "fixed";
    b.style.left = "50%";
    b.style.transform = "translateX(-50%)";
    b.style.bottom = "18px";
    b.style.zIndex = "999999";
    document.body.appendChild(b);
    LOG("[index] VRButton appended ✅");
  } catch (e) {
    LOG("[index] VRButton failed ❌ " + (e?.message || e));
  }

  UI.btnEnter.onclick = async () => {
    try {
      if (!navigator.xr) return LOG("[vr] navigator.xr missing");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      LOG(`[vr] isSessionSupported=${ok}`);
      if (!ok) return;

      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "local", "viewer", "hand-tracking", "layers", "dom-overlay"],
        domOverlay: { root: document.body }
      });

      await S.renderer.xr.setSession(session);
      LOG("[vr] session started ✅");
    } catch (e) {
      LOG("[vr] manual enter FAIL ❌ " + (e?.message || e));
    }
  };
}

// -------------------- SAFE IMPORT (NO HANG) --------------------
function withTimeout(promise, ms, label) {
  let t = null;
  const timeout = new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)));
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
async function safeImport(url, timeout = 8000) {
  try {
    const mod = await withTimeout(import(url), timeout, url);
    LOG(`[import] ok: ${url}`);
    return mod;
  } catch (e) {
    LOG(`[import] FAIL: ${url} -> ${e?.message || e}`);
    return null;
  }
}

// -------------------- LASER (GRIP-ANCHORED) --------------------
function buildLaser(color = 0x7fe7ff) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "ScarlettLaser";
  line.scale.z = 18;

  // tiny tip dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 10, 10),
    new THREE.MeshBasicMaterial({ color })
  );
  dot.position.z = -1;
  dot.name = "ScarlettLaserDot";
  line.add(dot);

  return line;
}

function attachLaserToGrip(grip, isRight) {
  if (!grip) return;
  // wipe old
  const old = grip.getObjectByName?.("ScarlettLaser");
  if (old) grip.remove(old);

  const laser = buildLaser(isRight ? 0x7fe7ff : 0xff2d7a);
  // slight offset so it's not inside hand mesh
  laser.position.set(0.0, -0.01, 0.02);
  grip.add(laser);
}

function enforceLasers() {
  // right grip = index 1 (usually), but we hard-force:
  const g0 = S.grips[0] || null;
  const g1 = S.grips[1] || null;

  // Prefer mapping: grip1 = right, grip0 = left
  if (g0) attachLaserToGrip(g0, false);
  if (g1) attachLaserToGrip(g1, true);

  LOG("[laser] grips laser enforced ✅");
}

// -------------------- CONTROLLERS + GRIPS + HANDS --------------------
async function initInputModels() {
  // controller models
  const cmf = await safeImport("https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js");
  if (cmf?.XRControllerModelFactory) {
    S.XRControllerModelFactory = cmf.XRControllerModelFactory;
    LOG("[xr] XRControllerModelFactory ✅");
  }

  // hand tracking models
  const hmf = await safeImport("https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js");
  if (hmf?.XRHandModelFactory) {
    S.XRHandModelFactory = hmf.XRHandModelFactory;
    LOG("[xr] XRHandModelFactory ✅");
  }
}

function initControllers() {
  S.controllers.length = 0;
  S.grips.length = 0;
  S.hands.length = 0;

  // controllers (for select events)
  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.userData.index = i;
    S.scene.add(c);
    S.controllers.push(c);

    c.addEventListener("connected", (ev) => {
      LOG(`[xr] controller${i} connected: ${ev?.data?.gamepad ? "gamepad" : "no-gamepad"}`);
      setTimeout(enforceLasers, 120);
    });
    c.addEventListener("disconnected", () => {
      LOG(`[xr] controller${i} disconnected`);
      setTimeout(enforceLasers, 120);
    });
  }

  // grips (for visible models + lasers)
  const factory = S.XRControllerModelFactory ? new S.XRControllerModelFactory() : null;
  for (let i = 0; i < 2; i++) {
    const g = S.renderer.xr.getControllerGrip(i);
    g.userData.index = i;
    if (factory) {
      const model = factory.createControllerModel(g);
      g.add(model);
    } else {
      // fallback “hand blob”
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x9aa3ff, roughness: 0.5, metalness: 0.1, emissive: 0x121a55, emissiveIntensity: 0.6 })
      );
      blob.position.set(0, 0, 0);
      g.add(blob);
    }
    S.scene.add(g);
    S.grips.push(g);
  }

  // hand tracking (optional)
  if (S.XRHandModelFactory) {
    const handFactory = new S.XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
      const h = S.renderer.xr.getHand(i);
      h.userData.index = i;
      const handModel = handFactory.createHandModel(h, "mesh");
      h.add(handModel);
      S.scene.add(h);
      S.hands.push(h);
    }
  }

  S.renderer.xr.addEventListener("sessionstart", () => setTimeout(enforceLasers, 200));
  S.renderer.xr.addEventListener("sessionend", () => setTimeout(enforceLasers, 200));

  enforceLasers();
  LOG("[index] controllers + grips + hands installed ✅");
}

// -------------------- LOCOMOTION (CORRECT) --------------------
function applyXRLocomotion(dt) {
  const session = S.renderer.xr.getSession?.();
  if (!session?.inputSources) return;

  let leftPad = null, rightPad = null;

  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") leftPad = src.gamepad;
    if (src.handedness === "right") rightPad = src.gamepad;
  }

  // fallback for weird inputSources order
  if (!leftPad || !rightPad) {
    const pads = [];
    for (const src of session.inputSources) if (src?.gamepad) pads.push(src.gamepad);
    leftPad = leftPad || pads[0] || null;
    rightPad = rightPad || pads[1] || pads[0] || null;
  }

  const DZ = 0.16;
  const dz = (v) => (Math.abs(v) < DZ ? 0 : v);

  const la = leftPad?.axes || [];
  const ra = rightPad?.axes || [];

  // left: move/strafe
  const lx = dz((la[0] ?? 0) || (la[2] ?? 0));
  const ly = dz((la[1] ?? 0) || (la[3] ?? 0));

  // right: turn (x)
  const rx = dz((ra[2] ?? 0) || (ra[0] ?? 0));

  const moveSpeed = 3.0;
  const turnSpeed = 2.3;

  const forward = -ly;
  const strafe = lx;

  if (rx) S.player.rotation.y -= rx * turnSpeed * dt;

  if (forward || strafe) {
    const v = new THREE.Vector3(strafe, 0, -forward).multiplyScalar(moveSpeed * dt);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
    S.player.position.add(v);
  }
}

// -------------------- Y BUTTON MENU TOGGLE --------------------
function readYPressed() {
  const session = S.renderer.xr.getSession?.();
  if (!session?.inputSources) return false;

  // Prefer left controller "Y"
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness !== "left") continue;
    const b = src.gamepad.buttons || [];
    // common: Y = buttons[3]
    return !!(b[3]?.pressed || b[4]?.pressed);
  }

  // fallback: any controller buttons[3]
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    const b = src.gamepad.buttons || [];
    if (b[3]?.pressed) return true;
  }
  return false;
}

function handleMenuToggle() {
  const yNow = readYPressed();
  const yPrev = S.lastButtons.y;

  if (yNow && !yPrev) {
    S.world?.toggleMenu?.();
    LOG("[input] Y -> toggleMenu");
  }
  S.lastButtons.y = yNow;
}

// -------------------- HUD STABILITY (YAW ONLY) --------------------
function faceYawOnly(obj, tilt = -0.10) {
  const dx = S.camera.position.x - obj.position.x;
  const dz = S.camera.position.z - obj.position.z;
  const yaw = Math.atan2(dx, dz);
  obj.rotation.set(tilt, yaw, 0);
}

// -------------------- WORLD LOAD --------------------
async function initWorld() {
  const mod = await safeImport("./world.js?v=" + Date.now(), 12000);
  if (!mod?.World?.init) {
    LOG("[index] world.js invalid ❌");
    return;
  }

  S.world = mod.World;

  let resolved = false;
  const p = Promise.resolve(
    S.world.init({
      THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      grips: S.grips,
      log: LOG,
      BUILD
    })
  ).then(() => {
    resolved = true;
    LOG("[index] world init ✅");
  }).catch((e) => {
    resolved = true;
    LOG("[index] world init FAIL ❌ " + (e?.message || e));
  });

  setTimeout(() => { if (!resolved) LOG("[index] WORLD INIT TIMEOUT ❌"); }, 9000);

  await p;
  S.hudRoot = S.scene.getObjectByName?.("ScarlettHUDRoot") || null;
}

// -------------------- LOOP --------------------
function startLoop() {
  S.renderer.setAnimationLoop(() => {
    const dt = Math.min(S.clock.getDelta(), 0.05);
    S.inXR = !!S.renderer.xr.isPresenting;

    // XR safety lock: don't fight headset pose
    if (S.inXR) {
      S.camera.position.set(0, 0, 0);
      S.camera.rotation.set(0, 0, 0);
      S.renderer.setPixelRatio(1.0);
      applyXRLocomotion(dt);
      handleMenuToggle();
    }

    if (S.hudRoot) faceYawOnly(S.hudRoot, -0.10);

    try { S.world?.update?.({ dt, t: S.clock.elapsedTime }); }
    catch (e) { LOG("[index] world.update crash ❌ " + (e?.message || e)); }

    S.renderer.render(S.scene, S.camera);
  });

  LOG("[index] loop ✅");
}

// -------------------- BOOT --------------------
(async function boot() {
  try {
    initThree();
    initVRButtons();
    await initInputModels();
    initControllers();
    await initWorld();
    startLoop();
    LOG("[index] ready ✅");
  } catch (e) {
    LOG("[index] FATAL ❌ " + (e?.message || e));
  }
})();
