// /js/scarlett1/world.js
// SCARLETT1 — WORLD ORCHESTRATOR (FULL)
// Modular Forever • Single Orchestrator • Android Dev HUD + Full Diagnostics

export const WORLD_BUILD = "WORLD_ORCH_FULL_v2_android_diag";

// ===== Imports (Three) =====
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// ===== Imports (XR) =====
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
import { createAndroidDevHudModule } from "./modules/dev/android_dev_hud_module.js";

// ================================
// Orchestrator
// ================================
export function createWorldOrchestrator({
  // Safe lobby spawn: away from walls, facing toward center
  spawn = { x: 0, y: 0, z: 3.2, yaw: Math.PI },
} = {}) {
  const log = (...a) => console.log("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  // ===== Scene / Camera / PlayerRig =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.02, 250);
  camera.position.set(0, 1.65, 0);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(spawn.x, spawn.y, spawn.z);
  playerRig.rotation.set(0, spawn.yaw || 0, 0);
  playerRig.add(camera);
  scene.add(playerRig);

  // ===== Lights (minimal safe defaults) =====
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(8, 12, 6);
  scene.add(key);

  // ===== Renderer =====
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // Anti-black guarantees
  renderer.setClearColor(0x05050a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Attach canvas
  const mount = document.getElementById("app") || document.body;
  mount.appendChild(renderer.domElement);

  // ===== Shared context =====
  const ctx = {
    WORLD_BUILD,
    THREE,
    scene,
    camera,
    renderer,
    playerRig,

    // XR runtime state (filled by XR module)
    xrSession: null,
    controllers: { left: null, right: null },

    // Normalized input (XR + Android HUD can write to this)
    input: {
      left:  { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a: false, b: false, x: false, y: false },
      right: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, x: false, y: false, a: false, b: false },
    },

    // Interactables registry (optional)
    interactables: [],

    // Rooms API (room manager attaches)
    rooms: null,

    // Show world objects (world master attaches)
    _show: null,

    // Module tracking (health overlay + toggles)
    _enabledModuleNames: [],
    _moduleInstances: [],
  };

  // ===== Module orchestration =====
  const modules = [];

  function enable(mod) {
    if (!mod || !mod.name) throw new Error("enable(mod): module missing name");
    modules.push(mod);

    ctx._enabledModuleNames.push(mod.name);
    ctx._moduleInstances.push(mod);

    log("module enabled ✅", mod.name);
    mod.onEnable?.(ctx);
    return mod;
  }

  // ===== Safe spawn clamp (prevents starting in walls) =====
  function safeSpawnClamp() {
    // Keep player within central lobby safe radius.
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

  // ===== Resize =====
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);
  onResize();

  // ===== Enable Order =====

  // XR first (controllers + input)
  enable(createXRControllerQuestModule());

  // Dev tools early (so black screen always shows errors)
  enable(createHealthOverlayModule());
  enable(createCopyDiagnosticsModule());
  enable(createAndroidDevHudModule({ onlyWhenNotXR: true })); // ✅ Android virtual controllers + full HUD
  enable(createModuleTogglePanelModule());

  // Venue backbone
  enable(createLobbyHallwaysModule());

  // Rooms + navigation
  enable(createRoomManagerModule());
  enable(createRoomPortalsModule({ portalCount: 20 }));
  enable(createDoorTeleportModule({ doorToRoom: [0, 1, 2, 3] }));
  enable(createRoomTypesModule());
  enable(createNameplatesModule());

  // Main centerpiece (Room #1 / Scorpion)
  enable(createWorldMasterModule());
  enable(createScorpionThemeModule());
  enable(createSpectatorStandsModule());
  enable(createJumbotronsModule());

  // Show-game + rules
  enable(createShowgameModule({ dealInterval: 6.0 }));
  const interactionPolicy = enable(createInteractionPolicyModule());
  ctx._interactionPolicy = interactionPolicy; // optional bridge used by some modules
  enable(createChipStabilizerModule());
  enable(createSeatJoinModule({ openSeatIndex: 4 }));

  // Movement + interaction
  enable(createXRLocomotionModule({ speed: 2.25 }));
  enable(createXRGrabModule());
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));

  // ===== Crash-safe Animation Loop =====
  let lastT = performance.now() / 1000;

  // One-time render so you never get “nothing” if an error happens early
  try { renderer.render(scene, camera); } catch {}

  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.001, now - lastT));
    lastT = now;

    for (const m of modules) {
      try {
        m.update?.(ctx, { dt, input: ctx.input });
      } catch (e) {
        err("module update failed:", m.name, e);
      }
    }

    try {
      renderer.render(scene, camera);
    } catch (e) {
      err("renderer.render failed:", e);
    }
  });

  log("orchestrator start ✅", WORLD_BUILD);

  return { ctx, scene, camera, renderer, playerRig, enable, modules };
}
