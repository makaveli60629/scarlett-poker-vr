// /js/world.js — Scarlett MASTER WORLD v12 (FULL)
// TRUE optional modules: uses dynamic imports so one missing/broken file won't kill the whole world.
// Loads: lobby + store + rail + scorpion + bots + poker sim + spawn pads (optional).
// Safe: falls back if modules fail, including GitHub Pages/Quest caching serving HTML instead of JS.

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const ctx = {
      THREE, scene, renderer, camera, player, controllers, log,
      BUILD,

      colliders: [],
      anchors: {},        // named points in world
      beacons: {},        // named visual markers
      spawns: {},         // spawn registry
      mode: "lobby",
      tables: {},         // table refs
      systems: {},        // store/ui/etc
    };

    log?.(`[world] ✅ LOADER SIGNATURE: WORLD.JS V12 MASTER ACTIVE`);

    // ---- base floor always ----
    this._buildBaseFloor(ctx);

    // ---- hard anchors FIRST (so SpawnPoints can read them) ----
    // These are your "master" defaults. Other modules can overwrite them later if needed.
    ctx.anchors.lobby_spawn   = new THREE.Vector3(0, 0, 3.2);
    ctx.anchors.store_spawn   = new THREE.Vector3(4.5, 0, -3.5);
    ctx.anchors.spectator     = new THREE.Vector3(0, 0, -3.0);
    ctx.anchors.table_seat_1  = new THREE.Vector3(0, 0, 0.95);
    ctx.anchors.scorpion_gate = new THREE.Vector3(8.0, 0, 0.0);

    // ---- textures kit ----
    await safeCall("[textures] createTextureKit", async () => {
      const mod = await safeModule("./textures.js");
      const fn = mod?.createTextureKit;
      if (!fn) return;
      ctx.textures = fn({ THREE, renderer, base: "./assets/textures/", log });
      log?.("[world] ✅ mounted textures via createTextureKit()");
    }, log);

    // ---- lights ----
    await safeCall("[lights] LightsPack.build", async () => {
      const mod = await safeModule("./lights_pack.js");
      const sys = mod?.LightsPack;
      if (sys?.build) await sys.build(ctx);
    }, log);

    // ---- walls/colliders ----
    await safeCall("[walls] SolidWalls.build", async () => {
      const mod = await safeModule("./solid_walls.js");
      const sys = mod?.SolidWalls;
      if (sys?.build) await sys.build(ctx);
    }, log);

    // ---- table factory ----
    await safeCall("[tables] TableFactory.build", async () => {
      const mod = await safeModule("./table_factory.js");
      const sys = mod?.TableFactory;
      if (!sys?.build) return;
      const out = await sys.build(ctx);
      if (!ctx.tables.lobby && out?.lobby) ctx.tables.lobby = out.lobby;
    }, log);

    // ---- spectator rail ----
    await safeCall("[rail] SpectatorRail.build", async () => {
      const mod = await safeModule("./spectator_rail.js");
      const sys = mod?.SpectatorRail;
      if (!sys?.build) return;
      const rail = await sys.build(ctx);
      if (rail) {
        rail.name = rail.name || "SPECTATOR_RAIL";
        ctx.rail = rail;
      }
    }, log);

    // ---- teleport machine ----
    await safeCall("[teleport] TeleportMachine.init", async () => {
      const mod = await safeModule("./teleport_machine.js");
      const sys = mod?.TeleportMachine;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // ---- store ----
    await safeCall("[store] StoreSystem.init", async () => {
      const mod = await safeModule("./store.js");
      const sys = mod?.StoreSystem;
      if (!sys?.init) return;
      const store = await sys.init(ctx);
      ctx.systems.store = store || ctx.systems.store;

      // Add a beacon you can see from spawn
      addBeacon(ctx, "STORE", new THREE.Vector3(4.5, 1.9, -3.5));
    }, log);

    // ---- spawn pads (optional, BUT NO LONGER A HARD IMPORT) ----
    await safeCall("[spawns] SpawnPoints.build", async () => {
      // ensure container exists
      ctx.spawns ||= {};
      const mod = await safeModule("./spawn_points.js");
      const sys = mod?.SpawnPoints;
      if (!sys?.build) return;

      sys.build({ THREE, scene, world: ctx, log });

      // Convenience alias
      ctx.spawns.default = ctx.spawns.lobby_spawn || ctx.spawns.default || null;

      log?.("[world] ✅ SpawnPoints built (pads + ctx.spawns)");
    }, log);

    // ---- scorpion room ----
    await safeCall("[scorpion] ScorpionRoom.build", async () => {
      const mod = await safeModule("./scorpion_room.js");
      const sys = mod?.ScorpionRoom;
      if (!sys?.build) return;
      const sc = await sys.build(ctx);
      ctx.systems.scorpion = sc || ctx.systems.scorpion;
    }, log);

    // ---- UI + VR UI ----
    await safeCall("[ui] UI.init", async () => {
      const mod = await safeModule("./ui.js");
      const sys = mod?.UI;
      if (sys?.init) await sys.init(ctx);
    }, log);

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

    // ---- rooms ----
    await safeCall("[rooms] RoomManager.init", async () => {
      const mod = await safeModule("./room_manager.js");
      const sys = mod?.RoomManager;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // ---- bots ----
    await safeCall("[bots] Bots.init", async () => {
      const mod = await safeModule("./bots.js");
      const sys = mod?.Bots;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // ---- poker sim ----
    await safeCall("[poker] PokerSim.init", async () => {
      const mod = await safeModule("./poker_sim.js");
      const sys = mod?.PokerSim;
      if (sys?.init) await sys.init(ctx);
    }, log);

    // ---- final master layout lock ----
    this._forceMasterLayout(ctx);

    log?.(`[world] ✅ REAL WORLD LOADED (mounted=MASTER)`);
    log?.(`[world] init complete ✅`);
    return ctx;
  },

  _buildBaseFloor(ctx) {
    const { THREE, scene } = ctx;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1.0, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "FLOOR";
    scene.add(floor);
  },

  _forceMasterLayout(ctx) {
    const { THREE, scene, log } = ctx;

    // Store placement lock
    const store = scene.getObjectByName("SCARLETT_STORE") || ctx.systems.store?.group || ctx.systems.store;
    if (store?.position) {
      store.position.set(4.5, 0, -3.5);
      store.visible = true;
    }

    // Rail visibility boost
    const rail = scene.getObjectByName("SPECTATOR_RAIL") || ctx.rail;
    if (rail?.position) {
      rail.position.set(0, 0, 0);
      rail.visible = true;
    }

    // Big neon sign
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

    // Table neon pop
    if (!scene.getObjectByName("TABLE_NEON")) {
      const neon = new THREE.PointLight(0xff2d7a, 1.8, 10);
      neon.name = "TABLE_NEON";
      neon.position.set(0, 2.2, 0);
      scene.add(neon);
    }

    log?.("[world] ✅ master layout locked (store/rail/table polish)");
  }
};

// ---------------- helpers ----------------

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
    // cache-bust using the same v param if present
    const v = new URL(location.href).searchParams.get("v");
    const url = v ? `${path}?v=${encodeURIComponent(v)}` : path;
    return await import(url);
  } catch (e) {
    // Important: if GitHub returns HTML/404, import throws here and we treat it as optional failure.
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
