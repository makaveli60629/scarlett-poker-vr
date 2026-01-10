// /js/world.js — Scarlett MASTER WORLD v15 (FULL)
// FIXES (v15):
// ✅ Boots in LOBBY every time (scorpion hidden, store visible)
// ✅ Calls SpawnPoints.build(ctx) and guarantees ctx.spawns.apply exists
// ✅ XR height correctness: always uses ctx.spawns.apply(name, rig, {standY/seatY})
// ✅ Room switching: listens to UI event "scarlett-room" and forces spawns
// ✅ Scorpion uses ctx.systems.scorpion from ScorpionRoom.build(ctx)
// ✅ PokerSim + Bots are optional, but wired to ctx.PokerSim / ctx.poker when present
// ✅ Adds safe bounds getter used by AndroidControls if you wire it

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const ctx = {
      THREE, scene, renderer, camera, player, controllers, log,
      BUILD: BUILD || "gh-pages",

      // gameplay state
      mode: "lobby",
      tables: {},
      systems: {},
      rooms: {},

      // shared registries
      colliders: [],
      anchors: {},
      beacons: {},
      spawns: {},

      // poker wiring
      PokerSim: null,
      poker: null,

      // helpers
      bounds: {
        min: new THREE.Vector3(-18, -10, -18),
        max: new THREE.Vector3(18,  10,  18),
      },
      getBounds() { return this.bounds; },
    };

    log?.(`[world] ✅ LOADER SIGNATURE: WORLD.JS V15 MASTER ACTIVE`);

    // --- BASE FLOOR (always present, never missing) ---
    this._buildBaseFloor(ctx);

    // --- SAFE DEFAULT ANCHORS (used by some systems) ---
    ctx.anchors.lobby_spawn     = new THREE.Vector3(0, 0, 2.8);
    ctx.anchors.store_spawn     = new THREE.Vector3(4.5, 0, -3.5);
    ctx.anchors.spectator       = new THREE.Vector3(0, 0, -3.0);
    ctx.anchors.table_seat_1    = new THREE.Vector3(0, 0, 1.55);
    ctx.anchors.scorpion_gate   = new THREE.Vector3(8.0, 0, 0.0);
    ctx.anchors.scorpion_seat_1 = new THREE.Vector3(8.0, 0, 1.55);
    ctx.anchors.scorpion_exit   = new THREE.Vector3(8.0, 0, 0.0);

    // --- TEXTURES ---
    await safeCall("[textures] createTextureKit", async () => {
      const mod = await safeModule("./textures.js");
      const fn = mod?.createTextureKit;
      if (!fn) return;
      ctx.textures = fn({ THREE, renderer, base: "./assets/textures/", log });
      log?.("[world] ✅ mounted textures via createTextureKit()");
    }, log);

    // --- LIGHTS ---
    await safeCall("[lights] LightsPack.build", async () => {
      const mod = await safeModule("./lights_pack.js");
      const sys = mod?.LightsPack;
      if (sys?.build) await sys.build(ctx);
    }, log);

    // --- WALLS ---
    await safeCall("[walls] SolidWalls.build", async () => {
      const mod = await safeModule("./solid_walls.js");
      const sys = mod?.SolidWalls;
      if (sys?.build) await sys.build(ctx);
    }, log);

    // --- TABLES (Lobby) ---
    await safeCall("[tables] TableFactory.build", async () => {
      const mod = await safeModule("./table_factory.js");
      const sys = mod?.TableFactory;
      if (!sys?.build) return;

      const out = await sys.build(ctx);

      // Support either { lobby } or a Group directly
      if (out?.lobby) ctx.tables.lobby = out.lobby;
      else if (out?.isObject3D) ctx.tables.lobby = out;

      // If TableFactory gave us bounds, keep them
      if (out?.bounds?.min && out?.bounds?.max) {
        ctx.bounds.min.copy(out.bounds.min);
        ctx.bounds.max.copy(out.bounds.max);
      }
    }, log);

    // --- SPECTATOR RAIL (Lobby) ---
    await safeCall("[rail] SpectatorRail.build", async () => {
      const mod = await safeModule("./spectator_rail.js");
      const sys = mod?.SpectatorRail;
      if (!sys?.build) return;
      const rail = await sys.build(ctx);
      if (rail) {
        rail.name = rail.name || "SPECTATOR_RAIL";
        ctx.systems.rail = rail;
      }
    }, log);

    // --- TELEPORT MACHINE (Lobby) ---
    await safeCall("[teleport] TeleportMachine.init", async () => {
      const mod = await safeModule("./teleport_machine.js");
      const sys = mod?.TeleportMachine;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // --- STORE ---
    await safeCall("[store] StoreSystem.init", async () => {
      const mod = await safeModule("./store.js");
      const sys = mod?.StoreSystem;
      if (!sys?.init) return;
      const store = await sys.init(ctx);
      ctx.systems.store = store || ctx.systems.store;
      addBeacon(ctx, "STORE", new THREE.Vector3(4.5, 2.1, -3.5));
    }, log);

    // --- SPAWN POINTS (CRITICAL) ---
    await safeCall("[spawns] SpawnPoints.build", async () => {
      const mod = await safeModule("./spawn_points.js");
      const sys = mod?.SpawnPoints;
      if (!sys?.build) return;

      sys.build(ctx);

      // Guarantee apply exists
      if (!ctx.spawns?.apply) {
        log?.("[world] ⚠️ SpawnPoints missing apply(); installing fallback apply()");
        this._installFallbackApply(ctx);
      }

      log?.("[world] ✅ SpawnPoints wired");
    }, log);

    // --- SCORPION ROOM (HIDDEN ON BOOT) ---
    await safeCall("[scorpion] ScorpionRoom.build", async () => {
      const mod = await safeModule("./scorpion_room.js");
      const sys = mod?.ScorpionRoom;
      if (!sys?.build) return;

      const sc = await sys.build(ctx);
      ctx.systems.scorpion = sc || ctx.systems.scorpion;

      // Always start hidden
      ctx.systems.scorpion?.setActive?.(false);
    }, log);

    // --- UI ---
    await safeCall("[ui] UI.init", async () => {
      const mod = await safeModule("./ui.js");
      const sys = mod?.UI;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // --- VR UI (optional overlays/hands/watch) ---
    await safeCall("[vrui] initVRUI", async () => {
      const mod = await safeModule("./vr_ui.js");
      const fn = mod?.initVRUI;
      if (fn) await fn(ctx);
    }, log);

    await safeCall("[vrui] VRUIPanel.init", async () => {
      const mod = await safeModule("./vr_ui_panel.js");
      const sys = mod?.VRUIPanel;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // --- POKER SIM ---
    await safeCall("[poker] PokerSim.init", async () => {
      const mod = await safeModule("./poker_sim.js");
      const sys = mod?.PokerSim;
      if (!sys?.init) return;
      await sys.init(ctx);
      ctx.PokerSim = sys;
      ctx.poker = sys;
      log?.("[world] ✅ PokerSim wired (ctx.PokerSim + ctx.poker)");
    }, log);

    // --- BOTS (optional) ---
    await safeCall("[bots] Bots.init", async () => {
      const mod = await safeModule("./bots.js");
      const sys = mod?.Bots;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // --- ROOM MANAGER (optional module) ---
    await safeCall("[rooms] RoomManager.init", async () => {
      const mod = await safeModule("./room_manager.js");
      const sys = mod?.RoomManager;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // --- HARD ROOM BRIDGE (THIS FIXES "I BOOTED IN SCORPION") ---
    this._installRoomBridge(ctx);

    // --- LAYOUT POLISH ---
    this._forceMasterLayout(ctx);

    // ✅ FINAL: ALWAYS BOOT LOBBY standing (correct XR height)
    ctx.mode = "lobby";
    ctx.systems.scorpion?.setActive?.(false);
    ctx.systems.store?.setActive?.(true);

    ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

    // force again after transforms settle
    setTimeout(() => ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 }), 250);

    ctx.PokerSim?.setMode?.("lobby_demo");

    log?.("[world] ✅ REAL WORLD LOADED (mounted=MASTER v15)");
    return ctx;
  },

  // ---------------------------------------------------------------------------
  // BASE FLOOR
  // ---------------------------------------------------------------------------
  _buildBaseFloor(ctx) {
    const { THREE, scene } = ctx;
    if (scene.getObjectByName("FLOOR")) return;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1.0, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "FLOOR";
    scene.add(floor);
  },

  // ---------------------------------------------------------------------------
  // FALLBACK APPLY (only if SpawnPoints failed)
  // ---------------------------------------------------------------------------
  _installFallbackApply(ctx) {
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    ctx.spawns = ctx.spawns || {};
    ctx.spawns.map = ctx.spawns.map || {};
    ctx.spawns.map.lobby_spawn = ctx.spawns.map.lobby_spawn || { x: 0, y: 0, z: 2.8, yaw: 0 };

    const camLocalY = () => (ctx.camera?.position?.y ?? 0);
    const rig = () => ctx.player || ctx.playerGroup || ctx.playerRig;

    const applyEye = (desired) => {
      const r = rig(); if (!r) return;
      r.position.y = desired - camLocalY();
    };

    ctx.spawns.apply = (name = "lobby_spawn", rigOverride = null, opts = {}) => {
      const s = ctx.spawns.map?.[name] || ctx.spawns.map.lobby_spawn;
      const r = rigOverride || rig();
      if (!r) return false;

      r.position.set(s.x || 0, 0, s.z || 0);
      r.rotation.set(0, s.yaw || 0, 0);

      // bounds clamp
      const b = ctx.getBounds?.() || ctx.bounds;
      if (b?.min && b?.max) {
        r.position.x = clamp(r.position.x, b.min.x, b.max.x);
        r.position.z = clamp(r.position.z, b.min.z, b.max.z);
      }

      if (typeof opts.seatY === "number") applyEye(opts.seatY);
      else if (typeof opts.standY === "number") applyEye(opts.standY);
      else r.position.y = 0;

      console.log(`[spawns:fallback] apply(${name}) x=${r.position.x.toFixed(2)} y=${r.position.y.toFixed(2)} z=${r.position.z.toFixed(2)}`);
      return true;
    };
  },

  // ---------------------------------------------------------------------------
  // ROOM BRIDGE (authoritative)
  // UI dispatches: window.dispatchEvent(new CustomEvent("scarlett-room",{detail:{name}}))
  // This bridge forces room visibility + spawns correctly.
  // ---------------------------------------------------------------------------
  _installRoomBridge(ctx) {
    if (ctx.__roomBridgeInstalled) return;
    ctx.__roomBridgeInstalled = true;

    const log = ctx.log || console.log;

    const setRoom = (name) => {
      ctx.mode = name;
      log(`[room-bridge] setRoom(${name})`);

      // visibility
      ctx.systems.scorpion?.setActive?.(name === "scorpion");

      // spawns (standing unless you explicitly sit)
      const spawnName =
        name === "scorpion"   ? "scorpion_safe_spawn" :
        name === "store"      ? "store_spawn" :
        name === "spectator"  ? "spectator" :
                                "lobby_spawn";

      ctx.spawns?.apply?.(spawnName, ctx.player, { standY: 1.65 });
      setTimeout(() => ctx.spawns?.apply?.(spawnName, ctx.player, { standY: 1.65 }), 250);

      // poker mode hints
      if (name === "scorpion") ctx.PokerSim?.setMode?.("scorpion");
      else ctx.PokerSim?.setMode?.("lobby_demo");
    };

    ctx.rooms = ctx.rooms || {};
    ctx.rooms.setRoom = setRoom;

    // Listen to UI
    window.addEventListener("scarlett-room", (ev) => {
      const name = ev?.detail?.name;
      if (!name) return;
      setRoom(name);
    });

    // HARD BOOT LOBBY again after UI loads to prevent “stuck in scorpion”
    setTimeout(() => setRoom("lobby"), 50);
    setTimeout(() => setRoom("lobby"), 650);

    log("[room-bridge] installed ✅");
  },

  // ---------------------------------------------------------------------------
  // LAYOUT POLISH
  // ---------------------------------------------------------------------------
  _forceMasterLayout(ctx) {
    const { scene, log, THREE } = ctx;

    // Ensure store position + visible
    const store = scene.getObjectByName("SCARLETT_STORE") || ctx.systems.store?.group || ctx.systems.store;
    if (store?.position) {
      store.position.set(4.5, 0, -3.5);
      store.visible = true;
    }

    // Ensure rail visible
    const rail = scene.getObjectByName("SPECTATOR_RAIL") || ctx.systems.rail;
    if (rail?.position) {
      rail.position.set(0, 0, 0);
      rail.visible = true;
    }

    // Simple store sign glow
    if (!scene.getObjectByName("STORE_SIGN")) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.9),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
      );
      sign.name = "STORE_SIGN";
      sign.position.set(4.5, 2.1, -3.5);
      sign.rotation.y = Math.PI;
      scene.add(sign);

      const glow = new THREE.PointLight(0x7fe7ff, 2.3, 12);
      glow.position.set(4.5, 2.2, -3.5);
      scene.add(glow);
    }

    // Table neon
    if (!scene.getObjectByName("TABLE_NEON")) {
      const neon = new THREE.PointLight(0xff2d7a, 1.8, 10);
      neon.name = "TABLE_NEON";
      neon.position.set(0, 2.2, 0);
      scene.add(neon);
    }

    log?.("[world] ✅ master layout locked (v15)");
  },
};

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
async function safeCall(label, fn, log) {
  try {
    log?.(`[world] calling ${label}`);
    const out = await fn();
    log?.(`[world] ✅ ok ${label}`);
    return out;
  } catch (e) {
    log?.(`[world] ⚠️ ${label} error: ${e?.message || e}`);
    return null;
  }
}

async function safeModule(path) {
  try {
    const v = new URL(location.href).searchParams.get("v");
    const url = v ? `${path}?v=${encodeURIComponent(v)}` : path;
    return await import(url);
  } catch (e) {
    console.error(`❌ module load failed: ${path}`, e);
    return null;
  }
}

function addBeacon(ctx, name, pos) {
  const { THREE, scene, log } = ctx;
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.8 })
  );
  m.position.copy(pos);
  m.name = `BEACON_${name}`;
  scene.add(m);
  ctx.beacons[name] = m;
  log?.(`[world] ✅ beacon: ${name}`);
        }
