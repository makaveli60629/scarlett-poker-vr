// /js/index.js — Scarlett MASTER Runtime (FULL, crash-proof)
// - Uses /js/three.js wrapper (AUTHORITATIVE): exports { THREE, VRButton }
// - Diagnostics UI + Copy Log
// - VRButton + manual Enter VR fallback
// - Controller lasers + stick locomotion (forward/back fixed)
// - Safe imports w/ timeout; never hangs
// - Works on Quest + Android mobile

import { THREE, VRButton } from "./three.js";

const BUILD = `INDEX_FULL_${Date.now()}`;

// -------------------- DIAGNOSTICS CORE (TDZ-SAFE) --------------------
const LogBuf = [];
let ui = null;

function LOG(...a) {
  const s = a
    .map((x) => (typeof x === "string" ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })()))
    .join(" ");
  console.log(s);
  LogBuf.push(s);
  if (LogBuf.length > 1500) LogBuf.shift();
  if (ui && ui.log) {
    ui.log.textContent = LogBuf.slice(-260).join("\n");
    ui.log.scrollTop = ui.log.scrollHeight;
  }
}

function makeDiagUI() {
  const root = document.createElement("div");
  root.id = "diag";
  root.style.cssText = `
    position:fixed; left:10px; top:10px; width:min(560px, calc(100vw - 20px));
    background:rgba(10,12,18,.82); color:#dfe6ff; font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    border:1px solid rgba(140,170,255,.22); border-radius:14px; padding:12px;
    box-shadow:0 18px 50px rgba(0,0,0,.42); z-index:999999; backdrop-filter: blur(8px);
  `;

  const row = document.createElement("div");
  row.style.cssText = "display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;";

  const title = document.createElement("div");
  title.textContent = "Scarlett Poker VR — Diagnostics";
  title.style.cssText = "font-weight:700; letter-spacing:.2px; margin-right:auto; opacity:.95;";

  const btnCopy = document.createElement("button");
  btnCopy.textContent = "Copy Log";
  btnCopy.style.cssText = `
    background:rgba(127,231,255,.14); color:#cfefff; border:1px solid rgba(127,231,255,.35);
    padding:7px 10px; border-radius:10px; cursor:pointer;
  `;
  btnCopy.onclick = async () => {
    const txt = LogBuf.join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      LOG("[diag] log copied ✅");
    } catch (e) {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      LOG("[diag] log copied (fallback) ✅");
    }
  };

  const btnHide = document.createElement("button");
  btnHide.textContent = "Hide";
  btnHide.style.cssText = `
    background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.18);
    padding:7px 10px; border-radius:10px; cursor:pointer;
  `;
  btnHide.onclick = () => {
    const isHidden = pre.style.display === "none";
    pre.style.display = isHidden ? "block" : "none";
  };

  const btnEnter = document.createElement("button");
  btnEnter.textContent = "Enter VR (Manual)";
  btnEnter.style.cssText = `
    background:rgba(255,45,122,.16); color:#ffd1e2; border:1px solid rgba(255,45,122,.35);
    padding:7px 10px; border-radius:10px; cursor:pointer;
  `;

  const pre = document.createElement("pre");
  pre.style.cssText = `
    margin:0; max-height:38vh; overflow:auto; white-space:pre-wrap;
    border-radius:12px; padding:10px; background:rgba(0,0,0,.28);
    border:1px solid rgba(255,255,255,.08);
  `;

  row.appendChild(title);
  row.appendChild(btnCopy);
  row.appendChild(btnHide);
  row.appendChild(btnEnter);
  root.appendChild(row);
  root.appendChild(pre);
  document.body.appendChild(root);

  return { root, log: pre, btnEnter };
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

async function safeImport(path, { timeout = 2200, silent = true } = {}) {
  try {
    const mod = await withTimeout(import(path), timeout, path);
    LOG(`[import] ok: ${path}`);
    return mod;
  } catch (e) {
    if (!silent) LOG(`[import] FAIL: ${path} -> ${e?.message || e}`);
    else LOG(`[import] skip: ${path}`);
    return null;
  }
}

