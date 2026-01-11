// /js/world.js — Scarlett VR Poker HybridWorld 1.4 (FULL, SIMPLE, ANDROID-FIRST)
// ✅ NO VRPanel at all (removed)
// ✅ Aggressive 2D "face-panel killer": removes any camera-attached panels every frame
// ✅ Android touch controls remain
// ✅ Modular world loads (decor/store/seating/chips + optional teleport/bots/poker)

import { TouchControls } from "./touch_controls.js";

export const HybridWorld = (() => {
  const state = {
    THREE: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    scene: null,
    clock: null,

    OPTS: {
      nonvrControls: true,
      allowTeleport: true,
      allowBots: true,
      allowPoker: true,
      allowStream: false,
      safeMode: false
    },

    root: null,
    floor: null,

    systems: {},
    __betTimer: 0
  };

  const safeLog = (...a) => { try { state.log?.(...a); } catch(e) {} };

  async function tryImport(path) {
    try { const m = await import(path); safeLog("[world] import ok:", path); return m; }
    catch(e){ safeLog("[world] import FAIL:", path, e?.message || e); return null; }
  }

  function disposeObject3D(obj) {
    if (!obj) return;
    try {
      obj.traverse?.((o) => {
        if (o.geometry?.dispose) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.());
          else o.material?.dispose?.();
        }
      });
    } catch(e){}
  }

  function makeBaseScene() {
    const THREE = state.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    scene.add(ring);

    return scene;
  }

  function ensureRoot() {
    const THREE = state.THREE;
    if (state.root && state.root.parent === state.scene) return state.root;
    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;
    return root;
  }

  // ✅ THIS IS THE SIMPLE FIX:
  // Remove ANY camera-attached objects that look like an in-your-face panel.
  function killFacePanelNow() {
    if (!state.camera) return;

    // Only kill in 2D (Android/Desktop). In XR we can allow normal hands-only.
    if (state.renderer?.xr?.isPresenting) return;

    const cam = state.camera;

    // Remove common names + anything with button-like labels
    for (let i = cam.children.length - 1; i >= 0; i--) {
      const ch = cam.children[i];
      const n = (ch?.name || "").toLowerCase();
      const looksLikePanel =
        n.includes("panel") || n.includes("hud") || n.includes("menu") || n.includes("vr") || n.includes("uipanel");
      if (looksLikePanel) {
        try { cam.remove(ch); disposeObject3D(ch); } catch(e){}
      }
    }

    // Remove any nested objects with "label" userData (common for UI buttons)
    try {
      cam.traverse?.((o) => {
        if (!o) return;
        const lbl = o?.userData?.label;
        if (typeof lbl === "string" && o.parent) {
          try { o.parent.remove(o); disposeObject3D(o); } catch(e){}
        }
      });
    } catch(e){}
  }

  function installNonVRControls() {
    if (state.systems.nonvr?.__installed) return;
    const { camera, player } = state;

    const keys = new Set();
    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    // Touch UI (Android)
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    const touchAPI = {
      toggleDebug: () => document.getElementById("overlay")?.classList.toggle("min"),
      toggleHUD: () => {
        const hud = document.getElementById("hudTop");
        if (hud) hud.style.display = (hud.style.display === "none" ? "" : "none");
        else document.getElementById("overlay")?.classList.toggle("hide");
      },
      gotoTable: () => { player.position.set(0, 0, 4.2); player.rotation.set(0, Math.PI, 0); },
      rebuild: async () => safeLog("[touch] rebuild: use page reload for now"),
      safeMode: () => { state.OPTS.safeMode = true; safeLog("[touch] SAFE MODE ✅"); }
    };

    if (isTouch) {
      try {
        TouchControls.init({ THREE: state.THREE, player, camera, log: state.log, api: touchAPI });
        state.systems.__touch = TouchControls;
        safeLog("[touch] init ✅");
      } catch (e) {
        safeLog("[touch] init FAIL", e?.message || e);
      }
    }

    state.systems.nonvr = {
      __installed: true,
      update(dt) {
        if (state.renderer?.xr?.isPresenting) return;

        // Touch movement
        let moveX = 0, moveY = 0;
        try {
          const out = state.systems.__touch?.update?.(dt);
          if (out) { moveX = out.moveX || 0; moveY = out.moveY || 0; }
        } catch(e){}

        // Keyboard movement
        const fwdKB = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
        const strKB = (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

        const fwd = moveY + fwdKB;
        const str = moveX + strKB;

        if (!fwd && !str) return;

        const speed = (keys.has("ShiftLeft") ? 6 : 3) * dt;

        const dir = new state.THREE.Vector3();
        player.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        const right = new state.THREE.Vector3(dir.z, 0, -dir.x);
        player.position.addScaledVector(dir, fwd * speed);
        player.position.addScaledVector(right, str * speed);
      }
    };
  }

  async function buildModules() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // clear root content
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // imports (optional)
    const decorMod     = await tryImport("./lobby_decor.js");
    const spectatorMod = await tryImport("./spectator.js");
    const storeRoomMod = await tryImport("./store_room.js");
    const seatingMod   = await tryImport("./seating.js");
    const chipsMod     = await tryImport("./chips.js");

    const botsMod      = await tryImport("./bots.js");
    const pokerSimMod  = await tryImport("./poker_sim.js");
    const roomMgrMod   = await tryImport("./room_manager.js");
    const tpMachineMod = await tryImport("./teleport_machine.js");
    const tpMod        = await tryImport("./teleport.js");

    // table placeholder (always present)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
      new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
    );
    table.position.set(0, 1.05, 0);
    root.add(table);

    const tablePos = new THREE.Vector3(0,0,0);
    table.getWorldPosition(tablePos);

    // Decor / halls
    if (decorMod?.LobbyDecor?.init) state.systems.decor = decorMod.LobbyDecor.init({ THREE, root, log: state.log });
    if (spectatorMod?.SpectatorRail?.init) state.systems.spectator = spectatorMod.SpectatorRail.init({ THREE, root, log: state.log });
    if (storeRoomMod?.StoreRoom?.init) state.systems.store = storeRoomMod.StoreRoom.init({ THREE, root, log: state.log });

    // Seating
    if (seatingMod?.SeatingSystem?.init) {
      state.systems.seating = seatingMod.SeatingSystem.init({
        THREE, root, camera: state.camera, player: state.player,
        log: state.log, tablePos, seatCount: 8
      });
    }

    // Chips
    if (chipsMod?.ChipSystem?.init) {
      const seatPositions = [];
      const count = 8;
      const radius = 3.35;
      for (let i=0; i<count; i++){
        const a = (i/count) * Math.PI*2;
        seatPositions.push(new THREE.Vector3(
          tablePos.x + Math.sin(a)*radius,
          0,
          tablePos.z + Math.cos(a)*radius
        ));
      }
      state.systems.chips = chipsMod.ChipSystem.init({
        THREE, root, log: state.log,
        seatPositions,
        potPos: new THREE.Vector3(tablePos.x, 0, tablePos.z)
      });
      state.__betTimer = 0;
    }

    // Teleport (optional)
    if (!state.OPTS.safeMode && state.OPTS.allowTeleport) {
      const tp = tpMachineMod?.TeleportMachine || tpMod?.Teleport || tpMod?.default;
      if (tp?.init) {
        try {
          state.systems.teleport = await tp.init({
            THREE,
            scene: state.scene,
            renderer: state.renderer,
            camera: state.camera,
            player: state.player,
            controllers: state.controllers,
            log: state.log,
            world: { floor: state.floor, root }
          });
        } catch(e) { safeLog("[teleport] init FAIL", e?.message || e); }
      }
    }

    // Bots (optional)
    if (!state.OPTS.safeMode && state.OPTS.allowBots && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({ THREE, scene: state.scene, root, player: state.player, log: state.log });
      } catch(e) { safeLog("[bots] init FAIL", e?.message || e); }
    }

    // Poker (optional)
    if (!state.OPTS.safeMode && state.OPTS.allowPoker && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table, player: state.player, camera: state.camera, log: state.log
        });
      } catch(e) { safeLog("[poker] init FAIL", e?.message || e); }
    }

    // Room manager (optional)
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
      } catch(e) { safeLog("[rm] init FAIL", e?.message || e); }
    }

    safeLog("[world] modules built ✅");
  }

  return {
    async build({ THREE, renderer, camera, player, controllers, log, OPTS }) {
      state.THREE = THREE;
      state.renderer = renderer;
      state.camera = camera;
      state.player = player;
      state.controllers = controllers;
      state.log = log || console.log;
      state.OPTS = { ...state.OPTS, ...(OPTS || {}) };

      state.clock = new THREE.Clock();

      state.scene = makeBaseScene();
      if (!state.scene.children.includes(player)) state.scene.add(player);

      // spawn
      player.position.set(0, 0, 26);
      camera.position.set(0, 1.65, 0);

      // install android controls
      if (state.OPTS.nonvrControls !== false) installNonVRControls();

      // ✅ kill any stuck panels immediately
      killFacePanelNow();

      await buildModules();

      safeLog("[world] build ✅ (panel removed)");
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;
      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // ✅ kill any stuck panels EVERY FRAME in 2D
      killFacePanelNow();

      try { state.systems.nonvr?.update?.(dt); } catch(e) {}
      try { state.systems.seating?.update?.(dt); } catch(e) {}
      try { state.systems.store?.update?.(dt); } catch(e) {}
      try { state.systems.chips?.update?.(dt); } catch(e) {}
      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      // demo chip bets
      try {
        if (state.systems.chips?.bet) {
          state.__betTimer += dt;
          if (state.__betTimer > 2.0) {
            state.__betTimer = 0;
            const seatId = "P" + (1 + Math.floor(Math.random()*8));
            state.systems.chips.bet(seatId, 1 + Math.floor(Math.random()*3));
          }
        }
      } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
