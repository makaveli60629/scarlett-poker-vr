// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Modular Forever
// ✅ Built-in: VRButton (so you can enter VR)
// ✅ Built-in: REAL XR controller nodes
// ✅ Built-in: Quest input mapper
// ✅ Built-in: Interactables registry + policy
// ✅ External modules load if they exist; missing ones are skipped safely

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

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

  playerRig.position.set(0, 0, 3.25);
  playerRig.rotation.set(0, Math.PI, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05050a, 1);

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.70));
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(8, 12, 6);
  scene.add(key);

  // Base floor
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

    input: {
      left:  { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
      right: { trigger: 0, squeeze: 0, stickX: 0, stickY: 0, a:false, b:false, x:false, y:false },
    },

    interactables: null,
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

  // ---------- Built-in: VRButton ----------
  function createVRButtonModule() {
    return {
      name: "vr_button",
      onEnable(ctx) {
        try {
          // Remove any old buttons
          document.querySelectorAll("#VRButton, .vr-button, button#VRButton").forEach(b => b.remove());

          const btn = VRButton.createButton(ctx.renderer);
          btn.id = "VRButton";
          btn.style.zIndex = "99999";
          document.body.appendChild(btn);

          this._btn = btn;

          // Hide/show logic
          const refresh = () => {
            const inXR = !!ctx.renderer.xr.getSession?.();
            btn.style.display = inXR ? "none" : "block";
          };

          this._refresh = refresh;
          refresh();

          // Also update on session start/end
          ctx.renderer.xr.addEventListener("sessionstart", refresh);
          ctx.renderer.xr.addEventListener("sessionend", refresh);

          console.log("[vr_button] ready ✅");
        } catch (e) {
          console.warn("[vr_button] failed (WebXR not supported?)", e);
        }
      },
      update(ctx) {
        // keep it correct if something changes
        try { this._refresh?.(); } catch {}
      }
    };
  }

  // ---------- Built-in: Interactables Registry ----------
  function createInteractablesRegistryModule() {
    return {
      name: "interactables_registry",
      onEnable(ctx) {
        const map = new Map();

        ctx.interactables = {
          register(obj, meta = {}) {
            if (!obj || !obj.isObject3D) return false;
            map.set(obj, { ...meta, object: obj });
            return true;
          },
          unregister(obj) {
            if (!obj || !obj.isObject3D) return false;
            return map.delete(obj);
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

  // ---------- Built-in: Interactables Policy ----------
  function createInteractablesPolicyModule() {
    return {
      name: "interactables_policy",
      onEnable(ctx) {
        ctx.tagInteractable = (obj, kind, grabbable) => {
          if (!obj) return;
          obj.userData = obj.userData || {};
          obj.userData.interactable = true;
          if (kind) obj.userData.kind = kind;
          if (typeof grabbable === "boolean") obj.userData.grabbable = grabbable;

          const k = String(obj.userData.kind || "unknown");
          if (typeof obj.userData.grabbable !== "boolean") obj.userData.grabbable = !(k.includes("card"));

          if (k === "community_card" || k === "bot_card") obj.userData.grabbable = false;
        };

        this._t = 0;
        this._last = 0;
        console.log("[interactables_policy] ready ✅");
      },

      update(ctx, { dt }) {
        this._t += dt;
        if (this._t < 0.25) return;
        this._t = 0;

        if (!ctx.interactables) return;

        ctx.scene.traverse((o) => {
          if (!o?.isObject3D) return;
          const ud = o.userData || {};
          if (!ud.interactable) return;

          const kind = String(ud.kind || "unknown");
          if (kind === "community_card" || kind === "bot_card") ud.grabbable = false;

          ctx.interactables.register(o, { kind, grabbable: ud.grabbable !== false });
        });

        const c = ctx.interactables.count();
        if (ctx.trace && c !== this._last) {
          console.log("[interactables_policy] registered=", c);
          this._last = c;
        }
      },
    };
  }

  // ---------- Built-in: XR Controller Nodes ----------
  function createXRControllerNodesModule() {
    return {
      name: "xr_controller_nodes",
      onEnable(ctx) {
        const c0 = ctx.renderer.xr.getController(0);
        const c1 = ctx.renderer.xr.getController(1);
        c0.name = "XRController0";
        c1.name = "XRController1";
        ctx.playerRig.add(c0);
        ctx.playerRig.add(c1);

        const makePointer = (color) => {
          const g = new THREE.CylinderGeometry(0.002, 0.002, 0.12, 6);
          const m = new THREE.MeshBasicMaterial({ color });
          const mesh = new THREE.Mesh(g, m);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.z = -0.06;
          return mesh;
        };
        c0.add(makePointer(0x33ffff));
        c1.add(makePointer(0xff66ff));

        function onConnected(e) {
          const h = e.data?.handedness;
          if (h === "left") ctx.controllers.left = e.target;
          if (h === "right") ctx.controllers.right = e.target;
          console.log("[xr_controller_nodes] connected", h, e.target?.name);
        }
        function onDisconnected(e) {
          const tgt = e.target;
          if (ctx.controllers.left === tgt) ctx.controllers.left = null;
          if (ctx.controllers.right === tgt) ctx.controllers.right = null;
          console.log("[xr_controller_nodes] disconnected", tgt?.name);
        }

        c0.addEventListener("connected", onConnected);
        c1.addEventListener("connected", onConnected);
        c0.addEventListener("disconnected", onDisconnected);
        c1.addEventListener("disconnected", onDisconnected);

        this._fallbackMap = () => {
          const s = ctx.renderer.xr.getSession?.();
          if (!s) return;
          if (!ctx.controllers.left) ctx.controllers.left = c0;
          if (!ctx.controllers.right) ctx.controllers.right = c1;
        };

        console.log("[xr_controller_nodes] ready ✅");
      },
      update(ctx) { this._fallbackMap?.(); },
    };
  }

  // ---------- Built-in: Quest Input Mapper ----------
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

        function getSession() { return ctx.renderer?.xr?.getSession?.() || null; }
        function findSource(handedness) {
          const s = getSession();
          if (!s || !s.inputSources) return null;
          for (const src of s.inputSources) {
            if (src && src.handedness === handedness && src.gamepad) return src;
          }
          return null;
        }

        function read(src, side) {
          const out = ctx.input[side];
          const gp = src?.gamepad;
          if (!gp) return;

          const b = gp.buttons || [];
          const ax = gp.axes || [];

          out.trigger = clamp01(b[0]?.value);
          out.squeeze = clamp01(b[1]?.value);

          // Bulletproof axis selection
          const pairs = [[2,3],[0,1],[3,2],[1,0]];
          let sx = 0, sy = 0;
          for (const [ix, iy] of pairs) {
            const tx = ax[ix] ?? 0;
            const ty = ax[iy] ?? 0;
            if (Math.abs(tx) + Math.abs(ty) > 0.02) { sx = tx; sy = ty; break; }
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

        this._tick = () => {
          const s = getSession();
          ctx.xrSession = s;

          if (!s) {
            ctx.input.left.trigger = ctx.input.left.squeeze = ctx.input.left.stickX = ctx.input.left.stickY = 0;
            ctx.input.right.trigger = ctx.input.right.squeeze = ctx.input.right.stickX = ctx.input.right.stickY = 0;
            ctx.input.left.x = ctx.input.left.y = false;
            ctx.input.right.a = ctx.input.right.b = false;
            return;
          }

          const L = findSource("left");
          const R = findSource("right");
          if (L) read(L, "left");
          if (R) read(R, "right");
        };

        console.log("[xr_controller_quest] ready ✅ (built-in)");
      },
      update(ctx) {
        try { this._tick?.(); } catch (e) { console.error("[xr_controller_quest] tick failed", e); }
      },
    };
  }

  // ---------- Safe dynamic import helper ----------
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
    enable(createVRButtonModule());               // ✅ this is what you were missing
    enable(createInteractablesRegistryModule());
    enable(createInteractablesPolicyModule());
    enable(createXRControllerNodesModule());
    enable(createXRControllerQuestModule());

    // External modules
    await tryEnable("createXRLocomotionModule", () => importIfExists("./modules/xr/xr_locomotion_module.js"), { speed: 2.25 });
    await tryEnable("createXRGrabModule", () => importIfExists("./modules/xr/xr_grab_module.js"));
    await tryEnable("createXRTeleportBlinkModule", () => importIfExists("./modules/xr/xr_teleport_blink_module.js"), { distance: 1.25 });
    await tryEnable("createWorldMasterModule", () => importIfExists("./modules/world/world_master_module.js"));

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

    renderer.render(scene, camera);
  });

  log("orchestrator running ✅", { safeMode, noHud, trace });
  return { ctx, scene, camera, renderer, playerRig, enable, modules };
      }
