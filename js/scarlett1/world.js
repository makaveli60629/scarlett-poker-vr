// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — ANDROID DEBUG + MOVEMENT
// ✅ Android: Virtual controllers + 2D locomotion (move/turn) ALWAYS works
// ✅ Show-check logs: confirms whether the table/pit world spawned
// ✅ Auto-snap camera to the table when it exists
// ✅ Still supports Quest VRButton + XR sessions
// ✅ Loads external modules if they exist; skips safely if missing

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";

export function createWorldOrchestrator({ safeMode = false, noHud = false, trace = false } = {}) {
  const log = (...a) => console.log("[world]", ...a);
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  log("boot ✅", { safeMode, noHud, trace });

  // -----------------------------
  // Core Three.js bootstrap
  // -----------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 250);
  camera.position.set(0, 1.65, 4.0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // VR Button (tag as HUD so you can hide it if desired)
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.dataset.scarlettHud = "1";
  document.body.appendChild(vrBtn);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x101024, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 0.45);
  sun.position.set(4, 9, 3);
  scene.add(sun);

  // Fallback floor so never-black
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const centerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.04, 18, 120),
    new THREE.MeshStandardMaterial({ color: 0x33ffff, roughness: 0.45, metalness: 0.15, emissive: 0x112233 })
  );
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.y = 0.02;
  scene.add(centerRing);

  // -----------------------------
  // Orchestrator Context
  // -----------------------------
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,

    input: {
      left:  { stickX: 0, stickY: 0, trigger: 0, squeeze: 0 },
      right: { stickX: 0, stickY: 0, trigger: 0, squeeze: 0 },
    },

    controllers: { left: null, right: null },

    interactables: [],
    rooms: new Map(),

    _worldUpdaters: [],
    registerWorldUpdater(fn) { if (typeof fn === "function") ctx._worldUpdaters.push(fn); },

    registerInteractable(obj) {
      if (!obj || !obj.isObject3D) return;
      if (!ctx.interactables.includes(obj)) ctx.interactables.push(obj);
    },

    // Policy: only objects explicitly marked grabbable
    _interactionPolicy: {
      canGrab(obj) { return !!obj?.userData?.grabbable; }
    },

    // Simple log buffer
    lastError: null,
    logBuffer: [],
    pushLog(line, level = "log") {
      const s = `[${level}] ${line}`;
      ctx.logBuffer.push(s);
      if (ctx.logBuffer.length > 250) ctx.logBuffer.shift();
    },

    // populated by world_master_module
    _show: null,
  };

  // -----------------------------
  // Built-in: XR Controller Nodes (for Quest)
  // -----------------------------
  function installXRControllers() {
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    c0.name = "XRController0";
    c1.name = "XRController1";
    scene.add(c0);
    scene.add(c1);
    ctx.controllers.left = c0;
    ctx.controllers.right = c1;

    // Visible lasers (helpful debugging)
    const mkLaser = (color) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
      const m = new THREE.LineBasicMaterial({ color });
      const l = new THREE.Line(g, m);
      l.scale.z = 6.5;
      return l;
    };
    c0.add(mkLaser(0xff66ff));
    c1.add(mkLaser(0x33ffff));

    log("XR controller nodes ready ✅");
  }
  installXRControllers();

  // -----------------------------
  // Built-in: Gamepad mapper (XR only)
  // -----------------------------
  function applyDeadzone(v, dz = 0.18) {
    if (Math.abs(v) < dz) return 0;
    const s = (Math.abs(v) - dz) / (1 - dz);
    return Math.sign(v) * Math.max(0, Math.min(1, s));
  }

  function readXRGamepadsIntoInput() {
    const session = renderer.xr.getSession?.();
    if (!session) return;

    const sources = session.inputSources || [];
    for (const src of sources) {
      if (!src?.gamepad) continue;
      const hand = src.handedness === "left" ? "left" : src.handedness === "right" ? "right" : null;
      if (!hand) continue;

      const gp = src.gamepad;
      const ax = gp.axes || [];
      const bt = gp.buttons || [];

      // pick best pair
      const pairs = [
        [2, 3],
        [0, 1],
        [3, 2],
        [1, 0],
      ];
      let sx = 0, sy = 0;
      for (const [ix, iy] of pairs) {
        const tx = ax[ix] ?? 0;
        const ty = ax[iy] ?? 0;
        if (Math.abs(tx) + Math.abs(ty) > 0.02) { sx = tx; sy = ty; break; }
      }

      ctx.input[hand].stickX = applyDeadzone(sx);
      ctx.input[hand].stickY = applyDeadzone(sy);

      ctx.input[hand].trigger = bt[0]?.value ?? 0;
      ctx.input[hand].squeeze = bt[1]?.value ?? 0;
    }
  }

  // -----------------------------
  // Module System
  // -----------------------------
  const enabledModules = [];
  const moduleMap = new Map();

  function enableModule(mod) {
    if (!mod || !mod.name) return;
    try {
      mod.onEnable?.(ctx);
      enabledModules.push(mod);
      moduleMap.set(mod.name, mod);
      ctx.pushLog(`module enabled ✅ ${mod.name}`);
      if (trace) log("module enabled ✅", mod.name);
    } catch (e) {
      ctx.lastError = e;
      ctx.pushLog(`module enable failed ❌ ${mod.name} ${String(e)}`, "error");
      err("module enable failed:", mod.name, e);
    }
  }

  async function importIfExists(relPath) {
    try {
      return await import(relPath);
    } catch (e) {
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
      ctx.pushLog(`module load failed: ${factoryName} ${String(e)}`, "error");
      err("module load failed:", factoryName, e);
      return false;
    }
  }

  // -----------------------------
  // Built-in: ANDROID 2D Locomotion (ALWAYS WORKS)
  // - left stick: move (forward/back + strafe)
  // - right stick: turn (yaw)
  // This is active ONLY when NOT in XR session.
  // -----------------------------
  function createAndroid2DLocomotionModule({
    moveSpeed = 2.4,   // meters/sec
    turnSpeed = 1.6,   // radians/sec
    yLock = 1.65,
  } = {}) {
    let yaw = 0;

    return {
      name: "android_2d_locomotion",

      onEnable() {
        // start facing origin
        yaw = 0;
        log("[android_2d_locomotion] ready ✅");
      },

      update(ctx, { dt, input }) {
        const inXR = !!ctx.renderer?.xr?.getSession?.();
        if (inXR) return;

        const lx = input?.left?.stickX ?? 0;
        const ly = input?.left?.stickY ?? 0;
        const rx = input?.right?.stickX ?? 0;

        // turn
        yaw += rx * turnSpeed * dt;

        // forward is -Z in camera space
        const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
        const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

        const move = new THREE.Vector3();
        move.addScaledVector(forward, ly);
        move.addScaledVector(right, lx);

        const len = move.length();
        if (len > 1e-4) {
          move.normalize().multiplyScalar(moveSpeed * dt);
          ctx.camera.position.add(move);
        }

        // lock height
        ctx.camera.position.y = yLock;

        // apply yaw to look direction
        const lookTarget = new THREE.Vector3(
          ctx.camera.position.x + Math.sin(yaw),
          ctx.camera.position.y,
          ctx.camera.position.z - Math.cos(yaw)
        );
        ctx.camera.lookAt(lookTarget);
      }
    };
  }

  // Enable built-in 2D locomotion
  enableModule(createAndroid2DLocomotionModule());

  // -----------------------------
  // Enable Android virtual controllers (sticks/buttons)
  // -----------------------------
  await tryEnable("createAndroidControlsModule", () => importIfExists("./modules/xr/android_controls_module.js"));

  // XR modules (optional)
  await tryEnable("createXRLocomotionModule", () => importIfExists("./modules/xr/xr_locomotion_module.js"));
  await tryEnable("createXRGrabModule", () => importIfExists("./modules/xr/xr_grab_module.js"));
  await tryEnable("createXRTeleportBlinkModule", () => importIfExists("./modules/xr/xr_teleport_blink_module.js"));

  // World/Rooms (optional)
  await tryEnable("createRoomManagerModule", () => importIfExists("./modules/world/room_manager_module.js"));
  await tryEnable("createLobbyHallwaysModule", () => importIfExists("./modules/world/lobby_hallways_module.js"));
  await tryEnable("createRoomPortalsModule", () => importIfExists("./modules/world/room_portals_module.js"));
  await tryEnable("createDoorTeleportModule", () => importIfExists("./modules/world/door_teleport_module.js"));

  // Your main build (pit + table + bots + chips)
  await tryEnable("createWorldMasterModule", () => importIfExists("./modules/world/world_master_module.js"));

  // Optional theme/signage
  await tryEnable("createScorpionThemeModule", () => importIfExists("./modules/theme/scorpion_theme_module.js"));
  await tryEnable("createJumbotronModule", () => importIfExists("./modules/theme/jumbotron_module.js"));

  // Optional diag modules (you can still keep them hidden via index.js default)
  await tryEnable("createAndroidDevHudModule", () => importIfExists("./modules/diag/android_dev_hud_module.js"));
  await tryEnable("createHealthOverlayModule", () => importIfExists("./modules/diag/health_overlay_module.js"));
  await tryEnable("createCopyDiagnosticsModule", () => importIfExists("./modules/diag/copy_diagnostics_module.js"));
  await tryEnable("createModuleTogglePanelModule", () => importIfExists("./modules/diag/module_toggle_panel_module.js"));

  // If noHud=1, hide tagged HUD (but never controls)
  if (noHud) {
    try {
      document.querySelectorAll("[data-scarlett-hud='1']").forEach((el) => {
        if (el.dataset.scarlettControls === "1") return;
        el.style.display = "none";
      });
      log("noHud=1 -> HUD hidden ✅");
    } catch {}
  }

  // -----------------------------
  // SHOW CHECK + AUTO SNAP TO TABLE (Android)
  // -----------------------------
  function snapToTableView() {
    const inXR = !!renderer.xr.getSession?.();
    if (inXR) return;

    const target = new THREE.Vector3(0, 1.0, 0);
    if (ctx._show?.tableGroup) ctx._show.tableGroup.getWorldPosition(target);

    // place camera back and slightly above
    camera.position.set(target.x, target.y + 1.8, target.z + 4.2);
    camera.lookAt(target.x, target.y + 0.8, target.z);

    // also align 2D locomotion yaw to face table
    // (we approximate by looking at target already)
  }

  setTimeout(() => {
    const hasShow = !!ctx._show?.tableGroup;
    const bots = ctx._show?.bots?.length || 0;
    const chips = ctx._show?.chips?.length || 0;
    const interactables = ctx.interactables?.length || 0;

    log("SHOW CHECK:", { hasShow, bots, chips, interactables });

    if (hasShow) {
      const p = new THREE.Vector3();
      ctx._show.tableGroup.getWorldPosition(p);
      log("TABLE POS:", p);
      snapToTableView();
    } else {
      warn("world_master_module NOT BUILT (you will only see fallback floor/ring). Check file path + factory name.");
    }
  }, 700);

  log("boot complete ✅ modules=", enabledModules.map(m => m.name));

  // -----------------------------
  // Main loop
  // -----------------------------
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const t = performance.now();
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // XR input (if session)
    readXRGamepadsIntoInput();

    // Module updates
    for (const m of enabledModules) {
      try {
        m.update?.(ctx, { dt, input: ctx.input });
      } catch (e) {
        ctx.lastError = e;
        ctx.pushLog(`module update failed: ${m.name} ${String(e)}`, "error");
        err("module update failed:", m.name, e);
      }
    }

    // World updaters (bots/cards)
    for (const fn of ctx._worldUpdaters) {
      try { fn(dt); } catch {}
    }

    renderer.render(scene, camera);
  });

  return { ctx, scene, camera, renderer, enabledModules, moduleMap };
        }
