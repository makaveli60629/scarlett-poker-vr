// /js/scarlett1/index.js
// SCARLETT1 — INDEX FULL (ENGINE ATTACH FIRST • NEVER FAIL PANEL)
// Build: SCARLETT1_INDEX_FULL_v24_1_ENGINE_ATTACH_FIRST

const BUILD = "SCARLETT1_INDEX_FULL_v24_1_ENGINE_ATTACH_FIRST";

const dwrite = (msg) => {
  try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {}
};

const log = (...a) => { console.log("[scarlett1]", ...a); dwrite(`[scarlett1] ${a.join(" ")}`); };
const warn = (...a) => { console.warn("[scarlett1]", ...a); dwrite(`[scarlett1][warn] ${a.join(" ")}`); };
const err  = (...a) => { console.error("[scarlett1]", ...a); dwrite(`[scarlett1][err] ${a.join(" ")}`); };

// Three.js (GH Pages safe)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

function nowISO() { return new Date().toISOString(); }

// ✅ Create & attach a minimal engine immediately (before WebGL / DOM work)
function attachEngineStubEarly() {
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;
  window.SCARLETT.time = nowISO();
  window.SCARLETT.engineAttached = true;     // ✅ panel check satisfied ASAP
  window.SCARLETT.indexAlive = true;         // extra breadcrumb
  window.SCARLETT.engine = window.SCARLETT.engine || { BUILD, startedAt: window.SCARLETT.time };
  dwrite(`[scarlett1] engine stub attached ✅ ${BUILD}`);
}

attachEngineStubEarly();

async function safeImportWorld(cacheTag = "") {
  const url = `./world.js${cacheTag ? `?v=${cacheTag}` : ""}`;
  try {
    const mod = await import(url);
    log("world import ✅", url);
    return mod;
  } catch (e) {
    err("world import FAILED ❌", url, e?.message || e);
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

  return { tableHeight: 0.80, table };
}

async function main() {
  log("booting…", BUILD);

  // Create scene/camera first (safe)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 0);

  // ✅ Update the already-attached engine object early
  const engine = window.SCARLETT.engine = Object.assign(window.SCARLETT.engine || {}, {
    BUILD,
    THREE,
    scene,
    camera,
    renderer: null,
    startedAt: window.SCARLETT.time || nowISO(),
    world: null,
    errors: []
  });

  // Now do the “fragile” stuff in a try/catch so engine stays attached even on failure
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // DOM attach
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(renderer.domElement);

    // VR button
    document.body.appendChild(VRButton.createButton(renderer));

    engine.renderer = renderer;
    log("renderer + VRButton ✅");
  } catch (e) {
    const msg = e?.message || String(e);
    engine.errors.push({ stage: "renderer", error: msg });
    err("renderer init failed ❌ (engine still attached)", msg);

    // Even if renderer failed, create a simple fallback render attempt is not possible.
    // But we keep engineAttached true so your panel can still operate.
    return;
  }

  // --- world import (SAFE) ---
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

  // --- render loop ---
  renderer.setAnimationLoop(() => {
    try { WORLD?.update?.(0); } catch (_) {}
    renderer.render(scene, camera);
  });

  // resize
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
  window.SCARLETT.engineAttached = true; // keep true no matter what
  window.SCARLETT.engine = window.SCARLETT.engine || { BUILD, errors: [] };
  window.SCARLETT.engine.errors.push({ stage: "fatal", error: msg });
  err("fatal boot error", msg);
});
