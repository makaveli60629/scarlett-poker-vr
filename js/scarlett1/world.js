// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Modular Forever
// - Safe spawn (not in walls)
// - Crash-safe module updates (no black screen)
// - Android Dev HUD (virtual controllers + hide/show + copy)
// - XR Quest controller module placeholder hook (if module exists)
// NOTE: This file assumes your modules live under /js/scarlett1/modules/...

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createWorldOrchestrator({
  safeMode = false,
  noHud = false,
  trace = false,
} = {}) {
  const log = (...a) => console.log("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  // Camera + player rig
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 250);
  camera.position.set(0, 1.65, 0);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  scene.add(playerRig);
  playerRig.add(camera);

  // ✅ Spawn: center lobby safe spot, facing inward
  // Keep you out of walls by staying near center and slightly back.
  playerRig.position.set(0, 0, 3.25);
  playerRig.rotation.set(0, Math.PI, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // Lights (safe defaults; theme modules can add more)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(8, 12, 6);
  scene.add(key);

  // Always-present floor so you never see pure black even if world build fails
  const baseFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
  );
  baseFloor.rotation.x = -Math.PI / 2;
  baseFloor.position.y = 0;
  scene.add(baseFloor);

  // Shared context (modules read/write here)
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,
    playerRig,

    xrSession: null,
    controllers: { left: null, right: null },

    input: {
      left:  { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
      right: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
    },

    safeMode,
    noHud,
    trace,

    _enabledModuleNames: [],
    _modules: [],
  };

  // Module system
  const modules = [];
  function enable(mod) {
    if (!mod || !mod.name) throw new Error("enable(mod): missing mod.name");
    modules.push(mod);
    ctx._enabledModuleNames.push(mod.name);
    ctx._modules.push(mod);
    try { mod.onEnable?.(ctx); } catch (e) { err("onEnable failed:", mod.name, e); }
    log("module enabled ✅", mod.name);
    return mod;
  }

  // Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // --------- Import modules dynamically (so missing files don't crash everything) ---------
  async function tryEnable(name, importer, opts) {
    try {
      const m = await importer();
      const factory = m?.[name];
      if (typeof factory !== "function") throw new Error(`missing export ${name}()`);
      enable(factory(opts));
      return true;
    } catch (e) {
      err(`module load failed: ${name}`, e);
      return false;
    }
  }

  // Boot order (dev + diagnostics first)
  const boot = async () => {
    // ANDROID DEV HUD (your full diagnostics / virtual controller HUD)
    if (!noHud) {
      await tryEnable(
        "createAndroidDevHudModule",
        () => import("./modules/dev/android_dev_hud_module.js"),
        { onlyWhenNotXR: true }
      );
    }

    // Optional: Health overlay, copy diagnostics, toggle panel
    await tryEnable("createHealthOverlayModule", () => import("./modules/dev/health_overlay_module.js"));
    await tryEnable("createCopyDiagnosticsModule", () => import("./modules/dev/copy_diagnostics_module.js"));
    await tryEnable("createModuleTogglePanelModule", () => import("./modules/dev/module_toggle_panel_module.js"));

    // XR controller + locomotion + grab (if present)
    await tryEnable("createXRControllerQuestModule", () => import("./modules/xr/xr_controller_quest_module.js"));
    await tryEnable("createXRLocomotionModule", () => import("./modules/xr/xr_locomotion_module.js"), { speed: 2.25 });
    await tryEnable("createXRGrabModule", () => import("./modules/xr/xr_grab_module.js"));
    await tryEnable("createXRTeleportBlinkModule", () => import("./modules/xr/xr_teleport_blink_module.js"), { distance: 1.25 });

    // World backbone
    await tryEnable("createLobbyHallwaysModule", () => import("./modules/world/lobby_hallways_module.js"));
    await tryEnable("createRoomManagerModule", () => import("./modules/world/room_manager_module.js"));
    await tryEnable("createRoomPortalsModule", () => import("./modules/world/room_portals_module.js"), { portalCount: 20 });
    await tryEnable("createDoorTeleportModule", () => import("./modules/world/door_teleport_module.js"), { doorToRoom: [0, 1, 2, 3] });

    // Centerpiece / show room (Scorpion)
    await tryEnable("createWorldMasterModule", () => import("./modules/world/world_master_module.js"));
    await tryEnable("createScorpionThemeModule", () => import("./modules/world/scorpion_theme_module.js"));
    await tryEnable("createJumbotronsModule", () => import("./modules/world/jumbotrons_module.js"));

    // Showgame (bots play continuously)
    await tryEnable("createShowgameModule", () => import("./modules/game/showgame_module.js"), { dealInterval: 6.0 });
    await tryEnable("createInteractionPolicyModule", () => import("./modules/game/interaction_policy_module.js"));
  };

  // Kick boot (async), but world renders immediately
  boot().then(() => log("boot complete ✅")).catch((e) => err("boot failed:", e));

  // Render loop — crash-safe updates
  let last = performance.now() / 1000;
  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.001, now - last));
    last = now;

    for (const m of modules) {
      try { m.update?.(ctx, { dt, input: ctx.input }); }
      catch (e) { err("update failed:", m.name, e); }
    }

    try { renderer.render(scene, camera); }
    catch (e) { err("render failed:", e); }
  });

  log("orchestrator running ✅", { safeMode, noHud, trace });

  return { ctx, scene, camera, renderer, playerRig, enable, modules };
    }
