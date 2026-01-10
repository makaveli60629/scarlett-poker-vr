// /js/main.js — Scarlett VR Poker (SAFE BOOT) v1.0 FULL
// Goal: never hard-crash on a single module export mismatch (Quest/GitHub Pages caching/404 HTML).

import { VRButton } from "./VRButton.js"; // keep your local VRButton
import * as THREE_NS from "./three.js";   // your wrapper that exports THREE namespace (per your setup)
import { World } from "./world.js";

const BOOT_VERSION = (typeof window !== "undefined" && window.__BOOT_V) ? window.__BOOT_V : Date.now();

function log(...args) { console.log(...args); }
function warn(...args) { console.warn(...args); }
function err(...args) { console.error(...args); }

async function safeImport(path, pickNamed = null) {
  try {
    const mod = await import(path);
    if (!pickNamed) return mod;
    return mod[pickNamed] || null;
  } catch (e) {
    err(`❌ import failed: ${path}`, e);
    return null;
  }
}

function makeRenderer() {
  const renderer = new THREE_NS.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function makeScene() {
  const scene = new THREE_NS.Scene();
  scene.background = new THREE_NS.Color(0x05060a);
  return scene;
}

function makeCamera() {
  const camera = new THREE_NS.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);
  return camera;
}

function makePlayerRig() {
  const rig = new THREE_NS.Group();
  rig.name = "PLAYER_RIG";
  rig.position.set(0, 0, 0);
  return rig;
}

function onResize(renderer, camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

async function boot() {
  // Diagnostics
  log(`BOOT v=${BOOT_VERSION}`);
  log(`href=${location.href}`);
  log(`ua=${navigator.userAgent}`);
  log(`navigator.xr=${!!navigator.xr}`);

  // Basic DOM safety
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";

  const THREE = THREE_NS;
  const scene = makeScene();
  const camera = makeCamera();
  const renderer = makeRenderer();
  const player = makePlayerRig();

  scene.add(player);
  player.add(camera);

  window.addEventListener("resize", () => onResize(renderer, camera));

  // VR Button
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("[main] VRButton appended ✅");
  } catch (e) {
    warn("[main] VRButton failed (non-fatal)", e);
  }

  // Your session init options (keep what you had)
  const sessionInit = {
    optionalFeatures: [
      "local-floor",
      "bounded-floor",
      "hand-tracking",
      "layers",
      "dom-overlay",
      "anchors",
      "plane-detection",
      "mesh-detection",
      "hit-test",
    ],
    domOverlay: { root: document.body },
  };
  // (World/main may read this)
  window.__SESSION_INIT__ = sessionInit;

  // Controllers container (your world may fill this)
  const controllers = { left: null, right: null, hands: [] };

  // Build a shared ctx object
  const ctx = {
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers,
    log,
    BUILD: "gh-pages",
    sessionInit,
  };

  // ---- SAFE MODULE LOADS ----
  // SpawnPoints: DO NOT hard-fail if export mismatch
  const SpawnPoints = await safeImport("./spawn_points.js", "SpawnPoints");
  if (SpawnPoints) log("[main] ✅ SpawnPoints imported");
  else warn("[main] ⚠️ SpawnPoints missing (game will still run)");

  // Controls / Teleport etc: load if available
  const Controls = await safeImport("./controls.js", "Controls");
  if (Controls) log("[main] ✅ Controls imported");
  else warn("[main] ⚠️ Controls missing");

  // Init World (your World does the heavy lifting)
  // IMPORTANT: world.spawns created early so SpawnPoints.build can register
  let world = null;
  try {
    world = await World.init(ctx);
    world ||= {};
    world.spawns ||= {};
    ctx.world = world;
    log("[main] world init ✅");
  } catch (e) {
    err("[main] ❌ world init failed", e);
    // Still keep rendering something so you can see errors in-VR
    world = { spawns: {} };
    ctx.world = world;
  }

  // Build spawn pads AFTER world exists
  try {
    if (SpawnPoints?.build) {
      SpawnPoints.build({ THREE, scene, world, log });
    }
  } catch (e) {
    warn("[main] ⚠️ SpawnPoints.build failed (non-fatal)", e);
  }

  // Init controls if present
  try {
    if (Controls?.init) {
      Controls.init({ ...ctx, world });
      log("[main] controllers ready ✅");
    }
  } catch (e) {
    warn("[main] ⚠️ Controls.init failed (non-fatal)", e);
  }

  // Render loop
  renderer.setAnimationLoop(() => {
    try {
      // Optional: world.update()
      if (world?.update) world.update();
      renderer.render(scene, camera);
    } catch (e) {
      err("[main] render loop error", e);
    }
  });

  log(`[main] ready ✅ v=${BOOT_VERSION}`);
}

boot().catch((e) => err("BOOT FATAL", e));
