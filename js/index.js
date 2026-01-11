// /js/index.js — Scarlett VR Poker Boot (FULL, PATH-SAFE)
// ✅ Confirms Three loads
// ✅ Creates renderer + visible scene (spinning cube) so black screen is impossible
// ✅ Adds VRButton (Quest compatible)
// ✅ Imports ./world.js and shows module keys
// ✅ Optional: call HybridWorld.init(...) once you’re ready

import * as THREE from "three";

// Make diagnostics happy if you ever check window.THREE
window.THREE = THREE;

// ---------- overlay logger ----------
const overlay = document.getElementById("overlay");
function log(...a) {
  console.log(...a);
  if (!overlay) return;
  const s = a
    .map((x) => (typeof x === "string" ? x : safeJson(x)))
    .join(" ");
  overlay.textContent += (overlay.textContent ? "\n" : "") + s;
}
function safeJson(x) {
  try { return JSON.stringify(x); } catch { return String(x); }
}

// ---------- boot header ----------
log("boot…");
log("BOOT index.js ✅");
log("href=" + location.href);
log("THREE version=" + THREE.REVISION);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + (!!navigator.xr));

// Build URLs relative to THIS file (/js/index.js) so GitHub Pages project path is always correct.
const here = (rel) => new URL(rel, import.meta.url).toString();

// ---------- hard fail helpers ----------
window.addEventListener("error", (e) => {
  log("❌ window.error:", e?.message || e);
});
window.addEventListener("unhandledrejection", (e) => {
  log("❌ unhandledrejection:", e?.reason?.message || String(e?.reason || e));
});

// ---------- create renderer + visible test scene ----------
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101020);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  200
);
camera.position.set(0, 1.6, 2);

// lights (can’t miss)
scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
scene.add(dir);

// floor reference
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// big obvious cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff2d7a })
);
cube.position.set(0, 1.5, -2);
scene.add(cube);

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// animation loop
renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.004;
  renderer.render(scene, camera);
});

log("render loop running ✅");

// ---------- add VRButton (Quest compatible) ----------
(async () => {
  try {
    const { VRButton } = await import(
      "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js"
    );
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added ✅");
  } catch (e) {
    log("❌ VRButton failed:", e?.message || String(e));
  }
})();

// ---------- import your world (but DO NOT run it unless enabled) ----------
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

const START_HYBRID_WORLD = false; // <-- flip to true when you want to actually run HybridWorld

(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    if (START_HYBRID_WORLD) {
      const HybridWorld = worldMod.HybridWorld || worldMod.World || worldMod.default;
      if (!HybridWorld) {
        log("❌ No HybridWorld export found.");
        return;
      }

      log("Starting HybridWorld.init…");
      // Best-effort context. Your HybridWorld may accept different args.
      // If your world expects a different signature, we’ll match it once we see the init() error (if any).
      const ctx = {
        THREE,
        scene,
        renderer,
        camera,
        player: new THREE.Group(),
        controllers: { left: null, right: null, hands: [] },
        log,
        BUILD: { stamp: Date.now() },
      };
      scene.add(ctx.player);

      // Call init if present; otherwise just note it.
      if (typeof HybridWorld.init === "function") {
        await HybridWorld.init(ctx);
        log("HybridWorld.init ✅");
      } else {
        log("❌ HybridWorld.init is not a function");
      }
    }

    log("✅ Loader finished. If you still see black, the next error will be shown here.");
  } catch (e) {
    log("FATAL:", e?.message || String(e));
  }
})();
