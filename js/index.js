// /js/index.js — Scarlett MASTER (FULL)
// ✅ TDZ-safe diagnostics + Copy Log
// ✅ VRButton + Manual Enter VR fallback
// ✅ RIGHT-hand laser (always)
// ✅ Correct locomotion mapping:
//    - Left stick: move forward/back + strafe left/right (true left/right, not 45°)
//    - Right stick: turn left/right
// ✅ Stable HUD: yaw-only facing (no wild pitch/roll)
// ✅ Works on Quest + Android (fallback sticks if XR gamepad missing)

import { THREE, VRButton } from "./three.js";

const BUILD = `SCARLETT_MASTER_INDEX_${Date.now()}`;

// -------------------- DIAGNOSTICS (TDZ SAFE) --------------------
const LogBuf = [];
let ui = null;

function LOG(...a) {
  const s = a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
  console.log(s);
  LogBuf.push(s);
  if (LogBuf.length > 1600) LogBuf.shift();
  if (ui?.log) {
    ui.log.textContent = LogBuf.slice(-280).join("\n");
    ui.log.scrollTop = ui.log.scrollHeight;
  }
}
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }

function makeDiagUI() {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed; left:10px; top:10px; z-index:999999;
    width:min(620px, calc(100vw - 20px));
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
  title.textContent = "Scarlett Poker VR — Diagnostics";
  title.style.cssText = "font-weight:800; opacity:.95; margin-right:auto;";

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
  btnHide.onclick = () => {
    pre.style.display = (pre.style.display === "none") ? "block" : "none";
  };

  const btnEnter = document.createElement("button");
  btnEnter.textContent = "ENTER VR (MANUAL)";
  btnEnter.style.cssText = btnStyle("pink");

  const pre = document.createElement("pre");
  pre.style.cssText = `
    margin:10px 0 0 0; padding:10px; border-radius:12px;
    background:rgba(0,0,0,.30); border:1px solid rgba(255,255,255,.08);
    max-height:40vh; overflow:auto; white-space:pre-wrap;
  `;

  row.appendChild(title);
  row.appendChild(btnCopy);
  row.appendChild(btnHide);
  row.appendChild(btnEnter);
  wrap.appendChild(row);
  wrap.appendChild(pre);
  document.body.appendChild(wrap);

  return { wrap, log: pre, btnEnter };
}

function btnStyle(kind) {
  const base = "padding:8px 10px; border-radius:12px; font-weight:900; cursor:pointer;";
  if (kind === "aqua") return base + "background:rgba(127,231,255,.14); color:#dff8ff; border:1px solid rgba(127,231,255,.35);";
  if (kind === "pink") return base + "background:rgba(255,45,122,.14); color:#ffe1ec; border:1px solid rgba(255,45,122,.35);";
  return base + "background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.18);";
}

ui = makeDiagUI();

LOG(`[index] runtime start ✅ build=${BUILD}`);
LOG(`[env] href=${location.href}`);
LOG(`[env] secureContext=${window.isSecureContext}`);
LOG(`[env] ua=${navigator.userAgent}`);
LOG(`[env] navigator.xr=${!!navigator.xr}`);

// -------------------- SAFE IMPORT --------------------
function withTimeout(promise, ms, label) {
  let t = null;
  const timeout = new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)));
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
async function safeImport(path, { timeout = 2500, silent = true } = {}) {
  try {
    const mod = await withTimeout(import(path), timeout, path);
    LOG(`[import] ok: ${path}`);
    return mod;
  } catch (e) {
    LOG(silent ? `[import] skip: ${path}` : `[import] FAIL: ${path} -> ${e?.message || e}`);
    return null;
  }
}

// -------------------- STATE --------------------
const S = নিশ্চিত();
function নিশ্চিত() {
  return {
    THREE,
    scene: null,
    camera: null,
    renderer: null,
    clock: new THREE.Clock(),
    player: new THREE.Group(),
    rig: new THREE.Group(),
    controllers: [],
    controllerRays: [],
    world: null,
    hudRoot: null,
  };
}

// -------------------- INIT THREE --------------------
function initThree() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#05060a";

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  S.renderer.setSize(innerWidth, innerHeight);
  S.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  S.renderer.xr.enabled = true;
  document.body.appendChild(S.renderer.domElement);

  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);
  S.scene.fog = new THREE.Fog(0x05060a, 10, 140);

  S.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 260);
  S.camera.position.set(0, 1.65, 3);

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

// -------------------- VR BUTTON + MANUAL ENTER --------------------
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

  ui.btnEnter.onclick = async () => {
    try {
      if (!navigator.xr) return LOG("[vr] navigator.xr missing");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      LOG(`[vr] isSessionSupported=${ok}`);
      if (!ok) return;
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "local", "viewer", "hand-tracking", "layers", "dom-overlay"],
        domOverlay: { root: document.body }
      });
      S.renderer.xr.setSession(session);
      LOG("[vr] session started ✅");
    } catch (e) {
      LOG("[vr] manual enter FAIL ❌ " + (e?.message || e));
    }
  };
}

// -------------------- RIGHT-HAND LASER (ALWAYS) --------------------
function buildLaser(color = 0x7fe7ff) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "RightLaser";
  line.scale.z = 18;
  return line;
}