// -------------------- RENDERER / SCENE --------------------
const S = {
  THREE,
  renderer: null,
  scene: null,
  camera: null,
  clock: new THREE.Clock(),
  player: new THREE.Group(),
  rig: new THREE.Group(),
  controllers: [],
  controllerGrips: [],
  rays: [],
  raycaster: new THREE.Raycaster(),
  tmpM4: new THREE.Matrix4(),
  tmpV3: new THREE.Vector3(),
  tmpDir: new THREE.Vector3(),
  basePath: (()=>{
    // best effort base folder
    const p = location.pathname;
    const i = p.lastIndexOf("/js/");
    if (i >= 0) return p.slice(0, i + 1);
    // fallback to repo root detection
    const maybe = "/scarlett-poker-vr/";
    return p.includes(maybe) ? maybe : "/";
  })(),
  world: null,
  locomotion: null,
  touch: null,
};

function initThree() {
  const { THREE } = S;

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.xr.enabled = true;
  S.renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
  document.body.appendChild(S.renderer.domElement);

  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);

  S.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
  S.camera.position.set(0, 1.65, 3);

  // Rig: player root
  S.player.position.set(0, 0, 0);
  S.rig.add(S.camera);
  S.player.add(S.rig);
  S.scene.add(S.player);

  const hemi = new THREE.HemisphereLight(0x99aaff, 0x101018, 0.6);
  S.scene.add(hemi);

  window.addEventListener("resize", () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  LOG("[index] three init ✅");
}

// -------------------- VR BUTTON + MANUAL ENTER --------------------
function initVRButton() {
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

  // manual enter
  ui.btnEnter.onclick = async () => {
    try {
      if (!navigator.xr) return LOG("[vr] navigator.xr missing");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      LOG(`[vr] isSessionSupported=${ok}`);
      if (!ok) return;
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [
          "local-floor","bounded-floor","local","viewer",
          "hand-tracking","layers","dom-overlay","anchors","hit-test",
        ],
        domOverlay: { root: document.body }
      });
      S.renderer.xr.setSession(session);
      LOG("[vr] session started ✅");
    } catch (e) {
      LOG("[vr] manual enter FAIL ❌ " + (e?.message || e));
    }
  };
}

// -------------------- CONTROLLERS + LASERS --------------------
function makeLaser(color = 0x7fe7ff) {
  const { THREE } = S;
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "laser";
  line.scale.z = 10;
  return line;
}

function initControllers() {
  const { THREE } = S;

  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    const g = S.renderer.xr.getControllerGrip(i);

    c.addEventListener("connected", (ev) => {
      LOG(`[xr] controller${i} connected: ${ev.data?.gamepad ? "gamepad" : "no-gamepad"} ${ev.data?.hand ? "hand" : ""}`);
    });
    c.addEventListener("disconnected", () => LOG(`[xr] controller${i} disconnected`));

    const laser = makeLaser(i === 0 ? 0x7fe7ff : 0xff2d7a);
    c.add(laser);

    S.scene.add(c);
    S.scene.add(g);

    S.controllers.push(c);
    S.controllerGrips.push(g);
    S.rays.push(laser);
  }

  LOG("[index] controllers + lasers installed ✅");
}

// -------------------- LOCOMOTION (STICKS) --------------------
// Fixes your issue: forward/back reversed + right stick not rotating.
// We read BOTH sticks (left move, right turn). We also support fallback to modules if present.

function getGamepadsXR() {
  const s = S.renderer.xr.getSession?.();
  if (!s) return [];
  const src = s.inputSources || [];
  const gps = [];
  for (const it of src) if (it.gamepad) gps.push(it.gamepad);
  return gps;
}

