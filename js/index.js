// /js/index.js — Scarlett Poker VR (FULL, crash-proof)
// ✅ Fixes: THREE.Clock is not a constructor (wrapper-safe)
// ✅ Ensures: ENTER VR button shows (VRButton appended)
// ✅ Works: Android + Quest (controllers + basic locomotion)
// ✅ World: loads ./world.js safely (init/build fallback)
// ✅ Logs: to console + on-screen (#log) if present

import * as THREE_NS from "./three.js";
import { VRButton } from "./VRButton.js";

// ---------- LOG ----------
const $log = () => document.getElementById("log");
function logLine(...args) {
  const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(msg);
  const el = $log();
  if (el) {
    el.textContent += msg + "\n";
    el.scrollTop = el.scrollHeight;
  }
}
const ok = (s) => logLine(`%c${s}`, "color:#4cd964");
const warn = (s) => logLine(`%c${s}`, "color:#ffcc00");
const bad = (s) => logLine(`%c${s}`, "color:#ff6b6b");

// ---------- THREE NORMALIZATION (WRAPPER-SAFE) ----------
const THREE = (THREE_NS && (THREE_NS.default || THREE_NS)) || {};
const T = {
  Clock: THREE.Clock || THREE_NS.Clock || THREE_NS.default?.Clock,
  Scene: THREE.Scene || THREE_NS.Scene || THREE_NS.default?.Scene,
  Color: THREE.Color || THREE_NS.Color || THREE_NS.default?.Color,
  Group: THREE.Group || THREE_NS.Group || THREE_NS.default?.Group,
  Vector3: THREE.Vector3 || THREE_NS.Vector3 || THREE_NS.default?.Vector3,
  Quaternion: THREE.Quaternion || THREE_NS.Quaternion || THREE_NS.default?.Quaternion,
  Matrix4: THREE.Matrix4 || THREE_NS.Matrix4 || THREE_NS.default?.Matrix4,
  WebGLRenderer: THREE.WebGLRenderer || THREE_NS.WebGLRenderer || THREE_NS.default?.WebGLRenderer,
  PerspectiveCamera: THREE.PerspectiveCamera || THREE_NS.PerspectiveCamera || THREE_NS.default?.PerspectiveCamera,
  HemisphereLight: THREE.HemisphereLight || THREE_NS.HemisphereLight || THREE_NS.default?.HemisphereLight,
  DirectionalLight: THREE.DirectionalLight || THREE_NS.DirectionalLight || THREE_NS.default?.DirectionalLight,
  Raycaster: THREE.Raycaster || THREE_NS.Raycaster || THREE_NS.default?.Raycaster,
};

function assertCtor(name) {
  if (!T[name]) throw new Error(`THREE wrapper missing constructor: ${name}`);
}
["Clock", "Scene", "Color", "Group", "Vector3", "Quaternion", "Matrix4", "WebGLRenderer", "PerspectiveCamera", "Raycaster"].forEach(assertCtor);

// ---------- GLOBAL STATE ----------
const S = {
  THREE,
  T,
  base: (new URL(".", location.href)).pathname,
  scene: null,
  camera: null,
  renderer: null,
  player: null,
  clock: null,
  controllers: [],
  controllerGrips: [],
  tmpV: null,
  tmpQ: null,

  // locomotion
  moveSpeed: 2.2,      // m/s
  turnSpeed: 1.6,      // rad/s
  deadZone: 0.15,
  smooth: 0.18,        // smoothing factor
  vMove: { x: 0, z: 0 },
  vTurn: 0,

  // world hook
  world: null,
  tickers: [],
};

// ---------- HELPERS ----------
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function applyDeadZone(v, dz) {
  if (Math.abs(v) < dz) return 0;
  const sign = Math.sign(v);
  const x = (Math.abs(v) - dz) / (1 - dz);
  return sign * clamp(x, 0, 1);
}
function ensureCanvasFull() {
  const c = S.renderer.domElement;
  c.style.width = "100%";
  c.style.height = "100%";
  c.style.display = "block";
}

// ---------- XR CONTROLLERS ----------
function setupControllers() {
  const r = S.renderer;
  const sc = S.scene;

  // controller 0/1 (rays can be added by your existing controller modules if desired)
  for (let i = 0; i < 2; i++) {
    const c = r.xr.getController(i);
    c.userData.index = i;
    sc.add(c);
    S.controllers.push(c);
  }

  ok("[index] controllers ready ✅");
}

function getGamepad(i) {
  try {
    const c = S.controllers[i];
    const src = c?.userData?.inputSource;
    const gp = src?.gamepad;
    return gp || null;
  } catch {
    return null;
  }
}

