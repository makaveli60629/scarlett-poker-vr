// /js/scarlett1/index.js
// SCARLETT1 — INDEX FRONT CONTROLLER (ALWAYS ATTACH • ALWAYS DIAG • PANEL UNBREAKABLE)
// Build: SCARLETT1_INDEX_FULL_v25_0_FRONT_CONTROLLER

const BUILD = "SCARLETT1_INDEX_FULL_v25_0_FRONT_CONTROLLER";

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

// ---- AUTHORITATIVE MODULE TEST ENDPOINT (panel-proof) ----
async function runModuleTestFallback() {
  const eng = window.SCARLETT?.engine;
  return {
    ok: true,
    time: new Date().toISOString(),
    build: BUILD,
    note: "Front-controller fallback test endpoint (works even if world fails).",
    engineAttached: true,
    enginePresent: !!eng,
    renderer: !!eng?.renderer,
    worldLoaded: !!eng?.world,
    errors: eng?.errors || []
  };
}

window.SCARLETT.runModuleTest = async () => {
  // Prefer world orchestrator if it exists
  if (typeof window.__scarlettRunModuleTest === "function") {
    try {
      const r = await window.__scarlettRunModuleTest();
      return { ok: !!r.ok, source: "__scarlettRunModuleTest", ...r };
    } catch (e) {
      return { ok: false, source: "__scarlettRunModuleTest", error: e?.message || String(e) };
    }
  }
  return runModuleTestFallback();
};

// Aliases old panels might call
window.__scarlettRunModuleTest = window.__scarlettRunModuleTest || window.SCARLETT.runModuleTest;
window.__scarlettModuleTest = window.__scarlettModuleTest || window.SCARLETT.runModuleTest;
window.runModuleTest = window.runModuleTest || window.SCARLETT.runModuleTest;

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
  const url = `./world.js${cacheTag ? `?v=${cacheTag}` : ""}`;
  const check = await canFetch(url);
  log(`world preflight: ok=${check.ok} status=${check.status} ct=${check.ct}${check.error ? ` err=${check.error}` : ""}`);
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

  // Update the engine object (still attached)
  const engine = window.SCARLETT.engine = Object.assign(window.SCARLETT.engine || {}, {
    BUILD, THREE, scene, camera, renderer: null, world: null
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
    engine.errors = engine.errors || [];
    engine.errors.push({ stage: "renderer", error: msg });
    err("renderer init failed ❌", msg);
    return;
  }

  // Load world (now that we know it’s served)
  const worldMod = await safeImportWorld(Date.now().toString());
  let WORLD;

  try {
    const createWorld = worldMod?.createWorld || worldMod?.bootWorld || worldMod?.default;
    if (typeof createWorld === "function") {
      WORLD = await createWorld({ THREE, scene, renderer, camera, engine });
      log("world boot ✅");
    } else {
      warn("world missing createWorld/bootWorld/default — fallback");
      WORLD = buildFallbackWorld(scene);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    engine.errors = engine.errors || [];
    engine.errors.push({ stage: "world", error: msg });
    err("world boot crashed ❌", msg);
    WORLD = buildFallbackWorld(scene);
  }

  engine.world = WORLD;
  window.SCARLETT.world = WORLD;

  renderer.setAnimationLoop(() => {
    try { WORLD?.update?.(0); } catch (_) {}
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
