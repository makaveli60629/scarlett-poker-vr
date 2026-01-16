// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — ANDROID DEBUG + MOVEMENT (NO AWAIT)
// ✅ Android: Virtual controllers + 2D locomotion ALWAYS works
// ✅ Show-check logs + auto-snap camera to table
// ✅ Quest VRButton + XR sessions supported
// ✅ External modules load if present; missing ones are skipped safely

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

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.dataset.scarlettHud = "1";
  document.body.appendChild(vrBtn);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lighting + fallback world (never black)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x101024, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 0.45);
  sun.position.set(4, 9, 3);
  scene.add(sun);

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

    _interactionPolicy: { canGrab(obj) { return !!obj?.userData?.grabbable; } },

    lastError: null,
    logBuffer: [],
    pushLog(line, level = "log") {
      const s = `[${level}] ${line}`;
      ctx.logBuffer.push(s);
      if (ctx.logBuffer.length > 250) ctx.logBuffer.shift();
    },

    _show: null,
  };

  // -----------------------------
  // XR Controller Nodes (Quest)
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
  // XR gamepad mapper -> ctx.input (XR only)
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

      const pairs = [[2,3],[0,1],[3,2],[1,0]];
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
  // Module system (promise-based, no await)
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

  function importIfExists(relPath) {
    return import(relPath).catch((e) => {
      if (trace) warn("import missing:", relPath, e);
      return null;
    });
  }

  function tryEnable(factoryName, importer) {
    return importer()
      .then((m) => {
        const fn = m?.[factoryName];
        if (typeof fn !== "function") return false;
        enableModule(fn());
        return true;
      })
      .catch((e) => {
        ctx.lastError = e;
        ctx.pushLog(`module load failed: ${factoryName} ${String(e)}`, "error");
        err("module load failed:", factoryName, e);
        return false;
      });
  }

  // -----------------------------
  // Built-in ANDROID 2D locomotion (ALWAYS works when not in XR)
  // -----------------------------
  function createAndroid2DLocomotionModule({
    moveSpeed = 2.4,
    turnSpeed = 1.6,
    yLock = 1.65,
  } = {}) {
    let yaw = 0;

    return {
      name: "android_2d_locomotion",
      onEnable() { log("[android_2d_locomotion] ready ✅"); },
      update(ctx, { dt, input }) {
        const inXR = !!ctx.renderer?.xr?.getSession?.();
        if (inXR) return;

        const lx = input?.left?.stickX ?? 0;
        const ly = input?.left?.stickY ?? 0;
        const rx = input?.right?.stickX ?? 0;

        yaw += rx * turnSpeed * dt;

        const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

        const move = new THREE.Vector3();
        move.addScaledVector(forward, ly);
        move.addScaledVector(right, lx);

        if (move.length() > 1e-4) {
          move.normalize().multiplyScalar(moveSpeed * dt);
          ctx.camera.position.add(move);
        }

        ctx.camera.position.y = yLock;

        const lookTarget = new THREE.Vector3(
          ctx.camera.position.x + Math.sin(yaw),
          ctx.camera.position.y,
          ctx.camera.position.z - Math.cos(yaw)
        );
        ctx.camera.lookAt(lookTarget);
      }
    };
  }

  enableModule(createAndroid2DLocomotionModule());

  // -----------------------------
  // Kick off module loads (non-blocking)
  // -----------------------------
  const loadPromises = [];

  // Android virtual controls (sticks/buttons)
  loadPromises.push(
    tryEnable("createAndroidControlsModule", () => importIfExists("./modules/xr/android_controls_module.js"))
  );

  // XR modules (optional)
  loadPromises.push(tryEnable("createXRLocomotionModule", () => importIfExists("./modules/xr/xr_locomotion_module.js")));
  loadPromises.push(tryEnable("createXRGrabModule", () => importIfExists("./modules/xr/xr_grab_module.js")));
  loadPromises.push(tryEnable("createXRTeleportBlinkModule", () => importIfExists("./modules/xr/xr_teleport_blink_module.js")));

  // Rooms/world
  loadPromises.push(tryEnable("createRoomManagerModule", () => importIfExists("./modules/world/room_manager_module.js")));
  loadPromises.push(tryEnable("createLobbyHallwaysModule", () => importIfExists("./modules/world/lobby_hallways_module.js")));
  loadPromises.push(tryEnable("createRoomPortalsModule", () => importIfExists("./modules/world/room_portals_module.js")));
  loadPromises.push(tryEnable("createDoorTeleportModule", () => importIfExists("./modules/world/door_teleport_module.js")));

  // Main table build
  loadPromises.push(tryEnable("createWorldMasterModule", () => importIfExists("./modules/world/world_master_module.js")));

  // Theme/signage optional
  loadPromises.push(tryEnable("createScorpionThemeModule", () => importIfExists("./modules/theme/scorpion_theme_module.js")));
  loadPromises.push(tryEnable("createJumbotronModule", () => importIfExists("./modules/theme/jumbotron_module.js")));

  // Diag modules optional
  loadPromises.push(tryEnable("createAndroidDevHudModule", () => importIfExists("./modules/diag/android_dev_hud_module.js")));
  loadPromises.push(tryEnable("createHealthOverlayModule", () => importIfExists("./modules/diag/health_overlay_module.js")));
  loadPromises.push(tryEnable("createCopyDiagnosticsModule", () => importIfExists("./modules/diag/copy_diagnostics_module.js")));
  loadPromises.push(tryEnable("createModuleTogglePanelModule", () => importIfExists("./modules/diag/module_toggle_panel_module.js")));

  // Hide HUD if requested (but never hide controls)
  if (noHud) {
    try {
      document.querySelectorAll("[data-scarlett-hud='1']").forEach((el) => {
        if (el.dataset.scarlettControls === "1") return;
        el.style.display = "none";
      });
      log("noHud=1 -> HUD hidden ✅");
    } catch {}
  }

  // After module loads settle, do show-check + snap camera
  function snapToTableView() {
    const inXR = !!renderer.xr.getSession?.();
    if (inXR) return;

    const target = new THREE.Vector3(0, 1.0, 0);
    if (ctx._show?.tableGroup) ctx._show.tableGroup.getWorldPosition(target);

    camera.position.set(target.x, target.y + 1.8, target.z + 4.2);
    camera.lookAt(target.x, target.y + 0.8, target.z);
  }

  Promise.allSettled(loadPromises).then(() => {
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
      warn("world_master_module NOT BUILT (fallback only). Check ./modules/world/world_master_module.js exists + exports createWorldMasterModule");
    }

    log("boot complete ✅ modules=", enabledModules.map((m) => m.name));
  });

  // -----------------------------
  // Main loop
  // -----------------------------
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const t = performance.now();
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // XR input (if XR session)
    readXRGamepadsIntoInput();

    // Update modules
    for (const m of enabledModules) {
      try {
        m.update?.(ctx, { dt, input: ctx.input });
      } catch (e) {
        ctx.lastError = e;
        ctx.pushLog(`module update failed: ${m.name} ${String(e)}`, "error");
        err("module update failed:", m.name, e);
      }
    }

    // World updaters
    for (const fn of ctx._worldUpdaters) {
      try { fn(dt); } catch {}
    }

    renderer.render(scene, camera);
  });

  return { ctx, scene, camera, renderer, enabledModules, moduleMap };
                         }
