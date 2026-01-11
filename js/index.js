// /js/index.js — Scarlett VR Poker Boot (FULL, PATH-SAFE, CRASH-PROOF)
// ✅ Always visible: cube + floor + render loop (never blind)
// ✅ VRButton (Quest compatible)
// ✅ Imports ./world.js safely
// ✅ AUTO-DETECTS how HybridWorld should be called:
//    - HybridWorld(ctx) function
//    - HybridWorld.init(ctx)
//    - HybridWorld.start(ctx)
//    - HybridWorld.boot(ctx)
//    - or default export
// ✅ On success: removes testRoot so real world shows
// ✅ On failure: keeps cube + prints exact error

import * as THREE from "three";
window.THREE = THREE;

// ---------------- overlay logger (CRASH-PROOF) ----------------
const overlay = document.getElementById("overlay");
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }
function log(...a) {
  try {
    console.log(...a);
    if (!overlay) return;
    const s = a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
    overlay.textContent += (overlay.textContent ? "\n" : "") + s;
  } catch (err) {
    console.log("[log-failed]", err);
  }
}

// ---------------- global error taps ----------------
window.addEventListener("error", (e) => {
  log("❌ window.error:", e?.message || String(e));
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e?.reason;
  log("❌ unhandledrejection:", r?.message || String(r || e));
});

// ---------------- boot header ----------------
log("boot…");
log("BOOT index.js ✅");
log("href=" + location.href);
log("THREE version=" + THREE.REVISION);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + (!!navigator.xr));

// Build URLs relative to THIS file (/js/index.js)
const here = (rel) => new URL(rel, import.meta.url).toString();

// ---------------- create renderer ----------------
log("STARTING VISIBILITY TEST ⏬");

const app = document.getElementById("app") || document.body;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);
  log("renderer created ✅");
} catch (e) {
  log("FATAL: renderer failed:", e?.message || String(e));
  throw e;
}

// ---------------- test scene (always visible) ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101020);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 400);
camera.position.set(0, 1.6, 2);

// Keep a “testRoot” group so we can remove it when the real world starts.
const testRoot = new THREE.Group();
scene.add(testRoot);

// lights
testRoot.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
testRoot.add(dir);

// floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
testRoot.add(floor);

// cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff2d7a })
);
cube.position.set(0, 1.5, -2);
testRoot.add(cube);

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// loop
renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.004;
  renderer.render(scene, camera);
});
log("render loop running ✅");

// ---------------- VRButton ----------------
(async () => {
  try {
    const { VRButton } = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added ✅");
  } catch (e) {
    log("❌ VRButton failed:", e?.message || String(e));
  }
})();

// ---------------- safe import ----------------
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

// ---------------- start HybridWorld (AUTO-DETECT ADAPTER) ----------------
(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    // Resolve HybridWorld in all known shapes
    const HW = (worldMod?.HybridWorld ?? worldMod?.default ?? null);
    if (!HW) {
      log("❌ No HybridWorld export found (HybridWorld or default).");
      log("✅ Staying in cube test mode.");
      return;
    }

    // Build expected ctx (matches your historical init signatures)
    const BUILD = {
      stamp: Date.now(),
      mode: "hybrid",
      platform: navigator.userAgent,
    };

    const player = new THREE.Group();
    player.position.set(0, 0, 0);
    player.add(camera);
    scene.add(player);

    const controllers = { left: null, right: null, hands: [] };

    const ctx = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log,
      BUILD,
    };

    log("▶ HybridWorld detected type:", typeof HW);

    // ---- CALL STRATEGY ----
    if (typeof HW === "function") {
      log("▶ Calling HybridWorld(ctx) as function");
      const res = HW(ctx);
      if (res instanceof Promise) await res;

    } else if (typeof HW.init === "function") {
      log("▶ Calling HybridWorld.init(ctx)");
      const res = HW.init(ctx);
      if (res instanceof Promise) await res;

    } else if (typeof HW.start === "function") {
      log("▶ Calling HybridWorld.start(ctx)");
      const res = HW.start(ctx);
      if (res instanceof Promise) await res;

    } else if (typeof HW.boot === "function") {
      log("▶ Calling HybridWorld.boot(ctx)");
      const res = HW.boot(ctx);
      if (res instanceof Promise) await res;

    } else {
      log("❌ HybridWorld found but no callable entry point");
      log("HybridWorld keys:", Object.keys(HW));
      log("✅ Staying in cube test mode.");
      return;
    }

    // Success: remove test visuals
    scene.remove(testRoot);
    testRoot.clear();

    log("🌍 HybridWorld is now ACTIVE ✅");

  } catch (e) {
    log("❌ HybridWorld boot failed:");
    log(e?.message || String(e));
    log(e?.stack || "");
    log("✅ Staying in cube test mode.");
  }
})();
