// /js/world.js — Scarlett Hybrid World 2.2 (FULL)
// ✅ 4 corner cubes + hub
// ✅ Brighter lighting
// ✅ SpawnPad z-fighting fixed (lift + polygonOffset)
// ✅ Center hub table
// ✅ ALWAYS-ON demo: 2 bots walking + visible card dealing at center
// ✅ Still loads your real modules if present (bots/poker_sim/etc)

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log = (m) => LOG?.push?.("log", m) || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};

    const safeImport = async (url) => {
      try { return await import(url); }
      catch (e) { warn(`import fail: ${url} — ${e?.message || e}`); return null; }
    };

    const addSystem = (name, api) => {
      if (!api) return;
      ctx.systems[name] = api;
      log(`[world] system ok: ${name}`);
    };

    // ---------- Lighting (BRIGHT) ----------
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x101018, 1.35));

    const dir = new THREE.DirectionalLight(0xffffff, 1.65);
    dir.position.set(10, 16, 8);
    scene.add(dir);

    const hubA = new THREE.PointLight(0x7fe7ff, 1.6, 34);
    hubA.position.set(0, 6.2, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0xff2d7a, 1.1, 34);
    hubB.position.set(0, 4.5, -6);
    scene.add(hubB);

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });
    const neonMat  = new THREE.MeshStandardMaterial({
      color: 0x081018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.7,
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

    // ---------- Base floor ----------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    scene.add(base);

    // ---------- Layout ----------
    const WALL_H = 3.0;
    const WALL_T = 0.26;

    const roomSize = 12;
    const roomHalf = roomSize / 2;

    const corridorW = 4.2;
    const corridorL = 9.0;

    const hubR = 8.2;
    const hubPlateR = 7.2;

    const cornerOffset = 18;
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
    hubPlate.name = "HubPlate";
    scene.add(hubPlate);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(hubR, 0.13, 16, 140), neonMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.35, 0);
    ring.name = "HubRing";
    scene.add(ring);

    // ---------- Boss table (CENTER) ----------
    const bossTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 0.14, 44),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    bossTable.position.set(0, 0.78, 0);
    bossTable.name = "BossTable";
    scene.add(bossTable);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.085, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.18 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.86, 0);
    scene.add(rim);

    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, 0.95);
    scene.add(dealer);

    // ---------- Fallback guard rail ring ----------
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.08, 12, 120),
      new THREE.MeshStandardMaterial({ color: 0x121422, emissive: 0x132a3a, emissiveIntensity: 0.55 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 0.68, 0);
    rail.name = "FallbackRail";
    scene.add(rail);

    // ---------- Rooms + corridors ----------
    const buildRoom = (r) => {
      makeFloor(roomSize, roomSize, r.x, r.z);

      const toCenter = new THREE.Vector3(-r.x, 0, -r.z);
      const innerIsX = Math.abs(toCenter.x) > Math.abs(toCenter.z);
      const doorW = 3.2;

      // side walls
      makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, roomSize + WALL_T), wallMat))
        .position.set(r.x - roomHalf, WALL_H / 2, r.z);
      makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, roomSize + WALL_T), wallMat))
        .position.set(r.x + roomHalf, WALL_H / 2, r.z);

      const northZ = r.z + roomHalf;
      const southZ = r.z - roomHalf;

      const splitWallZ = (zPos) => {
        const segW = (roomSize - doorW) / 2;

        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(segW, WALL_H, WALL_T), wallMat))
          .position.set(r.x - (doorW/2 + segW/2), WALL_H/2, zPos);

        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(segW, WALL_H, WALL_T), wallMat))
          .position.set(r.x + (doorW/2 + segW/2), WALL_H/2, zPos);

        const header = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.25, 0.25), neonMat);
        header.position.set(r.x, WALL_H - 0.2, zPos);
        scene.add(header);
      };

      if (innerIsX) {
        const doorX = (r.x < 0) ? (r.x + roomHalf) : (r.x - roomHalf);

        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
          .position.set(r.x, WALL_H/2, northZ);
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
          .position.set(r.x, WALL_H/2, southZ);

        const segL = (roomSize - doorW) / 2;
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segL), wallMat))
          .position.set(doorX, WALL_H/2, r.z - (doorW/2 + segL/2));
        makeSolid(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segL), wallMat))
          .position.set(doorX, WALL_H/2, r.z + (doorW/2 + segL/2));

        const header = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, doorW + 0.6), neonMat);
        header.position.set(doorX, WALL_H - 0.2, r.z);
        scene.add(header);
      } else {
        const doorZ = (r.z > 0) ? (r.z - roomHalf) : (r.z + roomHalf);

        if (doorZ === southZ) {
          makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
            .position.set(r.x, WALL_H/2, northZ);
          splitWallZ(southZ);
        } else {
          makeSolid(new THREE.Mesh(new THREE.BoxGeometry(roomSize + WALL_T, WALL_H, WALL_T), wallMat))
            .position.set(r.x, WALL_H/2, southZ);
          splitWallZ(northZ);
        }
      }

      // corridor toward hub
      const corridorDir = new THREE.Vector3(-r.x, 0, -r.z).normalize();
      const corridorCenter = new THREE.Vector3(r.x, 0, r.z)
        .add(corridorDir.clone().multiplyScalar(roomHalf + corridorL/2));

      makeFloor(corridorW, corridorL, corridorCenter.x, corridorCenter.z);

      const side = new THREE.Vector3(corridorDir.z, 0, -corridorDir.x);
      const leftWallPos  = corridorCenter.clone().add(side.clone().multiplyScalar(corridorW/2));
      const rightWallPos = corridorCenter.clone().add(side.clone().multiplyScalar(-corridorW/2));

      const yaw = Math.atan2(corridorDir.x, corridorDir.z);
      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H, corridorL);

      const lw = makeSolid(new THREE.Mesh(wallGeo, wallMat));
      lw.position.set(leftWallPos.x, WALL_H/2, leftWallPos.z);
      lw.rotation.y = yaw;

      const rw = makeSolid(new THREE.Mesh(wallGeo, wallMat));
      rw.position.set(rightWallPos.x, WALL_H/2, rightWallPos.z);
      rw.rotation.y = yaw;
    };

    rooms.forEach(buildRoom);

    // ---------- SpawnPad (NW room) — Z-FIGHT FIX ----------
    const spawnRoom = rooms[0]; // NW
    const spawnPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.1,
      roughness: 0.35,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.16, 32),
      spawnPadMat
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(spawnRoom.x, 0.14, spawnRoom.z); // lifted slightly to avoid flicker
    spawnPad.renderOrder = 10;
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(spawnRoom.x, 0, spawnRoom.z);
    scene.add(sp);

    // Teleporter behind you visually
    const tmAnchor = new THREE.Object3D();
    tmAnchor.name = "TeleportMachineSpawn";
    tmAnchor.position.set(spawnRoom.x, 0, spawnRoom.z + 2.8);
    scene.add(tmAnchor);

    const tmCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.35,
        roughness: 0.35
      })
    );
    tmCore.position.copy(tmAnchor.position);
    tmCore.position.y = 1.1;
    tmCore.name = "TeleportMachineFallback";
    scene.add(tmCore);

    // ---------- DEMO: 2 bots walking around hub ----------
    const makeDemoBot = (name, tint) => {
      const g = new THREE.Group();
      g.name = name;

      const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7, metalness: 0.05, flatShading: true });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), mat);
      torso.position.y = 1.15;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat);
      head.position.set(0, 0.45, 0);
      torso.add(head);

      const legGeo = new THREE.CapsuleGeometry(0.07, 0.45, 4, 6);
      const l = new THREE.Mesh(legGeo, mat);
      const r2 = new THREE.Mesh(legGeo, mat);
      l.position.set(-0.10, -0.65, 0);
      r2.position.set(0.10, -0.65, 0);
      torso.add(l, r2);

      return g;
    };

    ctx.demo.bots = [
      { obj: makeDemoBot("DemoBotA", 0x7fe7ff), t: 0, phase: 0 },
      { obj: makeDemoBot("DemoBotB", 0xff2d7a), t: 0, phase: Math.PI },
    ];
    ctx.demo.bots.forEach((b) => scene.add(b.obj));

    // ---------- DEMO: visible card dealing on center table ----------
    const cardGroup = new THREE.Group();
    cardGroup.name = "DemoCards";
    scene.add(cardGroup);

    const makeCard = () => {
      const geo = new THREE.PlaneGeometry(0.07, 0.10);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      // neon edge
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x00ffff })
      );
      m.add(edge);
      return m;
    };

    const deckPos = new THREE.Vector3(0, 0.92, 0.95); // dealer anchor
    const seatTargets = [
      new THREE.Vector3(-0.55, 0.86, 0.25),
      new THREE.Vector3( 0.55, 0.86, 0.25),
      new THREE.Vector3(-0.55, 0.86,-0.25),
      new THREE.Vector3( 0.55, 0.86,-0.25),
    ];

    ctx.demo.cards = {
      group: cardGroup,
      active: [],
      timer: 0,
      idx: 0,
      deckPos,
      seatTargets
    };

    log("[world] 4-corner cubes + hub built ✅");
    log(`[world] SpawnPad @ (${spawnPad.position.x.toFixed(1)}, ${spawnPad.position.z.toFixed(1)})`);
    log("[world] demo bots + demo dealing ✅");

    // ---------- Load your existing systems safely ----------
    const rm = await safeImport("./room_manager.js");
    if (rm?.RoomManager?.init) { try { rm.RoomManager.init(ctx); addSystem("room_manager", rm.RoomManager); } catch {} }

    const teleportMachine = await safeImport("./teleport_machine.js");
    if (teleportMachine?.TeleportMachine?.init) {
      try { await teleportMachine.TeleportMachine.init(ctx); addSystem("teleport_machine", teleportMachine.TeleportMachine); } catch {}
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
    // run real systems
    const systems = ctx.systems || {};
    for (const k of Object.keys(systems)) {
      try { systems[k]?.update?.(dt, ctx); } catch {}
    }

    // DEMO bots (always)
    if (ctx.demo?.bots?.length) {
      const r = 5.2;
      for (const b of ctx.demo.bots) {
        b.t += dt * 0.55;
        const ang = b.t + b.phase;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        b.obj.position.set(x, 0, z);
        b.obj.rotation.y = Math.atan2(-x, -z); // face center
      }
    }

    // DEMO dealing (always)
    const dc = ctx.demo?.cards;
    if (dc) {
      dc.timer += dt;

      // spawn a new card every ~0.6s, animate to seat
      if (dc.timer > 0.6) {
        dc.timer = 0;
        const card = (new ctx.THREE.Mesh(
          new ctx.THREE.PlaneGeometry(0.07, 0.10),
          new ctx.THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0, side: ctx.THREE.DoubleSide })
        ));
        card.rotation.x = -Math.PI / 2;
        card.position.copy(dc.deckPos);

        const edge = new ctx.THREE.LineSegments(
          new ctx.THREE.EdgesGeometry(card.geometry),
          new ctx.THREE.LineBasicMaterial({ color: 0x00ffff })
        );
        card.add(edge);

        const target = dc.seatTargets[dc.idx % dc.seatTargets.length].clone();
        dc.idx++;

        card.userData.anim = { t: 0, from: dc.deckPos.clone(), to: target };
        dc.group.add(card);
        dc.active.push(card);

        // clear pile occasionally
        if (dc.active.length > 18) {
          for (const c of dc.active) dc.group.remove(c);
          dc.active.length = 0;
        }
      }

      // animate active cards
      for (const card of dc.active) {
        const a = card.userData.anim;
        if (!a) continue;
        a.t = Math.min(1, a.t + dt * 1.8);

        // arc
        const mid = a.from.clone().lerp(a.to, 0.5);
        mid.y += 0.25;

        const p1 = a.from.clone().lerp(mid, a.t);
        const p2 = mid.clone().lerp(a.to, a.t);
        card.position.copy(p1.lerp(p2, a.t));
      }
    }
  }
};
