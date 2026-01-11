// /js/world.js — Scarlett MASTER WORLD (Yesterday Build) v1.0 (FULL)
// ✅ Export: { HybridWorld }  (keeps compatibility with your current boot/index pipeline)
// ✅ Restores: circular lobby + hallways + store + scorpion room + teleport + bots + poker
// ✅ No VRPanel / no face HUD in Quest (DOM HUD is handled in index.html, not here)
// ✅ Never-black: always builds base scene + floor + landmark
// ✅ Modular + fail-safe: missing modules won’t crash the build (logs will show what failed)
// ✅ Sunken table support: prefers BossTable, falls back to TableFactory with { sunken:true } if supported
// ✅ Safe spawn helpers: hard ground spawn + snapDown + goto areas (returned to index.js if you want)

export const HybridWorld = (() => {
  const S = {
    THREE: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    scene: null,
    clock: null,

    OPTS: {
      nonvrControls: true,     // keyboard+drag (desktop); Android touch should be handled in index.js
      allowTeleport: true,
      allowBots: true,
      allowPoker: true,
      allowStream: true,
      safeMode: false,

      // yesterday world preferences
      table: { sunken: true, seats: 8 }
    },

    root: null,
    floor: null,

    mods: {},
    systems: {},

    anchors: {
      spawn: null,
      facing: null
    },

    built: false
  };

  // -----------------------
  // utils
  // -----------------------
  const safeLog = (...a) => { try { S.log?.(...a); } catch(e) {} };

  async function tryImport(path) {
    try {
      const m = await import(path);
      safeLog("[world] import ok:", path);
      return m;
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

  function ensureAnchors() {
    const THREE = S.THREE;
    if (!S.anchors.spawn)  S.anchors.spawn  = new THREE.Vector3(0, 0, 26);
    if (!S.anchors.facing) S.anchors.facing = new THREE.Vector3(0, 1.65, 0);
  }

  function optsAllow(key) {
    if (S.OPTS?.safeMode) return false;
    return S.OPTS?.[key] !== false;
  }

  // -----------------------
  // Base scene (never black)
  // -----------------------
  function makeBaseScene() {
    const THREE = S.THREE;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    // light
    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    S.floor = floor;

    // landmark ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0x071025,
        emissiveIntensity: 0.35
      })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    scene.add(ring);

    return scene;
  }

  function ensureRoot() {
    const THREE = S.THREE;
    if (S.root && S.root.parent === S.scene) return S.root;

    const root = new THREE.Group();
    root.name = "MasterRoot";
    S.scene.add(root);
    S.root = root;
    return root;
  }

  function hardSpawnGround() {
    ensureAnchors();
    const { player, camera, THREE } = S;

    // hard spawn
    player.position.set(S.anchors.spawn.x, 0.02, S.anchors.spawn.z);
    camera.position.set(0, 1.65, 0);

    // face target
    const target = S.anchors.facing.clone();
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);
    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[spawn] HARD ✅ (yesterday world)", `x=${player.position.x.toFixed(2)}`, `y=${player.position.y.toFixed(2)}`, `z=${player.position.z.toFixed(2)}`);
  }

  // -----------------------
  // Build modules (yesterday world)
  // -----------------------
  async function buildYesterdayWorld() {
    const THREE = S.THREE;
    const root = ensureRoot();

    // wipe root children each rebuild
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // Imports (order matters: spawn/decor/walls first)
    const spawnMod        = await tryImport("./spawn_points.js");
    const decorMod        = await tryImport("./lobby_decor.js");
    const wallsMod        = await tryImport("./solid_walls.js");
    const storeMod        = await tryImport("./store.js");
    const scorpionMod     = await tryImport("./scorpion_room.js");
    const bossTableMod    = await tryImport("./boss_table.js");
    const tableFactoryMod = await tryImport("./table_factory.js");
    const botsMod         = await tryImport("./bots.js");
    const pokerSimMod     = await tryImport("./poker_sim.js");
    const roomMgrMod      = await tryImport("./room_manager.js");
    const tpMachineMod    = await tryImport("./teleport_machine.js");
    const tpMod           = await tryImport("./teleport.js");

    S.mods = {
      spawnMod, decorMod, wallsMod, storeMod, scorpionMod,
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod,
      roomMgrMod, tpMachineMod, tpMod
    };

    // SPAWN POINTS (optional)
    try {
      const SP = spawnMod?.SpawnPoints || spawnMod?.default;
      if (SP?.apply) {
        SP.apply({ THREE, root, player: S.player, log: S.log });
        safeLog("[spawn] SpawnPoints applied ✅");
      }
    } catch (e) {
      safeLog("[spawn] SpawnPoints apply FAIL", e?.message || e);
    }

    // DECOR (lobby ring / props)
    try {
      const Decor = decorMod?.LobbyDecor || decorMod?.default;
      if (Decor?.init) {
        await Decor.init({ THREE, scene: S.scene, root, log: S.log });
        safeLog("[decor] LobbyDecor ✅");
      } else {
        safeLog("[decor] LobbyDecor missing init (skipped)");
      }
    } catch (e) {
      safeLog("[decor] LobbyDecor FAIL", e?.message || e);
    }

    // WALLS / HALLWAYS (this restores “other rooms” pathways)
    try {
      const SW = wallsMod?.SolidWalls || wallsMod?.default || (typeof wallsMod?.init === "function" ? wallsMod : null);
      const fn = SW?.init || SW?.build || SW?.create;
      if (fn) {
        await fn.call(SW, { THREE, scene: S.scene, root, log: S.log });
        safeLog("[walls] ✅ (hallways/rooms shell)");
      } else {
        safeLog("[walls] missing SolidWalls.init ❌ (rooms/hallways won't appear)");
      }
    } catch (e) {
      safeLog("[walls] FAIL", e?.message || e);
    }

    // STORE
    try {
      const Store = storeMod?.StoreSystem || storeMod?.default;
      if (Store?.init) {
        S.systems.store = await Store.init({
          THREE, scene: S.scene, root,
          player: S.player, camera: S.camera, log: S.log
        });
        // Many builds expose setActive — make sure store is on in lobby
        try { Store.setActive?.(true); } catch(e) {}
        safeLog("[store] StoreSystem ✅");
      } else {
        safeLog("[store] StoreSystem missing init (skipped)");
      }
    } catch (e) {
      safeLog("[store] FAIL", e?.message || e);
    }

    // SCORPION ROOM
    try {
      const Sc = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (Sc?.init) {
        S.systems.scorpion = await Sc.init({
          THREE, scene: S.scene, root,
          player: S.player, camera: S.camera, log: S.log
        });
        safeLog("[scorpion] ✅");
      } else {
        safeLog("[scorpion] missing init (skipped)");
      }
    } catch (e) {
      safeLog("[scorpion] FAIL", e?.message || e);
    }

    // TABLE (prefer BossTable; fallback to TableFactory; else placeholder)
    let tableObj = null;

    const BossTableAPI =
      bossTableMod?.BossTable ||
      bossTableMod?.default ||
      (typeof bossTableMod?.init === "function" ? bossTableMod : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({
          THREE, scene: S.scene, root,
          log: S.log,
          OPTS: S.OPTS?.table || { sunken: true }
        });
        safeLog("[table] BossTable.init ✅");
      } catch (e) {
        safeLog("[table] BossTable.init FAIL", e?.message || e);
      }
    }

    if (!tableObj) {
      const TF = tableFactoryMod?.TableFactory || tableFactoryMod?.default;
      if (TF?.create) {
        try {
          tableObj = await TF.create({
            THREE, root, log: S.log,
            OPTS: S.OPTS?.table || { sunken: true, seats: 8 }
          });
          safeLog("[table] TableFactory.create ✅");
        } catch (e) {
          safeLog("[table] TableFactory.create FAIL", e?.message || e);
        }
      }
    }

    if (!tableObj) {
      // final fallback
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      t.position.set(0, 1.05, 0);
      t.name = "PlaceholderTable";
      root.add(t);
      safeLog("[table] fallback placeholder (missing BossTable/TableFactory)");
      tableObj = t;
    }

    // TELEPORT (machine preferred)
    if (optsAllow("allowTeleport")) {
      const tp = tpMachineMod?.TeleportMachine || tpMod?.Teleport || tpMod?.default;
      if (tp?.init) {
        try {
          S.systems.teleport = await tp.init({
            THREE,
            scene: S.scene,
            renderer: S.renderer,
            camera: S.camera,
            player: S.player,
            controllers: S.controllers,
            log: S.log,
            world: { floor: S.floor, root }
          });
          safeLog("[teleport] ✅");
        } catch (e) {
          safeLog("[teleport] FAIL", e?.message || e);
        }
      } else {
        safeLog("[teleport] module missing — skipped");
      }
    }

    // BOTS
    if (optsAllow("allowBots") && botsMod?.Bots?.init) {
      try {
        S.systems.bots = await botsMod.Bots.init({
          THREE, scene: S.scene, root,
          player: S.player, log: S.log
        });
        safeLog("[bots] ✅");
      } catch (e) {
        safeLog("[bots] FAIL", e?.message || e);
      }
    }

    // POKER
    if (optsAllow("allowPoker") && pokerSimMod?.PokerSim?.init) {
      try {
        S.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: S.scene, root,
          table: tableObj, player: S.player, camera: S.camera, log: S.log
        });
        safeLog("[poker] ✅");
      } catch (e) {
        safeLog("[poker] FAIL", e?.message || e);
      }
    }

    // ROOM MANAGER (ties lobby/store/scorpion)
    if (roomMgrMod?.RoomManager?.init) {
      try {
        S.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: S.scene, root,
          player: S.player, camera: S.camera,
          systems: S.systems, log: S.log
        });
        safeLog("[rm] ✅");
      } catch (e) {
        safeLog("[rm] FAIL", e?.message || e);
      }
    }

    safeLog("[world] YOUR master world restored ✅ (yesterday build)");
  }

  // -----------------------
  // Public API
  // -----------------------
  return {
    // Optional helpers you can call from index.js buttons if you want
    respawnSafe() { hardSpawnGround(); },
    snapDown() { try { S.player.position.y = 0.02; } catch(e) {} },

    async build({ THREE, renderer, camera, player, controllers, log, OPTS }) {
      S.THREE = THREE;
      S.renderer = renderer;
      S.camera = camera;
      S.player = player;
      S.controllers = controllers || {};
      S.log = log || console.log;

      S.OPTS = { ...S.OPTS, ...(OPTS || {}) };

      S.clock = new THREE.Clock();
      ensureAnchors();

      // fresh scene each build
      S.scene = makeBaseScene();
      if (!S.scene.children.includes(player)) S.scene.add(player);

      // IMPORTANT: do not attach any VR panel or HUD to camera here
      // The only UI should be DOM-based in index.html.

      hardSpawnGround();
      await buildYesterdayWorld();

      S.built = true;
      safeLog("[world] build complete ✅");
      safeLog("✅ HybridWorld.build ✅");
    },

    async rebuild(ctx) {
      S.built = false;

      // dispose systems best-effort
      try { S.systems.teleport?.dispose?.(); } catch(e) {}
      try { S.systems.bots?.dispose?.(); } catch(e) {}
      try { S.systems.poker?.dispose?.(); } catch(e) {}
      try { S.systems.room?.dispose?.(); } catch(e) {}

      // dispose root
      try {
        if (S.root) {
          S.scene?.remove(S.root);
          disposeObject3D(S.root);
        }
      } catch(e) {}
      S.root = null;

      S.mods = {};
      S.systems = {};

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!S.scene) return;

      const dt = S.clock ? S.clock.getDelta() : 0.016;

      // updates
      try { S.systems.bots?.update?.(dt); } catch(e) {}
      try { S.systems.poker?.update?.(dt); } catch(e) {}
      try { S.systems.room?.update?.(dt); } catch(e) {}
      try { S.systems.teleport?.update?.(dt); } catch(e) {}

      renderer.render(S.scene, camera);
    }
  };
})();
