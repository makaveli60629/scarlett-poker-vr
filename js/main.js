// /js/main.js — Scarlett Poker VR — Quest-safe v9.2 (IMPORTMAP EDITION)
// Works with index.html importmap:
//  "three" -> CDN three.module.js
//  "three/addons/" -> CDN examples/jsm/
// Fixes:
// - Quest: session.inputSources.map crash (XRInputSourceArray not Array)
// - Prevent renderer.setSize while XR presenting
// - Robust controller setup + clean errors

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";

// ---------- utilities ----------
function now(){ return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

function getInputSources(session){
  const out = [];
  const srcs = session?.inputSources;
  if (!srcs) return out;

  if (Array.isArray(srcs)) return srcs.slice();

  // Iterable
  try {
    if (typeof srcs[Symbol.iterator] === "function") {
      for (const s of srcs) out.push(s);
      return out;
    }
  } catch {}

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
    try { res.push(fn(arr[i], i)); } catch {}
  }
  return res;
}

// ---------- boot ----------
const BOOT = window.__BOOT || (window.__BOOT = { v: Date.now() });
console.log(`[main] boot ✅ v=${BOOT.v}`);

// global error hooks
window.addEventListener("error", (e) => {
  console.warn("❌ window.error:", e?.message || e);
});
window.addEventListener("unhandledrejection", (e) => {
  console.warn("❌ unhandledrejection:", e?.reason || e);
});

// ---------- scene/camera/renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / Math.max(1, window.innerHeight),
  0.05,
  240
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// VR Button (use your index sessionInit if present)
try {
  const init = window.__XR_SESSION_INIT || { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] };
  const btn = VRButton.createButton(renderer, init);

  // Put in your slot if present
  const slot = document.getElementById("vrButtonSlot");
  if (slot) slot.appendChild(btn);
  else document.body.appendChild(btn);

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

  // IMPORTANT: don't resize while XR is presenting
  if (renderer?.xr?.isPresenting) return;

  renderer.setSize(w, h, false);
}
window.addEventListener("resize", onResize);

// ---------- player rig ----------
const player = new THREE.Group();
player.name = "playerRig";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// ---------- controllers ----------
function buildControllers(){
  const controllers = {
    pointers: [],
    grips: [],
    hands: [],
    all: [],
    left: null,
    right: null,
  };

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

    const h = renderer.xr.getHand(i);
    h.userData.index = i;
    scene.add(h);
    controllers.hands.push(h);
    controllers.all.push(h);
  }

  // Default assignment (most runtimes order is stable)
  controllers.left = controllers.pointers[0] || null;
  controllers.right = controllers.pointers[1] || null;

  function refresh(session){
    // If you later want exact mapping by handedness, do it here safely:
    // const srcs = getInputSources(session);
    // ...
  }

  return { controllers, refresh };
}

const { controllers, refresh } = buildControllers();

// ---------- XR session hooks ----------
renderer.xr.addEventListener("sessionstart", () => {
  const session = renderer.xr.getSession();
  console.log("[main] XR sessionstart ✅");
  try {
    refresh(session);
    const info = safeMapInputSources(session, (s) => ({
      handedness: s?.handedness,
      targetRayMode: s?.targetRayMode,
      hasHand: !!s?.hand
    }));
    console.log("[main] inputSources:", info);
  } catch (e) {
    console.warn("[main] sessionstart hook error:", e);
  }
});

renderer.xr.addEventListener("sessionend", () => {
  console.log("[main] XR sessionend ✅");
  onResize();
});

// ---------- init world ----------
let world = null;

(async function init(){
  try {
    world = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: (...a)=>console.log(...a),
      _v: window.__BUILD_V || Date.now()
    });
    console.log("[main] world init ✅");
  } catch (e) {
    console.warn("[main] world init failed:", e);
  }
  console.log("[main] ready ✅");
})();

// ---------- loop ----------
let lastT = now();
renderer.setAnimationLoop(() => {
  const t = now();
  const dt = Math.min(0.05, Math.max(0.0, (t - lastT) / 1000));
  lastT = t;

  const session = renderer.xr.getSession();
  if (session) { try { refresh(session); } catch {} }

  try { if (world?.tick) world.tick(dt); } catch (e) { console.warn("[main] tick error:", e); }

  renderer.render(scene, camera);
});

// Optional: respond to your HUD events (safe no-ops if world systems listen)
window.addEventListener("scarlett-enter-vr", async () => {
  try {
    const s = renderer.xr.getSession();
    if (!s && navigator.xr) {
      const init = window.__XR_SESSION_INIT || { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] };
      await navigator.xr.requestSession("immersive-vr", init).then(sess => renderer.xr.setSession(sess));
    }
  } catch(e){ console.warn("[main] enter-vr failed:", e); }
});
