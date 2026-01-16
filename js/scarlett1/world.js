// /js/scarlett1/world.js
// SCARLETT1 — WORLD ORCHESTRATOR (FULL)
// Modular Forever • Single Orchestrator • Enables all modules

export const WORLD_BUILD = "WORLD_ORCH_FULL_v1";

// ===== Imports (Core + XR) =====
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// If you already have your own copies of these XR modules, keep your paths.
// (These names match how we’ve been using them in the orchestration.)
import { createXRControllerQuestModule } from "./modules/xr/xr_controller_quest_module.js";
import { createXRLocomotionModule } from "./modules/xr/xr_locomotion_module.js";
import { createXRGrabModule } from "./modules/xr/xr_grab_module.js";
import { createXRTeleportBlinkModule } from "./modules/xr/xr_teleport_blink_module.js";

// ===== Imports (World / Rooms) =====
import { createLobbyHallwaysModule } from "./modules/world/lobby_hallways_module.js";
import { createRoomManagerModule } from "./modules/world/room_manager_module.js";
import { createRoomPortalsModule } from "./modules/world/room_portals_module.js";
import { createDoorTeleportModule } from "./modules/world/door_teleport_module.js";
import { createRoomTypesModule } from "./modules/world/room_types_module.js";
import { createNameplatesModule } from "./modules/world/nameplates_module.js";

import { createWorldMasterModule } from "./modules/world/world_master_module.js";
import { createScorpionThemeModule } from "./modules/world/scorpion_theme_module.js";
import { createSpectatorStandsModule } from "./modules/world/spectator_stands_module.js";
import { createJumbotronsModule } from "./modules/world/jumbotrons_module.js";

// ===== Imports (Game / Rules) =====
import { createShowgameModule } from "./modules/game/showgame_module.js";
import { createInteractionPolicyModule } from "./modules/game/interaction_policy_module.js";
import { createChipStabilizerModule } from "./modules/game/chip_stabilizer_module.js";
import { createSeatJoinModule } from "./modules/game/seat_join_module.js";

// ===== Imports (Dev / Diagnostics) =====
import { createHealthOverlayModule } from "./modules/dev/health_overlay_module.js";
import { createCopyDiagnosticsModule } from "./modules/dev/copy_diagnostics_module.js";
import { createModuleTogglePanelModule } from "./modules/dev/module_toggle_panel_module.js";

// ================================
// Orchestrator
// ================================
export function createWorldOrchestrator({
  // Safe spawn in lobby, not in walls:
  // Lobby radius is ~12.5; spawn near center facing “forward”
  spawn = { x: 0, y: 0, z: 3.2, yaw: Math.PI }, // yaw PI faces back toward center sign/map
} = {}) {
  const log = (...a) => console.log("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  // ----- Three core -----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.02, 200);
  camera.position.set(0, 1.65, 0);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(spawn.x, spawn.y, spawn.z);
  playerRig.rotation.set(0, spawn.yaw || 0, 0);
  playerRig.add(camera);
  scene.add(playerRig);

  // Basic lights (safe defaults; your themed modules add more)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(8, 12, 6);
  scene.add(key);

  // ----- Renderer -----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // Attach canvas (if not already attached elsewhere)
  const mount = document.getElementById("app") || document.body;
  mount.appendChild(renderer.domElement);

  // ----- Context shared to modules -----
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,
    playerRig,

    // XR runtime state filled by xr controller module
    xrSession: null,
    controllers: { left: null, right: null },

    // Input normalized
    input: {
      left: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a: false, b: false },
      right: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, x: false, y: false },
    },

    // Interactables registry (grab module may fill/use this)
    interactables: [],

    // Rooms API (room_manager_module should attach ctx.rooms)
    rooms: null,

    // Show-world objects (world_master_module attaches ctx._show)
    _show: null,

    // Module tracking (for overlay/toggles)
    _enabledModuleNames: [],
    _moduleInstances: [],
  };

  // ----- Module orchestration -----
  const modules = [];

  function enable(mod) {
    if (!mod || !mod.name) throw new Error("enable(mod): module missing name");
    modules.push(mod);

    ctx._enabledModuleNames.push(mod.name);
    ctx._moduleInstances.push(mod);

    log("module enabled ✅", mod.name);
    try {
      mod.onEnable?.(ctx);
    } catch (e) {
      err("module onEnable failed:", mod.name, e);
      throw e;
    }
    return mod;
  }

  // ================================
  // ENABLE ORDER (Important)
  // ================================

  // XR first (controllers + input normalization)
  enable(createXRControllerQuestModule());

  // Diagnostics early (so it catches everything)
  enable(createHealthOverlayModule());
  enable(createCopyDiagnosticsModule());
  enable(createModuleTogglePanelModule());

  // Venue backbone
  enable(createLobbyHallwaysModule());

  // Rooms system
  enable(createRoomManagerModule());

  // Optional: 20 portal ring for “go to Game 10” style navigation
  enable(createRoomPortalsModule({ portalCount: 20 }));

  // Door hall teleport (4 doors -> rooms 1..4)
  enable(createDoorTeleportModule({ doorToRoom: [0, 1, 2, 3] }));

  // Room identities for rooms 2..4
  enable(createRoomTypesModule());

  // Door signs + lobby directory map
  enable(createNameplatesModule());

  // Main show centerpiece (Room #1 / Scorpion test)
  enable(createWorldMasterModule());       // builds table/chairs/bots/cards/chips into room #1
  enable(createScorpionThemeModule());     // trims, pylons, logo (no red wash)
  enable(createSpectatorStandsModule());   // balcony + tiered stands
  enable(createJumbotronsModule());        // 4 screens + banner ring

  // Gameplay rules (show loop + interaction rules)
  enable(createShowgameModule({ dealInterval: 6.0 }));
  const interactionPolicy = enable(createInteractionPolicyModule());
  // Make seat join able to flip spectator mode via ctx._interactionPolicy
  ctx._interactionPolicy = interactionPolicy;

  enable(createChipStabilizerModule());
  enable(createSeatJoinModule({ openSeatIndex: 4 }));

  // Movement + interaction last
  enable(createXRLocomotionModule({ speed: 2.25 }));
  enable(createXRGrabModule());
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));

  // ================================
  // Safe Spawn Guard (runs once)
  // ================================
  function safeSpawnClamp() {
    // Keep player in lobby open area and away from lobby wall thickness.
    // Lobby radius 12.5, halls start near that, so clamp to ~8.0 for safety.
    const maxR = 8.0;
    const x = playerRig.position.x;
    const z = playerRig.position.z;
    const r = Math.hypot(x, z);
    if (r > maxR) {
      const s = maxR / r;
      playerRig.position.x *= s;
      playerRig.position.z *= s;
    }
    playerRig.position.y = 0;
  }
  safeSpawnClamp();

  // ================================
  // Resize
  // ================================
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);
  onResize();

  // ================================
  // Main Loop
  // ================================
  let lastT = performance.now() / 1000;

  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.001, now - lastT));
    lastT = now;

    // Pull current input snapshot (xr controller module should write ctx.input each frame)
    // Modules use update(ctx, {dt, input})
    for (const m of modules) {
      try {
        m.update?.(ctx, { dt, input: ctx.input });
      } catch (e) {
        err("module update failed:", m.name, e);
      }
    }

    renderer.render(scene, camera);
  });

  log("orchestrator start ✅", WORLD_BUILD);

  // Returned API (optional)
  return {
    ctx,
    scene,
    camera,
    renderer,
    playerRig,
    enable,
    modules,
  };
                                           }
