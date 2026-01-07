// /js/world.js — Full World (uses your actual filenames)
export async function initWorld({ THREE, scene, log = console.log }) {
  const V = new URL(import.meta.url).searchParams.get("v") || "no-v";
  const imp = async (p) => {
    try { return await import(`${p}?v=${V}`); }
    catch (e) { log(`⚠️ [world] import failed: ${p} — ${e?.message || e}`); return null; }
  };

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [],
    roomClamp: { minX: -8, maxX: 8, minZ: -14, maxZ: 8 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 8), max: new THREE.Vector3(6, 0, 14) },
    bots: null,              // IMPORTANT for poker_simulation.js
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------- lights (optional) ----------
  const lights_pack = await imp("./lights_pack.js");
  if (lights_pack) {
    const fn = lights_pack.buildLights || lights_pack.initLights || lights_pack.addLights || lights_pack.setupLights;
    if (typeof fn === "function") {
      try { fn({ THREE, scene, world, log, parent: world.group }); }
      catch (e) { log("⚠️ [world] lights_pack error: " + (e?.message || e)); }
    }
  }

  // ---------- environment ----------
  const textures = await imp("./textures.js"); // optional helper
  for (const [modPath, names] of [
    ["./vip_room.js", ["build", "buildVIPRoom", "initVIPRoom", "createVIPRoom"]],
    ["./solid_walls.js", ["build", "buildSolidWalls", "initSolidWalls", "createSolidWalls"]],
    ["./spectator_rail.js", ["build", "buildSpectatorRail", "initSpectatorRail", "createSpectatorRail"]],
    ["./water_fountain.js", ["build", "buildWaterFountain", "initWaterFountain", "createWaterFountain"]],
  ]) {
    const m = await imp(modPath);
    if (!m) continue;
    const fn = names.map(n => m[n]).find(f => typeof f === "function");
    if (fn) {
      try {
        const res = fn({ THREE, scene, world, log, parent: world.group, textures });
        if (res?.isObject3D && !res.parent) world.group.add(res);
      } catch (e) {
        log(`⚠️ [world] ${modPath} error: ${e?.message || e}`);
      }
    }
  }

  // ---------- table ----------
  const tableMods = [
    await imp("./table_factory.js"),
    await imp("./boss_table.js"),
    await imp("./table_6_oval.js"),
    await imp("./table.js"),
  ].filter(Boolean);

  let tableRes = null;
  for (const m of tableMods) {
    const fn = m.build || m.buildTable || m.createTable || m.create || null;
    if (typeof fn === "function") {
      try {
        tableRes = fn({ THREE, scene, world, log, parent: world.group, textures }) || tableRes;
        break;
      } catch (e) {
        log("⚠️ [world] table build error: " + (e?.message || e));
      }
    }
  }

  // seats/focus from table if provided
  if (tableRes?.tableFocus) world.tableFocus.copy(tableRes.tableFocus);
  if (tableRes?.focus) world.tableFocus.copy(tableRes.focus);
  if (tableRes?.roomClamp) world.roomClamp = tableRes.roomClamp;
  if (tableRes?.seats?.length) world.seats = tableRes.seats;

  // fallback seats if none
  if (!world.seats.length) {
    const c = world.tableFocus.clone();
    const r = 3.2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
      world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
    }
  }

  // spawn pad
  world.spawnPads = [new THREE.Vector3(world.tableFocus.x, 0, world.tableFocus.z + 6.0)];

  // ---------- YOUR teleporter machine ----------
  const teleport_machine = await imp("./teleport_machine.js");
  if (teleport_machine) {
    const fn =
      teleport_machine.buildTeleportMachine ||
      teleport_machine.createTeleportMachine ||
      teleport_machine.build ||
      teleport_machine.init ||
      null;

    if (typeof fn === "function") {
      try {
        const tele = fn({ THREE, scene, world, log, parent: world.group, textures });
        if (tele?.isObject3D && !tele.parent) world.group.add(tele);
        log("[world] teleport_machine.js ✅");
      } catch (e) {
        log("⚠️ [world] teleport_machine error: " + (e?.message || e));
      }
    } else {
      log("⚠️ [world] teleport_machine.js loaded but no build function found");
    }
  }

  // ---------- bots ----------
  const botsMod = await imp("./bots.js");
  if (botsMod?.Bots?.init) {
    try {
      botsMod.Bots.init({
        scene,
        rig: null,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
      });

      world.bots = botsMod.Bots; // IMPORTANT for poker_simulation.js
      const prev = world.tick;
      world.tick = (dt) => { prev(dt); botsMod.Bots.update(dt); };

      log("[world] bots.js ✅");
    } catch (e) {
      log("⚠️ [world] Bots.init failed: " + (e?.message || e));
    }
  } else {
    log("⚠️ [world] bots.js missing Bots.init");
  }

  // ---------- poker simulation ----------
  const pokerSim = await imp("./poker_simulation.js");
  if (pokerSim?.PokerSimulation?.init) {
    try {
      pokerSim.PokerSimulation.init({
        THREE,
        scene,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus,
        world, // give it world so it can access world.bots if it wants
        log,
      });

      const tickFn = pokerSim.PokerSimulation.update || pokerSim.PokerSimulation.tick;
      if (typeof tickFn === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); tickFn(dt); };
      }

      log("[world] poker_simulation ✅");
    } catch (e) {
      log("⚠️ [world] poker_simulation init failed: " + (e?.message || e));
    }
  }

  log("[world] ready ✅");
  return world;
}