function applyStickLocomotion(dt) {
  // move is on left stick (axes 2/3 on Quest controllers typically), turn on right stick.
  // But some browsers map to axes 0/1. We support both.
  const gps = getGamepadsXR();
  if (!gps.length) return;

  // pick primary pads
  const gpL = gps[0];
  const gpR = gps[1] || gps[0];

  const ax = (gp, i) => (gp && gp.axes && gp.axes.length > i ? gp.axes[i] : 0);

  // Try common mappings
  const lx = ax(gpL, 2) || ax(gpL, 0);
  const ly = ax(gpL, 3) || ax(gpL, 1);

  const rx = ax(gpR, 2) || ax(gpR, 0);
  const ry = ax(gpR, 3) || ax(gpR, 1);

  // deadzone
  const dz = 0.16;
  const dx = Math.abs(lx) > dz ? lx : 0;
  const dy = Math.abs(ly) > dz ? ly : 0;

  // Forward/back FIX: pushing forward is negative Y on most pads; we convert to forward-positive.
  const forward = -dy;
  const strafe = dx;

  // Turn on right stick X (or fallback)
  const turn = Math.abs(rx) > dz ? rx : 0;

  const speed = 2.0;           // meters/sec
  const turnSpeed = 1.55;      // rad/sec

  // yaw rotate rig
  if (turn) S.player.rotation.y -= turn * turnSpeed * dt;

  // move in facing direction
  if (forward || strafe) {
    const dir = new THREE.Vector3(strafe, 0, -forward); // local move space
    dir.normalize().multiplyScalar(speed * dt);

    // rotate into world by player yaw
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);

    S.player.position.add(dir);
  }
}

// -------------------- WORLD INIT --------------------
async function initWorld() {
  // Prefer your existing world.js if present. (It is.)
  const worldMod = await safeImport("./world.js?v=" + Date.now(), { timeout: 5000, silent: false });
  if (!worldMod || !worldMod.World) {
    LOG("[index] world.js missing or invalid — using fallback box world");
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0x1b1f2b, side: THREE.BackSide })
    );
    box.position.y = 5;
    S.scene.add(box);
    return;
  }

  S.world = worldMod.World;

  // Guard against hanging awaits: init must resolve fast.
  const start = performance.now();
  let resolved = false;

  const initPromise = S.world.init({
    THREE: S.THREE,
    scene: S.scene,
    renderer: S.renderer,
    camera: S.camera,
    player: S.player,
    controllers: S.controllers,
    log: LOG,
    BUILD
  }).then(() => {
    resolved = true;
    LOG(`[index] world init ✅ ${(performance.now() - start).toFixed(0)}ms`);
  }).catch((e) => {
    resolved = true;
    LOG("[index] world init FAIL ❌ " + (e?.message || e));
  });

  // timeout warning (does not cancel, just warns)
  setTimeout(() => {
    if (!resolved) {
      LOG("[index] WORLD INIT TIMEOUT ❌ seems still running (world.js has a hanging await or long import)");
    }
  }, 6000);

  await initPromise;
}

// -------------------- MAIN LOOP --------------------
function animate() {
  S.renderer.setAnimationLoop(() => {
    const dt = Math.min(S.clock.getDelta(), 0.05);

    // fallback locomotion always works
    applyStickLocomotion(dt);

    // world update if present
    try {
      S.world?.update?.({ dt, t: S.clock.elapsedTime, THREE: S.THREE, scene: S.scene, camera: S.camera, player: S.player, log: LOG });
    } catch (e) {
      LOG("[index] world.update crash ❌ " + (e?.message || e));
    }

    S.renderer.render(S.scene, S.camera);
  });
  LOG("[index] animation loop ✅");
}

// -------------------- BOOT --------------------
(async function boot() {
  try {
    initThree();
    initVRButton();
    initControllers();

    // optional: try your advanced locomotion module if it exists (does not break if missing)
    await safeImport("./vr_locomotion.js?v=" + Date.now());
    await safeImport("./xr_locomotion.js?v=" + Date.now());
    await safeImport("./touch_controls.js?v=" + Date.now());
    await safeImport("./android_controls.js?v=" + Date.now());

    await initWorld();
    animate();
    LOG("[index] ready ✅");
  } catch (e) {
    LOG("[index] FATAL ❌ " + (e?.message || e));
  }
})();
