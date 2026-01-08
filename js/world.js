// /js/world.js — FULL WORLD 9.0 FIXED (always visible objects)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "9002" }) {
  log("[world] FULL WORLD boot v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    // ✅ tighter clamp so you can't leave the room
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ FLOOR / ROOM ------------------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };

  // room box
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ------------------ TABLE (ALWAYS BUILT) ------------------
  const table = new THREE.Group();
  table.name = "Table";
  table.position.set(0, 0, -6.5);
  world.group.add(table);

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

  world.tableFocus.set(0, 0, -6.5);

  // ✅ BIG DEBUG BEACON so you can NEVER miss the table again
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff44ff, emissiveIntensity: 2.2 })
  );
  beacon.position.set(0, 2.2, -6.5);
  world.group.add(beacon);

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // ------------------ TELEPORTER (YOUR MODULE) ------------------
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      const texLoader = new THREE.TextureLoader();
      const tele = mod.TeleportMachine.build(scene, texLoader);

      // make sure teleporter is visible and not at crazy coords
      tele.position.set(0, 0, 2.2);

      // tick FX if your teleporter provides it
      if (typeof mod.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          mod.TeleportMachine.tick(dt);
        };
      }

      log("[world] ✅ teleport_machine.js loaded");
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  // ------------------ BOTS (SAFE ALWAYS) ------------------
  const bots = buildSafeBots(THREE, scene, world);
  world.bots = bots;
  const prevBots = world.tick;
  world.tick = (dt) => {
    prevBots(dt);
    bots.update(dt);
  };

  // ------------------ POKER SIM (YOUR placeholder) ------------------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    const PS = pokerSim?.PokerSimulation;
    if (PS?.init) {
      PS.init({ bots, world });
      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          try { tfn(dt); } catch (e) { log("❌ poker tick crash: " + (e?.message || e)); }
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

  // Seat 6, lobby 2
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
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
        const dist = dir.length();
        if (dist > 0.001) {
          dir.normalize();
          b.position.addScaledVector(dir, dt * 0.7);
          b.lookAt(d.target.x, b.position.y, d.target.z);
        }
      }
    }
  };
}
