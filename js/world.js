// /js/world.js — FULL WORLD LOADER (case-safe, cache-safe)
// IMPORTANT: GitHub Pages is case-sensitive. Use ONLY lowercase filenames.

export async function initWorld({ THREE, scene, log = console.log }) {
  log("[world] FULL WORLD boot");

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 2)],
    roomClamp: { minX: -8, maxX: 8, minZ: -14, maxZ: 8 },
    seats: [],
    teleportMachine: null,
    botsSystem: null,
    pokerSystem: null,
    tick(dt) {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // --- room/floor (always exists) ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // --- helper: safe dynamic import with cache-bust ---
  const V = (new URL(import.meta.url).searchParams.get("v") || Date.now()).toString();
  async function safeImport(path) {
    try {
      return await import(`${path}?v=${V}`);
    } catch (e) {
      log(`⚠️ [world] import failed ${path}: ${e?.message || e}`);
      return null;
    }
  }

  // --- table: try your real table module, otherwise fallback simple table ---
  let tableBuilt = false;

  const tableMod = await safeImport("./table.js");
  if (tableMod) {
    // common patterns: export function buildTable(...) OR export const Table
    if (typeof tableMod.buildTable === "function") {
      try {
        const tg = await tableMod.buildTable({ THREE, scene, world, log });
        if (tg) world.group.add(tg);
        tableBuilt = true;
        log("[world] table.js buildTable ✅");
      } catch (e) {
        log("⚠️ [world] table.js buildTable failed: " + (e?.message || e));
      }
    } else if (tableMod.Table?.build) {
      try {
        const tg = await tableMod.Table.build({ THREE, scene, world, log });
        if (tg) world.group.add(tg);
        tableBuilt = true;
        log("[world] table.js Table.build ✅");
      } catch (e) {
        log("⚠️ [world] table.js Table.build failed: " + (e?.message || e));
      }
    }
  }

  if (!tableBuilt) {
    // fallback simple table so you're never black-screen
    const table = new THREE.Group();
    table.position.set(0, 0, -6.5);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.9 })
    );
    felt.position.y = 0.9;
    table.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.18, 18, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.8 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.99;
    table.add(rim);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.85, 20),
      new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
    );
    stem.position.y = 0.45;
    table.add(stem);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.1, 28),
      new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1 })
    );
    base.position.y = 0.05;
    table.add(base);

    world.group.add(table);
    log("[world] table fallback ✅");
  }

  // --- seats (6) ---
  world.tableFocus.set(0, 0, -6.5);
  const c = world.tableFocus.clone();
  const r = 3.2;
  world.seats = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // --- YOUR TELEPORT MACHINE (real one) ---
  const tm = await safeImport("./teleport_machine.js");
  if (tm?.TeleportMachine?.build) {
    try {
      // tex loader optional
      const texLoader = new THREE.TextureLoader();
      world.teleportMachine = tm.TeleportMachine;
      world.teleportMachine.build(scene, texLoader);

      // if your machine has safe spawn, use it
      const safe = world.teleportMachine.getSafeSpawn?.();
      if (safe?.position) {
        world.spawnPads = [safe.position.clone()];
      } else {
        world.spawnPads = [new THREE.Vector3(0, 0, 3.6 + 1.2)];
      }

      log("[world] teleport_machine.js ✅ (YOUR ORIGINAL)");
    } catch (e) {
      log("⚠️ [world] teleport_machine build failed: " + (e?.message || e));
    }
  } else {
    log("⚠️ [world] teleport_machine.js missing TeleportMachine.build (skipping)");
  }

  // --- bots: try your real bots.js, else no-crash fallback ---
  const botsMod = await safeImport("./bots.js");
  if (botsMod) {
    // common patterns:
    // - export const Bots = { init, tick/update }
    // - export function initBots(...)
    try {
      if (botsMod.Bots?.init) {
        world.botsSystem = botsMod.Bots;
        world.botsSystem.init({ THREE, scene, world, log });
        log("[world] bots.js Bots.init ✅");
      } else if (typeof botsMod.initBots === "function") {
        world.botsSystem = await botsMod.initBots({ THREE, scene, world, log });
        log("[world] bots.js initBots ✅");
      } else {
        log("⚠️ [world] bots.js loaded but no init found (will skip)");
      }
    } catch (e) {
      log("⚠️ [world] bots init failed: " + (e?.message || e));
      world.botsSystem = null;
    }
  }

  // --- poker simulation: load but auto-disable if it crashes ---
  const ps = await safeImport("./poker_simulation.js");
  if (ps?.PokerSimulation?.init) {
    try {
      world.pokerSystem = ps.PokerSimulation;
      world.pokerSystem.init({
        THREE,
        scene,
        world,
        log,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus
      });
      log("[world] poker_simulation init ✅");
    } catch (e) {
      log("⚠️ [world] poker_simulation init failed: " + (e?.message || e));
      world.pokerSystem = null;
    }
  }

  // --- final tick chain ---
  let pokerDisabled = false;

  world.tick = (dt) => {
    // teleporter fx
    try {
      world.teleportMachine?.tick?.(dt);
    } catch {}

    // bots update
    try {
      const b = world.botsSystem;
      (b?.tick || b?.update)?.call(b, dt);
    } catch {}

    // poker update (guarded)
    if (world.pokerSystem && !pokerDisabled) {
      try {
        const fn = world.pokerSystem.update || world.pokerSystem.tick;
        if (typeof fn === "function") fn(dt);
      } catch (e) {
        pokerDisabled = true;
        log("❌ PokerSimulation tick crashed (DISABLED): " + (e?.message || e));
      }
    }
  };

  log("[world] FULL WORLD ready ✅");
  return world;
                                }
