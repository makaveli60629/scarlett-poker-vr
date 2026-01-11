// /js/index.js — MASTER SAFE Loader (JS folder)
// Fixes: "world.js does not provide an export named 'World'"

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

const L = window.ScarlettLog?.push || console.log;
const setMode = window.ScarlettLog?.setMode?.bind(window.ScarlettLog) || (() => {});

L("[index] runtime start ✅", "ok");
setMode("init");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));

L("[index] renderer/camera/rig ✅", "ok");

// VR button
try {
  const b = VRButton.createButton(renderer);
  document.getElementById("vrSlot")?.appendChild(b);
  L("[index] VRButton appended ✅", "ok");
} catch (e) {
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// placeholder controllers object expected by your world pipeline
const controllers = { left: null, right: null, lasers: [] };

async function resolveWorld() {
  setMode("importing world");
  L("[index] importing ./world.js …");

  const mod = await import("./world.js");
  const keys = Object.keys(mod);
  L("[index] world.js exports: " + (keys.length ? keys.join(", ") : "(none)"), keys.length ? "ok" : "warn");

  // Common names across your versions
  const candidate =
    mod.World ||
    mod.HybridWorld ||
    mod.WorldSystem ||
    mod.Hybrid ||
    mod.default ||
    null;

  if (!candidate) {
    throw new Error("world.js exports no World/HybridWorld/default. Fix export in /js/world.js.");
  }
  if (typeof candidate.init !== "function") {
    throw new Error("Loaded world export but missing .init(). Fix /js/world.js export object.");
  }
  return candidate;
}

(async () => {
  try {
    setMode("loading world");
    const WorldLike = await resolveWorld();

    L("[index] calling world.init() …");
    await WorldLike.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: console.log,
      BUILD: Date.now()
    });

    L("[index] world init ✅", "ok");
    setMode("ready");
  } catch (e) {
    L("[index] world init FAIL ❌", "bad");
    L(String(e?.stack || e), "muted");
    setMode("world fail");
  }
})();

// render loop keeps screen alive even if world fails
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  clock.getDelta();
  renderer.render(scene, camera);
});

L("[index] animation loop running ✅", "ok");
