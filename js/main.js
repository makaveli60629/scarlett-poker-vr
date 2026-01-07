// /js/main.js — Scarlett Poker VR 1.0 (GitHub Safe + VRButton ALWAYS + ANDROID TOUCH STICKS)
// - VRButton always
// - HUB overlay
// - World build + spawn on lobby pad
// - Optional module safe-load (won't crash)
// - Android touch thumbsticks: LEFT = look, RIGHT = move
// - Ground clamp for bots/pills that fall under floor

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const overlay = document.getElementById("overlay");
const HUB = makeHub(overlay);

// ---------- Scene / Camera / Renderer ----------
HUB.line("Scarlett Poker VR — booting…");
HUB.line("--------------------------------");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 10, 90);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

// Color / tone so it doesn't go dark/black
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

document.body.appendChild(renderer.domElement);

// IMPORTANT for mobile touch
renderer.domElement.style.touchAction = "none";

// ALWAYS keep VR button
document.body.appendChild(VRButton.createButton(renderer));
HUB.ok("VRButton", "Ready");

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

// Default “dev” height (Android/non-XR)
camera.position.set(0, 1.80, 0);

// ---------- Build world ----------
let world = null;
try {
  // supports both build(scene, player) and build(scene)
  try {
    world = World.build(scene, player);
    HUB.ok("world.js", "Built (scene, player)");
  } catch {
    world = World.build(scene);
    HUB.ok("world.js", "Built (scene)");
  }
} catch (e) {
  HUB.fail("world.js", e);
  addFailsafeLight(scene);
  addFailsafeFloor(scene);
}

// ---------- Force spawn on lobby pad ----------
forceSpawnOnLobby(player, world);
HUB.ok("spawn", `Rig at ${fmtV3(player.position)}`);

// ---------- Touch Thumbsticks for Android (non-XR) ----------
const mobile = createMobileThumbsticks();
HUB.ok("Android Sticks", "LEFT=look, RIGHT=move");

// ---------- Optional modules (won’t crash if missing) ----------
await loadOptional("./vrcontroller.js", "vrcontroller.js", async (m) => {
  // If you have createVRRig, it will run only in XR
  if (m?.createVRRig) {
    scene.userData._vrRig = m.createVRRig(renderer, scene, camera, {
      heightLockM: 1.80,
      getWorld: () => world
    });
    return true;
  }
  return false;
});

await loadOptional("./controls.js", "controls.js", async (m) => {
  const C = m?.Controls || m;
  if (C?.init) {
    C.init({
      renderer,
      camera,
      player,
      colliders: world?.colliders || [],
      bounds: world?.bounds || null,
      pads: world?.pads || [],
      padById: world?.padById || {},
      floorY: world?.floorY ?? 0,
    });
    scene.userData._controls = C;
    return true;
  }
  return false;
});

await loadOptional("./ui.js", "ui.js", async (m) => {
  const UI = m?.UI || m;
  if (UI?.init) {
    UI.init(scene, camera);
    scene.userData._ui = UI;
    return true;
  }
  return false;
});

await loadOptional("./poker_simulation.js", "poker_simulation.js", async (m) => {
  const P = m?.PokerSimulation || m;
  if (P?.build) {
    P.build({});
    scene.userData._poker = P;
    return true;
  }
  return false;
});

await loadOptional("./bots.js", "bots.js", async (m) => {
  if (m?.init) {
    const api = m.init({ scene, world });
    if (api?.update) scene.userData._botsUpdate = api.update;
    return true;
  }
  return false;
});

await loadOptional("./interactions.js", "interactions.js", async (m) => {
  if (m?.init) {
    m.init({ scene, camera, world });
    return true;
  }
  return false;
});

await loadOptional("./store.js", "store.js", async (m) => {
  if (m?.init) {
    m.init({ scene, world });
    return true;
  }
  return false;
});

await loadOptional("./watch_ui.js", "watch_ui.js", async (m) => {
  if (m?.init) {
    m.init({ camera, scene });
    return true;
  }
  return false;
});

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Ground clamp (fix “pink pills under floor”) ----------
let clampScanT = 0;
let clampTargets = [];
function rescanClampTargets() {
  const arr = [];
  scene.traverse((o) => {
    if (!o) return;
    // Heuristic: pills/bots often named or tagged; we clamp them if they’re dynamic.
    const n = (o.name || "").toLowerCase();
    if (o.isObject3D && (o.userData?.isBot || o.userData?.bot || n.includes("bot") || n.includes("pill"))) {
      arr.push(o);
    }
  });
  clampTargets = arr;
}
rescanClampTargets();

// ---------- Animation loop ----------
const clock = new THREE.Clock();
HUB.line("");
HUB.line("✅ Ready — Enter VR (or use Android sticks)");

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // If you have external VR Controls (XR mode), update them
  if (scene.userData._controls?.update) {
    try { scene.userData._controls.update(dt); } catch {}
  }

  // XR rig update (laser/ring etc.)
  if (renderer.xr.isPresenting && scene.userData._vrRig?.update) {
    try { scene.userData._vrRig.update(dt); } catch {}
  }

  // Android/mobile movement when NOT in XR
  if (!renderer.xr.isPresenting) {
    applyMobileSticks(dt, mobile, player, camera, world);
  }

  // UI update
  if (scene.userData._ui?.update) {
    try { scene.userData._ui.update(dt); } catch {}
  }

  // bots update
  if (scene.userData._botsUpdate) {
    try { scene.userData._botsUpdate(dt); } catch {}
  }

  // clamp scan once per second (cheap safety)
  clampScanT -= dt;
  if (clampScanT <= 0) {
    clampScanT = 1.0;
    rescanClampTargets();
  }

  // ground clamp
  const floorY = world?.floorY ?? 0;
  const minY = floorY + 0.0015;
  for (const o of clampTargets) {
    if (!o?.position) continue;
    if (o.position.y < minY) o.position.y = minY;
  }

  renderer.render(scene, camera);
});

