// /js/main.js — Scarlett Poker VR — FULL (Quest-safe) v9.1
// Fixes:
// - Quest/OculusBrowser: session.inputSources is not a real Array -> no .map() crash
// - Prevent renderer.setSize while XR presenting
// - Defensive controller + hand-tracking setup
// - Keeps your existing world.js modular mounting

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

// ---------- small utilities ----------
function now(){ return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

function getInputSources(session){
  const out = [];
  const srcs = session?.inputSources;
  if (!srcs) return out;

  if (Array.isArray(srcs)) return srcs.slice();

  // Iterable (most modern browsers)
  try {
    if (typeof srcs[Symbol.iterator] === "function") {
      for (const s of srcs) out.push(s);
      return out;
    }
  } catch(e){ /* ignore */ }

  // Array-like fallback
  const len = (typeof srcs.length === "number") ? srcs.length : 0;
  for (let i = 0; i < len; i++) {
    const v = srcs[i] ?? (typeof srcs.item === "function" ? srcs.item(i) : undefined);
    if (v) out.push(v);
  }
  return out;
}

function safeMapInputSources(session, fn){
  const arr = getInputSources(session);
  const res = [];
  for (let i=0;i<arr.length;i++){
    try { res.push(fn(arr[i], i)); } catch(e){ /* ignore */ }
  }
  return res;
}

// ---------- HUD logger (optional but helps) ----------
function makeHudLogger(){
  const hud = document.getElementById("hudlog") || (() => {
    const el = document.createElement("div");
    el.id = "hudlog";
    el.style.cssText = `
      position:fixed; left:0; right:0; top:0; max-height:55%;
      overflow:auto; z-index:99999; padding:10px 12px;
      font:12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:#e8ecff; background:rgba(6,7,12,.72); backdrop-filter: blur(6px);
      border-bottom:1px solid rgba(255,255,255,.08);
      display:none;
    `;
    document.body.appendChild(el);
    return el;
  })();

  const api = {
    open(){ hud.style.display = "block"; },
    close(){ hud.style.display = "none"; },
    toggle(){ hud.style.display = (hud.style.display === "none" ? "block" : "none"); },
    log(...args){
      const line = document.createElement("div");
      line.textContent = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      hud.appendChild(line);
      hud.scrollTop = hud.scrollHeight;
      // also console
      console.log(...args);
    }
  };
  return api;
}

// ---------- boot ----------
const BOOT = window.__BOOT || (window.__BOOT = { v: Date.now() });
const log = makeHudLogger();

console.log(`[main] boot ✅ v=${BOOT.v}`);

window.addEventListener("error", (e) => {
  console.warn("❌ window.error:", e?.message || e);
  // auto-open hud when errors happen
  try { log.open(); log.log("❌ window.error:", e?.message || String(e)); } catch(_) {}
});

window.addEventListener("unhandledrejection", (e) => {
  console.warn("❌ unhandledrejection:", e?.reason || e);
  try { log.open(); log.log("❌ unhandledrejection:", String(e?.reason || e)); } catch(_) {}
});

// ---------- renderer / scene / camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / Math.max(1, window.innerHeight),
  0.05,
  200
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// VR Button
try {
  const btn = VRButton.createButton(renderer, {
    optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
  });
  document.body.appendChild(btn);
  console.log("[main] VRButton appended ✅");
} catch (e) {
  console.warn("[main] VRButton create failed:", e);
}

// ---------- resize (XR-safe) ----------
function onResize(){
  const w = window.innerWidth;
  const h = Math.max(1, window.innerHeight);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // IMPORTANT: do not resize while XR is presenting
  if (renderer?.xr?.isPresenting) return;

  renderer.setSize(w, h, false);
}
window.addEventListener("resize", onResize);

// ---------- controllers (safe) ----------
function buildControllers(){
  const controllers = {
    left: null,
    right: null,
    grips: [],
    pointers: [],
    hands: [],
    all: [],
  };

  // controller rays
  for (let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    c.userData.index = i;
    scene.add(c);
    controllers.pointers.push(c);
    controllers.all.push(c);

    const g = renderer.xr.getControllerGrip(i);
    g.userData.index = i;
    scene.add(g);
    controllers.grips.push(g);
    controllers.all.push(g);

    // hands
    const h = renderer.xr.getHand(i);
    h.userData.index = i;
    scene.add(h);
    controllers.hands.push(h);
    controllers.all.push(h);
  }

  // assign left/right when we learn handedness
  function refreshHandedness(session){
    const srcs = getInputSources(session);
    for (const s of srcs){
      if (!s) continue;
      const hand = s.handedness; // "left" | "right" | "none"
      const idx = s.targetRayMode ? s : s; // noop, keep stable
      // We can't directly map inputSource -> controller index in all runtimes,
      // but Oculus usually orders left/right reliably. We'll still keep a fallback:
    }
    controllers.left = controllers.pointers[0] || null;
    controllers.right = controllers.pointers[1] || null;
  }

  return { controllers, refreshHandedness };
}

const { controllers, refreshHandedness } = buildControllers();

// ---------- player rig ----------
const player = new THREE.Group();
player.name = "playerRig";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// ---------- XR session hooks ----------
renderer.xr.addEventListener("sessionstart", () => {
  const session = renderer.xr.getSession();
  console.log("[main] XR sessionstart ✅");

  // safe usage — never do session.inputSources.map(...)
  try {
    refreshHandedness(session);

    // Example: if you need to log input sources safely
    const info = safeMapInputSources(session, (s) => ({
      handedness: s?.handedness,
      targetRayMode: s?.targetRayMode,
      hasHand: !!s?.hand
    }));
    console.log("[main] inputSources:", info);
  } catch(e){
    console.warn("[main] sessionstart handler error:", e);
  }
});

renderer.xr.addEventListener("sessionend", () => {
  console.log("[main] XR sessionend ✅");
  // allow resize again after session ends
  onResize();
});

// ---------- init World ----------
let world = null;

(async function init(){
  try{
    world = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: (...a)=>console.log(...a),
      hud: log
    });
    console.log("[main] world init ✅");
  }catch(e){
    console.warn("[main] world init failed:", e);
    log.open();
    log.log("[main] world init failed:", String(e?.message || e));
  }

  console.log("[main] ready ✅");
})();

// ---------- main loop ----------
let lastT = now();
renderer.setAnimationLoop(() => {
  const t = now();
  const dt = Math.min(0.05, Math.max(0.0, (t - lastT) / 1000));
  lastT = t;

  // Keep handedness refreshed in a safe way (no map())
  const session = renderer.xr.getSession();
  if (session) {
    try { refreshHandedness(session); } catch(_) {}
  }

  // world update
  try {
    if (world?.tick) world.tick(dt);
  } catch(e){
    console.warn("[main] world.tick error:", e);
  }

  renderer.render(scene, camera);
});

// Optional: keyboard toggle HUD on desktop
window.addEventListener("keydown", (e) => {
  if (e.key === "`" || e.key === "~") log.toggle();
});
