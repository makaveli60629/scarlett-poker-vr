// js/main.js — Boss Table Pack (No-Whitescreen) + exports boot
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
  // short-living message (prevents spam)
  if (_toastT > 0) return;
  overlay(`Loaded ✅\n${msg}`);
  _toastT = 0.9;
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

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  setScene(scene);

  // Rig + camera
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  const playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  setCamera(camera);
  setPlayerRig(playerRig);

  // Build world/rooms
  RoomManager.init(scene);

  // Main poker table (public)
  Table.build(scene, { x: 0, y: 0, z: 0 });
  Chair.buildSet(scene, { x: 0, z: 0 }, 6);

  // Boss table (spectator only)
  BossTable.build(scene);

  // Leaderboard
  Leaderboard.build(scene);

  // Teleport + safe spawn
  TeleportMachine.init(scene, playerRig);
  const spawn = TeleportMachine.getSafeSpawn?.();
  if (spawn) {
    playerRig.position.copy(spawn.position);
    playerRig.rotation.y = spawn.rotationY || 0;
  } else {
    playerRig.position.set(0, 0, 6);
  }

  // Movement ON
  Controls.init(renderer, camera, playerRig);

  // OPTIONAL: BossBots
  const botMod = await safeImport("./boss_bots.js");
  const BossBots = botMod?.BossBots || null;
  try { BossBots?.init?.(scene, camera, { count: 5 }); } catch {}

  overlay("Loaded ✅\nBoss Table: Spectator Only\n(Oculus: Left stick move • Right stick 45° turn)");

  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    _toastT = Math.max(0, _toastT - dt);

    Controls.update(dt);

    // Push player out of restricted zones (boss table)
    updateZones(playerRig, (msg) => toast(msg));

    try { BossBots?.update?.(dt); } catch {}
    Leaderboard.update(dt, camera, null);

    renderer.render(scene, camera);
  });

  return { renderer, scene, camera, playerRig };
}

// Auto-run
if (!window.__SCARLETT_BOOTED__) {
  window.__SCARLETT_BOOTED__ = true;
  boot().catch((e) => {
    console.error(e);
    overlay(`IMPORT FAILED ❌\n${String(e?.message || e)}`);
  });
}
