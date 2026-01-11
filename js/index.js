// /js/index.js — MASTER SAFE Loader v2 (supports init/build/start/create)
// Fixes: HybridWorld exists but lacks .init()

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

// VR Button
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

// controllers placeholder compatible with your project
const controllers = { left: null, right: null, lasers: [] };

async function loadWorldExport() {
  setMode("importing world");
  L("[index] importing ./world.js …");

  const mod = await import("./world.js");
  const keys = Object.keys(mod);
  L("[index] world.js exports: " + (keys.length ? keys.join(", ") : "(none)"), keys.length ? "ok" : "warn");

  const obj =
    mod.World ||
    mod.HybridWorld ||
    mod.WorldSystem ||
    mod.Hybrid ||
    mod.default ||
    null;

  if (!obj) throw new Error("world.js exports no usable World/HybridWorld/default.");

  return obj;
}

function pickWorldEntrypoint(obj) {
  // Most common names across your versions:
  const fn =
    (typeof obj.init === "function" && { name: "init", fn: obj.init.bind(obj) }) ||
    (typeof obj.build === "function" && { name: "build", fn: obj.build.bind(obj) }) ||
    (typeof obj.start === "function" && { name: "start", fn: obj.start.bind(obj) }) ||
    (typeof obj.create === "function" && { name: "create", fn: obj.create.bind(obj) }) ||
    null;

  return fn;
}

(async () => {
  try {
    setMode("loading world");
    const WorldLike = await loadWorldExport();

    // Tell us what methods exist (so we can standardize later)
    const methods = Object.keys(WorldLike).filter(k => typeof WorldLike[k] === "function");
    L("[index] world methods: " + (methods.length ? methods.join(", ") : "(none)"), methods.length ? "ok" : "warn");

    const entry = pickWorldEntrypoint(WorldLike);
    if (!entry) {
      throw new Error("World export has no init/build/start/create function.");
    }

    L(`[index] calling world.${entry.name}() …`);

    // Unified context object (your worlds vary)
    const ctx = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: console.log,
      BUILD: Date.now()
    };

    // Call the entry function
    const result = await entry.fn(ctx);

    // Some worlds return an object; some mutate scene directly; both are fine.
    if (result && typeof result === "object") {
      L("[index] world entry returned object ✅", "ok");
    }

    L("[index] world start ✅", "ok");
    setMode("ready");
  } catch (e) {
    L("[index] world start FAIL ❌", "bad");
    L(String(e?.stack || e), "muted");
    setMode("world fail");
  }
})();

// render loop keeps UI alive even if world fails
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  clock.getDelta();
  renderer.render(scene, camera);
});

L("[index] animation loop running ✅", "ok");
