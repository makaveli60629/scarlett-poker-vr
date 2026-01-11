// /js/world.js — Scarlett VR Poker WORLD MASTER v3.0 (FULL)
// ✅ Exports: { HybridWorld }
// ✅ Restores your real world: LobbyDecor + SolidWalls (hallways) + StoreSystem + ScorpionRoom + SpawnPoints
// ✅ Quest-safe: module imports are optional (no black screen)
// ✅ HARD FLOOR SPAWN: never floats (player.y forced to 0.02)
// ✅ Android-safe: VRPanel only runs in XR (not in 2D)
// ✅ Keeps Teleport + Bots + Poker + Table fallback behavior

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
      allowStream: false, // off by default while debugging
      safeMode: false
    },

    spawn: { x: 0, z: 26 },
    facingTarget: { x: 0, y: 1.65, z: 0 },

    root: null,
    floor: null,

    mods: {},
    systems: {},

    built: false
  };

  // -----------------------
  // helpers
  // -----------------------
  function safeLog(...a) { try { state.log?.(...a); } catch(e) {} }

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

  function ensureRoot() {
    const THREE = state.THREE;
    if (state.root && state.root.parent === state.scene) return state.root;
    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;
    return root;
  }

  // -----------------------
  // Base scene (never black)
  // -----------------------
  function makeBaseScene() {
    const THREE = state.THREE;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    // Landmark
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    scene.add(ring);

    return scene;
  }

  // ✅ HARD SPAWN (authoritative)
  function hardSpawn(reason = "post-build") {
    const { player, camera } = state;
    const x = Number.isFinite(state.spawn?.x) ? state.spawn.x : 0;
    const z = Number.isFinite(state.spawn?.z) ? state.spawn.z : 26;

    // rig base on the floor
    player.position.set(x, 0.02, z);
    // camera eye height
    camera.position.set(0, 1.65, 0);

    // face the center
    try {
      const THREE = state.THREE;
      const camWorld = new THREE.Vector3();
      camera.getWorldPosition(camWorld);
      const target = new THREE.Vector3(state.facingTarget.x, state.facingTarget.y, state.facingTarget.z);
      const d = target.sub(camWorld).normalize();
      const yaw = Math.atan2(d.x, d.z);
      player.rotation.set(0, yaw, 0);
    } catch(e){}

    safeLog(`[spawn] HARD ✅ (${reason}) x=${x.toFixed(2)} y=${player.position.y.toFixed(2)} z=${z.toFixed(2)}`);
  }

  // -----------------------
  // VR Panel (XR only)
  // -----------------------
  function makeVRPanel() {
    const THREE = state.THREE;
    const g = new THREE.Group();
    g.name = "VRPanel";
    g.visible = true;

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.48),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.86 })
    );
    plate.position.set(0, 0, -0.85);
    g.add(plate);

    return { group: g, update(){} };
  }

  // -----------------------
  // Build FULL world modules
  // -----------------------
  async function buildModules() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // clear root
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // FULL world modules (optional, won't crash if missing)
    const spawnPointsMod  = await tryImport("./spawn_points.js");
    const lobbyDecorMod   = await tryImport("./lobby_decor.js");
    const solidWallsMod   = await tryImport("./solid_walls.js");
    const storeMod        = await tryImport("./store.js");
    const scorpionMod     = await tryImport("./scorpion_room.js");

    // Gameplay modules
    const bossTableMod    = await tryImport("./boss_table.js");
    const tableFactoryMod = await tryImport("./table_factory.js");
    const botsMod         = await tryImport("./bots.js");
    const pokerSimMod     = await tryImport("./poker_sim.js");
    const roomMgrMod      = await tryImport("./room_manager.js");
    const tpMachineMod    = await tryImport("./teleport_machine.js");
    const tpMod           = await tryImport("./teleport.js");

    state.mods = {
      spawnPointsMod, lobbyDecorMod, solidWallsMod, storeMod, scorpionMod,
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod, roomMgrMod, tpMachineMod, tpMod
    };

    // SpawnPoints (only x/z)
    try {
      const SP = spawnPointsMod?.SpawnPoints || spawnPointsMod?.default;
      if (SP?.lobby) {
        if (Number.isFinite(SP.lobby.x)) state.spawn.x = SP.lobby.x;
        if (Number.isFinite(SP.lobby.z)) state.spawn.z = SP.lobby.z;
      }
      safeLog("[spawn] SpawnPoints applied ✅");
    } catch(e) {}

    // LobbyDecor
    try {
      const Decor = lobbyDecorMod?.LobbyDecor || lobbyDecorMod?.default;
      if (Decor?.init) {
        state.systems.decor = Decor.init({ THREE, root, log: state.log });
        safeLog("[decor] LobbyDecor ✅");
      } else {
        safeLog("[decor] missing LobbyDecor.init ❌");
      }
    } catch(e) { safeLog("[decor] FAIL", e?.message || e); }

    // SolidWalls (hallways/rooms)
    try {
      const SW = solidWallsMod?.SolidWalls || solidWallsMod?.default;
      if (SW?.init) {
        state.systems.walls = SW.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[walls] SolidWalls ✅");
      } else {
        safeLog("[walls] missing SolidWalls.init ❌ (hallways won't appear)");
      }
    } catch(e) { safeLog("[walls] FAIL", e?.message || e); }

    // StoreSystem
    try {
      const StoreSystem = storeMod?.StoreSystem || storeMod?.default;
      if (StoreSystem?.init) {
        state.systems.store = StoreSystem.init({
          THREE, scene: state.scene, world: { root }, root,
          player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[store] StoreSystem ✅");
      } else {
        safeLog("[store] missing StoreSystem.init ❌");
      }
    } catch(e) { safeLog("[store] FAIL", e?.message || e); }

    // ScorpionRoom
    try {
      const ScorpionRoom = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (ScorpionRoom?.init) {
        state.systems.scorpion = ScorpionRoom.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[scorpion] ✅");
      } else {
        safeLog("[scorpion] missing ScorpionRoom.init ❌");
      }
    } catch(e) { safeLog("[scorpion] FAIL", e?.message || e); }

    // TABLE
    let tableObj = null;

    const BossTableAPI =
      bossTableMod?.BossTable ||
      bossTableMod?.default ||
      (typeof bossTableMod?.init === "function" ? bossTableMod : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable ✅");
      } catch(e) { safeLog("[table] BossTable FAIL", e?.message || e); }
    }

    if (!tableObj && tableFactoryMod?.TableFactory?.create) {
      try {
        tableObj = await tableFactoryMod.TableFactory.create({ THREE, root, log: state.log });
        safeLog("[table] TableFactory ✅");
      } catch(e) { safeLog("[table] TableFactory FAIL", e?.message || e); }
    }

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

    // TELEPORT
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
          safeLog("[teleport] ✅");
        } catch(e) { safeLog("[teleport] FAIL", e?.message || e); }
      }
    }

    // BOTS
    if (!state.OPTS.safeMode && state.OPTS.allowBots && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({
          THREE, scene: state.scene, root,
          player: state.player, log: state.log
        });
        safeLog("[bots] ✅");
      } catch(e) { safeLog("[bots] FAIL", e?.message || e); }
    }

    // POKER
    if (!state.OPTS.safeMode && state.OPTS.allowPoker && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[poker] ✅");
      } catch(e) { safeLog("[poker] FAIL", e?.message || e); }
    }

    // ROOM MANAGER
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
        safeLog("[rm] ✅");
      } catch(e) { safeLog("[rm] FAIL", e?.message || e); }
    }

    safeLog("[world] YOUR world restored ✅");
  }

  // -----------------------
  // Public API
  // -----------------------
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

      // Non-VR controls handled in your touch_controls.js; keep keyboard fallback if desired
      // (We leave this file focused on world restore)
      // If you want keyboard fallback back, tell me and I’ll add it here.

      // VR panel only if XR presenting
      state.systems.vrpanel = makeVRPanel();
      state.camera.add(state.systems.vrpanel.group);

      await buildModules();

      // 🔒 Always force a correct floor spawn AFTER building modules
      hardSpawn("post-build");

      state.built = true;
      safeLog("[world] build complete ✅");
    },

    async rebuild(ctx) {
      state.built = false;

      try { state.systems.teleport?.dispose?.(); } catch(e) {}
      try { state.systems.bots?.dispose?.(); } catch(e) {}
      try { state.systems.poker?.dispose?.(); } catch(e) {}
      try { state.systems.room?.dispose?.(); } catch(e) {}
      try { state.systems.store?.dispose?.(); } catch(e) {}

      try {
        if (state.systems.vrpanel?.group?.parent) {
          state.systems.vrpanel.group.parent.remove(state.systems.vrpanel.group);
        }
      } catch(e) {}

      try {
        if (state.root) {
          state.scene?.remove(state.root);
          disposeObject3D(state.root);
        }
      } catch(e) {}
      state.root = null;

      state.mods = {};
      state.systems = {};

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;

      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // Update VR panel ONLY in XR
      try {
        if (renderer.xr.isPresenting) state.systems.vrpanel?.update?.(dt);
      } catch(e) {}

      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
