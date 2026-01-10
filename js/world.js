// /js/world.js — Scarlett Hybrid World 1.1 (Square Entry → Circle Hub + Solid Walls + Spawn Facing Table)

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log = (m) => LOG?.push?.("log", m) || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

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

    // ---------- BASE LIGHTING (never black) ----------
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    // ---------- COLLIDERS ----------
    // We keep a simple array so fallback movement can collide.
    ctx.colliders = ctx.colliders || [];

    const makeSolid = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      return mesh;
    };

    // ---------- FLOOR (big base) ----------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ---------- YOUR BUILDING SHAPE ----------
    // Square entry room (spawn area) -> doorway -> circular hub.
    // Coordinates: player enters from +Z side toward -Z (toward hub/table).

    const WALL_H = 3.0;
    const WALL_T = 0.25;

    // SQUARE ENTRY dimensions
    const squareW = 12;      // width (X)
    const squareL = 16;      // length (Z)
    const squareCenter = new THREE.Vector3(0, WALL_H/2, 18); // forward of hub

    // HUB circle
    const hubRadius = 7.2;
    const hubCenter = new THREE.Vector3(0, 0, 0);

    // Visual hub plate
    const hubPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(hubRadius, hubRadius, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.45, metalness: 0.18 })
    );
    hubPlate.position.set(hubCenter.x, 0.11, hubCenter.z);
    scene.add(hubPlate);

    // Neon ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(hubRadius, 0.12, 16, 128),
      new THREE.MeshStandardMaterial({
        color: 0x081018,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 1.6,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(hubCenter.x, 0.35, hubCenter.z);
    scene.add(ring);

    // Square entry floor plate (visual guide)
    const entryPlate = new THREE.Mesh(
      new THREE.BoxGeometry(squareW, 0.18, squareL),
      new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.8, metalness: 0.08 })
    );
    entryPlate.position.set(squareCenter.x, 0.09, squareCenter.z);
    scene.add(entryPlate);

    // ---- Solid square walls with ONE doorway opening toward the hub ----
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x080a12, roughness: 0.75, metalness: 0.10
    });

    // Doorway on the "south" wall (facing hub): centered opening
    const doorW = 3.0;

    // North wall (back of square, farthest from hub)
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(squareW + WALL_T, WALL_H, WALL_T),
      wallMat
    )).position.set(squareCenter.x, WALL_H/2, squareCenter.z + squareL/2);

    // West wall
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(WALL_T, WALL_H, squareL + WALL_T),
      wallMat
    )).position.set(squareCenter.x - squareW/2, WALL_H/2, squareCenter.z);

    // East wall
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(WALL_T, WALL_H, squareL + WALL_T),
      wallMat
    )).position.set(squareCenter.x + squareW/2, WALL_H/2, squareCenter.z);

    // South wall split into two segments with doorway gap
    const southZ = squareCenter.z - squareL/2;
    const leftSegW = (squareW - doorW) / 2;
    const rightSegW = leftSegW;

    // left segment
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(leftSegW, WALL_H, WALL_T),
      wallMat
    )).position.set(squareCenter.x - (doorW/2 + leftSegW/2), WALL_H/2, southZ);

    // right segment
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(rightSegW, WALL_H, WALL_T),
      wallMat
    )).position.set(squareCenter.x + (doorW/2 + rightSegW/2), WALL_H/2, southZ);

    // ---- Hallway bridge from square doorway into hub ----
    const hallW = 4.0;
    const hallL = 8.0;
    const hallCenter = new THREE.Vector3(0, 0.09, southZ - hallL/2);

    const hallPlate = new THREE.Mesh(
      new THREE.BoxGeometry(hallW, 0.18, hallL),
      new THREE.MeshStandardMaterial({ color: 0x090b14, roughness: 0.9 })
    );
    hallPlate.position.copy(hallCenter);
    scene.add(hallPlate);

    // Hall walls (solid)
    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(WALL_T, WALL_H, hallL),
      wallMat
    )).position.set(-hallW/2, WALL_H/2, hallCenter.z);

    makeSolid(new THREE.Mesh(
      new THREE.BoxGeometry(WALL_T, WALL_H, hallL),
      wallMat
    )).position.set(+hallW/2, WALL_H/2, hallCenter.z);

    // Optional “arch” at hub entry (visual)
    const arch = new THREE.Mesh(
      new THREE.BoxGeometry(hallW + 0.6, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111827, emissive: new THREE.Color(0x00ffff), emissiveIntensity: 0.9 })
    );
    arch.position.set(0, WALL_H - 0.2, hallCenter.z - hallL/2 + 0.4);
    scene.add(arch);

    // ---- Boss table in hub (the thing you must face) ----
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    table.position.set(0, 0.78, -1.4);
    table.name = "BossTable";
    scene.add(table);

    // Dealer anchor (for dealing modules)
    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, -0.55);
    scene.add(dealer);

    // ---- Spawn point: inside the square, near its “beginning” ----
    // This is the beginning of the square before reaching the circle, as you requested.
    const spawn = new THREE.Object3D();
    spawn.name = "SpawnPoint";
    spawn.position.set(0, 0, squareCenter.z + squareL/2 - 2.2); // near back of square
    scene.add(spawn);

    log("[world] structure built ✅ (square entry → hall → circle hub)");

    // ---------- Load your existing systems (safe) ----------
    const rm = await safeImport("./room_manager.js");
    if (rm?.RoomManager?.init) { try { rm.RoomManager.init(ctx); addSystem("room_manager", rm.RoomManager); } catch {} }

    const teleportMachine = await safeImport("./teleport_machine.js");
    if (teleportMachine?.TeleportMachine?.init) { try { await teleportMachine.TeleportMachine.init(ctx); addSystem("teleport_machine", teleportMachine.TeleportMachine); } catch {} }

    const teleport = await safeImport("./teleport.js");
    if (teleport?.Teleport?.init) { try { teleport.Teleport.init(ctx); addSystem("teleport", teleport.Teleport); } catch {} }

    const store = await safeImport("./store.js");
    if (store?.StoreSystem?.init) { try { store.StoreSystem.init(ctx); addSystem("store", store.StoreSystem); } catch {} }

    const scorpion = await safeImport("./scorpion_room.js");
    if (scorpion?.ScorpionRoom?.init) { try { scorpion.ScorpionRoom.init(ctx); addSystem("scorpion", scorpion.ScorpionRoom); } catch {} }

    const bots = await safeImport("./bots.js");
    if (bots?.Bots?.init) { try { bots.Bots.init(ctx); addSystem("bots", bots.Bots); } catch {} }

    const pokerSim = await safeImport("./poker_sim.js");
    if (pokerSim?.PokerSim?.init) { try { pokerSim.PokerSim.init(ctx); addSystem("poker_sim", pokerSim.PokerSim); } catch {} }

    const uiMod = await safeImport("./ui.js");
    if (uiMod?.UI?.init) { try { uiMod.UI.init(ctx); addSystem("ui", uiMod.UI); } catch {} }

    const vrUi = await safeImport("./vr_ui.js");
    if (vrUi?.initVRUI) { try { vrUi.initVRUI(ctx); addSystem("vr_ui", { update: vrUi.updateVRUI || null }); } catch {} }

    const interactions = await safeImport("./interactions.js");
    if (interactions?.Interactions?.init) { try { interactions.Interactions.init(ctx); addSystem("interactions", interactions.Interactions); } catch {} }

    // Start in lobby
    this.setRoom(ctx, ctx.room || "lobby");
    log("[world] init complete ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;

    const rm = ctx.systems?.room_manager;
    if (rm?.setRoom) return rm.setRoom(ctx, room);

    ctx.systems?.store?.setActive?.(room === "store");
    ctx.systems?.scorpion?.setActive?.(room === "scorpion");
    ctx.systems?.poker_sim?.setMode?.(room === "poker" ? "table" : "lobby_demo");
    ctx.LOG?.push?.("log", `[world] setRoom fallback => ${room}`);
  },

  update(ctx, dt) {
    const systems = ctx.systems || {};
    for (const k of Object.keys(systems)) {
      try { systems[k]?.update?.(dt, ctx); } catch {}
    }
  }
};
