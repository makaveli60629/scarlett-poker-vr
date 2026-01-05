// js/main.js
// Skylark Poker VR - FULL RESTORE BOOT (GitHub Pages safe)
// IMPORTANT: Uses CDN Three.js (no "import three" errors).

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { XrLocomotion } from "./xr_locomotion.js";
import { WatchUI } from "./watch_ui.js";
import { TeleportMachine } from "./teleport_machine.js";
import { PokerTable } from "./table.js";
import { Bots } from "./bots.js";
import { Poker } from "./poker.js";
import { Leaderboard } from "./leaderboard.js";
import { Notify } from "./notify.js";
import { AudioSys } from "./audio.js";
import { State } from "./state.js";

// ---------- Small helpers ----------
function $(id) { return document.getElementById(id); }
function safeText(el, t) { if (el) el.textContent = t; }

function ensureStatusUI() {
  // If your index.html already has these, we reuse them.
  // If not, we create a minimal overlay that never blocks VR.
  let hud = $("hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    hud.style.cssText = `
      position:fixed; left:12px; top:12px; z-index:9999;
      background:rgba(0,0,0,.55); color:#fff; padding:10px 12px;
      border-radius:12px; font-family:system-ui,Segoe UI,Roboto,Arial;
      width:min(520px, calc(100vw - 24px)); pointer-events:none;
    `;
    const title = document.createElement("div");
    title.id = "hudTitle";
    title.style.fontWeight = "700";
    title.style.marginBottom = "6px";
    title.textContent = "Skylark Poker VR";
    const status = document.createElement("div");
    status.id = "hudStatus";
    status.textContent = "Status: booting…";
    const tip = document.createElement("div");
    tip.id = "hudTip";
    tip.style.opacity = "0.85";
    tip.style.marginTop = "8px";
    tip.style.fontSize = "12px";
    tip.textContent = "Tip: If you still see old behavior, open incognito or clear site data.";
    hud.appendChild(title);
    hud.appendChild(status);
    hud.appendChild(tip);
    document.body.appendChild(hud);
  }
  return {
    status: $("hudStatus"),
    tip: $("hudTip"),
  };
}

async function boot() {
  const ui = ensureStatusUI();
  safeText(ui.status, "Status: loading main.js…");

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  // VR button (top-right, never overlaps mobile controls)
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "12px";
  vrBtn.style.top = "12px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Camera & Player Rig ---
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 0);

  const playerRig = new THREE.Group();     // moves with locomotion
  playerRig.name = "PlayerRig";

  const head = new THREE.Group();          // anchor for camera
  head.name = "Head";
  head.add(camera);

  playerRig.add(head);
  scene.add(playerRig);

  // --- Global state ---
  const state = new State();
  State.instance = state;

  // --- Systems ---
  const notify = new Notify(scene, playerRig);
  const audio = new AudioSys();
  const watch = new WatchUI(scene, playerRig, notify, audio, (roomName) => world.setRoom(roomName));
  const locomotion = new XrLocomotion(renderer, scene, playerRig, camera, notify);
  const world = new World(scene, playerRig, notify);

  // Build rooms & environment
  safeText(ui.status, "Status: building world…");
  world.buildAllRooms();
  world.setRoom("lobby"); // default spawn

  // Teleport machines (pads)
  const teleport = new TeleportMachine(scene, world, notify);
  teleport.buildPads();

  // Poker Table + Bots + Poker loop
  const table = new PokerTable(scene, world, notify);
  table.build();

  const bots = new Bots(scene, world, table, notify);
  bots.spawnAll(); // seated bots + 2 walkers

  const poker = new Poker(table, bots, notify);
  poker.startAutoplay(); // keeps dealing hands so you can observe

  // Leaderboard (safe placement; NOT in face)
  const leaderboard = new Leaderboard(scene, world);
  leaderboard.build();
  leaderboard.setPlayers(bots.getLeaderboardData());

  // Wire world hooks
  world.onRoomChanged = (roomName) => {
    // Update UI + safe spawns per room
    notify.toast(`Entered: ${roomName.toUpperCase()}`, 1200);
    locomotion.forceRigToSpawn(world.getSpawn(roomName));
    teleport.onRoomChanged(roomName);
  };

  // Input bindings
  locomotion.setTeleportTargets(() => world.getTeleportSurfaces());
  locomotion.setActionTargets(() => world.getActionTargets());
  watch.bindXR(renderer);

  // HTML buttons (if your index has Reset/Audio/Menu)
  window.__SKYLARK = { renderer, scene, playerRig, camera, world, locomotion, watch, notify, audio, table, bots, poker, leaderboard };

  const resetBtn = $("resetBtn");
  const audioBtn = $("audioBtn");
  const menuBtn  = $("menuBtn");

  if (resetBtn) resetBtn.onclick = () => locomotion.forceRigToSpawn(world.getSpawn(world.currentRoom));
  if (audioBtn) audioBtn.onclick = () => audio.toggle();
  if (menuBtn)  menuBtn.onclick  = () => watch.toggle();

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  safeText(ui.status, "Status: running ✅ (VR button should appear)");
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);

    world.update(dt);
    locomotion.update(dt);
    teleport.update(dt);
    bots.update(dt);
    poker.update(dt);
    watch.update(dt);
    leaderboard.update(dt);

    renderer.render(scene, camera);
  });
}

boot().catch((err) => {
  console.error(err);
  const ui = ensureStatusUI();
  safeText(ui.status, "Status: ERROR ❌ (check console)");
  if (ui.tip) ui.tip.textContent = String(err?.stack || err);
});
