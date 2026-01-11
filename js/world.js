// /js/world.js — Scarlett VR Poker HybridWorld RESTORE 1.5 (FULL)
// Goal: bring back YOUR real lobby/store/rooms, while permanently disabling the stuck face panel in 2D.
// ✅ Uses your existing modules if they exist (World v11 style):
//    textures.js, lights_pack.js, solid_walls.js, spectator_rail.js, teleport_machine.js,
//    store.js, scorpion_room.js, spawn_points.js, room_manager.js, poker_sim.js, bots.js,
//    boss_table.js, table_factory.js
// ✅ Android touch controls + keyboard movement
// ✅ 2D Panel Killer: removes any camera-attached panel/HUD/menu every frame (non-XR)
// ✅ Quest-safe: doesn’t break XR; just avoids 2D stuck menu

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
      safeMode: false
    },

    root: null,
    floor: null,

    // systems
    systems: {},
    mods: {},

    // spawn
    spawn: { x: 0, y: 0, z: 26 },
    facing: { x: 0, y: 1.5, z: 0 },

    __betTimer: 0
  };

  // ----------------------
  // helpers
  // ----------------------
  const safeLog = (...a) => { try { state.log?.(...a); } catch (e) {} };

  async function tryImport(path) {
    try {
      const mod = await import(path);
      safeLog("[world] import ok:", path);
      return mod;
    } catch (e) {
      safeLog("[world] import FAIL:", path, e?.message || e);
      return null;
    }
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
    } catch(e) {}
  }

  // ✅ Hard disable any face panel in 2D
  function killFacePanels2D() {
    // Only kill when NOT in XR
    if (state.renderer?.xr?.isPresenting) return;
    const cam = state.camera;
    if (!cam) return;

    // Remove suspicious camera children
    for (let i = cam.children.length - 1; i >= 0; i--) {
      const ch = cam.children[i];
      const n = (ch?.name || "").toLowerCase();
      if (
        n.includes("vrpanel") ||
        n.includes("panel") ||
        n.includes("hud") ||
        n.includes("menu") ||
        n.includes("uipanel")
      ) {
        try { cam.remove(ch); } catch(e) {}
        try { disposeObject3D(ch); } catch(e) {}
      }
    }

    // Remove nested objects with userData.label (old UI buttons)
    try {
      cam.traverse?.((o) => {
        if (!o) return;
        if (typeof o?.userData?.label === "string") {
          try { o.parent?.remove(o); } catch(e) {}
          try { disposeObject3D(o); } catch(e) {}
        }
      });
    } catch(e) {}
  }

  // ----------------------
  // base scene
  // ----------------------
  function makeBaseScene() {
    const THREE = state.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    // landmark (so never-black, never-empty)
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

  function applySpawn() {
    const { player, camera, spawn, facing, THREE } = state;

    player.position.set(spawn.x, spawn.y, spawn.z);
    camera.position.set(0, 1.65, 0);

    // Face toward target
    const target = new THREE.Vector3(facing.x, facing.y, facing.z);
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);
    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[spawn] set", spawn);
  }

  // ----------------------
  // Android / Desktop controls
  // ----------------------
  function installNonVRControls() {
    if (state.systems.nonvr?.__installed) return;

    const { camera, player } = state;
    const keys = new Set();

    // Desktop pointer look
    let dragging = false;
    let lastX = 0, lastY = 0;
    let yaw = 0, pitch = 0;

    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    window.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      player.rotation.y = yaw;
      camera.rotation.x = pitch;
    });

    // Touch UI (Android)
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

    const touchAPI = {
      toggleDebug: () => document.getElementById("overlay")?.classList.toggle("min"),
      toggleHUD: () => {
        const hud = document.getElementById("hudTop") || document.getElementById("hud");
        if (hud) hud.style.display = (hud.style.display === "none" ? "" : "none");
        else document.getElementById("overlay")?.classList.toggle("hide");
      },
      gotoTable: () => { player.position.set(0, 0, 4.2); player.rotation.set(0, Math.PI, 0); },
      safeMode: () => {
        state.OPTS.safeMode = true;
        state.OPTS.allowBots = false;
        state.OPTS.allowPoker = false;
        state.OPTS.allowTeleport = false;
        safeLog("[touch] SAFE MODE ✅");
      }
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

    safeLog("[nonvr] controls ✅");
  }

  function attachHandsToRig() {
    // harmless in 2D; helpful in XR
    try {
      const L = state.controllers?.handLeft;
      const R = state.controllers?.handRight;
      if (L && L.parent !== state.player) state.player.add(L);
      if (R && R.parent !== state.player) state.player.add(R);
    } catch(e) {}
  }

  // ----------------------
  // restore your world modules
  // ----------------------
  async function buildYourWorld() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // Clear previous root
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // Import the modules you previously used (if they exist)
    const texturesMod      = await tryImport("./textures.js");
    const lightsPackMod    = await tryImport("./lights_pack.js");
    const solidWallsMod    = await tryImport("./solid_walls.js");
    const spectatorRailMod = await tryImport("./spectator_rail.js");
    const storeMod         = await tryImport("./store.js");
    const scorpionMod      = await tryImport("./scorpion_room.js");
    const spawnPointsMod   = await tryImport("./spawn_points.js");

    const bossTableMod     = await tryImport("./boss_table.js");
    const tableFactoryMod  = await tryImport("./table_factory.js");
    const botsMod          = await tryImport("./bots.js");
    const pokerSimMod      = await tryImport("./poker_sim.js");
    const roomMgrMod       = await tryImport("./room_manager.js");

    const tpMachineMod     = await tryImport("./teleport_machine.js");
    const tpMod            = await tryImport("./teleport.js");

    // Also allow newer decor modules if present
    const lobbyDecorMod    = await tryImport("./lobby_decor.js");
    const storeRoomMod     = await tryImport("./store_room.js");
    const spectatorMod2    = await tryImport("./spectator.js");
    const seatingMod       = await tryImport("./seating.js");
    const chipsMod         = await tryImport("./chips.js");

    state.mods = {
      texturesMod, lightsPackMod, solidWallsMod, spectatorRailMod, storeMod, scorpionMod, spawnPointsMod,
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod, roomMgrMod, tpMachineMod, tpMod,
      lobbyDecorMod, storeRoomMod, spectatorMod2, seatingMod, chipsMod
    };

    // Spawn points (if you have them)
    try {
      const SP = spawnPointsMod?.SpawnPoints || spawnPointsMod?.default;
      if (SP?.lobby) {
        state.spawn.x = SP.lobby.x ?? state.spawn.x;
        state.spawn.y = SP.lobby.y ?? state.spawn.y;
        state.spawn.z = SP.lobby.z ?? state.spawn.z;
      }
      if (SP?.facing) {
        state.facing.x = SP.facing.x ?? state.facing.x;
        state.facing.y = SP.facing.y ?? state.facing.y;
        state.facing.z = SP.facing.z ?? state.facing.z;
      }
      safeLog("[spawn] SpawnPoints applied ✅");
    } catch(e){}

    // Lights pack (if your pack exists)
    try {
      const LP = lightsPackMod?.LightsPack || lightsPackMod?.default;
      if (LP?.init) {
        state.systems.lights = LP.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[lights] LightsPack ✅");
      }
    } catch(e){ safeLog("[lights] pack FAIL", e?.message || e); }

    // Walls / lobby build (if you have it)
    try {
      const SW = solidWallsMod?.SolidWalls || solidWallsMod?.default;
      if (SW?.init) {
        state.systems.walls = SW.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[walls] SolidWalls ✅");
      }
    } catch(e){ safeLog("[walls] FAIL", e?.message || e); }

    // Spectator rail (old or new)
    try {
      const SR = spectatorRailMod?.SpectatorRail || spectatorMod2?.SpectatorRail || spectatorRailMod?.default;
      if (SR?.init) {
        state.systems.spectator = SR.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[spectator] ✅");
      }
    } catch(e){ safeLog("[spectator] FAIL", e?.message || e); }

    // Store (old store.js system or new store_room.js)
    try {
      const StoreSystem = storeMod?.StoreSystem || storeMod?.default;
      if (StoreSystem?.init) {
        state.systems.store = StoreSystem.init({
          THREE, scene: state.scene, root,
          world: { root }, player: state.player, camera: state.camera,
          log: state.log
        });
        safeLog("[store] StoreSystem ✅");
      } else if (storeRoomMod?.StoreRoom?.init) {
        state.systems.store = storeRoomMod.StoreRoom.init({ THREE, root, log: state.log });
        safeLog("[store] StoreRoom ✅");
      }
    } catch(e){ safeLog("[store] FAIL", e?.message || e); }

    // Scorpion room (if exists)
    try {
      const ScorpionRoom = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (ScorpionRoom?.init) {
        state.systems.scorpion = ScorpionRoom.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[scorpion] ✅");
      }
    } catch(e){ safeLog("[scorpion] FAIL", e?.message || e); }

    // Hallways / lobby decor (if exists)
    try {
      const LobbyDecor = lobbyDecorMod?.LobbyDecor || lobbyDecorMod?.default;
      if (LobbyDecor?.init) {
        state.systems.decor = LobbyDecor.init({ THREE, root, log: state.log });
        safeLog("[decor] LobbyDecor ✅");
      }
    } catch(e){ safeLog("[decor] FAIL", e?.message || e); }

    // TABLE (prefer BossTable, then TableFactory) — keeps your real orientation/branding
    let tableObj = null;
    try {
      const BossTable = bossTableMod?.BossTable || bossTableMod?.default;
      if (BossTable?.init) {
        tableObj = await BossTable.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable ✅");
      }
    } catch(e){ safeLog("[table] BossTable FAIL", e?.message || e); }

    if (!tableObj) {
      try {
        const TF = tableFactoryMod?.TableFactory || tableFactoryMod?.default;
        if (TF?.create) {
          tableObj = await TF.create({ THREE, root, log: state.log });
          safeLog("[table] TableFactory ✅");
        }
      } catch(e){ safeLog("[table] TableFactory FAIL", e?.message || e); }
    }

    // Final fallback table (only if both missing)
    if (!tableObj) {
      tableObj = new THREE.Mesh(
        new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      tableObj.position.set(0, 1.05, 0);
      tableObj.name = "FallbackTable";
      root.add(tableObj);
      safeLog("[table] fallback placeholder (missing BossTable/TableFactory)");
    }

    // If table orientation is “wrong”, snap it to face player (gentle fix)
    try {
      // Some builds load table rotated weird; align “front” toward player initial facing.
      // This won’t break good tables; it only applies a 90/180 correction if needed.
      const yaw = state.player.rotation.y;
      const ry = tableObj.rotation?.y ?? 0;
      // normalize to [-PI, PI]
      const norm = (v) => {
        while (v > Math.PI) v -= Math.PI * 2;
        while (v < -Math.PI) v += Math.PI * 2;
        return v;
      };
      const d = Math.abs(norm(ry - yaw));
      // If table is basically sideways (~90deg) or backwards (~180deg), rotate to match player
      if (d > 1.2) {
        tableObj.rotation.y = yaw;
        safeLog("[table] orientation corrected ✅");
      }
    } catch(e){}

    // Seating & chips (optional)
    try {
      const tablePos = new THREE.Vector3();
      tableObj.getWorldPosition(tablePos);

      if (seatingMod?.SeatingSystem?.init) {
        state.systems.seating = seatingMod.SeatingSystem.init({
          THREE, scene: state.scene, root,
          camera: state.camera, player: state.player,
          log: state.log, tablePos, seatCount: 8
        });
        safeLog("[seat] ✅");
      }

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
          THREE, root, log: state.log, seatPositions,
          potPos: new THREE.Vector3(tablePos.x, 0, tablePos.z)
        });
        state.__betTimer = 0;
        safeLog("[chips] ✅");
      }
    } catch(e){ safeLog("[seat/chips] FAIL", e?.message || e); }

    // Teleport (optional) — prefer TeleportMachine then Teleport
    if (!state.OPTS.safeMode && state.OPTS.allowTeleport) {
      try {
        const TP = tpMachineMod?.TeleportMachine || tpMachineMod?.default || tpMod?.Teleport || tpMod?.default;
        if (TP?.init) {
          state.systems.teleport = await TP.init({
            THREE,
            scene: state.scene,
            renderer: state.renderer,
            camera: state.camera,
            player: state.player,
            controllers: state.controllers,
            log: state.log,
            world: { floor: state.floor, root }
          });
          safeLog("[teleport] ✅");
        }
      } catch(e){ safeLog("[teleport] FAIL", e?.message || e); }
    }

    // Bots (optional)
    if (!state.OPTS.safeMode && state.OPTS.allowBots && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({
          THREE, scene: state.scene, root,
          player: state.player, log: state.log
        });
        safeLog("[bots] ✅");
      } catch(e){ safeLog("[bots] FAIL", e?.message || e); }
    }

    // PokerSim (optional)
    if (!state.OPTS.safeMode && state.OPTS.allowPoker && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera,
          log: state.log
        });
        safeLog("[poker] ✅");
      } catch(e){ safeLog("[poker] FAIL", e?.message || e); }
    }

    // RoomManager (optional)
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems,
          log: state.log
        });
        safeLog("[rm] ✅");
      } catch(e){ safeLog("[rm] FAIL", e?.message || e); }
    }

    safeLog("[world] YOUR world restored ✅");
  }

  // ----------------------
  // Public API
  // ----------------------
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

      // Base scene
      state.scene = makeBaseScene();
      if (!state.scene.children.includes(player)) state.scene.add(player);

      attachHandsToRig();

      // Android controls
      if (state.OPTS.nonvrControls !== false) installNonVRControls();

      // Kill any stuck panels immediately (2D)
      killFacePanels2D();

      // Try to rebuild your world using your modules
      await buildYourWorld();

      // Apply spawn after modules (SpawnPoints may have updated it)
      applySpawn();

      safeLog("[world] build complete ✅");
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;
      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // ✅ Always kill face panels in 2D, every frame
      killFacePanels2D();

      // Updates
      try { state.systems.nonvr?.update?.(dt); } catch(e) {}
      try { state.systems.__touch?.update?.(dt); } catch(e) {}

      try { state.systems.seating?.update?.(dt); } catch(e) {}
      try { state.systems.store?.update?.(dt); } catch(e) {}
      try { state.systems.decor?.update?.(dt); } catch(e) {}
      try { state.systems.scorpion?.update?.(dt); } catch(e) {}
      try { state.systems.spectator?.update?.(dt); } catch(e) {}

      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      // Simple chip demo loop (only if ChipSystem exists)
      try {
        if (state.systems.chips?.bet) {
          state.__betTimer += dt;
          if (state.__betTimer > 2.0) {
            state.__betTimer = 0;
            const seatId = "P" + (1 + Math.floor(Math.random() * 8));
            state.systems.chips.bet(seatId, 1 + Math.floor(Math.random() * 3));
          }
        }
      } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