// ---------- BASIC SMOOTH LOCOMOTION ----------
function updateLocomotion(dt) {
  // Prefer XR gamepads if in session
  const session = S.renderer.xr.getSession?.();
  let gpL = null, gpR = null;

  if (session) {
    // Map input sources into controller.userData.inputSource
    const sources = session.inputSources || [];
    for (const src of sources) {
      if (!src || !src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
  }

  // Left stick = move
  let mx = 0, mz = 0;
  if (gpL && gpL.axes && gpL.axes.length >= 2) {
    mx = applyDeadZone(gpL.axes[0], S.deadZone);
    mz = applyDeadZone(gpL.axes[1], S.deadZone);
  }

  // Right stick = turn (yaw)
  let tx = 0;
  if (gpR && gpR.axes && gpR.axes.length >= 2) {
    tx = applyDeadZone(gpR.axes[0], S.deadZone);
  }

  // IMPORTANT: Fix the "forward/back inverted" feel
  // Many XR sticks report forward as -1 on Y axis, so moveZ should be -mz
  const targetMoveX = mx;
  const targetMoveZ = -mz;
  const targetTurn = -tx;

  S.vMove.x = lerp(S.vMove.x, targetMoveX, S.smooth);
  S.vMove.z = lerp(S.vMove.z, targetMoveZ, S.smooth);
  S.vTurn = lerp(S.vTurn, targetTurn, S.smooth);

  // apply translation in camera-facing direction, but move the PLAYER RIG
  const cam = S.camera;
  const rig = S.player;

  // forward and right vectors from camera yaw only
  const fwd = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  fwd.y = 0; fwd.normalize();

  const right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  right.y = 0; right.normalize();

  const move = new T.Vector3();
  move.addScaledVector(right, S.vMove.x);
  move.addScaledVector(fwd, S.vMove.z);

  const len = move.length();
  if (len > 1) move.multiplyScalar(1 / len);

  rig.position.addScaledVector(move, S.moveSpeed * dt);

  // yaw rotate rig
  if (Math.abs(S.vTurn) > 0.001) {
    rig.rotation.y += S.vTurn * S.turnSpeed * dt;
  }
}

// ---------- WORLD LOADER ----------
async function loadWorld() {
  try {
    const mod = await import("./world.js");
    const World = mod.World || mod.default || mod;

    if (!World) {
      warn("[index] world.js loaded but no export found (World/default). Using empty world.");
      return null;
    }
    S.world = World;

    // Provide a build context that matches your existing architecture
    const ctx = {
      THREE: S.THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      log: logLine,
      BUILD: { base: S.base },
    };

    // init / build fallback
    if (typeof World.init === "function") {
      await World.init(ctx);
      ok("[index] world init ✅");
    } else if (typeof World.build === "function") {
      await World.build(ctx);
      ok("[index] world build ✅");
    } else {
      warn("[index] World export has no init/build. Loaded but not executed.");
    }

    // ticker hookup (optional)
    if (typeof World.update === "function") {
      S.tickers.push((dt) => World.update(ctx, dt));
    }

    return World;
  } catch (e) {
    bad(`[index] world load FAILED ❌ ${e?.message || e}`);
    console.error(e);
    return null;
  }
}

// ---------- INIT ----------
async function init() {
  logLine(`[index] runtime start ✅ base=${S.base}`);

  // Scene / Camera / Player Rig
  S.scene = new T.Scene();
  S.scene.background = new (T.Color)(0x05060a);

  S.camera = new T.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);

  // Player rig = move/rotate this (camera rides inside)
  S.player = new T.Group();
  S.player.name = "PlayerRig";
  S.player.position.set(0, 1.65, 0); // standing height default
  S.player.add(S.camera);
  S.scene.add(S.player);

  // Renderer
  S.renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  S.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.xr.enabled = true;
  ensureCanvasFull();
  document.body.appendChild(S.renderer.domElement);

  // Clock (FIXED: wrapper-safe)
  S.clock = new T.Clock();

  // Simple base lights (bright enough to not look black even if world lights fail)
  const hemi = new (T.HemisphereLight)(0xffffff, 0x202040, 1.15);
  hemi.position.set(0, 10, 0);
  S.scene.add(hemi);

  const dir = new (T.DirectionalLight)(0xffffff, 1.35);
  dir.position.set(6, 12, 4);
  dir.castShadow = false;
  S.scene.add(dir);

  ok("[index] renderer ready ✅");

  // VR Button
  try {
    const btn = VRButton.createButton(S.renderer);
    btn.style.position = "fixed";
    btn.style.left = "50%";
    btn.style.transform = "translateX(-50%)";
    btn.style.bottom = "18px";
    btn.style.zIndex = "9999";
    document.body.appendChild(btn);
    ok("[index] VRButton appended ✅");
  } catch (e) {
    bad(`[index] VRButton failed ❌ ${e?.message || e}`);
  }

  // XR controller wiring
  setupControllers();

  // Keep controller inputSource mapped (some browsers don’t fill controller.userData.inputSource automatically)
  S.renderer.xr.addEventListener("sessionstart", () => {
    const session = S.renderer.xr.getSession();
    ok("[index] XR session start ✅");

    // map input sources to controllers for convenience
    const syncSources = () => {
      const sources = session.inputSources || [];
      // attach by handedness
      for (const src of sources) {
        if (!src) continue;
        if (src.handedness === "left" && S.controllers[0]) S.controllers[0].userData.inputSource = src;
        if (src.handedness === "right" && S.controllers[1]) S.controllers[1].userData.inputSource = src;
      }
    };
    syncSources();
    session.addEventListener("inputsourceschange", syncSources);
  });

  // Load World
  await loadWorld();

  // Resize
  window.addEventListener("resize", () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  S.renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, S.clock.getDelta());

    // locomotion always (works in XR session)
    updateLocomotion(dt);

    // tickers
    for (const fn of S.tickers) {
      try { fn(dt); } catch (e) { console.warn(e); }
    }

    S.renderer.render(S.scene, S.camera);
  });
  ok("[index] ready ✅");
}

// ---------- BOOT ----------
init().catch((e) => {
  bad(`[index] init FAILED ❌ ${e?.message || e}`);
  console.error(e);
});
