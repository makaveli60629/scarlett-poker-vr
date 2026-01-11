// /js/index.js — Scarlett VR Poker Boot (FULL, PATH-SAFE, CRASH-PROOF)

import * as THREE from "three";
window.THREE = THREE;

// ---------- overlay logger (CRASH-PROOF) ----------
const overlay = document.getElementById("overlay");
function log(...a) {
  try {
    console.log(...a);
    if (!overlay) return;
    const s = a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
    overlay.textContent += (overlay.textContent ? "\n" : "") + s;
  } catch (err) {
    // If overlay logging ever fails, we still keep console alive
    console.log("[log-failed]", err);
  }
}
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }

// ---------- global error taps ----------
window.addEventListener("error", (e) => {
  log("❌ window.error:", e?.message || String(e));
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e?.reason;
  log("❌ unhandledrejection:", r?.message || String(r || e));
});

// ---------- boot header ----------
log("boot…");
log("BOOT index.js ✅");
log("href=" + location.href);
log("THREE version=" + THREE.REVISION);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + (!!navigator.xr));

// Build URLs relative to THIS file (/js/index.js)
const here = (rel) => new URL(rel, import.meta.url).toString();

// ---------- VISIBILITY TEST ----------
log("STARTING VISIBILITY TEST ⏬");

const app = document.getElementById("app") || document.body;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  app.appendChild(renderer.domElement);
  log("renderer created ✅");
} catch (e) {
  log("FATAL: renderer failed:", e?.message || String(e));
  throw e;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101020);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200);
camera.position.set(0, 1.6, 2);

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
scene.add(dir);

// floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// cube
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

// loop
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

// ---------- import world (do not start yet) ----------
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

const START_HYBRID_WORLD = true;

(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));
    log("✅ Loader finished. Cube+VRButton should be visible now.");
  } catch (e) {
    log("FATAL:", e?.message || String(e));
  }
})();
