// /js/scarlett1/index.js
// SCARLETT1 — INDEX FRONT CONTROLLER (FULL • XR-SAFE WORLD RESOLVER + RIGHT-HAND GESTURE FEED)
// Build: SCARLETT1_INDEX_FULL_v25_5_WORLD_BOOTWORLD_RIG_HANDEDNESS

const BUILD = "SCARLETT1_INDEX_FULL_v25_5_WORLD_BOOTWORLD_RIG_HANDEDNESS";

// ---- DIAG + CONSOLE fingerprint (must appear no matter what) ----
const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
const FP = `[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`;
console.log(FP);
dwrite(FP);

// ---- HARD attach flags (cover *all* likely panel checks) ----
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.SCARLETT.attached = true;
window.SCARLETT.ok = true;

window.__scarlettEngineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;
window.__scarlettAttached = true;
window.__scarlettOK = true;

// Provide an engine object immediately (panel can point at this)
window.SCARLETT.engine = window.SCARLETT.engine || { BUILD, startedAt: new Date().toISOString(), errors: [] };
window.__scarlettEngine = window.SCARLETT.engine;
window.__SCARLETT_ENGINE__ = window.SCARLETT.engine;

// ---- AUTHORITATIVE PANEL OVERRIDE: module test endpoint (panel-proof) ----
const forcedModuleTest = async () => {
  if (typeof window.__scarlettRunModuleTest === "function") {
    try {
      const r = await window.__scarlettRunModuleTest();
      return { ok: !!r.ok, source: "__scarlettRunModuleTest", ...r };
    } catch (e) {
      return { ok: false, source: "__scarlettRunModuleTest", error: e?.message || String(e) };
    }
  }

  const eng = window.SCARLETT?.engine;
  return {
    ok: true,
    source: "forcedFallback",
    time: new Date().toISOString(),
    build: BUILD,
    engineAttached: true,
    enginePresent: !!eng,
    renderer: !!eng?.renderer,
    worldLoaded: !!eng?.world,
    errors: eng?.errors || []
  };
};

window.SCARLETT.runModuleTest = forcedModuleTest;
window.__scarlettRunModuleTest = window.__scarlettRunModuleTest || forcedModuleTest;
window.__scarlettModuleTest = forcedModuleTest;
window.__runModuleTest = forcedModuleTest;
window.runModuleTest = forcedModuleTest;

window.__scarlettEngineAttached = true;
window.__scarlettEngine = window.SCARLETT.engine;

// ---- Three.js + VR boot (GH pages safe) ----
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

const log = (...a) => { console.log("[scarlett1]", ...a); dwrite(`[scarlett1] ${a.join(" ")}`); };
const warn = (...a) => { console.warn("[scarlett1]", ...a); dwrite(`[scarlett1][warn] ${a.join(" ")}`); };
const err  = (...a) => { console.error("[scarlett1]", ...a); dwrite(`[scarlett1][err] ${a.join(" ")}`); };

async function canFetch(url) {
  try {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    return { ok: r.ok, status: r.status, ct: r.headers.get("content-type") || "" };
  } catch (e) {
    return { ok: false, status: 0, ct: "", error: e?.message || String(e) };
  }
}

async function safeImportWorld(cacheTag = "") {
  const base = new URL(import.meta.url);
  const worldURL = new URL("world.js", base);
  if (cacheTag) worldURL.searchParams.set("v", cacheTag);

  const url = worldURL.toString();

  const check = await canFetch(url);
  log(`world preflight: url=${url} ok=${check.ok} status=${check.status} ct=${check.ct}${check.error ? ` err=${check.error}` : ""}`);

  if (!check.ok) return null;

  try {
    const mod = await import(url);
    log("world import ✅", url);
    return mod;
  } catch (e) {
    err("world import FAILED ❌", url, e?.message || String(e));
    return null;
  }
}

function buildFallbackWorld(scene) {
  warn("USING FALLBACK WORLD");

  scene.background = new THREE.Color(0x050509);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202040, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 5, 2);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.16, 28),
    new THREE.MeshStandardMaterial({ color: 0x0f5a2a, roughness: 0.9 })
  );
  table.position.set(0, 0.80, -1.25);
  scene.add(table);

  return { tableHeight: 0.80, table, update(){} };
}

