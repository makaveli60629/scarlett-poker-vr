// /js/world.js — SCARLETT MASTER WORLD — Ultimate v10.1 (FULL + LEGACY COMPAT)
// ✅ LOADER SIGNATURE: WORLD.JS V10.1 ACTIVE
//
// Fixes legacy module expectations:
// - ctx.world.mount()
// - ctx.__ui + ctx.ui.__ui
// - ctx.world.colliders / ctx.colliders
// - ctx.rm.mode / ctx.room.mode / ctx.rooms.mode
//
// Keeps v10 fallback lobby + safe imports + registry tickers.

export const World = {
  async init(baseCtx) {
    const ctx = World._createCtx(baseCtx);
    ctx.log(`[world] ✅ LOADER SIGNATURE: WORLD.JS V10.1 ACTIVE`);

    // 1) Build fallback lobby first so you never load into void
    ctx.log(`[world] fallback world building…`);
    World._buildFallbackLobby(ctx);
    ctx.log(`[world] fallback built ✅`);

    // 2) Mount all systems safely
    const mountedCount = await World._mountAllSystems(ctx);

    // 3) Finalize
    World._finalizeWorld(ctx);

    ctx.log(`[world] ✅ REAL WORLD LOADED (mounted=${mountedCount})`);
    ctx.log(`[world] init complete ✅`);
    return {
      ctx,
      tick: (dt) => World._tick(ctx, dt),
      getSpawn: (name) => ctx.spawns[name] || null,
    };
  },

  // ---------------- ctx + compatibility ----------------
  _createCtx(base) {
    const ctx = base || {};
    ctx.THREE = ctx.THREE || (globalThis.THREE ?? null);
    ctx.scene = ctx.scene || null;
    ctx.renderer = ctx.renderer || null;
    ctx.camera = ctx.camera || null;
    ctx.player = ctx.player || null;
    ctx.controllers = ctx.controllers || null;

    // logging (never assume)
    const consoleLog = (...a) => console.log(...a);
    ctx.log = (typeof ctx.log === "function") ? ctx.log : consoleLog;

    // Registries
    ctx.__mounted = ctx.__mounted || [];
    ctx.__tickers = ctx.__tickers || [];

    // New-style registries
    ctx.solids = ctx.solids || [];       // collision solids
    ctx.triggers = ctx.triggers || [];   // triggers/areas
    ctx.spawns = ctx.spawns || {};
    ctx.textures = ctx.textures || {};
    ctx.flags = ctx.flags || {};

    // UI containers (new-style)
    ctx.ui = ctx.ui || {};
    ctx.ui.panels = ctx.ui.panels || [];
    ctx.ui.buttons = ctx.ui.buttons || [];
    ctx.ui.hotspots = ctx.ui.hotspots || [];

    // ---- LEGACY UI COMPAT ----
    // Some older modules use ctx.__ui or ctx.ui.__ui
    ctx.__ui = ctx.__ui || {};
    ctx.ui.__ui = ctx.ui.__ui || ctx.__ui;

    // Some modules set ctx.__ui.hub / ctx.ui.hub
    ctx.ui.hub = ctx.ui.hub || null;
    ctx.__ui.hub = ctx.__ui.hub || ctx.ui.hub;

    // Rooms/state (legacy + new)
    ctx.rooms = ctx.rooms || {};
    ctx.rooms.mode = ctx.rooms.mode || "lobby";
    ctx.rm = ctx.rm || { mode: ctx.rooms.mode };
    ctx.room = ctx.room || { mode: ctx.rooms.mode };

    // ---- LEGACY WORLD COMPAT ----
    // Many of your modules were written to expect ctx.world.mount and ctx.world.colliders
    ctx.world = ctx.world || {};
    ctx.world.colliders = ctx.world.colliders || ctx.solids; // alias
    ctx.colliders = ctx.colliders || ctx.world.colliders;    // alias
    ctx.world.triggers = ctx.world.triggers || ctx.triggers;

    // Helpers
    ctx.addMounted = (obj) => {
      if (!obj) return;
      ctx.__mounted.push(obj);
      if (ctx.scene && obj.isObject3D && obj.parent !== ctx.scene) ctx.scene.add(obj);
    };

    // LEGACY: ctx.world.mount(obj)
    ctx.world.mount = ctx.world.mount || ((obj) => ctx.addMounted(obj));

    ctx.addSolid = (obj) => {
      if (!obj) return;
      ctx.solids.push(obj);
      // keep aliases in sync
      ctx.world.colliders = ctx.solids;
      ctx.colliders = ctx.solids;
      ctx.addMounted(obj);
    };

    ctx.addTrigger = (obj) => {
      if (!obj) return;
      ctx.triggers.push(obj);
      ctx.world.triggers = ctx.triggers;
      ctx.addMounted(obj);
    };

    ctx.addTicker = (fn) => {
      if (typeof fn === "function") ctx.__tickers.push(fn);
    };

    ctx.addSpawn = (name, pos, rotY = 0) => {
      ctx.spawns[name] = {
        position: pos?.clone ? pos.clone() : pos,
        rotY
      };
    };

    // Keep legacy room mode synced
    ctx.setRoomMode = (mode) => {
      ctx.rooms.mode = mode;
      ctx.rm.mode = mode;
      ctx.room.mode = mode;
    };

    return ctx;
  },

  async _safeImport(ctx, path) {
    try {
      ctx.log(`[world] import ${path}`);
      const m = await import(path);
      ctx.log(`[world] ✅ imported ${path}`);
      return m;
    } catch (e) {
      ctx.log(`[world] ⚠️ import failed ${path}: ${String(e?.message || e)}`);
      return null;
    }
  },

  async _callSystem(ctx, label, fn, arg = ctx) {
    if (typeof fn !== "function") return false;
    try {
      ctx.log(`[world] calling ${label}`);
      const res = await fn(arg);

      // allow returning tickers etc
      if (res?.tick) ctx.addTicker((dt) => res.tick(dt, ctx));
      if (res?.mounted?.length) res.mounted.forEach(ctx.addMounted);

      ctx.log(`[world] ✅ ok ${label}`);
      return true;
    } catch (e) {
      ctx.log(`[world] ⚠️ ${label} error: ${String(e?.message || e)}`);
      return false;
    }
  },

  async _mountAllSystems(ctx) {
    let mounted = 0;
    const v = ctx._v || Date.now();

    // textures
    {
      const m = await World._safeImport(ctx, `./textures.js?v=${v}`);
      const kitFn =
        m?.createTextureKit ||
        m?.Textures?.createTextureKit ||
        m?.default?.createTextureKit;

      if (kitFn) {
        try {
          const kit = await kitFn(ctx);
          if (kit) ctx.textures = kit;
          ctx.log(`[world] ✅ mounted textures via createTextureKit()`);
          mounted++;
        } catch (e) {
          ctx.log(`[world] ⚠️ textures kit error: ${String(e?.message || e)}`);
        }
      }
    }

    // lights
    {
      const m = await World._safeImport(ctx, `./lights_pack.js?v=${v}`);
      const build =
        m?.LightsPack?.build ||
        m?.default?.LightsPack?.build ||
        m?.build;
      if (await World._callSystem(ctx, `lights_pack.js.LightsPack.build (ctx)`, build, ctx)) mounted++;
    }

    // walls
    {
      const m = await World._safeImport(ctx, `./solid_walls.js?v=${v}`);
      const build =
        m?.SolidWalls?.build ||
        m?.default?.SolidWalls?.build ||
        m?.build;
      if (await World._callSystem(ctx, `solid_walls.js.SolidWalls.build (ctx)`, build, ctx)) mounted++;
    }

    // table factory
    {
      const m = await World._safeImport(ctx, `./table_factory.js?v=${v}`);
      const build =
        m?.TableFactory?.build ||
        m?.default?.TableFactory?.build ||
        m?.build;
      if (await World._callSystem(ctx, `table_factory.js.TableFactory.build (ctx)`, build, ctx)) mounted++;
    }

    // spectator rail
    {
      const m = await World._safeImport(ctx, `./spectator_rail.js?v=${v}`);
      const build =
        m?.SpectatorRail?.build ||
        m?.default?.SpectatorRail?.build ||
        m?.build;
      if (await World._callSystem(ctx, `spectator_rail.js.SpectatorRail.build (ctx)`, build, ctx)) mounted++;
    }

    // teleport machine (legacy expects ctx.world.mount)
    {
      const m = await World._safeImport(ctx, `./teleport_machine.js?v=${v}`);
      const init =
        m?.TeleportMachine?.init ||
        m?.default?.TeleportMachine?.init ||
        m?.init;
      if (await World._callSystem(ctx, `teleport_machine.js.TeleportMachine.init (ctx)`, init, ctx)) mounted++;
    }

    // store
    {
      const m = await World._safeImport(ctx, `./store.js?v=${v}`);
      const init =
        m?.StoreSystem?.init ||
        m?.default?.StoreSystem?.init ||
        m?.init;
      if (await World._callSystem(ctx, `store.js.StoreSystem.init (ctx)`, init, ctx)) mounted++;
    }

    // shop ui
    {
      const m = await World._safeImport(ctx, `./shop_ui.js?v=${v}`);
      const init =
        m?.ShopUI?.init ||
        m?.default?.ShopUI?.init ||
        m?.init;
      if (await World._callSystem(ctx, `shop_ui.js.ShopUI.init (ctx)`, init, ctx)) mounted++;
    }

    // fountain
    {
      const m = await World._safeImport(ctx, `./water_fountain.js?v=${v}`);
      const build =
        m?.WaterFountain?.build ||
        m?.default?.WaterFountain?.build ||
        m?.build;
      if (await World._callSystem(ctx, `water_fountain.js.WaterFountain.build (ctx)`, build, ctx)) mounted++;
    }

    // ui (legacy expects ctx.__ui)
    {
      const m = await World._safeImport(ctx, `./ui.js?v=${v}`);
      const init =
        m?.UI?.init ||
        m?.default?.UI?.init ||
        m?.init;
      if (await World._callSystem(ctx, `ui.js.UI.init (ctx)`, init, ctx)) mounted++;
    }

    // vr ui (legacy expects ctx.__ui)
    {
      const m = await World._safeImport(ctx, `./vr_ui.js?v=${v}`);
      const init =
        m?.initVRUI ||
        m?.VRUI?.init ||
        m?.default?.initVRUI ||
        m?.default?.VRUI?.init;
      if (await World._callSystem(ctx, `vr_ui.js.initVRUI (ctx)`, init, ctx)) mounted++;
    }

    // vr ui panel
    {
      const m = await World._safeImport(ctx, `./vr_ui_panel.js?v=${v}`);
      const init =
        m?.VRUIPanel?.init ||
        m?.default?.VRUIPanel?.init ||
        m?.init;
      if (await World._callSystem(ctx, `vr_ui_panel.js.init (ctx)`, init, ctx)) mounted++;
    }

    // scorpion room (legacy expects ctx.world.colliders)
    {
      const m = await World._safeImport(ctx, `./scorpion_room.js?v=${v}`);
      const build =
        m?.ScorpionRoom?.build ||
        m?.default?.ScorpionRoom?.build ||
        m?.build;
      if (await World._callSystem(ctx, `scorpion_room.js.ScorpionRoom.build (ctx)`, build, ctx)) mounted++;
    }

    // room manager (legacy expects ctx.rm.mode / ctx.room.mode)
    {
      const m = await World._safeImport(ctx, `./room_manager.js?v=${v}`);
      const init =
        m?.RoomManager?.init ||
        m?.default?.RoomManager?.init ||
        m?.init;
      if (await World._callSystem(ctx, `room_manager.js.RoomManager.init (ctx)`, init, ctx)) mounted++;
    }

    // optional fx packs
    await World._safeImport(ctx, `./teleport_fx.js?v=${v}`);
    await World._safeImport(ctx, `./TeleportVFX.js?v=${v}`);
    await World._safeImport(ctx, `./teleport_burst_fx.js?v=${v}`);

    return mounted;
  },

  // ---------------- fallback lobby ----------------
  _buildFallbackLobby(ctx) {
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;

    const root = new THREE.Group();
    root.name = "MASTER_LOBBY_FALLBACK";
    ctx.addMounted(root);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x070815, emissive: 0x111a44, emissiveIntensity: 0.35, roughness: 1 })
    );
    ceil.position.y = 6.5;
    ceil.rotation.x = Math.PI / 2;
    root.add(ceil);

    // walls (solid)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x14172a, roughness: 0.85, metalness: 0.0 });
    const wallH = 6;
    const thickness = 0.5;
    const half = 28;

    function wall(w, h, d, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      root.add(m);
      ctx.addSolid(m);
    }

    wall(60, wallH, thickness, 0, wallH/2, -half);
    wall(60, wallH, thickness, 0, wallH/2,  half);
    wall(thickness, wallH, 60, -half, wallH/2, 0);
    wall(thickness, wallH, 60,  half, wallH/2, 0);

    // columns
    const colMat = new THREE.MeshStandardMaterial({ color: 0x101325, roughness: 0.7, metalness: 0.08 });
    for (let i=0;i<10;i++){
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 18), colMat);
      const a = (i/10) * Math.PI*2;
      c.position.set(Math.cos(a)*12, 3, Math.sin(a)*12);
      root.add(c);
    }

    // lighting
    const amb = new THREE.AmbientLight(0x8aa0ff, 0.18);
    root.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 4);
    root.add(key);

    // spawns
    ctx.addSpawn("lobby", new THREE.Vector3(0, 0, 10), Math.PI);
    ctx.addSpawn("spectator", new THREE.Vector3(0, 0, 16), Math.PI);
    ctx.addSpawn("scorpion_seat", new THREE.Vector3(10, 0, 0), -Math.PI/2);

    // ambience pulse
    let t = 0;
    ctx.addTicker((dt) => {
      t += dt;
      amb.intensity = 0.12 + Math.sin(t*0.6)*0.02;
    });
  },

  _finalizeWorld(ctx) {
    const { THREE } = ctx;
    if (!THREE) return;

    // Ensure spawns exist
    if (!ctx.spawns.lobby) ctx.addSpawn("lobby", new THREE.Vector3(0,0,10), Math.PI);
    if (!ctx.spawns.scorpion_seat) ctx.addSpawn("scorpion_seat", new THREE.Vector3(10,0,0), -Math.PI/2);
    if (!ctx.spawns.spectator) ctx.addSpawn("spectator", new THREE.Vector3(0,0,16), Math.PI);

    // Ensure room modes are synced
    const mode = ctx.rooms?.mode || "lobby";
    ctx.setRoomMode(mode);
  },

  _tick(ctx, dt) {
    // tickers
    const arr = ctx.__tickers;
    for (let i=0;i<arr.length;i++){
      try { arr[i](dt, ctx); } catch {}
    }
  }
};
