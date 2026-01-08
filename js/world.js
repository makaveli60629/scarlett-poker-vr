// /js/world.js — Scarlett VR Poker — Update 9.0 FULL WORLD
// IMPORTANT: No THREE imports. Uses THREE passed from main.js.

import { createTeleportMachine } from "./teleport_machine.js";
import { Bots } from "./bots.js";
import { initStore } from "./store.js";
import { initScorpionRoom } from "./scorpion_room.js";

export async function initWorld({ THREE, scene, log = console.log, v = "no-v" }) {
  log("[world] FULL WORLD boot v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [],
    roomClamp: { minX: -8, maxX: 8, minZ: -14, maxZ: 14 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 8), max: new THREE.Vector3(6, 0, 14) },
    bots: null,
    onPlayerTeleport: null,
    tick: (dt) => {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // -------- Floor / Walls --------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 14);
  mkWall(0.3, 4, 28, -8, 2, 0);
  mkWall(0.3, 4, 28, 8, 2, 0);

  // -------- Poker Table --------
  const table = new THREE.Group();
  table.name = "PokerTable";
  table.position.copy(world.tableFocus);

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

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // spawn pad default (behind table)
  world.spawnPads = [new THREE.Vector3(world.tableFocus.x, 0, world.tableFocus.z + 6)];

  // -------- Teleport Machine (YOUR portal style) --------
  const tele = createTeleportMachine(THREE);
  const teleGroup = tele.build(scene, new THREE.TextureLoader());
  const safe = tele.getSafeSpawn?.();
  if (safe?.position) world.spawnPads = [safe.position.clone()];

  // teleport burst hook (optional)
  world.onPlayerTeleport = (p) => {
    // small flash at landing
    const flash = new THREE.PointLight(0x6a2bff, 1.5, 4);
    flash.position.set(p.x, 1.0, p.z);
    scene.add(flash);
    let life = 0.15;
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      life -= dt;
      flash.intensity = Math.max(0, life * 10);
      if (life <= 0) {
        scene.remove(flash);
        world.tick = prev;
      }
    };
  };

  // tick teleporter FX
  const prevTick0 = world.tick;
  world.tick = (dt) => {
    prevTick0(dt);
    tele.tick(dt);
  };

  // -------- Store + Scorpion Room --------
  const store = await initStore({ THREE, scene, world, log });
  const scorp = await initScorpionRoom({ THREE, scene, world, log });

  const prevTick1 = world.tick;
  world.tick = (dt) => {
    prevTick1(dt);
    store?.tick?.(dt);
    scorp?.tick?.(dt);
  };

  // -------- Bots --------
  const botsSystem = await Bots.init({ THREE, scene, world, log });
  world.bots = botsSystem;

  const prevTick2 = world.tick;
  world.tick = (dt) => {
    prevTick2(dt);
    botsSystem?.update?.(dt);
  };

  // -------- Poker Simulation --------
  try {
    const pokerMod = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    const PS = pokerMod?.PokerSimulation;
    if (PS?.init) {
      PS.init({
        THREE,
        scene,
        world,
        bots: botsSystem,
        getSeats: () => world.seats
      });

      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        let disabled = false;
        const prevTick3 = world.tick;
        world.tick = (dt) => {
          prevTick3(dt);
          if (disabled) return;
          try {
            tfn(dt);
          } catch (e) {
            disabled = true;
            log("❌ PokerSimulation crashed (DISABLED): " + (e?.message || e));
          }
        };
      }
      log("[world] poker_simulation init ✅");
    } else {
      log("[world] poker_simulation loaded but missing init ⚠️");
    }
  } catch (e) {
    log("[world] poker_simulation import failed ⚠️ " + (e?.message || e));
  }

  log("[world] FULL WORLD ready ✅");
  return world;
                                }
