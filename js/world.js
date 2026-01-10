// /js/world.js — Scarlett Hybrid World 2.0
// ✅ 4 corner cubes (rooms) connected to a circular hub ring
// ✅ Solid walls (colliders) + walkable corridors
// ✅ SpawnPad in one corner + SpawnPoint on pad
// ✅ BossTable in hub; always face it on spawn

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log = (m) => LOG?.push?.("log", m) || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];

    const safeImport = async (url) => {
      try { return await import(url); }
      catch (e) { warn(`import fail: ${url} — ${e?.message || e}`); return null; }
    };

    const addSystem = (name, api) => {
      if (!api) return;
      ctx.systems[name] = api;
      log(`[world] system ok: ${name}`);
    };

    // ---------- Lighting (never black) ----------
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.05));
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x081018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.4,
      roughness: 0.35
    });

    // ---------- Helpers ----------
    const makeSolid = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const makeFloor = (w, l, x, z, y = 0.09) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, l), floorMat);
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    // ---------- Base floor (big) ----------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    scene.add(base);

    // ---------- Layout ----------
    // Four corner “cubes” (rooms) at N/E/S/W-ish corners around center,
    // connected by straight corridors into a circular hub ring.

    const WALL_H = 3.0;
    const WALL_T = 0.26;

    const roomSize = 12;           // room cube width/length
    const roomHalf = roomSize / 2;

    const corridorW = 4.2;
    const corridorL = 9.0;

    const hubR = 8.2;              // outer hub ring radius visual
    const hubPlateR = 7.2;         // walkable hub plate radius

    // Corner room centers (square corners around hub)
    // Think: a square of rooms around the hub.
    const cornerOffset = 18; // distance from center
    const rooms = [
      { name: "Room_NW", x: -cornerOffset, z:  cornerOffset },
      { name: "Room_NE", x:  cornerOffset, z:  cornerOffset },
      { name: "Room_SW", x: -cornerOffset, z: -cornerOffset },
      { name: "Room_SE", x:  cornerOffset, z: -cornerOffset },
    ];

    // ---------- Hub plate + neon ring ----------
    const hubPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(hubPlateR, hubPlateR, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.45, metalness: 0.18 })
    );
    hubPlate.position.set(0, 0.11, 0);
    scene.add(hubPlate);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(hubR, 0.13, 16, 140),
      neonMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.35, 0);
    scene.add(ring);

    // ---------- Boss table in hub ----------
    const bossTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    bossTable.position.set(0, 0.78, 0);
    bossTable.name = "BossTable";
    scene.add(bossTable);

    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, 0.8);
    scene.add(dealer);

    // ---------- Build 4 rooms + corridor to hub ----------
    const buildRoom = (r) => {
      // Room floor
      makeFloor(roomSize, roomSize, r.x, r.z);

      // Walls (full cube feel) with an opening facing toward center
      // Compute direction to center to place doorway on inner-facing wall.
      const toCenter = new THREE.Vector3(-r.x, 0, -r.z);
      const innerIsX = Math.abs(toCenter.x) > Math.abs(toCenter.z); // which wall faces center
      const doorW = 3.2;

      // West/East walls
      makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, roomSize + WALL_T), wallMat))
        .position.set(r.x - roomHalf, WALL_H / 2, r.z);
      makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, roomSize + WALL_T), wallMat))
        .position.set(r.x + roomHalf, WALL_H / 2, r.z);

      // North/South walls (we will split one into two segments for a doorway)
      const northZ = r.z + roomHalf;
      const southZ = r.z - roomHalf;

      const splitWall = (zPos, isNorth) => {
        const leftSegW = (roomSize - doorW) / 2;
        const rightSegW = leftSegW;

        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(leftSegW, WALL_H, WALL_T), wallMat))
          .position.set(r.x - (doorW/2 + leftSegW/2), WALL_H/2, zPos);

        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(rightSegW, WALL_H, WALL_T), wallMat))
          .position.set(r.x + (doorW/2 + rightSegW/2), WALL_H/2, zPos);

        // Neon doorway header
        const header = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.25, 0.25), neonMat);
        header.position.set(r.x, WALL_H - 0.2, zPos);
        scene.add(header);
      };

      // Decide which wall gets doorway (the wall that faces center)
      // If inner wall is X direction: doorway on West or East wall; else on North/South.
      if (innerIsX) {
        // doorway on east wall if room is on west side; on west wall if room on east side
        const doorX = (r.x < 0) ? (r.x + roomHalf) : (r.x - roomHalf);
        // Build full north/south
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
          .position.set(r.x, WALL_H/2, northZ);
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
          .position.set(r.x, WALL_H/2, southZ);

        // Split the inner-facing side wall into two segments (doorway)
        const segL = (roomSize - doorW) / 2;
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segL), wallMat))
          .position.set(doorX, WALL_H/2, r.z - (doorW/2 + segL/2));
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segL), wallMat))
          .position.set(doorX, WALL_H/2, r.z + (doorW/2 + segL/2));

        const header = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, doorW + 0.6), neonMat);
        header.position.set(doorX, WALL_H - 0.2, r.z);
        scene.add(header);
      } else {
        // doorway on south wall if room is north side; on north wall if room south side
        const doorZ = (r.z > 0) ? (r.z - roomHalf) : (r.z + roomHalf);

        // Build full west/east already done, now build the other wall full and split the inner wall
        // If doorway is on south wall, make north full; else make south full.
        if (doorZ === southZ) {
          makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
            .position.set(r.x, WALL_H/2, northZ);
          splitWall(southZ, false);
        } else {
          makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
            .position.set(r.x, WALL_H/2, southZ);
          splitWall(northZ, true);
        }
      }

      // Corridor from doorway area toward hub
      // Corridor center is between room and hub
      const corridorDir = new THREE.Vector3(-r.x, 0, -r.z).normalize();
      const corridorCenter = new THREE.Vector3(r.x, 0, r.z).add(corridorDir.multiplyScalar(roomHalf + corridorL/2));
      makeFloor(corridorW, corridorL, corridorCenter.x, corridorCenter.z);

      // Corridor side walls (solid)
      // Build in corridor local basis: use a sideways vector
      const side = new THREE.Vector3(corridorDir.z, 0, -corridorDir.x); // perpendicular
      const leftWallPos = corridorCenter.clone().add(side.clone().multiplyScalar(corridorW/2));
      const rightWallPos = corridorCenter.clone().add(side.clone().multiplyScalar(-corridorW/2));

      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H, corridorL);
      // rotate corridor walls to align with corridor
      const yaw = Math.atan2(corridorDir.x, corridorDir.z);

      const lw = makeSolid(new THREE.Mesh(wallGeo, wallMat));
      lw.position.set(leftWallPos.x, WALL_H/2, leftWallPos.z);
      lw.rotation.y = yaw;

      const rw = makeSolid(new THREE.Mesh(wallGeo, wallMat));
      rw.position.set(rightWallPos.x, WALL_H/2, rightWallPos.z);
      rw.rotation.y = yaw;
    };

    rooms.forEach(buildRoom);

    // ---------- Spawn pad in NW room (you always spawn on a pad) ----------
    const spawnRoom = rooms[0]; // NW
    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.16, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0a0b12,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 1.3,
        roughness: 0.35,
        metalness: 0.15
      })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(spawnRoom.x, 0.10, spawnRoom.z);
    scene.add(spawnPad);

    // SpawnPoint sits on pad
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(spawnRoom.x, 0, spawnRoom.z);
    scene.add(sp);

    // Teleport machine anchor at spawn (world places a marker; your real module can replace/augment)
    const tmAnchor = new THREE.Object3D();
    tmAnchor.name = "TeleportMachineSpawn";
    tmAnchor.position.set(spawnRoom.x, 0, spawnRoom.z + 2.6);
    scene.add(tmAnchor);

    // Visual fallback teleport machine (if your module doesn't draw its own)
    const tmCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.2,
        roughness: 0.35
      })
    );
    tmCore.position.copy(tmAnchor.position);
    tmCore.position.y = 1.1;
    tmCore.name = "TeleportMachineFallback";
    scene.add(tmCore);

    log("[world] 4-corner cubes + hub built ✅");
    log(`[world] SpawnPad @ (${spawnPad.position.x.toFixed(1)}, ${spawnPad.position.z.toFixed(1)})`);

    // ---------- Try load your existing systems (safe) ----------
    const rm = await safeImport("./room_manager.js");
    if (rm?.RoomManager?.init) { try { rm.RoomManager.init(ctx); addSystem("room_manager", rm.RoomManager); } catch {} }

    const teleportMachine = await safeImport("./teleport_machine.js");
    if (teleportMachine?.TeleportMachine?.init) {
      try {
        await teleportMachine.TeleportMachine.init(ctx);
        addSystem("teleport_machine", teleportMachine.TeleportMachine);
      } catch {}
    }

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
