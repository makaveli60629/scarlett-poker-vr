// /js/world.js — SCARLETT MASTER WORLD — FULL v10.2 (COMPAT + BOTS + DEMO GAME)
// ✅ LOADER SIGNATURE: WORLD.JS V10.2 ACTIVE

export const World = {
  async init(baseCtx) {
    const ctx = World._createCtx(baseCtx);
    ctx.log(`[world] ✅ LOADER SIGNATURE: WORLD.JS V10.2 ACTIVE`);

    ctx.log(`[world] fallback world building…`);
    World._buildFallbackLobby(ctx);
    ctx.log(`[world] fallback built ✅`);

    const mountedCount = await World._mountAllSystems(ctx);

    // If bots/game did not mount from external modules, spawn fallback bots + demo play
    if (!ctx.__hasBots) World._spawnFallbackBots(ctx);
    if (!ctx.__hasDemoGame) World._startDemoPoker(ctx);

    World._finalizeWorld(ctx);

    ctx.log(`[world] ✅ REAL WORLD LOADED (mounted=${mountedCount})`);
    ctx.log(`[world] init complete ✅`);
    return {
      ctx,
      tick: (dt) => World._tick(ctx, dt),
      getSpawn: (name) => ctx.spawns[name] || null,
    };
  },

  _createCtx(base) {
    const ctx = base || {};
    ctx.THREE = ctx.THREE || globalThis.THREE;
    ctx.scene = ctx.scene || null;
    ctx.renderer = ctx.renderer || null;
    ctx.camera = ctx.camera || null;
    ctx.player = ctx.player || null;
    ctx.controllers = ctx.controllers || null;

    ctx.log = (typeof ctx.log === "function") ? ctx.log : (...a)=>console.log(...a);

    ctx.__mounted = ctx.__mounted || [];
    ctx.__tickers = ctx.__tickers || [];
    ctx.solids = ctx.solids || [];
    ctx.triggers = ctx.triggers || [];
    ctx.spawns = ctx.spawns || {};
    ctx.textures = ctx.textures || {};
    ctx.flags = ctx.flags || {};
    ctx.ui = ctx.ui || {};
    ctx.ui.panels = ctx.ui.panels || [];
    ctx.ui.buttons = ctx.ui.buttons || [];
    ctx.ui.hotspots = ctx.ui.hotspots || [];

    // legacy ui compat
    ctx.__ui = ctx.__ui || {};
    ctx.ui.__ui = ctx.ui.__ui || ctx.__ui;
    ctx.ui.hub = ctx.ui.hub || null;
    ctx.__ui.hub = ctx.__ui.hub || ctx.ui.hub;

    // legacy rooms compat
    ctx.rooms = ctx.rooms || {};
    ctx.rooms.mode = ctx.rooms.mode || "lobby";
    ctx.rm = ctx.rm || { mode: ctx.rooms.mode };
    ctx.room = ctx.room || { mode: ctx.rooms.mode };

    // legacy world compat
    ctx.world = ctx.world || {};
    ctx.world.colliders = ctx.world.colliders || ctx.solids;
    ctx.colliders = ctx.colliders || ctx.world.colliders;
    ctx.world.triggers = ctx.world.triggers || ctx.triggers;

    ctx.addMounted = (obj) => {
      if (!obj) return;
      ctx.__mounted.push(obj);
      if (ctx.scene && obj.isObject3D && obj.parent !== ctx.scene) ctx.scene.add(obj);
    };
    ctx.world.mount = ctx.world.mount || ((obj) => ctx.addMounted(obj));

    ctx.addSolid = (obj) => {
      if (!obj) return;
      ctx.solids.push(obj);
      ctx.world.colliders = ctx.solids;
      ctx.colliders = ctx.solids;
      ctx.addMounted(obj);
    };

    ctx.addTicker = (fn) => { if (typeof fn === "function") ctx.__tickers.push(fn); };

    ctx.addSpawn = (name, pos, rotY = 0) => {
      ctx.spawns[name] = { position: pos?.clone ? pos.clone() : pos, rotY };
    };

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

  async _call(ctx, label, fn, arg = ctx) {
    if (typeof fn !== "function") return false;
    try {
      ctx.log(`[world] calling ${label}`);
      const res = await fn(arg);
      if (res?.tick) ctx.addTicker((dt)=>res.tick(dt, ctx));
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

    // TEXTURES
    {
      const m = await World._safeImport(ctx, `./textures.js?v=${v}`);
      const kitFn = m?.createTextureKit || m?.Textures?.createTextureKit || m?.default?.createTextureKit;
      if (kitFn) {
        try { ctx.textures = await kitFn(ctx) || ctx.textures; ctx.log(`[world] ✅ mounted textures via createTextureKit()`); mounted++; }
        catch(e){ ctx.log(`[world] ⚠️ textures kit error: ${String(e?.message||e)}`); }
      }
    }

    // CORE WORLD SYSTEMS (your modules)
    const systems = [
      ["lights_pack.js.LightsPack.build (ctx)", `./lights_pack.js?v=${v}`, (m)=>m?.LightsPack?.build || m?.default?.LightsPack?.build || m?.build],
      ["solid_walls.js.SolidWalls.build (ctx)", `./solid_walls.js?v=${v}`, (m)=>m?.SolidWalls?.build || m?.default?.SolidWalls?.build || m?.build],
      ["table_factory.js.TableFactory.build (ctx)", `./table_factory.js?v=${v}`, (m)=>m?.TableFactory?.build || m?.default?.TableFactory?.build || m?.build],
      ["spectator_rail.js.SpectatorRail.build (ctx)", `./spectator_rail.js?v=${v}`, (m)=>m?.SpectatorRail?.build || m?.default?.SpectatorRail?.build || m?.build],
      ["teleport_machine.js.TeleportMachine.init (ctx)", `./teleport_machine.js?v=${v}`, (m)=>m?.TeleportMachine?.init || m?.default?.TeleportMachine?.init || m?.init],
      ["store.js.StoreSystem.init (ctx)", `./store.js?v=${v}`, (m)=>m?.StoreSystem?.init || m?.default?.StoreSystem?.init || m?.init],
      ["shop_ui.js.ShopUI.init (ctx)", `./shop_ui.js?v=${v}`, (m)=>m?.ShopUI?.init || m?.default?.ShopUI?.init || m?.init],
      ["water_fountain.js.WaterFountain.build (ctx)", `./water_fountain.js?v=${v}`, (m)=>m?.WaterFountain?.build || m?.default?.WaterFountain?.build || m?.build],
      ["ui.js.UI.init (ctx)", `./ui.js?v=${v}`, (m)=>m?.UI?.init || m?.default?.UI?.init || m?.init],
      ["vr_ui.js.initVRUI (ctx)", `./vr_ui.js?v=${v}`, (m)=>m?.initVRUI || m?.VRUI?.init || m?.default?.initVRUI || m?.default?.VRUI?.init],
      ["vr_ui_panel.js.init (ctx)", `./vr_ui_panel.js?v=${v}`, (m)=>m?.VRUIPanel?.init || m?.default?.VRUIPanel?.init || m?.init],
      ["scorpion_room.js.ScorpionRoom.build (ctx)", `./scorpion_room.js?v=${v}`, (m)=>m?.ScorpionRoom?.build || m?.default?.ScorpionRoom?.build || m?.build],
      ["room_manager.js.RoomManager.init (ctx)", `./room_manager.js?v=${v}`, (m)=>m?.RoomManager?.init || m?.default?.RoomManager?.init || m?.init],
    ];

    for (const [label, path, pick] of systems){
      const mod = await World._safeImport(ctx, path);
      const fn = pick(mod);
      if (await World._call(ctx, label, fn, ctx)) mounted++;
    }

    // OPTIONAL: bots module if you have it
    {
      const m = await World._safeImport(ctx, `./bots.js?v=${v}`);
      const init = m?.Bots?.init || m?.default?.Bots?.init || m?.init;
      const ok = await World._call(ctx, `bots.js.Bots.init (ctx)`, init, ctx);
      if (ok) { ctx.__hasBots = true; mounted++; }
    }

    // OPTIONAL: poker sim module if you have it
    {
      const m = await World._safeImport(ctx, `./poker_sim.js?v=${v}`);
      const init = m?.PokerSim?.init || m?.default?.PokerSim?.init || m?.init;
      const ok = await World._call(ctx, `poker_sim.js.PokerSim.init (ctx)`, init, ctx);
      if (ok) { ctx.__hasDemoGame = true; mounted++; }
    }

    // FX (optional)
    await World._safeImport(ctx, `./teleport_fx.js?v=${v}`);
    await World._safeImport(ctx, `./TeleportVFX.js?v=${v}`);
    await World._safeImport(ctx, `./teleport_burst_fx.js?v=${v}`);

    return mounted;
  },

  _buildFallbackLobby(ctx) {
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;

    const root = new THREE.Group();
    root.name = "MASTER_LOBBY";
    ctx.addMounted(root);

    // Better-looking lobby instantly (more “appealing” even before textures)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x090b14, roughness: 0.92, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    root.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x151a2d, roughness: 0.78, metalness: 0.08 });
    const wallH = 7, thick = 0.6, half = 36;

    const mkWall = (w,h,d,x,y,z)=>{
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
      m.position.set(x,y,z);
      root.add(m);
      ctx.addSolid(m);
    };
    mkWall(80, wallH, thick, 0, wallH/2, -half);
    mkWall(80, wallH, thick, 0, wallH/2,  half);
    mkWall(thick, wallH, 80, -half, wallH/2, 0);
    mkWall(thick, wallH, 80,  half, wallH/2, 0);

    // Neon ring lights
    const amb = new THREE.AmbientLight(0x9fb1ff, 0.22);
    root.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(8, 12, 6);
    root.add(key);

    const rim = new THREE.PointLight(0x7fe7ff, 2.2, 30);
    rim.position.set(0, 3.2, 0);
    root.add(rim);

    // spawns
    ctx.addSpawn("lobby", new THREE.Vector3(0,0,14), Math.PI);
    ctx.addSpawn("spectator", new THREE.Vector3(0,0,20), Math.PI);
    ctx.addSpawn("scorpion_seat", new THREE.Vector3(14,0,0), -Math.PI/2);

    // subtle pulse
    let t=0;
    ctx.addTicker((dt)=>{
      t += dt;
      rim.intensity = 1.9 + Math.sin(t*0.9)*0.25;
      amb.intensity = 0.20 + Math.sin(t*0.4)*0.02;
    });
  },

  _spawnFallbackBots(ctx){
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;
    ctx.__hasBots = true;

    const bots = new THREE.Group();
    bots.name = "BOTS_FALLBACK";
    scene.add(bots);

    const botMat = new THREE.MeshStandardMaterial({ color: 0x0d1020, roughness: 0.55, metalness: 0.15, emissive: 0x001a22, emissiveIntensity: 0.25 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 0.35, metalness: 0.2, emissive: 0x004455, emissiveIntensity: 0.5 });

    const botList = [];
    const count = 8;
    for (let i=0;i<count;i++){
      const g = new THREE.Group();
      g.userData.phase = Math.random()*Math.PI*2;

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.85, 6, 14), botMat);
      body.position.y = 1.05;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 18), headMat);
      head.position.y = 1.68;

      g.add(body, head);
      bots.add(g);
      botList.push(g);
    }

    // ring around table area
    ctx.addTicker((dt)=>{
      const R = 3.2;
      for (let i=0;i<botList.length;i++){
        const b = botList[i];
        b.userData.phase += dt * 0.25;
        const a = (i/botList.length)*Math.PI*2 + b.userData.phase*0.15;
        b.position.set(Math.cos(a)*R, 0, Math.sin(a)*R);
        b.rotation.y = -a + Math.PI/2;
        b.position.y = 0;
      }
    });

    ctx.bots = botList;
  },

  _startDemoPoker(ctx){
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;
    ctx.__hasDemoGame = true;

    // Simple “dealer chip” + “card” visual so you can OBSERVE the game while editing
    const root = new THREE.Group();
    root.name = "DEMO_POKER";
    scene.add(root);

    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.35, emissive: 0x330011, emissiveIntensity: 0.25 })
    );
    chip.position.set(0, 1.05, 0);
    root.add(chip);

    const cardMat = new THREE.MeshStandardMaterial({ color: 0xe8ecff, roughness: 0.85, metalness: 0.0 });
    const cards = [];
    for (let i=0;i<5;i++){
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), cardMat);
      c.position.set(-0.6 + i*0.3, 1.02, 0.2);
      c.rotation.x = -Math.PI/2;
      root.add(c);
      cards.push(c);
    }

    let t=0;
    ctx.addTicker((dt)=>{
      t += dt;
      chip.rotation.y += dt*1.6;
      chip.position.y = 1.03 + Math.sin(t*2.2)*0.02;
    });
  },

  _finalizeWorld(ctx) {
    const { THREE } = ctx;
    if (!THREE) return;

    if (!ctx.spawns.lobby) ctx.addSpawn("lobby", new THREE.Vector3(0,0,14), Math.PI);
    if (!ctx.spawns.scorpion_seat) ctx.addSpawn("scorpion_seat", new THREE.Vector3(14,0,0), -Math.PI/2);
    if (!ctx.spawns.spectator) ctx.addSpawn("spectator", new THREE.Vector3(0,0,20), Math.PI);

    ctx.setRoomMode(ctx.rooms?.mode || "lobby");
  },

  _tick(ctx, dt) {
    for (let i=0;i<ctx.__tickers.length;i++){
      try{ ctx.__tickers[i](dt, ctx); } catch {}
    }
  }
};
