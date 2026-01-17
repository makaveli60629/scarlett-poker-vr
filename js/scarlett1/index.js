// /js/scarlett1/index.js
// SCARLETT1 — INDEX FULL (AUTHORITATIVE SAFE WORLD IMPORT + AUDIO MODULES)
// Build: SCARLETT1_INDEX_FULL_v23_0_AUDIO_SAFE_WORLD

const BUILD = "SCARLETT1_INDEX_FULL_v23_0_AUDIO_SAFE_WORLD";

const log = (...a) => console.log("[scarlett1]", ...a);
const warn = (...a) => console.warn("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

// Three.js (GH Pages safe)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

// Poker Audio + Gesture
import { PokerAudio } from "/js/modules/audioLogic.js";
import { GestureControl } from "/js/modules/gestureControl.js";

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
  floor.receiveShadow = false;
  scene.add(floor);

  const tableGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.16, 28);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f5a2a, roughness: 0.9, metalness: 0.0 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, 0.80, -1.25);
  scene.add(table);

  // simple marker ring
  const ringGeo = new THREE.TorusGeometry(0.7, 0.03, 10, 48);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xb59a3a, roughness: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.89, -1.25);
  scene.add(ring);

  return { tableHeight: 0.80, table };
}

// Audio unlock (Quest/Android requirement)
const unlockAudioOnce = async () => {
  try {
    await PokerAudio.init({ volume: 0.55 });
    await PokerAudio.unlock?.();
    log("audio unlocked ✅");
  } catch (e) {
    err("audio unlock failed", e);
  } finally {
    window.removeEventListener("pointerdown", unlockAudioOnce);
    window.removeEventListener("touchstart", unlockAudioOnce);
  }
};
window.addEventListener("pointerdown", unlockAudioOnce, { passive: true });
window.addEventListener("touchstart", unlockAudioOnce, { passive: true });

function installScarlettAPI() {
  window.SCARLETT = window.SCARLETT || {};

  // Simple sound triggers for UI / Android Panel
  window.SCARLETT.audioTest = async () => {
    await PokerAudio.init({ volume: 0.55 });
    PokerAudio.playCardSlide();
    setTimeout(() => PokerAudio.playChipSingle(), 120);
    setTimeout(() => PokerAudio.playTableKnock(), 240);
    setTimeout(() => PokerAudio.playPotVacuum({ duration: 1.2 }), 420);
    return { ok: true, build: BUILD, time: nowISO() };
  };

  // Hooks you can call from your poker game logic later
  window.SCARLETT.sfx = {
    card: () => PokerAudio.playCardSlide(),
    chip: () => PokerAudio.playChipSingle(),
    knock: () => PokerAudio.playTableKnock(),
    vacuum: () => GestureControl.triggerPotVacuum()
  };
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
  installScarlettAPI();

  // --- world import (SAFE) ---
  const worldMod = await safeImportWorld(Date.now().toString());
  let WORLD = null;

  if (worldMod && (worldMod.createWorld || worldMod.default)) {
    try {
      // support either named export createWorld or default export
      const createWorld = worldMod.createWorld || worldMod.default;
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

  // Set gesture table height from world
  GestureControl.tableHeight = WORLD?.tableHeight ?? 0.8;

  // --- render loop ---
  renderer.setAnimationLoop(() => {
    // If you have real handData later, feed it here:
    // GestureControl.update(handData);

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
