// /js/world.js — Scarlett Hybrid World 1.0 (Combined)
// ✅ Always builds a visible hub + rooms
// ✅ Then loads your real modules if they exist (safe)
// ✅ Exposes World.init / World.update / World.setRoom

export const World = {
  async init(ctx) {
    const { THREE, scene, camera, renderer, LOG } = ctx;
    const log = (m) => LOG?.push?.("log", m) || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);
    const err = (m) => LOG?.push?.("error", m) || console.error(m);

    ctx.systems = ctx.systems || {};
    ctx.room = ctx.room || "lobby";
    ctx.mode = ctx.mode || "lobby";

    // ---------- helpers ----------
    const safeImport = async (url) => {
      try { return await import(url); }
      catch (e) { warn(`import fail: ${url} — ${e?.message || e}`); return null; }
    };

    const addSystem = (name, api) => {
      if (!api) return;
      ctx.systems[name] = api;
      log(`[world] system ok: ${name}`);
    };

    // ---------- 0) Always-visible base environment (hub blueprint) ----------
    // Lighting (baseline so nothing is black even if lights_pack fails)
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Neon ring hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.2, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.45, metalness: 0.18 })
    );
    hub.position.set(0, 0.11, 0);
    scene.add(hub);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.12, 16, 128),
      new THREE.MeshStandardMaterial({
        color: 0x081018,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 1.6,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    scene.add(ring);

    // Center boss table anchor
    const bossTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    bossTable.position.set(0, 0.78, -1.4);
    bossTable.name = "BossTable";
    scene.add(bossTable);

    // Dealer anchor (many of your deal systems depend on it)
    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, -0.55);
    scene.add(dealer);

    // Door/room stubs from your blueprint
    const mkPortal = (name, x, z, color = 0x00ffff) => {
      const g = new THREE.BoxGeometry(1.4, 2.2, 0.18);
      const m = new THREE.MeshStandardMaterial({
        color: 0x081018,
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0.15
      });
      const p = new THREE.Mesh(g, m);
      p.position.set(x, 1.1, z);
      p.name = name;
      p.userData.isPortal = true;
      p.userData.room = name.toLowerCase().includes("store") ? "store"
                     : name.toLowerCase().includes("scorpion") ? "scorpion"
                     : name.toLowerCase().includes("poker") ? "poker"
                     : "lobby";
      scene.add(p);
      return p;
    };

    // Positions: store left, scorpion down-left-ish, poker right, event up
    mkPortal("Portal_Store", -9.5, 0.0, 0x7fe7ff);
    mkPortal("Portal_Poker",  9.5, 0.0, 0xff2d7a);
    mkPortal("Portal_Event",  0.0, -10.5, 0xffcc00);
    mkPortal("Portal_Scorpion", 0.0, 10.5, 0x9b5cff);

    // Spawn point
    const spawn = new THREE.Object3D();
    spawn.name = "SpawnPoint";
    spawn.position.set(0, 1.65, 4.2);
    scene.add(spawn);

    log("[world] base hub built ✅");

    // ---------- 1) Try to load your richer lighting/world modules ----------
    const lightsPack = await safeImport("./lights_pack.js");
    if (lightsPack?.LightsPack?.init) {
      try { await lightsPack.LightsPack.init(ctx); addSystem("lights_pack", lightsPack.LightsPack); }
      catch (e) { warn(`lights_pack init failed: ${e?.message || e}`); }
    }

    const solidWalls = await safeImport("./solid_walls.js");
    if (solidWalls?.SolidWalls?.init) {
      try { await solidWalls.SolidWalls.init(ctx); addSystem("solid_walls", solidWalls.SolidWalls); }
      catch (e) { warn(`solid_walls init failed: ${e?.message || e}`); }
    }

    // ---------- 2) Load core gameplay systems (safe) ----------
    const rm = await safeImport("./room_manager.js");
    if (rm?.RoomManager?.init) {
      try { rm.RoomManager.init(ctx); addSystem("room_manager", rm.RoomManager); }
      catch (e) { warn(`room_manager init failed: ${e?.message || e}`); }
    }

    const teleportMachine = await safeImport("./teleport_machine.js");
    if (teleportMachine?.TeleportMachine?.init) {
      try { await teleportMachine.TeleportMachine.init(ctx); addSystem("teleport_machine", teleportMachine.TeleportMachine); }
      catch (e) { warn(`teleport_machine init failed: ${e?.message || e}`); }
    }

    // Optional simple teleport ray (some builds used teleport.js)
    const teleport = await safeImport("./teleport.js");
    if (teleport?.Teleport?.init) {
      try { teleport.Teleport.init({ ...ctx, controllers: ctx.controllers }); addSystem("teleport", teleport.Teleport); }
      catch (e) { warn(`teleport init failed: ${e?.message || e}`); }
    }

    // Store
    const store = await safeImport("./store.js");
    if (store?.StoreSystem?.init) {
      try { store.StoreSystem.init({ ...ctx, player: ctx.player, world: ctx.world }); addSystem("store", store.StoreSystem); }
      catch (e) { warn(`store init failed: ${e?.message || e}`); }
    }

    // Scorpion room
    const scorpion = await safeImport("./scorpion_room.js");
    if (scorpion?.ScorpionRoom?.init) {
      try { scorpion.ScorpionRoom.init(ctx); addSystem("scorpion", scorpion.ScorpionRoom); }
      catch (e) { warn(`scorpion init failed: ${e?.message || e}`); }
    }

    // Bots
    const bots = await safeImport("./bots.js");
    if (bots?.Bots?.init) {
      try { bots.Bots.init(ctx); addSystem("bots", bots.Bots); }
      catch (e) { warn(`bots init failed: ${e?.message || e}`); }
    }

    // Poker sim
    const pokerSim = await safeImport("./poker_sim.js");
    if (pokerSim?.PokerSim?.init) {
      try { pokerSim.PokerSim.init(ctx); addSystem("poker_sim", pokerSim.PokerSim); }
      catch (e) { warn(`poker_sim init failed: ${e?.message || e}`); }
    }

    // UI modules (optional)
    const uiMod = await safeImport("./ui.js");
    if (uiMod?.UI?.init) {
      try { uiMod.UI.init(ctx); addSystem("ui", uiMod.UI); }
      catch (e) { warn(`ui init failed: ${e?.message || e}`); }
    }

    const vrUi = await safeImport("./vr_ui.js");
    if (vrUi?.initVRUI) {
      try { vrUi.initVRUI(ctx); addSystem("vr_ui", { update: vrUi.updateVRUI || null }); }
      catch (e) { warn(`vr_ui init failed: ${e?.message || e}`); }
    }

    // Controls / locomotion (Android + XR)
    const xrLoc = await safeImport("./xr_locomotion.js");
    if (xrLoc?.XrLocomotion?.init) {
      try { xrLoc.XrLocomotion.init(ctx); addSystem("xr_locomotion", xrLoc.XrLocomotion); }
      catch (e) { warn(`xr_locomotion init failed: ${e?.message || e}`); }
    }

    const vrLoc = await safeImport("./vr_locomotion.js");
    if (vrLoc?.VRLocomotion?.init) {
      try { vrLoc.VRLocomotion.init(ctx); addSystem("vr_locomotion", vrLoc.VRLocomotion); }
      catch (e) { warn(`vr_locomotion init failed: ${e?.message || e}`); }
    }

    const android = await safeImport("./android_controls.js");
    if (android?.AndroidControls?.init) {
      try { android.AndroidControls.init(ctx); addSystem("android_controls", android.AndroidControls); }
      catch (e) { warn(`android_controls init failed: ${e?.message || e}`); }
    }

    const mobileTouch = await safeImport("./mobile_touch.js");
    if (mobileTouch?.MobileTouch?.init) {
      try { mobileTouch.MobileTouch.init(ctx); addSystem("mobile_touch", mobileTouch.MobileTouch); }
      catch (e) { warn(`mobile_touch init failed: ${e?.message || e}`); }
    }

    // Hands / input / interactions (hands-only pipeline)
    const hands = await safeImport("./hands.js");
    if (hands?.Hands?.init) {
      try { hands.Hands.init(ctx); addSystem("hands", hands.Hands); }
      catch (e) { warn(`hands init failed: ${e?.message || e}`); }
    }

    const input = await safeImport("./input.js");
    if (input?.Input?.init) {
      try { input.Input.init(ctx); addSystem("input", input.Input); }
      catch (e) { warn(`input init failed: ${e?.message || e}`); }
    }

    const interactions = await safeImport("./interactions.js");
    if (interactions?.Interactions?.init) {
      try { interactions.Interactions.init(ctx); addSystem("interactions", interactions.Interactions); }
      catch (e) { warn(`interactions init failed: ${e?.message || e}`); }
    }

    // Start in lobby
    this.setRoom(ctx, ctx.room || "lobby");
    log("[world] init complete ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;

    // Prefer your actual RoomManager if loaded
    const rm = ctx.systems?.room_manager;
    if (rm?.setRoom) {
      rm.setRoom(ctx, room);
      return;
    }

    // Fallback behavior if RoomManager not present:
    // show/hide store/scorpion systems if they implement setActive
    ctx.systems?.store?.setActive?.(room === "store");
    ctx.systems?.scorpion?.setActive?.(room === "scorpion");
    ctx.systems?.poker_sim?.setMode?.(room === "poker" ? "table" : "lobby_demo");
    ctx.LOG?.push?.("log", `[world] setRoom fallback => ${room}`);
  },

  update(ctx, dt) {
    // Update any loaded systems that expose update
    const systems = ctx.systems || {};
    for (const k of Object.keys(systems)) {
      try { systems[k]?.update?.(dt, ctx); } catch {}
    }
  }
};
