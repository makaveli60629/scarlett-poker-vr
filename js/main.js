// /js/main.js — Scarlett Poker VR — Full Boot (GitHub + Oculus Safe)
// Everything-on, but crash-safe:
// - World (spawn/colliders/bounds)
// - Controls (move/snap/teleport) + visible controllers
// - UI (optional)
// - PokerSimulation (optional)
// - Lobby ambience audio (optional)
// - Bright fallback lighting so the room is never dark
//
// Requires these local files (recommended):
//   /js/world.js
//   /js/controls.js
// Optional (won't crash if missing):
//   /js/ui.js  (export const UI = { init(), update(), toggle()? })
//   /js/poker_simulation.js (export const PokerSimulation = { build() })
// Optional assets:
//   assets/audio/lobby_ambience.mp3

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

// ---------- Overlay logging ----------
const overlay = document.getElementById("overlay");
const set = (m) => { if (overlay) overlay.textContent = m; console.log(m); };
const log = (m) => { if (overlay) overlay.textContent += "\n" + m; console.log(m); };

window.addEventListener("error", (e) => log("❌ JS Error: " + (e.message || e)));
window.addEventListener("unhandledrejection", (e) =>
  log("❌ Promise: " + (e.reason?.message || e.reason || e))
);

set("Scarlett Poker VR — booting…");

// ---------- Optional module loader (never hard-fails) ----------
async function safeImport(path, exportName) {
  try {
    const mod = await import(path);
    return exportName ? mod?.[exportName] : mod;
  } catch (e) {
    log(`⚠️ Optional module missing: ${path}`);
    return null;
  }
}

const UI = await safeImport("./ui.js", "UI");
const PokerSimulation = await safeImport("./poker_simulation.js", "PokerSimulation");

// ---------- Core Three setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 2, 80);

const player = new THREE.Group();
scene.add(player);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
camera.position.set(0, 1.65, 3);
player.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- Bright fallback lighting (prevents “dark room”) ----------
function addFallbackLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(8, 14, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfe6ff, 0.55);
  fill.position.set(-9, 8, -7);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffd2a0, 1.25, 26);
  warm.position.set(0, 4.8, 0);
  scene.add(warm);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 9;
    const z = Math.sin(a) * 9;
    const p = new THREE.PointLight(0xffffff, 0.65, 28);
    p.position.set(x, 6.8, z);
    scene.add(p);
  }
}
addFallbackLighting();

// Always-visible baseline floor (even if World fails)
const baselineFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 1 })
);
baselineFloor.rotation.x = -Math.PI / 2;
baselineFloor.position.y = 0;
scene.add(baselineFloor);

// ---------- World build ----------
let colliders = [];
let bounds = null;

try {
  log("▶ World.build()…");
  const out = World?.build?.(scene, player) || {};
  colliders = Array.isArray(out.colliders) ? out.colliders : [];
  bounds = out.bounds || null;

  // Spawn + face forward
  if (out.spawn?.isVector3) player.position.copy(out.spawn);
  player.rotation.y = 0;

  log(`✅ World OK — colliders: ${colliders.length}`);
} catch (e) {
  log("⚠️ World build failed — staying with baseline floor: " + (e?.message || e));
}

// ---------- Controller visuals (so controllers are never “invisible”) ----------
function addControllerViz(ctrl, colorHex) {
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.10, 10),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.1 })
  );
  grip.rotation.x = Math.PI / 2;
  ctrl.add(grip);

  const ray = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]),
    new THREE.LineBasicMaterial({ color: colorHex })
  );
  ray.name = "ray";
  ray.visible = true;
  ctrl.add(ray);
}

const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
player.add(c0);
player.add(c1);
addControllerViz(c0, 0x2bd7ff);
addControllerViz(c1, 0xff2bd6);

// ---------- Controls init (movement/snap/teleport) ----------
try {
  log("▶ Controls.init()…");
  Controls?.init?.({
    renderer,
    camera,
    player,
    colliders,
    bounds,
    controllers: { c0, c1 },
  });
  log("✅ Controls OK");
} catch (e) {
  log("❌ Controls init failed: " + (e?.message || e));
}

// ---------- UI init (optional) ----------
try {
  if (UI?.init) {
    log("▶ UI.init()…");
    UI.init(scene, camera, { title: "Scarlett Poker VR" });

    // Desktop menu toggle
    window.addEventListener("keydown", (e) => {
      if ((e.key || "").toLowerCase() === "m") UI.toggle?.();
    });

    log("✅ UI OK");
  } else {
    log("ℹ️ UI not loaded (optional)");
  }
} catch (e) {
  log("⚠️ UI failed (optional): " + (e?.message || e));
}

// ---------- Poker simulation (optional) ----------
try {
  if (PokerSimulation?.build) {
    log("▶ PokerSimulation.build()…");
    // You can wire real bot arrays later; this just boots the module safely
    PokerSimulation.build({ players: [], bots: [] });
    log("✅ PokerSimulation OK");
  } else {
    log("ℹ️ PokerSimulation not loaded (optional)");
  }
} catch (e) {
  log("⚠️ PokerSimulation failed (optional): " + (e?.message || e));
}

// ---------- Audio hook (optional) ----------
let audioStarted = false;
async function tryStartAudio() {
  if (audioStarted) return;
  audioStarted = true;

  try {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();

    loader.load(
      "assets/audio/lobby_ambience.mp3",
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.35);
        sound.play();
        log("🔊 Lobby ambience playing");
      },
      undefined,
      () => log("ℹ️ No lobby audio found (assets/audio/lobby_ambience.mp3)")
    );
  } catch (e) {
    log("⚠️ Audio failed (optional): " + (e?.message || e));
  }
}

// On Quest, user gesture is needed; start when session begins or button pressed
renderer.xr.addEventListener("sessionstart", () => tryStartAudio());
window.addEventListener("pointerdown", () => tryStartAudio(), { once: true });

// ---------- Render loop ----------
const clock = new THREE.Clock();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

set("✅ Loaded — press Enter VR");

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  try { Controls?.update?.(dt); } catch {}
  try { UI?.update?.(dt, { left: c0, right: c1 }); } catch {}

  renderer.render(scene, camera);
});
