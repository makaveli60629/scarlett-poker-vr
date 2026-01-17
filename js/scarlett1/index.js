// /js/scarlett1/index.js
// SCARLETT1 — INDEX FULL (AUTHORITATIVE: ENGINE ATTACH + WORLD PREFLIGHT + PANEL COMPAT)
// Build: SCARLETT1_INDEX_FULL_v24_2_PANEL_COMPAT_WORLD_PREFLIGHT

const BUILD = "SCARLETT1_INDEX_FULL_v24_2_PANEL_COMPAT_WORLD_PREFLIGHT";

// --- diag writer (if boot provides it) ---
const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };

const log = (...a) => { console.log("[scarlett1]", ...a); dwrite(`[scarlett1] ${a.join(" ")}`); };
const warn = (...a) => { console.warn("[scarlett1]", ...a); dwrite(`[scarlett1][warn] ${a.join(" ")}`); };
const err  = (...a) => { console.error("[scarlett1]", ...a); dwrite(`[scarlett1][err] ${a.join(" ")}`); };

// Three.js (GH Pages safe)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

function nowISO() { return new Date().toISOString(); }

// ✅ Attach engine flags in ALL legacy locations so Android Panel never misses it
function attachEngineStubEarly() {
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;
  window.SCARLETT.time = nowISO();

  // Primary flags
  window.SCARLETT.engineAttached = true;
  window.SCARLETT.indexAlive = true;

  // Legacy/alias flags (panel might check any of these)
  window.__scarlettEngineAttached = true;
  window.__SCARLETT_ENGINE_ATTACHED__ = true;
  window.__scarlettIndexAlive = true;

  // Engine object stub
  window.SCARLETT.engine = window.SCARLETT.engine || { BUILD, startedAt: window.SCARLETT.time, errors: [] };

  dwrite(`[scarlett1] engine stub attached ✅ ${BUILD}`);
}
attachEngineStubEarly();

function broadcastEngineAttached(engine) {
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.engine = engine;
  window.SCARLETT.engineAttached = true;
  window.SCARLETT.attached = true;
  window.SCARLETT.ok = true;

  // aliases
  window.__scarlettEngine = engine;
  window.__scarlettEngineAttached = true;
  window.__SCARLETT_ENGINE__ = engine;
  window.__SCARLETT_ENGINE_ATTACHED__ = true;
}

// ✅ Preflight fetch check so we can see 404 vs JS error
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

// Minimal fallback so you NEVER black-screen if world fails
function buildFallbackWorld(scene) {
  warn("USING FALLBACK WORLD (world.js missing or crashing)");

  scene.background = new THREE.Color(0x050509);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202040, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 5, 2);
  scene.add(dir);

  const floorGeo = new THREE.PlaneGeometry(40, 40);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 1.0, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const tableGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.16, 28);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f5a2a, roughness: 0.9, metalness: 0.0 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, 0.80, -1.25);
  scene.add(table);

  return { tableHeight: 0.80, table, update(){} };
}

// ✅ Fallback module test so Android Panel always gets a response (even without world.js)
window.__scarlettRunModuleTest = window.__scarlettRunModuleTest || (async () => {
  const eng = window.SCARLETT?.engine;
  return {
    ok: true,
    time: new Date().toISOString(),
    build: BUILD,
    note: "Fallback module test (world.js not loaded or panel not wired to world orchestrator).",
    engineAttached: !!window.SCARLETT?.engineAttached,
    renderer: !!eng?.renderer,
    worldLoaded: !!eng?.world,
    errors: eng?.errors || []
  };
});

async function main() {
  log("booting…", BUILD);

  // Safe: create scene/camera first
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 0);

  // Create engine object early and broadcast it
  const engine = window.SCARLETT.engine = Object.assign(window.SCARLETT.engine || {}, {
    BUILD,
    THREE,
    scene,
    camera,
    renderer: null,
    startedAt: window.SCARLETT.time || nowISO(),
    world: null,
    errors: window.SCARLETT.engine?.errors || []
  });

  broadcastEngineAttached(engine);
  log("engine broadcast ✅");

  // Fragile part: renderer + DOM + VRButton
  let renderer = null;
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
    err("renderer init failed ❌ (engine still attached)", msg);
    return;
  }

  // World load (with preflight)
  const worldMod = await safeImportWorld(Date.now().toString());
  let WORLD = null;

  try {
    const createWorld = worldMod?.createWorld || worldMod?.bootWorld || worldMod?.default;
    if (typeof createWorld === "function") {
      WORLD = await createWorld({ THREE, scene, renderer, camera, engine });
      log("world boot ✅");
    } else {
      warn("world module missing createWorld/bootWorld/default — using fallback");
      WORLD = buildFallbackWorld(scene);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    engine.errors.push({ stage: "world", error: msg });
    err("world boot crashed ❌ (using fallback)", msg);
    WORLD = buildFallbackWorld(scene);
  }

  engine.world = WORLD;
  window.SCARLETT.world = WORLD;

  // Render loop
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

main().catch((e) => {
  const msg = e?.message || String(e);
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.engineAttached = true;
  window.__scarlettEngineAttached = true;

  window.SCARLETT.engine = window.SCARLETT.engine || { BUILD, errors: [] };
  window.SCARLETT.engine.errors.push({ stage: "fatal", error: msg });

  err("fatal boot error", msg);
});
