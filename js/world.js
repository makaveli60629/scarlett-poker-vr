// /js/world.js — Scarlett MASTER WORLD (Yesterday Build) v1.1 (FULL)
// ✅ No VRPanel / no camera HUD objects created here
// ✅ Restores: circular lobby + hallways + store + scorpion room + teleport + bots + poker
// ✅ Failsafe: missing modules won't crash, logs show what's missing

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
      allowTeleport: true,
      allowBots: true,
      allowPoker: true,
      safeMode: false,
      table: { sunken: true, seats: 8 }
    },

    root: null,
    floor: null,
    systems: {},
    mods: {},

    anchors: {
      spawn: null,
      facing: null
    }
  };

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

  function makeBaseScene() {
    const THREE = S.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    S.floor = floor;

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

    player.position.set(S.anchors.spawn.x, 0.02, S.anchors.spawn.z);
    camera.position.set(0, 1.65, 0);

    const target = S.anchors.facing.clone();
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);
    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[spawn] HARD ✅ (yesterday world)", `x=${player.position.x.toFixed(2)}`, `y=${player.position.y.toFixed(2)}`, `z=${player.position.z.toFixed(2)}`);
  }

  function optsAllow(key) {
    if (S.OPTS?.safeMode) return false;
    return S.OPTS?.[key] !== false;
  }

  async function buildYesterdayWorld() {
    const THREE = S.THREE;
    const root = ensureRoot();

    // clear root
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // imports (yesterday blueprint)
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

    S.mods = { spawnMod, decorMod, wallsMod, storeMod, scorpionMod, bossTableMod, tableFactoryMod, botsMod, pokerSimMod, roomMgrMod, tpMachineMod, tpMod };

    // SpawnPoints optional
    try {
      const SP = spawnMod?.SpawnPoints || spawnMod?.default;
      if (SP?.apply) { SP.apply({ THREE, root, player: S.player, log: S.log }); safeLog("[spawn] SpawnPoints applied ✅"); }
    } catch (e) { safeLog("[spawn] SpawnPoints apply FAIL", e?.message || e); }

    // Decor
    try {
      const Decor = decorMod?.LobbyDecor || decorMod?.default;
      if (Decor?.init) { await Decor.init({ THREE, scene: S.scene, root, log: S.log }); safeLog("[decor] LobbyDecor ✅"); }
      else safeLog("[decor] LobbyDecor missing init (skipped)");
    } catch (e) { safeLog("[decor] LobbyDecor FAIL", e?.message || e); }

    // Walls/Hallways (your “other rooms” shell)
    try {
      const SW = wallsMod?.SolidWalls || wallsMod?.default || (typeof wallsMod?.init === "function" ? wallsMod : null);
      const fn = SW?.init || SW?.build || SW?.create;
      if (fn) { await fn.call(SW, { THREE, scene: S.scene, root, log: S.log }); safeLog("[walls] ✅ (hallways/rooms shell)"); }
      else safeLog("[walls] missing SolidWalls.init ❌ (rooms/hallways won't appear)");
    } catch (e) { safeLog("[walls] FAIL", e?.message || e); }

    // Store
    try {
      const Store = storeMod?.StoreSystem || storeMod?.default;
      if (Store?.init) {
        S.systems.store = await Store.init({ THREE, scene: S.scene, root, player: S.player, camera: S.camera, log: S.log });
        try { Store.setActive?.(true); } catch(e) {}
        safeLog("[store] StoreSystem ✅");
      } else safeLog("[store] StoreSystem missing init (skipped)");
    } catch (e) { safeLog("[store] FAIL", e?.message || e); }

    // Scorpion room
    try {
      const Sc = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (Sc?.init) { S.systems.scorpion = await Sc.init({ THREE, scene: S.scene, root, player: S.player, camera: S.camera, log: S.log }); safeLog("[scorpion] ✅"); }
      else safeLog("[scorpion] missing init (skipped)");
    } catch (e) { safeLog("[scorpion] FAIL", e?.message || e); }

    // Table (BossTable -> TableFactory -> placeholder)
    let tableObj = null;

    const BossTableAPI = bossTableMod?.BossTable || bossTableMod?.default || (typeof bossTableMod?.init === "function" ? bossTableMod : null);
    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({ THREE, scene: S.scene, root, log: S.log, OPTS: S.OPTS?.table || { sunken:true } });
        safeLog("[table] BossTable.init ✅");
      } catch (e) { safeLog("[table] BossTable.init FAIL", e?.message || e); }
    }

    if (!tableObj) {
      const TF = tableFactoryMod?.TableFactory || tableFactoryMod?.default;
      if (TF?.create) {
        try {
          tableObj = await TF.create({ THREE, root, log: S.log, OPTS: S.OPTS?.table || { sunken:true, seats:8 } });
          safeLog("[table] TableFactory.create ✅");
        } catch (e) { safeLog("[table] TableFactory.create FAIL", e?.message || e); }
      }
    }

    if (!tableObj) {
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

    // Teleport
    if (optsAllow("allowTeleport")) {
      const tp = tpMachineMod?.TeleportMachine || tpMod?.Teleport || tpMod?.default;
      if (tp?.init) {
        try {
          S.systems.teleport = await tp.init({
            THREE, scene: S.scene, renderer: S.renderer, camera: S.camera,
            player: S.player, controllers: S.controllers, log: S.log,
            world: { floor: S.floor, root }
          });
          safeLog("[teleport] ✅");
        } catch (e) { safeLog("[teleport] FAIL", e?.message || e); }
      } else safeLog("[teleport] module missing — skipped");
    }

    // Bots
    if (optsAllow("allowBots") && botsMod?.Bots?.init) {
      try { S.systems.bots = await botsMod.Bots.init({ THREE, scene: S.scene, root, player: S.player, log: S.log }); safeLog("[bots] ✅"); }
      catch (e) { safeLog("[bots] FAIL", e?.message || e); }
    }

    // Poker
    if (optsAllow("allowPoker") && pokerSimMod?.PokerSim?.init) {
      try { S.systems.poker = await pokerSimMod.PokerSim.init({ THREE, scene: S.scene, root, table: tableObj, player: S.player, camera: S.camera, log: S.log }); safeLog("[poker] ✅"); }
      catch (e) { safeLog("[poker] FAIL", e?.message || e); }
    }

    // Room Manager
    if (roomMgrMod?.RoomManager?.init) {
      try { S.systems.room = await roomMgrMod.RoomManager.init({ THREE, scene: S.scene, root, player: S.player, camera: S.camera, systems: S.systems, log: S.log }); safeLog("[rm] ✅"); }
      catch (e) { safeLog("[rm] FAIL", e?.message || e); }
    }

    safeLog("[world] YOUR master world restored ✅ (yesterday build)");
  }

  return {
    respawnSafe(){ hardSpawnGround(); },

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

      S.scene = makeBaseScene();
      if (!S.scene.children.includes(player)) S.scene.add(player);

      // no HUD/panel attached here
      hardSpawnGround();
      await buildYesterdayWorld();

      safeLog("[world] build complete ✅");
      safeLog("✅ HybridWorld.build ✅");
    },

    frame({ renderer, camera }) {
      if (!S.scene) return;
      const dt = S.clock ? S.clock.getDelta() : 0.016;

      try { S.systems.bots?.update?.(dt); } catch(e) {}
      try { S.systems.poker?.update?.(dt); } catch(e) {}
      try { S.systems.room?.update?.(dt); } catch(e) {}
      try { S.systems.teleport?.update?.(dt); } catch(e) {}

      renderer.render(S.scene, camera);
    }
  };
})();
