// /js/index.js — Scarlett Boot Loader (PATH-SAFE)

import * as THREE from "three";

// Make diagnostics happy if you expect a global:
window.THREE = THREE;

const overlay = document.getElementById("overlay");
const log = (...a) => {
  console.log(...a);
  if (overlay) overlay.textContent += "\n" + a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
};

log("BOOT index.js ✅");
log("href=" + location.href);
log("THREE version=" + THREE.REVISION);

// Helper: always build URLs relative to THIS file (/js/index.js)
const here = (p) => new URL(p, import.meta.url).toString();

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

(async () => {
  // Import your world from the SAME /js folder
  // IMPORTANT: this expects world.js to be at /js/world.js exactly.
  const worldMod = await safeImport("./world.js");

  // If your project uses a different entry (main.js), switch to:
  // const mainMod = await safeImport("./main.js");

  // If you expect worldMod.World.init(...) etc, you can just log here for now:
  log("world module keys:", Object.keys(worldMod));

  // OPTIONAL: if your world expects to be started from here, do it.
  // But since you said "don't touch world", we stop at confirming it loads.
  log("✅ Loader finished. If you still see black, the next error will be shown here.");
})().catch((e) => {
  log("FATAL:", String(e?.message || e));
});
// ===== TEMP VISIBILITY TEST (DO NOT REMOVE YET) =====

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;

document.getElementById("app").appendChild(renderer.domElement);
log("renderer created ✅");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101020);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(0, 1.6, 2);

// light
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

// big visible cube (cannot miss it)
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff2d7a })
);
cube.position.set(0, 1.5, -2);
scene.add(cube);

// animation loop
renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});

log("render loop running ✅");

// VR Button (Quest-compatible)
import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js")
  .then(({ VRButton }) => {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added ✅");
  });
