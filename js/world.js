// /js/world.js — Scarlett VR Poker (FULL WORLD LOADER)
// Purpose: Restore YOUR original modules (teleporter machine, full room, poker sim, cards)
// while staying robust and cache-proof.
//
// main.js imports this as: import(`./world.js?v=${V}`)
// and calls: initWorld({ THREE, scene, log })

export async function initWorld({ THREE, scene, log = console.log }) {
  log("[world] boot (loader)");

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 2.0)],
    roomClamp: { minX: -7.5, maxX: 7.5, minZ: -13.5, maxZ: 7.5 },
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // Helper: cache-proof import using the same querystring as world.js got
  const V = new URL(import.meta.url).searchParams.get("v") || "no-v";
  const imp = async (path) => {
    try {
      return await import(`${path}?v=${V}`);
    } catch (e) {
      log(`⚠️ [world] import failed: ${path} — ${e?.message || e}`);
      return null;
    }
  };

  // Helper: safe call
  const safe = async (label, fn) => {
    try {
      return await fn();
    } catch (e) {
      log(`⚠️ [world] ${label} failed — ${e?.message || e}`);
      return null;
    }
  };

  // ---------------------------------------------------------
  // 1) Load YOUR full environment/world build (if present)
  // ---------------------------------------------------------
  // These are COMMON filenames you’ve used in this project.
  // If your repo uses different ones, just rename the paths below.
  const candidates = [
    "./world_full.js",
    "./room.js",
    "./environment.js",
    "./world_build.js",
    "./World.js",
  ];

  let envBuilt = false;

  for (const p of candidates) {
    const mod = await imp(p);
    if (!mod) continue;

    // Try common entry points
    const buildFn =
      mod.initWorld ||
      mod.buildWorld ||
      mod.buildRoom ||
      mod.createWorld ||
      mod.init ||
      null;

    if (typeof buildFn === "function") {
      const result = await safe(`environment via ${p}`, async () =>
        buildFn({ THREE, scene, worldGroup: world.group, log })
      );

      // If that module returned useful metadata, adopt it
      if (result?.tableFocus) world.tableFocus.copy(result.tableFocus);
      if (result?.spawnPads?.length) world.spawnPads = result.spawnPads;
      if (result?.roomClamp) world.roomClamp = result.roomClamp;
      if (typeof result?.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          result.tick(dt);
        };
      }

      envBuilt = true;
      log(`[world] environment loaded from ${p} ✅`);
      break;
    }
  }

  // If no environment module exists, do NOT panic — keep a tiny safety floor
  if (!envBuilt) {
    log("[world] No full environment module found — keeping minimal safety floor.");
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    world.group.add(floor);
  }

  // ---------------------------------------------------------
  // 2) Restore YOUR original teleporter machine module
  // ---------------------------------------------------------
  // Expected: you already have a teleporter machine .js we made earlier.
  // Try common names; whichever exists will be used.
  const teleMods = [
    "./teleport_machine.js",
    "./teleporter_machine.js",
    "./TeleportMachine.js",
    "./teleporter.js",
  ];

  let teleporter = null;

  for (const p of teleMods) {
    const mod = await imp(p);
    if (!mod) continue;

    const buildFn =
      mod.buildTeleportMachine ||
      mod.createTeleportMachine ||
      mod.buildTeleporterMachine ||
      mod.createTeleporterMachine ||
      mod.initTeleportMachine ||
      null;

    if (typeof buildFn === "function") {
      teleporter = await safe(`teleporter build via ${p}`, async () =>
        buildFn({ THREE, scene, parent: world.group, log })
      );

      // Some builders return a mesh/group, some add to parent and return nothing.
      if (teleporter && teleporter.isObject3D) {
        if (!teleporter.parent) world.group.add(teleporter);
      }

      // Optional: if that module exports tick/update for FX
      const tickFn = mod.tick || mod.update || mod.teleportTick || null;
      if (typeof tickFn === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          tickFn(dt);
        };
      }

      log(`[world] teleporter restored from ${p} ✅`);
      break;
    }
  }

  if (!teleporter) {
    log("[world] ⚠️ Could not find your teleporter module. (Keeping none rather than wrong one.)");
  }

  // ---------------------------------------------------------
  // 3) Restore Bots system (your Bots module, not the dummy BossBots)
  // ---------------------------------------------------------
  const botsMod =
    (await imp("./bots.js")) ||
    (await imp("./Bots.js")) ||
    null;

  if (botsMod?.Bots?.init) {
    // Provide seats + lobby zone if your world build has them
    const getSeats =
      () => (world.seats ? world.seats : (world._getSeats ? world._getSeats() : []));
    const getLobbyZone =
      () => (world.lobbyZone ? world.lobbyZone : (world._getLobbyZone ? world._getLobbyZone() : null));

    await safe("Bots.init", async () => {
      botsMod.Bots.init({
        scene,
        rig: null,
        getSeats,
        getLobbyZone,
      });
    });

    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      botsMod.Bots.update(dt);
    };

    log("[world] Bots system restored ✅");
  } else {
    log("[world] ⚠️ Bots module not found or missing Bots.init (skipping).");
  }

  // ---------------------------------------------------------
  // 4) Restore PokerSimulation / cards (your gameplay)
  // ---------------------------------------------------------
  const pokerCandidates = [
    "./poker_simulation.js",
    "./PokerSimulation.js",
    "./poker.js",
    "./gameplay.js",
  ];

  for (const p of pokerCandidates) {
    const mod = await imp(p);
    if (!mod) continue;

    const startFn =
      mod.initPoker ||
      mod.startPoker ||
      mod.PokerSimulation?.init ||
      mod.PokerSimulation?.start ||
      mod.init ||
      null;

    if (typeof startFn === "function") {
      const sim = await safe(`poker start via ${p}`, async () =>
        startFn({ THREE, scene, world, log })
      );

      // If it provides tick/update
      const tickFn =
        sim?.tick ||
        sim?.update ||
        mod.tick ||
        mod.update ||
        mod.PokerSimulation?.update ||
        null;

      if (typeof tickFn === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          tickFn(dt);
        };
      }

      log(`[world] PokerSimulation restored from ${p} ✅`);
      break;
    }
  }

  log("[world] ready ✅");
  return world;
    }
