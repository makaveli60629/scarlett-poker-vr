// js/main.js — Patch 7.0 FULL
// Integrates RoomManager spawn pads + TeleportMachine authoritative spawn.
// Result: you ALWAYS spawn on the pad (per room), never on table.
// Adds: XR session start hook -> dispatch "webxr-session-start" (Ray Fix Lock trigger)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera, setPlayerRig, setScene } from "./state.js";
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

import { Input } from "./input.js";
import { Inventory } from "./inventory.js";
import { AvatarShop } from "./avatar_shop.js";

import { Interactions } from "./interactions.js";
import { VRUIPanel } from "./vr_ui_panel.js";

import { CrownSystem } from "./crown_system.js";
import { PokerSimulation } from "./poker_simulation.js";
import { BossBots } from "./boss_bots.js";

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

export async function boot() {
  overlay("Booting…");

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // XR session start hook (Ray Fix Lock trigger)
  renderer.xr.addEventListener("sessionstart", () => {
    window.dispatchEvent(new Event("webxr-session-start"));
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  setScene(scene);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  const playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  setCamera(camera);
  setPlayerRig(playerRig);

  RoomManager.init(scene);

  SolidWalls.build(scene, { halfX: 14, halfZ: 14, height: 4.2, thickness: 0.35, y: 0 });
  LightsPack.build(scene);

  // Build content (in Lobby area). Other rooms currently only have pads/floors.
  Table.build(scene, { x: 0, y: 0, z: 0 });
  Chair.buildSet(scene, { x: 0, z: 0 }, 6);

  BossTable.build(scene);
  Leaderboard.build(scene);

  StoreKiosk.build(scene, { x: -6.5, y: 0, z: 5.5 });
  EventChip.build(scene, { x: 6.5, y: 0, z: 5.5 });

  const kioskObj = StoreKiosk.getObject?.() || StoreKiosk.group || StoreKiosk.mesh || null;
  const chipObj = EventChip.getObject?.() || EventChip.group || EventChip.mesh || null;

  FurniturePack.build(scene);
  WaterFountain.build(scene, { x: 0, y: 0, z: 9.0 });

  TeleportMachine.init(scene, playerRig);

  // Authoritative spawn: ALWAYS use pad
  const spawn = TeleportMachine.getSafeSpawn();
  playerRig.position.copy(spawn.position);
  playerRig.position.y = 0;
  playerRig.rotation.set(0, spawn.rotationY || 0, 0);

  Collision.setPlayerRadius(0.22);
  Collision.maxPushPerFrame = 0.34;
  Collision.rescueEnabled = true;

  Input.init(renderer);
  Inventory.init();
  Controls.init(renderer, camera, playerRig);

  AvatarShop.build(scene, { x: -6.5, y: 0, z: 4.0 });

  Interactions.init(scene, camera, playerRig, { kioskObj, chipObj });

  VRUIPanel.init(scene, camera, renderer, {
    onEquip: (equipped) => AvatarShop.apply(equipped),
    onToast: (msg) => toast(msg)
  });

  BossBots.init(scene, camera, { count: 5 });

  CrownSystem.init(scene, camera, {
    toast: (m) => toast(m),
    getRooms: () => RoomManager.getRooms(),
    getBossBots: () => BossBots,
    getBossHeads: () => BossBots.getHeads(),
    onCrownChange: (name) => toast(`👑 Crown Holder: ${name}`)
  });

  PokerSimulation.init(scene, camera, BossBots, Leaderboard, (m) => toast(m), CrownSystem);

  overlay("Loaded ✅\nPatch 7.0: Spawn Pads (All Rooms) + Teleport Authority\nYou will always spawn on a pad.");

  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    _toastT = Math.max(0, _toastT - dt);

    Input.update();

    if (Input.menuPressed()) {
      VRUIPanel.toggle();
    }

    if (Input.gripPressed()) {
      Interactions.onGrip((m) => toast(m));
    }

    Controls.update(dt);

    // rescue check (kept mild; collision handles most)
    TeleportMachine.rescueIfBadSpawn(playerRig);

    Collision.update(dt, playerRig, () => TeleportMachine.getSafeSpawn(), (m) => toast(m));

    VRUIPanel.update(dt);
    Interactions.update(dt);

    BossBots.update(dt);
    CrownSystem.update(dt);
    PokerSimulation.update(dt);

    EventChip.update(dt);
    WaterFountain.update(dt);
    AvatarShop.update(dt);

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
