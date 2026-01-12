// /js/index.js — Scarlett Poker VR (FULL, crash-proof)
// Fixes: "THREE wrapper missing constructor: Clock" + restores ENTER buttons.

import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

// ---------- LOG PANEL ----------
const LOG = (...a) => {
  console.log(...a);
  const el = document.getElementById("log");
  if (!el) return;
  const line = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  el.textContent += line + "\n";
  el.scrollTop = el.scrollHeight;
};
const BAD = (...a) => LOG("❌", ...a);
const OK  = (...a) => LOG("✅", ...a);

// ---------- SAFE THREE LOADER ----------
// Your project uses a "three wrapper" in some builds.
// We support either: window.THREE, or ESM import from ./three.module.js if you have it.
async function getTHREE() {
  if (window.THREE) return window.THREE;

  // If you have a local module, uncomment one of these and ensure file exists:
  // const mod = await import("./three.module.js");
  // return mod;

  // If you have a wrapper file that exports THREE object:
  // const wrap = await import("./three_wrap.js");
  // return wrap.THREE || wrap.default || wrap;

  return null;
}

// ---------- CLOCK POLYFILL (THE FIX) ----------
function ensureClock(THREE) {
  if (!THREE) return;
  if (THREE.Clock) return;

  class ClockPolyfill {
    constructor(autoStart = true) {
      this.autoStart = autoStart;
      this.startTime = 0;
      this.oldTime = 0;
      this.elapsedTime = 0;
      this.running = false;
      if (autoStart) this.start();
    }
    start() {
      this.startTime = performance.now();
      this.oldTime = this.startTime;
      this.elapsedTime = 0;
      this.running = true;
    }
    getDelta() {
      if (!this.running) {
        if (this.autoStart) this.start();
        return 0;
      }
      const newTime = performance.now();
      const diff = (newTime - this.oldTime) / 1000;
      this.oldTime = newTime;
      this.elapsedTime += diff;
      return diff;
    }
    getElapsedTime() {
      this.getDelta();
      return this.elapsedTime;
    }
  }

  THREE.Clock = ClockPolyfill;
  OK("[index] Clock polyfilled ✅");
}

// ---------- UI (ENTER / ENTER VR) ----------
function ensureOverlayUI() {
  let hud = document.getElementById("hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    hud.style.cssText = `
      position:fixed; left:0; top:0; right:0;
      display:flex; gap:10px; padding:12px;
      align-items:center; justify-content:center;
      z-index:9999; pointer-events:none;
      font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;
    `;
    document.body.appendChild(hud);
  }

  const mkBtn = (id, text) => {
    let b = document.getElementById(id);
    if (!b) {
      b = document.createElement("button");
      b.id = id;
      b.textContent = text;
      b.style.cssText = `
        pointer-events:auto;
        padding:12px 14px; border-radius:14px;
        border:1px solid rgba(127,231,255,.55);
        background:rgba(10,12,18,.75);
        color:#e8ecff; font-weight:800;
        box-shadow:0 10px 30px rgba(0,0,0,.45);
      `;
      hud.appendChild(b);
    }
    return b;
  };

  const enter2D = mkBtn("enter2d", "ENTER");
  const rebuild = mkBtn("rebuild", "REBUILD");
  return { enter2D, rebuild };
}

// ---------- INPUT (ANDROID DUAL STICK BASIC) ----------
function installMobileLookMove({ camera, player, log }) {
  // Minimal: swipe to look + two-finger drag to move
  const state = { dragging: false, two: false, lx: 0, ly: 0, yaw: 0, pitch: 0 };
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  const onTouchStart = (e) => {
    state.dragging = true;
    state.two = e.touches.length >= 2;
    state.lx = e.touches[0].clientX;
    state.ly = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (!state.dragging) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - state.lx;
    const dy = y - state.ly;
    state.lx = x; state.ly = y;

    if (!state.two) {
      state.yaw   -= dx * 0.0032;
      state.pitch -= dy * 0.0032;
      state.pitch = clamp(state.pitch, -1.2, 1.2);
      player.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;
    } else {
      // two finger = move forward/back + strafe
      const fwd = -dy * 0.01;
      const str = dx * 0.01;
      const dir = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
      const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
      player.position.addScaledVector(dir, fwd);
      player.position.addScaledVector(right, str);
    }
  };
  const onTouchEnd = () => { state.dragging = false; state.two = false; };

  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });

  log?.("[index] android touch look/move ✅ (1 finger look, 2 finger move)");
}

// ---------- MAIN ----------
let THREE = null;
let renderer = null;
let scene = null;
let camera = null;
let player = null;
let controllers = [];
let clock = null;
let running = false;

async function boot() {
  LOG("[index] runtime start ✅");

  THREE = await getTHREE();
  if (!THREE) {
    BAD("[index] THREE not found. Ensure your boot.js sets window.THREE or add a module import in index.js.");
    return;
  }

  ensureClock(THREE);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // scene/camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.65, 6);

  // player rig
  player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 0);
  player.add(camera);
  scene.add(player);

  // basic controllers (safe even if none)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  player.add(c0); player.add(c1);
  controllers = [c0, c1];

  // UI
  const { enter2D, rebuild } = ensureOverlayUI();

  // VRButton (restores Enter VR)
  try {
    const vrBtn = VRButton.createButton(renderer);
    vrBtn.style.marginLeft = "10px";
    document.body.appendChild(vrBtn);
    OK("[index] VRButton appended ✅");
  } catch (e) {
    BAD("[index] VRButton failed:", e?.message || e);
  }

  // Android movement (so you can debug away from Quest)
  try { installMobileLookMove({ camera, player, log: LOG }); } catch {}

  // World init
  await buildWorld();

  // Buttons
  enter2D.onclick = () => {
    running = true;
    enter2D.textContent = "IN WORLD ✅";
    OK("[index] ENTER 2D ✅");
  };

  rebuild.onclick = async () => {
    OK("[index] REBUILD requested…");
    await buildWorld(true);
  };

  // resize
  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // clock + loop
  clock = new THREE.Clock(true);
  running = true;

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    if (running) {
      try {
        World?.update?.({ THREE, scene, renderer, camera, player, controllers, log: LOG }, dt);
      } catch (e) {
        BAD("[index] World.update crashed:", e?.message || e);
      }
    }
    renderer.render(scene, camera);
  });

  OK("[index] ready ✅");
}

async function buildWorld(clear = false) {
  try {
    if (clear && scene) {
      // remove everything except player rig
      const keep = new Set([player]);
      const toRemove = [];
      scene.children.forEach(ch => { if (!keep.has(ch)) toRemove.push(ch); });
      toRemove.forEach(ch => scene.remove(ch));
      OK("[index] scene cleared ✅");
    }

    await World.init({ THREE, scene, renderer, camera, player, controllers, log: LOG });
    OK("[index] world init ✅");
  } catch (e) {
    BAD("[index] world init FAILED:", e?.message || e);
  }
}

boot().catch(e => BAD("[index] boot FAILED:", e?.message || e));
