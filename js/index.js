// /js/index.js — Scarlett VR Poker Boot (FULL, PATH-SAFE, CRASH-PROOF)
// ✅ Always visible: cube + floor + render loop (never blind)
// ✅ VRButton (Quest compatible)
// ✅ Imports ./world.js safely
// ✅ Calls HybridWorld(ctx) as a FUNCTION (NO .init anywhere)
// ✅ On success: removes testRoot so real world shows
// ✅ On failure: keeps cube + prints exact error/type/keys

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

// ---------------- start HybridWorld (FUNCTION EXPORT ONLY) ----------------
(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    const HybridWorld = worldMod?.HybridWorld;
    log("HybridWorld typeof:", typeof HybridWorld);

    if (typeof HybridWorld !== "function") {
      // Print whatever it is, so we can adapt instantly.
      if (HybridWorld && typeof HybridWorld === "object") {
        log("HybridWorld keys:", Object.keys(HybridWorld));
      }
      log("❌ HybridWorld is not a function — cannot call it yet.");
      log("✅ Staying in cube test mode.");
      return;
    }

    const BUILD = {
      stamp: Date.now(),
      mode: "hybrid",
      platform: navigator.userAgent,
    };

    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);

    const controllers = { left: null, right: null, hands: [] };

    log("▶ Calling HybridWorld(ctx)");

    const res = HybridWorld({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log,
      BUILD,
    });

    if (res instanceof Promise) await res;

    log("🌍 HybridWorld ACTIVE ✅");

    // remove cube test
    scene.remove(testRoot);
    testRoot.clear();

  } catch (e) {
    log("❌ HybridWorld failed:");
    log(e?.message || String(e));
    log(e?.stack || "");
    log("✅ Staying in cube test mode.");
  }
})();
