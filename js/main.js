// js/main.js — Patch 6.3 FULL (WIRING + COLLISION + SOLID WALLS + RESCUE)
//
// IMPORTANT:
// - This file assumes you added js/collision.js and js/solid_walls.js
// - It also assumes your existing files still exist: state.js, room_manager.js, teleport_machine.js, etc.
// - Boss-only poker simulation remains optional via safeImport.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera, setPlayerRig, setScene, updateZones } from "./state.js";
import { RoomManager } from "./room_manager.js";
import { TeleportMachine } from "./teleport_machine.js";

import { Controls } from "./controls.js";
import { Table } from "./table.js";
import { Chair } from "./chair.js";
import { Leaderboard } from "./leaderboard.js";

import { BossTable } from "./boss_table.js";
import { StoreKiosk } from "./store_kiosk.js";
import { EventChip } from "./chip.js";

import { LightsPack } from "./lights_pack.js";
import { FurniturePack } from "./furniture_pack.js";
import { WaterFountain } from "./water_fountain.js";

import { Collision } from "./collision.js";
import { SolidWalls } from "./solid_walls.js";

function overlay(msg) {
  let el = document.getElementById("dbg");
  if (!el) {
    el = document.createElement("div");
    el.id = "dbg";
    el.style.position = "fixed";
    el.style.left = "10px";
    el.style.top = "10px";
    el.style.maxWidth = "92vw";
    el.style.padding = "10px 12px";
    el.style.background = "rgba(0,0,0,0.70)";
    el.style.color = "#fff";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.fontSize = "14px";
    el.style.borderRadius = "12px";
    el.style.zIndex = "99999";
    el.style.whiteSpace = "pre-wrap";
    document.body.appendChild(el);
  }
  el.textContent = msg;
}

let _toastT = 0;
function toast(msg) {
  if (_toastT > 0) return;
  overlay(`Loaded ✅\n${msg}`);
  _toastT = 1.1;
}

async function safeImport(path) {
  try {
    return await import(`${path}?v=${Date.now()}`);
  } catch (e) {
    console.warn("Optional module failed:", path, e);
    overlay(`Loaded ✅ (optional module failed)\n${path}\n${String(e?.message || e)}`);
    return null;
  }
}

export async function boot() {
  overlay("Booting…");

  // Renderer / XR
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene / Camera / Rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  setScene(scene);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  const playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  setCamera(camera);
  setPlayerRig(playerRig);

  // World/rooms
  RoomManager.init(scene);

  // Patch 6.3: Solid perimeter walls (cannot walk through)
  SolidWalls.build(scene, { halfX: 14, halfZ: 14, height: 4.2, thickness: 0.35, y: 0 });

  // Lighting pack (prevents black screen)
  LightsPack.build(scene);

  // Main public poker area
  Table.build(scene, { x: 0, y: 0, z: 0 });
  Chair.buildSet(scene, { x: 0, z: 0 }, 6);

  // Boss area (spectator only + VIP rope)
  BossTable.build(scene);

  // Leaderboard
  Leaderboard.build(scene);

  // Store + chip
  StoreKiosk.build(scene, { x: -6.5, y: 0, z: 5.5 });
  EventChip.build(scene, { x: 6.5, y: 0, z: 5.5 });

  // Furniture + Fountain
  FurniturePack.build(scene);
  WaterFountain.build(scene, { x: 0, y: 0, z: 9.0 });

  // Teleport pads + spawn (authoritative spawn)
  TeleportMachine.init(scene, playerRig);
  const spawn = TeleportMachine.getSafeSpawn?.();
  if (spawn) {
    playerRig.position.copy(spawn.position);
    playerRig.rotation.y = spawn.rotationY || 0;
  } else {
    playerRig.position.set(0, 0, 7.5);
    playerRig.rotation.y = Math.PI;
  }

  // Collision system settings (VR comfort)
  Collision.setPlayerRadius(0.22);
  Collision.maxPushPerFrame = 0.34;
  Collision.rescueEnabled = true;

  // Controls
  Controls.init(renderer, camera, playerRig);

  // Optional BossBots
  const botMod = await safeImport("./boss_bots.js");
  const BossBots = botMod?.BossBots || null;
  try { BossBots?.init?.(scene, camera, { count: 5 }); } catch {}

  // Optional Poker Simulation
  let PokerSimulation = null;
  const simMod = await safeImport("./poker_simulation.js");
  PokerSimulation = simMod?.PokerSimulation || null;
  try { PokerSimulation?.init?.(scene, camera, BossBots, Leaderboard, (msg) => toast(msg)); } catch {}

  overlay("Loaded ✅\nPatch 6.3: SolidWalls + Collision + SpawnRescue");

  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    _toastT = Math.max(0, _toastT - dt);

    // Movement
    Controls.update(dt);

    // Zones (boss table spectator only)
    updateZones(playerRig, (msg) => toast(msg));

    // Patch 6.3: collision + spawn rescue to teleport pad
    Collision.update(dt, playerRig, () => TeleportMachine.getSafeSpawn?.(), (m) => toast(m));

    // Bots / Poker
    try { BossBots?.update?.(dt); } catch {}
    try { PokerSimulation?.update?.(dt); } catch {}
    if (!PokerSimulation) Leaderboard.update(dt, camera, null);

    // Props
    EventChip.update(dt);
    WaterFountain.update(dt);

    renderer.render(scene, camera);
  });

  return { renderer, scene, camera, playerRig };
}

if (!window.__SCARLETT_BOOTED__) {
  window.__SCARLETT_BOOTED__ = true;
  boot().catch((e) => {
    console.error(e);
    overlay(`IMPORT FAILED ❌\n${String(e?.message || e)}`);
  });
}
