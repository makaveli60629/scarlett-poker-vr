// /js/world.js — FULL WORLD (YOUR teleporter + safe fallbacks)
// IMPORTANT: Do NOT import THREE here.

export async function initWorld({ THREE, scene, log = console.log }) {
  log("[world] FULL WORLD boot");

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [],
    roomClamp: { minX: -8, maxX: 8, minZ: -14, maxZ: 8 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 8), max: new THREE.Vector3(6, 0, 14) },
    bots: null,
    tick: (dt) => {},
  };

  scene.add(world.group);

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  // ---------- walls ----------
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

  // ---------- table fallback ----------
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
  world.tableFocus.set(0, 0, -6.5);

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  world.spawnPads = [new THREE.Vector3(world.tableFocus.x, 0, world.tableFocus.z + 6)];

  // ---------- YOUR TELEPORTER ----------
  let tele = null;
  try {
    const mod = await import(`./teleport_machine.js?v=${Date.now()}`);
    if (mod?.TeleportMachine?.build) {
      const texLoader = new THREE.TextureLoader();
      tele = mod.TeleportMachine;
      tele.build(scene, texLoader);

      if (tele.getSafeSpawn) {
        const s = tele.getSafeSpawn();
        if (s?.position) world.spawnPads = [s.position.clone ? s.position.clone() : new THREE.Vector3(s.position.x, s.position.y, s.position.z)];
      }

      const prev = world.tick;
      world.tick = (dt) => {
        prev(dt);
        if (tele?.tick) tele.tick(dt);
      };

      log("[world] ✅ teleport_machine.js loaded (YOUR portal)");
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but missing TeleportMachine.build");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  // ---------- BOTS (try yours, fallback safe) ----------
  let botsSystem = null;
  try {
    const botsMod = await import(`./bots.js?v=${Date.now()}`);
    if (botsMod?.Bots?.init) {
      botsSystem = await botsMod.Bots.init({ THREE, scene, world, log });
      if (!botsSystem?.update) botsSystem = null; // if it doesn’t give an update loop, we fallback
      log("[world] ✅ bots.js (Bots.init) loaded");
    }
  } catch (e) {
    log("[world] ⚠️ bots import failed: " + (e?.message || e));
  }

  if (!botsSystem) {
    botsSystem = buildSafeBots(THREE, scene, world);
    log("[world] ⚠️ Using SAFE bots fallback");
  }

  world.bots = botsSystem;
  const prevBots = world.tick;
  world.tick = (dt) => {
    prevBots(dt);
    botsSystem.update?.(dt);
  };

  // ---------- POKER SIM (guarded) ----------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${Date.now()}`);
    const PS = pokerSim?.PokerSimulation;
    if (PS?.init) {
      PS.init({ THREE, scene, world, bots: botsSystem, getSeats: () => world.seats, tableFocus: world.tableFocus, log });

      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        let disabled = false;
        const prevPoker = world.tick;
        world.tick = (dt) => {
          prevPoker(dt);
          if (disabled) return;
          try { tfn(dt); }
          catch (e) { disabled = true; log("❌ PokerSimulation crashed (DISABLED): " + (e?.message || e)); }
        };
      }

      log("[world] ✅ poker_simulation init");
    }
  } catch (e) {
    log("[world] ⚠️ poker_simulation import failed: " + (e?.message || e));
  }

  log("[world] FULL WORLD ready ✅");
  return world;
}

// ---------- SAFE BOTS ----------
function buildSafeBots(THREE, scene, world) {
  const bots = [];
  const matA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
  const matB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  function makeBot(i) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), i % 2 ? matA : matB);
    body.position.y = 0.55;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.25;
    g.add(head);

    g.userData.bot = { id: i, seated: false, target: null };
    scene.add(g);
    return g;
  }

  for (let i = 0; i < 8; i++) bots.push(makeBot(i));

  // seat 6
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.position.set((Math.random() * 10) - 5, 0, 10 + Math.random() * 3);
      b.userData.bot.seated = false;
      b.userData.bot.target = b.position.clone();
    }
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  return {
    bots,
    update(dt) {
      for (const b of bots) {
        const d = b.userData.bot;
        if (d.seated) continue;
        if (!d.target || b.position.distanceTo(d.target) < 0.2) d.target = pickTarget();
        const dir = d.target.clone().sub(b.position);
        dir.y = 0;
        if (dir.length() > 0.001) {
          dir.normalize();
          b.position.addScaledVector(dir, dt * 0.7);
          b.lookAt(d.target.x, b.position.y, d.target.z);
        }
      }
    }
  };
                                       }
