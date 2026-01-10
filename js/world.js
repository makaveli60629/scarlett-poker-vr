// /js/world.js — SCARLETT MASTER WORLD — Ultimate v10.0 (FULL)
// LOADER SIGNATURE: WORLD.JS V10.0 ACTIVE
//
// Goals:
// - Full lobby + store + rooms + tables + rails + teleport + UI
// - Safe module mounting (no hard crashes if one module changes)
// - Central ctx registry: solids/colliders/mounted/tickers/spawns
// - Works on Quest/Oculus Browser + GitHub Pages
//
// Expected external modules (optional, auto-safe):
//  ./textures.js
//  ./lights_pack.js
//  ./solid_walls.js
//  ./table_factory.js
//  ./spectator_rail.js
//  ./teleport_machine.js
//  ./store.js
//  ./shop_ui.js
//  ./water_fountain.js
//  ./ui.js
//  ./vr_ui.js
//  ./vr_ui_panel.js
//  ./scorpion_room.js
//  ./room_manager.js
//  ./teleport_fx.js
//  ./TeleportVFX.js
//  ./teleport_burst_fx.js

export const World = {
  async init(baseCtx) {
    const ctx = World._createCtx(baseCtx);
    ctx.log(`[world] ✅ LOADER SIGNATURE: WORLD.JS V10.0 ACTIVE`);

    // 1) Always build a strong fallback world first (so you NEVER load into black void)
    ctx.log(`[world] fallback world building…`);
    World._buildFallbackLobby(ctx);
    ctx.log(`[world] fallback built ✅`);

    // 2) Load modules safely and mount them (your full world stack)
    const mountedCount = await World._mountAllSystems(ctx);

    // 3) Final sanity pass
    World._finalizeWorld(ctx);

    ctx.log(`[world] ✅ REAL WORLD LOADED (mounted=${mountedCount})`);
    ctx.log(`[world] init complete ✅`);
    return {
      ctx,
      tick: (dt) => World._tick(ctx, dt),
      getSpawn: (name) => ctx.spawns[name] || null,
    };
  },

  // ---------------- ctx + mounting ----------------
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

    // Global registries
    ctx.__mounted = ctx.__mounted || [];
    ctx.__tickers = ctx.__tickers || [];
    ctx.solids = ctx.solids || [];          // collision solids
    ctx.triggers = ctx.triggers || [];      // teleport/interaction triggers
    ctx.ui = ctx.ui || {};
    ctx.ui.panels = ctx.ui.panels || [];
    ctx.ui.buttons = ctx.ui.buttons || [];
    ctx.ui.hotspots = ctx.ui.hotspots || [];
    ctx.rooms = ctx.rooms || {};
    ctx.spawns = ctx.spawns || {};          // named spawn transforms
    ctx.textures = ctx.textures || {};      // texture kit
    ctx.flags = ctx.flags || {};

    // Helpers
    ctx.addMounted = (obj) => {
      if (!obj) return;
      ctx.__mounted.push(obj);
      if (ctx.scene && obj.parent !== ctx.scene && obj.isObject3D) ctx.scene.add(obj);
    };

    ctx.addSolid = (obj) => {
      if (!obj) return;
      ctx.solids.push(obj);
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

    // Texture kit first (so everything else can use it)
    {
      const m = await World._safeImport(ctx, `./textures.js?v=${ctx._v || Date.now()}`);
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

    // Lights pack
    {
      const m = await World._safeImport(ctx, `./lights_pack.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.LightsPack?.build ||
        m?.default?.LightsPack?.build ||
        m?.build;
      if (await World._callSystem(ctx, `lights_pack.js.LightsPack.build (ctx)`, build, ctx)) mounted++;
    }

    // Solid walls / collisions
    {
      const m = await World._safeImport(ctx, `./solid_walls.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.SolidWalls?.build ||
        m?.default?.SolidWalls?.build ||
        m?.build;
      if (await World._callSystem(ctx, `solid_walls.js.SolidWalls.build (ctx)`, build, ctx)) mounted++;
    }

    // Table factory (tables + chairs + seats)
    {
      const m = await World._safeImport(ctx, `./table_factory.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.TableFactory?.build ||
        m?.default?.TableFactory?.build ||
        m?.build;
      if (await World._callSystem(ctx, `table_factory.js.TableFactory.build (ctx)`, build, ctx)) mounted++;
    }

    // Spectator rail
    {
      const m = await World._safeImport(ctx, `./spectator_rail.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.SpectatorRail?.build ||
        m?.default?.SpectatorRail?.build ||
        m?.build;
      if (await World._callSystem(ctx, `spectator_rail.js.SpectatorRail.build (ctx)`, build, ctx)) mounted++;
    }

    // Teleport machine
    {
      const m = await World._safeImport(ctx, `./teleport_machine.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.TeleportMachine?.init ||
        m?.default?.TeleportMachine?.init ||
        m?.init;
      if (await World._callSystem(ctx, `teleport_machine.js.TeleportMachine.init (ctx)`, init, ctx)) mounted++;
    }

    // Store system
    {
      const m = await World._safeImport(ctx, `./store.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.StoreSystem?.init ||
        m?.default?.StoreSystem?.init ||
        m?.init;
      if (await World._callSystem(ctx, `store.js.StoreSystem.init (ctx)`, init, ctx)) mounted++;
    }

    // Shop UI
    {
      const m = await World._safeImport(ctx, `./shop_ui.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.ShopUI?.init ||
        m?.default?.ShopUI?.init ||
        m?.init;
      if (await World._callSystem(ctx, `shop_ui.js.ShopUI.init (ctx)`, init, ctx)) mounted++;
    }

    // Water fountain
    {
      const m = await World._safeImport(ctx, `./water_fountain.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.WaterFountain?.build ||
        m?.default?.WaterFountain?.build ||
        m?.build;
      if (await World._callSystem(ctx, `water_fountain.js.WaterFountain.build (ctx)`, build, ctx)) mounted++;
    }

    // UI
    {
      const m = await World._safeImport(ctx, `./ui.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.UI?.init ||
        m?.default?.UI?.init ||
        m?.init;
      if (await World._callSystem(ctx, `ui.js.UI.init (ctx)`, init, ctx)) mounted++;
    }

    // VR UI (hands/watch/menu textures etc)
    {
      const m = await World._safeImport(ctx, `./vr_ui.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.initVRUI ||
        m?.VRUI?.init ||
        m?.default?.initVRUI ||
        m?.default?.VRUI?.init;
      if (await World._callSystem(ctx, `vr_ui.js.initVRUI (ctx)`, init, ctx)) mounted++;
    }

    // VR UI Panel (hardened)
    {
      const m = await World._safeImport(ctx, `./vr_ui_panel.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.VRUIPanel?.init ||
        m?.default?.VRUIPanel?.init ||
        m?.init;
      // Try ctx first; if some older file expects scene, it should still not crash
      const ok = await World._callSystem(ctx, `vr_ui_panel.js.init (ctx)`, init, ctx);
      if (!ok) await World._callSystem(ctx, `vr_ui_panel.js.init (scene)`, init, ctx.scene);
      mounted++;
    }

    // Scorpion Room
    {
      const m = await World._safeImport(ctx, `./scorpion_room.js?v=${ctx._v || Date.now()}`);
      const build =
        m?.ScorpionRoom?.build ||
        m?.default?.ScorpionRoom?.build ||
        m?.build;
      if (await World._callSystem(ctx, `scorpion_room.js.ScorpionRoom.build (ctx)`, build, ctx)) mounted++;
    }

    // Room manager
    {
      const m = await World._safeImport(ctx, `./room_manager.js?v=${ctx._v || Date.now()}`);
      const init =
        m?.RoomManager?.init ||
        m?.default?.RoomManager?.init ||
        m?.init;
      if (await World._callSystem(ctx, `room_manager.js.RoomManager.init (ctx)`, init, ctx)) mounted++;
    }

    // Teleport FX packs (optional)
    {
      const m1 = await World._safeImport(ctx, `./teleport_fx.js?v=${ctx._v || Date.now()}`);
      const m2 = await World._safeImport(ctx, `./TeleportVFX.js?v=${ctx._v || Date.now()}`);
      const m3 = await World._safeImport(ctx, `./teleport_burst_fx.js?v=${ctx._v || Date.now()}`);

      // If any of these exports have init/build, call them
      const cand = [
        m1?.init || m1?.TeleportFX?.init || m1?.TeleportFX?.build,
        m2?.init || m2?.TeleportVFX?.init || m2?.TeleportVFX?.build,
        m3?.init || m3?.TeleportBurstFX?.init || m3?.TeleportBurstFX?.build,
      ];
      for (let i = 0; i < cand.length; i++) {
        if (await World._callSystem(ctx, `teleport fx pack #${i+1}`, cand[i], ctx)) mounted++;
      }
    }

    return mounted;
  },

  // ---------------- fallback master lobby ----------------
  _buildFallbackLobby(ctx) {
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;

    // Root
    const root = new THREE.Group();
    root.name = "MASTER_LOBBY_FALLBACK";
    ctx.addMounted(root);

    // Floor (big)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "floor";
    root.add(floor);

    // Ceiling glow plane
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x070815, emissive: 0x111a44, emissiveIntensity: 0.35, roughness: 1 })
    );
    ceil.position.y = 6.5;
    ceil.rotation.x = Math.PI / 2;
    root.add(ceil);

    // Lobby walls (simple box ring)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x14172a, roughness: 0.85, metalness: 0.0 });
    const wallH = 6;
    const thickness = 0.5;
    const half = 28;

    function wall(w, h, d, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = false;
      m.receiveShadow = true;
      m.name = "wall";
      root.add(m);
      ctx.addSolid(m); // treat as solid
    }

    wall(60, wallH, thickness, 0, wallH/2, -half);
    wall(60, wallH, thickness, 0, wallH/2,  half);
    wall(thickness, wallH, 60, -half, wallH/2, 0);
    wall(thickness, wallH, 60,  half, wallH/2, 0);

    // Columns for a richer space
    const colMat = new THREE.MeshStandardMaterial({ color: 0x101325, roughness: 0.7, metalness: 0.08 });
    for (let i=0;i<10;i++){
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 18), colMat);
      const a = (i/10) * Math.PI*2;
      c.position.set(Math.cos(a)*12, 3, Math.sin(a)*12);
      root.add(c);
    }

    // Lighting (fallback)
    const amb = new THREE.AmbientLight(0x8aa0ff, 0.18);
    root.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 4);
    root.add(key);

    // Spawn points (standing lobby + spectator + scorpion seat)
    ctx.addSpawn("lobby", new THREE.Vector3(0, 0, 10), Math.PI);
    ctx.addSpawn("spectator", new THREE.Vector3(0, 0, 16), Math.PI);
    ctx.addSpawn("scorpion_seat", new THREE.Vector3(10, 0, 0), -Math.PI/2);

    // Big sign
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xff2d7a, emissiveIntensity: 0.35, roughness: 1 })
    );
    sign.position.set(0, 4.6, -25);
    root.add(sign);

    // Soft “casino rug” center circle
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.95, metalness: 0.0 })
    );
    rug.rotation.x = -Math.PI/2;
    rug.position.y = 0.01;
    root.add(rug);

    // Tick subtle ambience pulsing (very light)
    let t = 0;
    ctx.addTicker((dt) => {
      t += dt;
      const pulse = 0.12 + Math.sin(t*0.6)*0.02;
      amb.intensity = pulse;
    });
  },

  _finalizeWorld(ctx) {
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;

    // If your modules didn’t set spawns, keep fallback spawns.
    if (!ctx.spawns.lobby) ctx.addSpawn("lobby", new THREE.Vector3(0,0,10), Math.PI);
    if (!ctx.spawns.scorpion_seat) ctx.addSpawn("scorpion_seat", new THREE.Vector3(10,0,0), -Math.PI/2);
    if (!ctx.spawns.spectator) ctx.addSpawn("spectator", new THREE.Vector3(0,0,16), Math.PI);

    // Guarantee a “worldRoot” for organization if systems want it
    if (!ctx.worldRoot) {
      ctx.worldRoot = scene.getObjectByName("WORLD_ROOT") || new THREE.Group();
      ctx.worldRoot.name = "WORLD_ROOT";
      if (!ctx.worldRoot.parent) scene.add(ctx.worldRoot);
    }
  },

  _tick(ctx, dt) {
    // Run registered tickers
    const arr = ctx.__tickers;
    for (let i=0;i<arr.length;i++){
      try { arr[i](dt, ctx); } catch(e) {}
    }

    // Optional: if room manager exposes a tick
    if (ctx.rooms?.manager?.tick) {
      try { ctx.rooms.manager.tick(dt, ctx); } catch(e) {}
    }
  }
};
