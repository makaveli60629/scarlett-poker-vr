// ===============================
// Skylark Poker VR — js/main.js (RESILIENT BOOT)
// Exports: boot()
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { State, setRenderer, setScene, setCamera, setPlayerRig } from "./state.js";
import { Audio } from "./audio.js";

// Change this when you need to force refresh everywhere
const BUILD = "v63";

// ---------- helper: safe dynamic import ----------
async function safeImport(path) {
  try {
    // cache buster
    return await import(`${path}?${BUILD}`);
  } catch (e) {
    console.warn(`Module failed: ${path}`, e);
    return null;
  }
}

function makeStatusOverlay() {
  const el = document.getElementById("status");
  if (el) return el;

  const d = document.createElement("div");
  d.id = "status";
  d.style.position = "fixed";
  d.style.left = "12px";
  d.style.top = "12px";
  d.style.padding = "10px 12px";
  d.style.background = "rgba(0,0,0,0.55)";
  d.style.color = "#fff";
  d.style.fontFamily = "system-ui, sans-serif";
  d.style.fontSize = "14px";
  d.style.borderRadius = "10px";
  d.style.zIndex = "9999";
  d.innerHTML = `Skylark Poker VR<br>✅ HTML loaded<br>Status: BOOTING...`;
  document.body.appendChild(d);
  return d;
}

function statusText(text) {
  const s = makeStatusOverlay();
  s.innerHTML = `Skylark Poker VR<br>✅ HTML loaded<br>Status: ${text}`;
}

function addBasicLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(6, 10, 6);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.8, 40);
  fill.position.set(-6, 6, -6);
  scene.add(fill);
}

function addFloor(scene) {
  const g = new THREE.PlaneGeometry(60, 60);
  const m = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1.0 });
  const floor = new THREE.Mesh(g, m);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "floor";
  scene.add(floor);
  return floor;
}

function createRig(scene) {
  const rig = new THREE.Group();
  rig.name = "playerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.65, 3.5);
  rig.add(camera);

  scene.add(rig);
  return { rig, camera };
}

function setupRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  r.setPixelRatio(window.devicePixelRatio);
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = true;
  r.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(r.domElement);
  document.body.appendChild(VRButton.createButton(r));

  return r;
}

function onResize(renderer, camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// ---------- BOOT ----------
export async function boot() {
  statusText("BOOTING...");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  addBasicLights(scene);
  addFloor(scene);

  const renderer = setupRenderer();
  const { rig, camera } = createRig(scene);

  // register references
  setRenderer(renderer);
  setScene(scene);
  setCamera(camera);
  setPlayerRig(rig);

  // audio
  Audio.init(camera);

  window.addEventListener("resize", () => onResize(renderer, camera));

  // ---- Optional modules (won’t crash if missing) ----
  // If these exist and export correctly, they’ll run.
  const uiMod = await safeImport("./ui.js");
  const controlsMod = await safeImport("./controls.js");
  const interactionsMod = await safeImport("./interactions.js");
  const roomMod = await safeImport("./room_manager.js");
  const tableMod = await safeImport("./table.js");
  const chairMod = await safeImport("./chair.js");
  const botsMod = await safeImport("./bots.js");
  const bossBotsMod = await safeImport("./boss_bots.js");
  const leaderboardMod = await safeImport("./leaderboard.js");
  const teleportMod = await safeImport("./teleport_machine.js");
  const storeMod = await safeImport("./store.js");
  const tournamentMod = await safeImport("./tournament.js");

  try { uiMod?.UI?.init?.({ scene, renderer, camera, rig, State }); } catch (e) { console.warn(e); }
  try { controlsMod?.Controls?.init?.({ scene, renderer, camera, rig, State }); } catch (e) { console.warn(e); }
  try { interactionsMod?.Interactions?.init?.({ scene, renderer, camera, rig, State }); } catch (e) { console.warn(e); }

  // Build world content (if modules support it)
  try { roomMod?.RoomManager?.build?.(scene, rig); } catch (e) { console.warn(e); }
  try { tableMod?.Table?.build?.(scene); } catch (e) { console.warn(e); }
  try { chairMod?.Chair?.buildSet?.(scene, 0, 0); } catch (e) { console.warn(e); }

  try { teleportMod?.TeleportMachine?.build?.(scene, rig); } catch (e) { console.warn(e); }
  try { storeMod?.Store?.build?.(scene); } catch (e) { console.warn(e); }

  try { leaderboardMod?.Leaderboard?.build?.(scene); } catch (e) { console.warn(e); }
  try { tournamentMod?.Tournament?.init?.(scene); } catch (e) { console.warn(e); }

  try { botsMod?.Bots?.spawn?.(scene); } catch (e) { console.warn(e); }
  try { bossBotsMod?.BossBots?.spawn?.(scene); } catch (e) { console.warn(e); }

  statusText("OK ✅");

  // ---- Render loop ----
  renderer.setAnimationLoop(() => {
    try { controlsMod?.Controls?.update?.(renderer, scene, camera, rig); } catch {}
    try { interactionsMod?.Interactions?.update?.(); } catch {}
    try { uiMod?.UI?.update?.(); } catch {}
    try { leaderboardMod?.Leaderboard?.update?.(); } catch {}
    try { botsMod?.Bots?.update?.(); } catch {}
    try { bossBotsMod?.BossBots?.update?.(); } catch {}
    renderer.render(scene, camera);
  });

  // Optional: auto-play ambience if you have assets/audio/lobby_ambience.mp3
  // Audio.playUrl("assets/audio/lobby_ambience.mp3", { loop: true, volume: 0.25 });
}

// Auto-run boot when loaded
boot().catch((e) => {
  console.error(e);
  statusText("IMPORT FAILED ❌ (see console)");
});