function installRightHandLaser() {
  // remove any existing
  S.controllers.forEach(c => {
    const old = c.getObjectByName?.("RightLaser");
    if (old) c.remove(old);
  });

  // right is typically controller 1
  const right = S.controllers[1] || S.controllers[0];
  if (!right) return;

  const laser = buildLaser(0x7fe7ff);
  right.add(laser);
  LOG("[laser] RIGHT laser attached ✅");
}

function initControllers() {
  S.controllers.length = 0;
  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.userData.index = i;

    c.addEventListener("connected", (ev) => {
      LOG(`[xr] controller${i} connected: ${ev?.data?.gamepad ? "gamepad" : "no-gamepad"} ${ev?.data?.hand ? "hand" : ""}`);
    });
    c.addEventListener("disconnected", () => LOG(`[xr] controller${i} disconnected`));

    S.scene.add(c);
    S.controllers.push(c);
  }

  installRightHandLaser();

  // re-attach laser once session starts (controllers can “refresh”)
  S.renderer.xr.addEventListener("sessionstart", () => {
    setTimeout(installRightHandLaser, 250);
  });

  LOG("[index] controllers installed ✅");
}

// -------------------- LOCOMOTION (CORRECT) --------------------
// Left stick: move/strafe (true left/right)
// Right stick: turn
function applyXRLocomotion(dt) {
  const session = S.renderer.xr.getSession?.();
  if (!session?.inputSources) return;

  let left = null;
  let right = null;

  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }

  // fallback if handedness not provided
  if (!left || !right) {
    const pads = [];
    for (const src of session.inputSources) if (src?.gamepad) pads.push(src.gamepad);
    left = left || pads[0] || null;
    right = right || pads[1] || pads[0] || null;
  }

  const DZ = 0.16;
  const dz = v => (Math.abs(v) < DZ ? 0 : v);

  const getAxes = (gp) => gp?.axes || [];

  const la = getAxes(left);
  const ra = getAxes(right);

  // left stick axes: prefer [0,1]; fallback [2,3]
  const lx = dz(la[0] ?? 0) || dz(la[2] ?? 0);
  const ly = dz(la[1] ?? 0) || dz(la[3] ?? 0);

  // right stick x for turn: prefer [2]; fallback [0]
  const rx = dz(ra[2] ?? 0) || dz(ra[0] ?? 0);

  const moveSpeed = 2.8;
  const turnSpeed = 2.2;

  // Forward: pushing stick forward yields negative Y on most controllers -> invert
  const forward = -ly;
  const strafe = lx;

  // turn
  if (rx) S.player.rotation.y -= rx * turnSpeed * dt;

  if (forward || strafe) {
    const v = new THREE.Vector3(strafe, 0, -forward).multiplyScalar(moveSpeed * dt);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
    S.player.position.add(v);
  }
}

// -------------------- STABLE HUD (yaw-only) --------------------
function faceYawOnly(obj, camera, tilt = -0.10) {
  const dx = camera.position.x - obj.position.x;
  const dz = camera.position.z - obj.position.z;
  const yaw = Math.atan2(dx, dz);
  obj.rotation.set(tilt, yaw, 0);
}

// -------------------- WORLD LOADER --------------------
async function initWorld() {
  const mod = await safeImport("./world.js?v=" + Date.now(), { timeout: 8000, silent: false });
  if (!mod?.World?.init) {
    LOG("[index] world.js invalid -> fallback");
    return;
  }
  S.world = mod.World;

  const start = performance.now();
  let resolved = false;

  const p = Promise.resolve(
    S.world.init({
      THREE: S.THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      log: LOG,
      BUILD
    })
  ).then(() => {
    resolved = true;
    LOG(`[index] world init ✅ ${(performance.now() - start).toFixed(0)}ms`);
  }).catch((e) => {
    resolved = true;
    LOG("[index] world init FAIL ❌ " + (e?.message || e));
  });

  setTimeout(() => {
    if (!resolved) LOG("[index] WORLD INIT TIMEOUT ❌ (world init still running)");
  }, 6000);

  await p;

  // Grab HUD root if world exposed it
  S.hudRoot = S.scene.getObjectByName?.("ScarlettHUDRoot") || null;
}

// -------------------- LOOP --------------------
function startLoop() {
  S.renderer.setAnimationLoop(() => {
    const dt = Math.min(S.clock.getDelta(), 0.05);

    applyXRLocomotion(dt);

    // keep hud stable
    if (S.hudRoot) faceYawOnly(S.hudRoot, S.camera, -0.10);

    // world update
    try {
      S.world?.update?.({ dt, t: S.clock.elapsedTime });
    } catch (e) {
      LOG("[index] world.update crash ❌ " + (e?.message || e));
    }

    S.renderer.render(S.scene, S.camera);
  });
  LOG("[index] loop ✅");
}

// -------------------- BOOT --------------------
(async function boot() {
  try {
    initThree();
    initVRButtons();
    initControllers();

    // optional helpers (won't break)
    await safeImport("./vr_locomotion.js?v=" + Date.now());
    await safeImport("./xr_locomotion.js?v=" + Date.now());
    await safeImport("./touch_controls.js?v=" + Date.now());
    await safeImport("./android_controls.js?v=" + Date.now());

    await initWorld();
    startLoop();

    LOG("[index] ready ✅");
  } catch (e) {
    LOG("[index] FATAL ❌ " + (e?.message || e));
  }
})();