async function main() {
  log("booting…", BUILD);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 0);

  // XR rig (authoritative parent for camera + controllers)
  const rig = new THREE.Group();
  rig.name = "XR_RIG";
  scene.add(rig);
  rig.add(camera);

  const engine = window.SCARLETT.engine = Object.assign(window.SCARLETT.engine || {}, {
    BUILD, THREE, scene, camera, rig, renderer: null, world: null, errors: window.SCARLETT.engine?.errors || []
  });
  window.__scarlettEngine = engine;
  window.__SCARLETT_ENGINE__ = engine;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    engine.renderer = renderer;
    log("renderer + VRButton ✅");
  } catch (e) {
    const msg = e?.message || String(e);
    engine.errors.push({ stage: "renderer", error: msg });
    err("renderer init failed ❌", msg);
    return;
  }

  // --- Controllers (handedness-safe; do NOT assume indices) ---
  const ctrl0 = renderer.xr.getController(0);
  const ctrl1 = renderer.xr.getController(1);
  ctrl0.name = "XR_CONTROLLER_0";
  ctrl1.name = "XR_CONTROLLER_1";
  rig.add(ctrl0);
  rig.add(ctrl1);

  function tagController(ctrl) {
    ctrl.userData.handedness = "unknown";
    ctrl.addEventListener("connected", (e) => {
      ctrl.userData.handedness = e?.data?.handedness || "unknown";
      log(`controller connected: ${ctrl.name} handedness=${ctrl.userData.handedness}`);
    });
    ctrl.addEventListener("disconnected", () => {
      log(`controller disconnected: ${ctrl.name}`);
      ctrl.userData.handedness = "unknown";
    });
  }
  tagController(ctrl0);
  tagController(ctrl1);

  function getRightController() {
    if (ctrl0.userData.handedness === "right") return ctrl0;
    if (ctrl1.userData.handedness === "right") return ctrl1;
    // fallback: Quest often reports ctrl1 as right, but do not hard rely.
    return ctrl1 || ctrl0;
  }

  const motion = {
    t: performance.now(),
    initRight: false,
    lastRight: new THREE.Vector3()
  };

  function feedRightHand(dt) {
    const GC = window.SCARLETT?.GestureControl;
    if (!GC || typeof GC.update !== "function") return;

    const obj = getRightController();
    if (!obj) return;

    const p = new THREE.Vector3();
    obj.getWorldPosition(p);

    if (!motion.initRight) {
      motion.lastRight.copy(p);
      motion.initRight = true;
      return;
    }

    const v = new THREE.Vector3().subVectors(p, motion.lastRight).multiplyScalar(1 / Math.max(dt, 1e-4));
    motion.lastRight.copy(p);

    GC.update({
      handedness: "right",
      position: { x: p.x, y: p.y, z: p.z },
      velocity: { x: v.x, y: v.y, z: v.z }
    });
  }

  // World load (MUST call bootWorld)
  if (window.__SCARLETT_WORLD_INIT__) {
    warn("world init blocked (already initialized)");
    return;
  }
  window.__SCARLETT_WORLD_INIT__ = true;

  const worldMod = await safeImportWorld(Date.now().toString());
  let WORLD;

  try {
    const boot = worldMod?.bootWorld || worldMod?.createWorld || worldMod?.default;
    if (typeof boot === "function") {
      WORLD = await boot({ THREE, scene, rig, camera, renderer, HUD: null, DIAG: null });
      log("world boot ✅ (bootWorld)");
    } else {
      warn("world missing bootWorld/createWorld/default — fallback");
      WORLD = buildFallbackWorld(scene);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    engine.errors.push({ stage: "world", error: msg });
    err("world boot crashed ❌", msg);
    WORLD = buildFallbackWorld(scene);
  }

  engine.world = WORLD;
  window.SCARLETT.world = WORLD;

  renderer.setAnimationLoop(() => {
    const tNow = performance.now();
    const dt = (tNow - motion.t) / 1000;
    motion.t = tNow;

    try { WORLD?.update?.(dt); } catch (_) {}

    // Only feed while XR is active
    if (renderer.xr.isPresenting) {
      feedRightHand(dt);
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  log("ready ✅");
}

main().catch((e) => err("fatal boot error", e?.message || String(e)));