// ===================== Mobile Thumbsticks =====================

function createMobileThumbsticks() {
  // Full-screen UI layer
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "9999";
  document.body.appendChild(root);

  const mkStick = (side) => {
    const base = document.createElement("div");
    const nub = document.createElement("div");

    base.style.position = "fixed";
    base.style.bottom = "22px";
    base.style.width = "140px";
    base.style.height = "140px";
    base.style.borderRadius = "999px";
    base.style.background = "rgba(255,255,255,0.06)";
    base.style.border = "1px solid rgba(0,255,102,0.25)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";

    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "62px";
    nub.style.height = "62px";
    nub.style.borderRadius = "999px";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.background = "rgba(0,255,102,0.18)";
    nub.style.border = "1px solid rgba(0,255,102,0.35)";

    if (side === "left") base.style.left = "18px";
    else base.style.right = "18px";

    base.appendChild(nub);
    root.appendChild(base);

    const state = {
      active: false,
      id: null,
      ax: 0,
      ay: 0,
      cx: 0,
      cy: 0,
    };

    const radius = 54;

    const setNub = (x, y) => {
      nub.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
    };

    base.addEventListener("pointerdown", (e) => {
      state.active = true;
      state.id = e.pointerId;
      const r = base.getBoundingClientRect();
      state.cx = r.left + r.width / 2;
      state.cy = r.top + r.height / 2;
      base.setPointerCapture(e.pointerId);
    });

    base.addEventListener("pointermove", (e) => {
      if (!state.active || e.pointerId !== state.id) return;
      const dx = e.clientX - state.cx;
      const dy = e.clientY - state.cy;

      const len = Math.hypot(dx, dy);
      const cl = len > radius ? radius / len : 1;

      const nx = dx * cl;
      const ny = dy * cl;

      state.ax = nx / radius;
      state.ay = ny / radius;

      setNub(nx, ny);
    });

    const end = (e) => {
      if (e.pointerId !== state.id) return;
      state.active = false;
      state.id = null;
      state.ax = 0;
      state.ay = 0;
      setNub(0, 0);
    };

    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);

    return state;
  };

  const left = mkStick("left");
  const right = mkStick("right");

  return { left, right };
}

function applyMobileSticks(dt, mobile, player, camera, world) {
  // LEFT stick: look
  // RIGHT stick: move
  const lookX = mobile.left.ax;
  const lookY = mobile.left.ay;

  const moveX = mobile.right.ax;
  const moveY = mobile.right.ay;

  // sensitivity
  const yawSpeed = 2.25;   // radians/sec
  const pitchSpeed = 1.45;

  // invert Y so dragging up looks up
  player.rotation.y -= lookX * yawSpeed * dt;

  // pitch on camera local x
  camera.rotation.x -= lookY * pitchSpeed * dt;
  camera.rotation.x = clamp(camera.rotation.x, -1.05, 0.75);

  // lock “standing” dev height so you can see over table even while sitting
  camera.position.y = 1.80;

  // movement relative to player yaw
  const speed = 2.25;
  const dead = 0.08;

  const mx = Math.abs(moveX) < dead ? 0 : moveX;
  const my = Math.abs(moveY) < dead ? 0 : moveY;

  if (mx === 0 && my === 0) return;

  const yaw = player.rotation.y;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // player forward
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const move = new THREE.Vector3();
  // Right stick up = forward (negative Y on joystick)
  move.addScaledVector(forward, -my);
  move.addScaledVector(right, mx);
  move.normalize().multiplyScalar(speed * dt);

  player.position.add(move);

  // bounds clamp
  const b = world?.bounds;
  if (b) {
    player.position.x = THREE.MathUtils.clamp(player.position.x, b.min.x, b.max.x);
    player.position.z = THREE.MathUtils.clamp(player.position.z, b.min.z, b.max.z);
  }
}

// ===================== Other helpers =====================

function makeHub(overlayEl) {
  const lines = [];
  const push = (s) => {
    lines.push(String(s));
    if (overlayEl) overlayEl.textContent = lines.join("\n");
  };
  return {
    line: (t) => push(t),
    ok: (name, msg) => push(`✅ ${name}: ${msg || "ok"}`),
    skip: (name, msg) => push(`⏭️ ${name}: ${msg || "skipped"}`),
    fail: (name, e) => push(`❌ ${name}: ${errStr(e)}`),
  };
}

function errStr(e) {
  const s = String(e?.message || e || "error");
  return s.length > 180 ? s.slice(0, 180) + "…" : s;
}

async function safeImport(path) {
  try { return await import(path); } catch { return null; }
}

async function loadOptional(path, name, runner) {
  const m = await safeImport(path);
  if (!m) { HUB.skip(name, "Missing or not importable"); return; }
  try {
    const ok = await runner(m);
    if (ok) HUB.ok(name, "Loaded");
    else HUB.skip(name, "No supported exports");
  } catch (e) {
    HUB.fail(name, e);
  }
}

function forceSpawnOnLobby(player, world) {
  const lobby = world?.padById?.lobby?.position;
  const spawn = world?.spawn;
  const p = lobby || spawn || new THREE.Vector3(0, 0, 10);
  player.position.set(p.x, 0, p.z);
  player.rotation.set(0, 0, 0);
}

function fmtV3(v) {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

function addFailsafeLight(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 18, 8);
  scene.add(sun);
}

function addFailsafeFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0015;
  scene.add(floor);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
