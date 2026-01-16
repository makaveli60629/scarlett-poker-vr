// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Modular Forever
// ✅ No 404 dependency for Quest controllers (built-in)
// ✅ No 404 dependency for interactables registry (built-in)
// ✅ Built-in Interactables Policy (cards not grabbable, chips grabbable)
// ✅ External modules still load if they exist; missing ones are skipped safely
//
// URL params handled by index.js pass-through: safeMode/noHud/trace

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createWorldOrchestrator({ safeMode = false, noHud = false, trace = false } = {}) {
  const log = (...a) => console.log("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  // ---------- Core three.js ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 300);
  camera.position.set(0, 1.65, 0);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  scene.add(playerRig);
  playerRig.add(camera);

  // ✅ Safe spawn: center-ish, not inside walls
  playerRig.position.set(0, 0, 3.25);
  playerRig.rotation.set(0, Math.PI, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // Lights (safe baseline)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.70));
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(8, 12, 6);
  scene.add(key);

  // Always-present floor (prevents black screen if a module fails)
  const baseFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
  );
  baseFloor.rotation.x = -Math.PI / 2;
  baseFloor.position.y = 0;
  scene.add(baseFloor);

  // ---------- Shared context ----------
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,
    playerRig,

    safeMode,
    noHud,
    trace,

    xrSession: null,
    controllers: { left: null, right: null },

    // unified input (what ALL systems should use)
    input: {
      left:  { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
      right: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
    },

    // interactables registry (filled by built-in module below)
    interactables: null,

    // helper (filled by policy module below)
    tagInteractable: null,

    _enabledModuleNames: [],
    _modules: [],
  };

  // ---------- Module system ----------
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

  // ---------- Built-in module: Interactables Registry (no 404) ----------
  function createInteractablesRegistryModule() {
    return {
      name: "interactables_registry",
      onEnable(ctx) {
        const map = new Map(); // object3D -> meta

        function toObj(o) {
          return o && (o.isObject3D ? o : o.object3D || o.mesh || null);
        }

        ctx.interactables = {
          register(obj, meta = {}) {
            const o = toObj(obj);
            if (!o) return false;
            map.set(o, { ...meta, object: o });
            return true;
          },
          unregister(obj) {
            const o = toObj(obj);
            if (!o) return false;
            return map.delete(o);
          },
          clear() { map.clear(); },
          list() { return Array.from(map.values()); },
          objects() { return Array.from(map.keys()); },
          count() { return map.size; },
        };

        Object.defineProperty(ctx.interactables, "all", {
          get() { return Array.from(map.keys()); },
        });

        console.log("[interactables] ready ✅");
      },
    };
  }

  // ---------- Built-in module: Quest Controller Mapper (no 404) ----------
  function createXRControllerQuestModule() {
    return {
      name: "xr_controller_quest",
      onEnable(ctx) {
        const deadzone = 0.18;
        const invertY = true;
        const clamp01 = (v) => Math.max(0, Math.min(1, Number(v || 0)));

        function dz(v) {
          v = Number(v || 0);
          if (Math.abs(v) < deadzone) return 0;
          const s = Math.sign(v);
          const a = (Math.abs(v) - deadzone) / (1 - deadzone);
          return s * Math.min(1, Math.max(0, a));
        }
        function normAxis(v) {
          v = dz(v);
          return Math.max(-1, Math.min(1, v));
        }
        function ensure(side) {
          ctx.input = ctx.input || {};
          if (!ctx.input[side]) {
            ctx.input[side] = {
              trigger: 0, squeeze: 0,
              stickX: 0, stickY: 0,
              a:false, b:false, x:false, y:false,
            };
          }
          return ctx.input[side];
        }
        function getSession() {
          return ctx.renderer?.xr?.getSession?.() || ctx.xrSession || null;
        }
        function findSource(handedness) {
          const s = getSession();
          if (!s || !s.inputSources) return null;
          for (const src of s.inputSources) {
            if (src && src.handedness === handedness && src.gamepad) return src;
          }
          return null;
        }
        function read(src, side) {
          const out = ensure(side);
          const gp = src?.gamepad;
          if (!gp) return;

          const b = gp.buttons || [];
          const ax = gp.axes || [];

          out.trigger = clamp01(b[0]?.value);
          out.squeeze = clamp01(b[1]?.value);

          let sx = ax[2] ?? 0, sy = ax[3] ?? 0;
          if (Math.abs(sx) < 0.001 && Math.abs(sy) < 0.001) {
            sx = ax[0] ?? 0;
            sy = ax[1] ?? 0;
          }

          out.stickX = normAxis(sx);
          out.stickY = normAxis(invertY ? -sy : sy);

          const btn4 = !!b[4]?.pressed;
          const btn5 = !!b[5]?.pressed;
          const btn3 = !!b[3]?.pressed;
          const btn2 = !!b[2]?.pressed;

          if (side === "right") {
            out.a = btn4 || btn3;
            out.b = btn5 || btn2;
          } else {
            out.x = btn4 || btn3;
            out.y = btn5 || btn2;
          }
        }

        ctx.controllers = ctx.controllers || { left: null, right: null };

        this._tick = () => {
          const session = getSession();
          ctx.xrSession = session;

          const L = findSource("left");
          const R = findSource("right");

          ctx.controllers.left = L;
          ctx.controllers.right = R;

          if (!session) {
            const l = ensure("left");
            const r = ensure("right");
            l.trigger = l.squeeze = l.stickX = l.stickY = 0; l.x = l.y = false;
            r.trigger = r.squeeze = r.stickX = r.stickY = 0; r.a = r.b = false;
            return;
          }

          if (L) read(L, "left");
          else {
            const l = ensure("left");
            l.trigger = l.squeeze = l.stickX = l.stickY = 0; l.x = l.y = false;
          }

          if (R) read(R, "right");
          else {
            const r = ensure("right");
            r.trigger = r.squeeze = r.stickX = r.stickY = 0; r.a = r.b = false;
          }
        };

        console.log("[xr_controller_quest] ready ✅ (built-in)");
      },
      update() {
        try { this._tick?.(); } catch (e) { console.error("[xr_controller_quest] tick failed", e); }
      },
    };
  }

  // ---------- Built-in module: Interactable Tagger + Policy (FULL) ----------
  // Convention:
  // - Tag any Object3D:
  //   obj.userData.interactable = true
  //   obj.userData.kind = "chip" | "community_card" | "bot_card" | "dealer" | ...
  //   obj.userData.grabbable = true/false
  //
  // Policy:
  // - community_card + bot_card are NEVER grabbable.
  // - chips + dealer items default grabbable unless explicitly false.
  function createInteractablesPolicyModule() {
    return {
      name: "interactables_policy",

      onEnable(ctx) {
        const logp = (...a) => console.log("[interactables_policy]", ...a);

        ctx.tagInteractable = (obj, kind, grabbable) => {
          if (!obj) return;
          obj.userData = obj.userData || {};
          obj.userData.interactable = true;
          if (kind) obj.userData.kind = kind;
          if (typeof grabbable === "boolean") obj.userData.grabbable = grabbable;

          // defaults
          const k = String(obj.userData.kind || "unknown");
          if (typeof obj.userData.grabbable !== "boolean") {
            obj.userData.grabbable = !(k.includes("card"));
          }

          // force policy
          if (k === "community_card" || k === "bot_card") obj.userData.grabbable = false;
        };

        this._scanTimer = 0;
        this._lastCount = 0;
        logp("ready ✅ (tag + policy)");
      },

      update(ctx, { dt }) {
        // scan 4x/sec (cheap and safe)
        this._scanTimer += dt;
        if (this._scanTimer < 0.25) return;
        this._scanTimer = 0;

        if (!ctx.interactables) return;

        // Traverse and register tagged interactables
        let seen = 0;
        ctx.scene.traverse((o) => {
          if (!o || !o.isObject3D) return;
          const ud = o.userData || {};
          if (!ud.interactable) return;

          const kind = String(ud.kind || "unknown");

          // enforce policy always
          if (kind === "community_card" || kind === "bot_card") ud.grabbable = false;

          ctx.interactables.register(o, {
            kind,
            grabbable: ud.grabbable !== false,
          });

          seen++;
        });

        // log only when count changes
        const c = ctx.interactables.count();
        if (c !== this._lastCount && ctx.trace) {
          console.log("[interactables_policy] registered=", c, "taggedSeen=", seen);
          this._lastCount = c;
        }
      },
    };
  }

  // ---------- Safe dynamic import helper (skips missing modules quietly) ----------
  async function importIfExists(path) {
    try {
      const abs = new URL(path, location.href).toString();
      const res = await fetch(abs, { cache: "no-store" });
      if (!res.ok) return null;
      return await import(path);
    } catch {
      return null;
    }
  }

  async function tryEnable(exportName, importer, opts) {
    try {
      const m = await importer();
      if (!m) {
        if (trace) console.warn("[world] skip missing:", exportName);
        return false;
      }
      const factory = m?.[exportName];
      if (typeof factory !== "function") throw new Error(`missing export ${exportName}()`);
      enable(factory(opts));
      return true;
    } catch (e) {
      err(`module load failed: ${exportName}`, e);
      return false;
    }
  }

  // ---------- Resize ----------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Boot ----------
  const boot = async () => {
    // ✅ Built-ins first (never 404)
    enable(createInteractablesRegistryModule());
    enable(createInteractablesPolicyModule());
    enable(createXRControllerQuestModule());

    // ✅ External modules (load only if present)
    if (!noHud) {
      await tryEnable(
        "createAndroidDevHudModule",
        () => importIfExists("./modules/dev/android_dev_hud_module.js"),
        { onlyWhenNotXR: true }
      );
    }

    await tryEnable("createHealthOverlayModule", () => importIfExists("./modules/dev/health_overlay_module.js"));
    await tryEnable("createCopyDiagnosticsModule", () => importIfExists("./modules/dev/copy_diagnostics_module.js"));
    await tryEnable("createModuleTogglePanelModule", () => importIfExists("./modules/dev/module_toggle_panel_module.js"));

    // XR stack (if you have these files)
    await tryEnable("createXRLocomotionModule", () => importIfExists("./modules/xr/xr_locomotion_module.js"), { speed: 2.25 });
    await tryEnable("createXRGrabModule", () => importIfExists("./modules/xr/xr_grab_module.js"));
    await tryEnable("createXRTeleportBlinkModule", () => importIfExists("./modules/xr/xr_teleport_blink_module.js"), { distance: 1.25 });

    // World stack
    await tryEnable("createLobbyHallwaysModule", () => importIfExists("./modules/world/lobby_hallways_module.js"));
    await tryEnable("createRoomManagerModule", () => importIfExists("./modules/world/room_manager_module.js"));
    await tryEnable("createRoomPortalsModule", () => importIfExists("./modules/world/room_portals_module.js"), { portalCount: 20 });
    await tryEnable("createDoorTeleportModule", () => importIfExists("./modules/world/door_teleport_module.js"), { doorToRoom: [0, 1, 2, 3] });

    await tryEnable("createWorldMasterModule", () => importIfExists("./modules/world/world_master_module.js"));
    await tryEnable("createScorpionThemeModule", () => importIfExists("./modules/world/scorpion_theme_module.js"));
    await tryEnable("createJumbotronsModule", () => importIfExists("./modules/world/jumbotrons_module.js"));

    // Game / show
    await tryEnable("createShowgameModule", () => importIfExists("./modules/game/showgame_module.js"), { dealInterval: 6.0 });
    await tryEnable("createInteractionPolicyModule", () => importIfExists("./modules/game/interaction_policy_module.js"));

    log("boot complete ✅");
  };

  boot().catch((e) => err("boot failed:", e));

  // ---------- Render loop ----------
  let last = performance.now() / 1000;
  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.001, now - last));
    last = now;

    for (const m of modules) {
      try { m.update?.(ctx, { dt, input: ctx.input }); } catch (e) { err("update failed:", m.name, e); }
    }

    try { renderer.render(scene, camera); } catch (e) { err("render failed:", e); }
  });

  log("orchestrator running ✅", { safeMode, noHud, trace });

  return { ctx, scene, camera, renderer, playerRig, enable, modules };
        }
