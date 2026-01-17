// /js/scarlett1/index.js
// SCARLETT1 — INDEX FULL (AUTHORITATIVE SAFE WORLD IMPORT)
// Build: SCARLETT1_INDEX_FULL_v24_0_WORLD_ORCH_MODULES

const BUILD = "SCARLETT1_INDEX_FULL_v24_0_WORLD_ORCH_MODULES";

const log = (...a) => console.log("[scarlett1]", ...a);
const warn = (...a) => console.warn("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

// Three.js (GH Pages safe)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

function nowISO() { return new Date().toISOString(); }

function attachEngineEarly(engine) {
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;
  window.SCARLETT.engine = engine;
  window.SCARLETT.engineAttached = true;
  window.SCARLETT.time = nowISO();
  log("engine attached ✅", BUILD);
}

async function safeImportWorld(cacheTag = "") {
  const url = `./world.js${cacheTag ? `?v=${cacheTag}` : ""}`;
  try {
    const mod = await import(url);
    log("world import ✅", url);
    return mod;
  } catch (e) {
    err("world import FAILED ❌", url, e);
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

  // --- renderer / scene / camera ---
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    200
  );
  camera.position.set(0, 1.6, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));

  // --- engine object for your panel / HUD ---
  const engine = {
    BUILD,
    THREE,
    scene,
    camera,
    renderer,
    startedAt: nowISO(),
    world: null
  };

  attachEngineEarly(engine);

  // --- world import (SAFE) ---
  const worldMod = await safeImportWorld(Date.now().toString());
  let WORLD = null;

  if (worldMod && (worldMod.createWorld || worldMod.bootWorld || worldMod.default)) {
    try {
      // Support: createWorld OR bootWorld OR default
      const createWorld = worldMod.createWorld || worldMod.bootWorld || worldMod.default;
      WORLD = await createWorld({ THREE, scene, renderer, camera, engine });
      log("world boot ✅", WORLD);
    } catch (e) {
      err("world boot crashed ❌ (using fallback)", e);
      WORLD = buildFallbackWorld(scene);
    }
  } else {
    WORLD = buildFallbackWorld(scene);
  }

  engine.world = WORLD;
  window.SCARLETT.world = WORLD;

  // --- render loop ---
  renderer.setAnimationLoop(() => {
    // World may expose update(dt) later; safe call if present
    try { WORLD?.update?.(0); } catch (_) {}
    renderer.render(scene, camera);
  });

  // --- resize ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  log("ready ✅");
}

main().catch((e) => err("fatal boot error", e));
