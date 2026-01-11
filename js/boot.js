// /js/boot.js — Scarlett VR Poker BOOT (FORCED, CRASH-PROOF, NO GHOST FILES)
// ✅ Unique fingerprint every load
// ✅ Cube + floor always (never blind)
// ✅ VRButton
// ✅ Imports ./world.js
// ✅ Calls HybridWorld as FUNCTION FIRST (no .init)
// ✅ If HybridWorld returns/awaits ok -> removes cube testRoot

import * as THREE from "three";
window.THREE = THREE;

// ---------- UNIQUE FINGERPRINT (PROVES THIS FILE RUNS) ----------
const BOOT_SIG = "BOOT.JS ✅ " + Date.now() + " r" + Math.random().toString(16).slice(2);
console.log(BOOT_SIG);

// ---------- overlay logger (crash-proof) ----------
const overlay = document.getElementById("overlay");
const safeJson = (x) => { try { return JSON.stringify(x); } catch { return String(x); } };
function log(...a) {
  try {
    console.log(...a);
    if (!overlay) return;
    const s = a.map(v => (typeof v === "string" ? v : safeJson(v))).join(" ");
    overlay.textContent += (overlay.textContent ? "\n" : "") + s;
  } catch (e) {
    console.log("[overlay-log-failed]", e);
  }
}

// global error taps
window.addEventListener("error", (e) => log("❌ window.error:", e?.message || String(e)));
window.addEventListener("unhandledrejection", (e) => {
  const r = e?.reason;
  log("❌ unhandledrejection:", r?.message || String(r || e));
});

// ---------- boot header ----------
log("boot…");
log(BOOT_SIG);
log("href=" + location.href);
log("THREE=" + THREE.REVISION);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + (!!navigator.xr));

// Build URLs relative to THIS file (/js/boot.js)
const here = (rel) => new URL(rel, import.meta.url).toString();

// ---------- renderer ----------
log("STARTING VISIBILITY TEST ⏬");

const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);
log("renderer created ✅");

// ---------- test scene (always visible) ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101020);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 400);
camera.position.set(0, 1.6, 2);

const testRoot = new THREE.Group();
scene.add(testRoot);

testRoot.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
testRoot.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
testRoot.add(floor);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff2d7a })
);
cube.position.set(0, 1.5, -2);
testRoot.add(cube);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.004;
  renderer.render(scene, camera);
});
log("render loop running ✅");

// ---------- VRButton ----------
(async () => {
  try {
    const { VRButton } = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added ✅");
  } catch (e) {
    log("❌ VRButton failed:", e?.message || String(e));
  }
})();

// ---------- safe import ----------
async function safeImport(rel) {
  const url = here(rel);
  try {
    const mod = await import(url);
    log("import ok:", rel);
    return mod;
  } catch (e) {
    log("❌ import failed:", rel);
    log(String(e?.stack || e));
    throw e;
  }
}

// ---------- boot HybridWorld (NO .init, FUNCTION-FIRST) ----------
(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    // Prefer named export HybridWorld, else fall back to default
    const HW = worldMod?.HybridWorld ?? worldMod?.default;
    log("HybridWorld typeof:", typeof HW);

    const BUILD = {
      stamp: Date.now(),
      mode: "hybrid",
      platform: navigator.userAgent,
    };

    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);

    const controllers = { left: null, right: null, hands: [] };

    const ctx = { THREE, scene, renderer, camera, player, controllers, log, BUILD };

    // Call strategy:
    // 1) If function -> call directly (this matches your current reality)
    // 2) Else if object has init/start/boot -> call whichever exists
    log("▶ Attempting to start HybridWorld…");

    if (typeof HW === "function") {
      log("▶ Calling HybridWorld(ctx) as function");
      const res = HW(ctx);
      if (res instanceof Promise) await res;

    } else if (HW && typeof HW.init === "function") {
      log("▶ Calling HybridWorld.init(ctx)");
      const res = HW.init(ctx);
      if (res instanceof Promise) await res;

    } else if (HW && typeof HW.start === "function") {
      log("▶ Calling HybridWorld.start(ctx)");
      const res = HW.start(ctx);
      if (res instanceof Promise) await res;

    } else if (HW && typeof HW.boot === "function") {
      log("▶ Calling HybridWorld.boot(ctx)");
      const res = HW.boot(ctx);
      if (res instanceof Promise) await res;

    } else {
      log("❌ HybridWorld has no callable entrypoint");
      if (HW && typeof HW === "object") log("HybridWorld keys:", Object.keys(HW));
      log("✅ Staying in cube test mode.");
      return;
    }

    // success
    log("🌍 HybridWorld ACTIVE ✅");
    scene.remove(testRoot);
    testRoot.clear();
    log("✅ Test scene removed");

  } catch (e) {
    log("❌ HybridWorld boot failed:");
    log(e?.message || String(e));
    log(e?.stack || "");
    log("✅ Staying in cube test mode.");
  }
})();
