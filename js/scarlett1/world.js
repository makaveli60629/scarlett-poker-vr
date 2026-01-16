// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Modular Forever
// ✅ Built-in: VRButton (enter VR)
// ✅ Built-in: REAL XR controller nodes
// ✅ Built-in: Quest input mapper (stable thumbsticks/triggers)
// ✅ Built-in: Interactables registry + policy (cards not grabbable, chips/dealer grabbable)
// ✅ Android: virtual controllers (sticks + triggers + grip) for 2D testing
// ✅ External modules load if they exist; missing ones are skipped safely
//
// Options (passed from index.js):
//  - safeMode: bool (you can use to reduce load if needed)
//  - noHud: bool (hide HUD on start; HUD button still exists)
//  - trace: bool (verbose logs)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";

export function createWorldOrchestrator({ safeMode = false, noHud = false, trace = false } = {}) {
  const log = (...a) => (trace ? console.log("[world]", ...a) : console.log("[world]", ...a));
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  log("world.js reached ✅", { safeMode, noHud, trace });

  // -----------------------------
  // Core Three.js scene bootstrap
  // -----------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 200);
  camera.position.set(0, 1.65, 2.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VR button (tagged as HUD so it can be hidden if you want)
  const btn = VRButton.createButton(renderer);
  btn.dataset.scarlettHud = "1";
  document.body.appendChild(btn);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Some safe global lighting (modules add more later)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x101024, 0.35);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.35);
  dir.position.set(4, 8, 2);
  scene.add(dir);

  // -----------------------------
  // Orchestrator Context
  // -----------------------------
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,

    // populated later
    input: {
      left: { stickX: 0, stickY: 0, trigger: 0, squeeze: 0, a: 0, b: 0, x: 0, y: 0 },
      right: { stickX: 0, stickY: 0, trigger: 0, squeeze: 0, a: 0, b: 0, x: 0, y: 0 },
    },

    // real XR controllers (Object3D)
    controllers: { left: null, right: null },

    // interactables registry
    interactables: [],

    // room registry (from room_manager)
    rooms: new Map(),

    // update hooks
    _worldUpdaters: [],
    registerWorldUpdater(fn) {
      if (typeof fn === "function") ctx._worldUpdaters.push(fn);
    },

    registerInteractable(obj) {
      if (!obj || !obj.isObject3D) return;
      if (!ctx.interactables.includes(obj)) ctx.interactables.push(obj);
    },

    // Interaction policy can override this later
    _interactionPolicy: {
      canGrab(obj /*, hand */) {
        // default: only if explicitly grabbable
        return !!obj?.userData?.grabbable;
      },
    },

    // lightweight error buffer for diagnostics panels
    lastError: null,
    logBuffer: [],
    pushLog(line, level = "log") {
      const s = `[${level}] ${line}`;
      ctx.logBuffer.push(s);
      if (ctx.logBuffer.length > 220) ctx.logBuffer.shift();
    },
  };

  // -----------------------------
  // Built-in: REAL XR Controller Nodes
  // -----------------------------
  function installXRControllers() {
    // Real XR input sources -> left/right controller objects
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    c0.name = "XRController0";
    c1.name = "XRController1";
    scene.add(c0);
    scene.add(c1);

    // We’ll map to left/right once we see inputSources; until then, keep both
    ctx.controllers.left = c0;
    ctx.controllers.right = c1;

    // Simple visible “laser” helpers (optional)
    const mkLaser = (color) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const m = new THREE.LineBasicMaterial({ color });
      const l = new THREE.Line(g, m);
      l.name = "Laser";
      l.scale.z = 6.5;
      return l;
    };
    c0.add(mkLaser(0xff66ff));
    c1.add(mkLaser(0x33ffff));

    log("XR controllers installed ✅");
  }

  // -----------------------------
  // Built-in: Quest Input Mapper (stable)
  // -----------------------------
  function applyDeadzone(v, dz = 0.18) {
    if (Math.abs(v) < dz) return 0;
    // rescale remaining range
    const s = (Math.abs(v) - dz) / (1 - dz);
    return Math.sign(v) * Math.max(0, Math.min(1, s));
  }

  function readGamepadInputs() {
    const session = renderer.xr.getSession?.();
    if (!session) return;

    const sources = session.inputSources || [];
    // Fill left/right from any gamepads we find; match handedness if possible
    for (const src of sources) {
      if (!src?.gamepad) continue;
      const gp = src.gamepad;
      const hand = src.handedness === "left" ? "left" : src.handedness === "right" ? "right" : null;
      if (!hand) continue;

      const ax = gp.axes || [];
      const bt = gp.buttons || [];

      // Standard: axes[2,3] or [0,1] depending on device. We’ll prefer [2,3] if present.
      const sx = ax.length >= 4 ? ax[2] : ax[0] || 0;
      const sy = ax.length >= 4 ? ax[3] : ax[1] || 0;

      ctx.input[hand].stickX = applyDeadzone(sx);
      ctx.input[hand].stickY = applyDeadzone(sy);

      ctx.input[hand].trigger = bt[0]?.value ?? 0; // index finger
      ctx.input[hand].squeeze = bt[1]?.value ?? 0; // grip

      // Common buttons (best-effort)
      ctx.input[hand].a = bt[4]?.pressed ? 1 : 0;
      ctx.input[hand].b = bt[5]?.pressed ? 1 : 0;
      ctx.input[hand].x = bt[4]?.pressed ? 1 : 0;
      ctx.input[hand].y = bt[5]?.pressed ? 1 : 0;
    }
  }

  // -----------------------------
  // Module system
  // -----------------------------
  const enabledModules = [];
  const moduleMap = new Map();

  function enableModule(mod) {
    if (!mod || !mod.name) return;
    try {
      mod.onEnable?.(ctx);
      enabledModules.push(mod);
      moduleMap.set(mod.name, mod);
      ctx.pushLog(`[world] module enabled ✅ ${mod.name}`);
    } catch (e) {
      ctx.lastError = e;
      ctx.pushLog(`[world] module enable failed ❌ ${mod.name} ${String(e)}`, "error");
      err("module enable failed:", mod.name, e);
    }
  }

  async function importIfExists(relPath) {
    try {
      return await import(relPath);
    } catch (e) {
      // keep silent unless trace
      if (trace) warn("import missing:", relPath, e);
      return null;
    }
  }

  async function tryEnable(factoryName, importer) {
    try {
      const m = await importer();
      const fn = m?.[factoryName];
      if (typeof fn !== "function") return false;
      enableModule(fn());
      return true;
    } catch (e) {
      ctx.lastError = e;
      ctx.pushLog(`[world] module load failed: ${factoryName} ${String(e)}`, "error");
      err("module load failed:", factoryName, e);
      return false;
    }
  }

  // -----------------------------
  // Built-in safe fallback world (never black)
  // -----------------------------
  function buildFallbackFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.04, 18, 120),
      new THREE.MeshStandardMaterial({ color: 0x33ffff, roughness: 0.45, metalness: 0.15, emissive: 0x112233 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    log("fallback floor built ✅");
  }

  // -----------------------------
  // Boot sequence (modules)
  // -----------------------------
  installXRControllers();
  buildFallbackFloor();

  // IMPORTANT: Android controllers (2D testing) — this is what you asked for
  // File: /js/scarlett1/modules/xr/android_controls_module.js
  // Factory: createAndroidControlsModule
  tryEnable("createAndroidControlsModule", () => importIfExists("./modules/xr/android_controls_module.js"));

  // XR locomotion / grab / teleport (external modules, if present)
  tryEnable("createXRLocomotionModule", () => importIfExists("./modules/xr/xr_locomotion_module.js"));
  tryEnable("createXRGrabModule", () => importIfExists("./modules/xr/xr_grab_module.js"));
  tryEnable("createXRTeleportBlinkModule", () => importIfExists("./modules/xr/xr_teleport_blink_module.js"));

  // World & room system modules (external modules, if present)
  tryEnable("createLobbyHallwaysModule", () => importIfExists("./modules/world/lobby_hallways_module.js"));
  tryEnable("createRoomManagerModule", () => importIfExists("./modules/world/room_manager_module.js"));
  tryEnable("createRoomPortalsModule", () => importIfExists("./modules/world/room_portals_module.js"));
  tryEnable("createDoorTeleportModule", () => importIfExists("./modules/world/door_teleport_module.js"));

  // The patched world builder you pasted (make sure path matches)
  tryEnable("createWorldMasterModule", () => importIfExists("./modules/world/world_master_module.js"));

  // Theme & signage (optional)
  tryEnable("createScorpionThemeModule", () => importIfExists("./modules/theme/scorpion_theme_module.js"));
  tryEnable("createJumbotronModule", () => importIfExists("./modules/theme/jumbotron_module.js"));

  // Showgame / interaction policy (optional)
  tryEnable("createShowgameModule", () => importIfExists("./modules/game/showgame_module.js"));
  tryEnable("createInteractionPolicyModule", () => importIfExists("./modules/game/interaction_policy_module.js"));

  // Diagnostics / HUD modules (optional) — they can exist, but you wanted green HUD hidden by default.
  tryEnable("createAndroidDevHudModule", () => importIfExists("./modules/diag/android_dev_hud_module.js"));
  tryEnable("createHealthOverlayModule", () => importIfExists("./modules/diag/health_overlay_module.js"));
  tryEnable("createCopyDiagnosticsModule", () => importIfExists("./modules/diag/copy_diagnostics_module.js"));
  tryEnable("createModuleTogglePanelModule", () => importIfExists("./modules/diag/module_toggle_panel_module.js"));

  // If index.js passed noHud=1, hide any HUD modules that tagged themselves properly
  if (noHud) {
    try {
      document.querySelectorAll("[data-scarlett-hud='1']").forEach((el) => {
        // never hide controls or the HUD toggle button if they marked themselves
        if (el.dataset.scarlettControls === "1") return;
        el.style.display = "none";
      });
      log("noHud=1 -> HUD hidden ✅");
    } catch {}
  }

  log("boot complete ✅ modules=", enabledModules.map((m) => m.name));

  // -----------------------------
  // Render loop
  // -----------------------------
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const t = performance.now();
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // XR gamepad input if in session
    readGamepadInputs();

    // Update modules
    for (const m of enabledModules) {
      try {
        m.update?.(ctx, { dt, input: ctx.input });
      } catch (e) {
        ctx.lastError = e;
        ctx.pushLog(`[world] module update failed: ${m.name} ${String(e)}`, "error");
        err("module update failed:", m.name, e);
      }
    }

    // World updaters (world_master_module uses this)
    for (const fn of ctx._worldUpdaters) {
      try { fn(dt); } catch {}
    }

    renderer.render(scene, camera);
  });

  // expose for debugging
  return {
    ctx,
    scene,
    camera,
    renderer,
    enableModule,
    enabledModules,
    moduleMap,
  };
          }
