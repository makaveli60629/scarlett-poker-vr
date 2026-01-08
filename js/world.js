// /js/world.js — Scarlett VR Poker WORLD v11.2 (Back Together)
// - Gray debug floor + grid
// - Table anchors are authoritative (no "game behind table")
// - Table HUD higher
// - Adds chips at pot (flat)
// - OPTIONAL bots import (won't crash if missing)

export async function initWorld({ THREE, scene, log = console.log, v = "0" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    floor: null,
    table: null,
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    seats: [],
    anchors: { dealer: null, community: null, pot: null, hud: null },
    tableHud: null,
    bots: null,
    connect({ camera }) {
      // provide billboard target to HUD and to dealing mix via scene userdata
      try { world.tableHud?.setTarget?.(camera); } catch {}
      try { scene.userData.cameraRef = camera; } catch {}
    },
    tick: (dt) => {}
  };

  world.group.name = "WorldRoot";
  scene.add(world.group);

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(10, 14, 8);
  world.group.add(key);

  const tableLight = new THREE.PointLight(0x7fe7ff, 1.45, 26);
  tableLight.position.set(0, 3.4, world.tableFocus.z);
  world.group.add(tableLight);

  const purple = new THREE.PointLight(0xb46bff, 0.95, 32);
  purple.position.set(0, 3.8, 3.8);
  world.group.add(purple);

  // ---------- FLOOR (GRAY DEBUG) ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6f6f74, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // Grid helper for alignment
  const grid = new THREE.GridHelper(140, 140, 0x2b2b33, 0x40404a);
  grid.position.y = 0.002;
  world.group.add(grid);

  // ---------- ROOM (solid) ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x171b2a, roughness: 0.96 });
  const H = 7.0;

  function wall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  }

  wall(100, H, 0.8, 0, H / 2, -55);
  wall(100, H, 0.8, 0, H / 2, 55);
  wall(0.8, H, 110, -50, H / 2, 0);
  wall(0.8, H, 110, 50, H / 2, 0);

  // ---------- TABLE ----------
  const TABLE_Y = 0.95;

  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.88 })
  );
  felt.position.y = TABLE_Y;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.18, 16, 80),
    new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.85 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.1;
  table.add(rim);

  // stand
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.2, 0.75, 28),
    new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.95 })
  );
  stand.position.y = 0.38;
  table.add(stand);

  // ---------- SEATS ----------
  const seatRadius = 3.1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pos = new THREE.Vector3(
      world.tableFocus.x + Math.cos(a) * seatRadius,
      0.52,
      world.tableFocus.z + Math.sin(a) * seatRadius
    );
    const yaw = Math.atan2(world.tableFocus.x - pos.x, world.tableFocus.z - pos.z);
    world.seats.push({ index: i, position: pos, yaw });
  }

  // ---------- ANCHORS (authoritative, table-centered) ----------
  const mkAnchor = (name, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    table.add(g);
    return g;
  };

  // Dealer deck sits in front of dealer chip (near right side of table)
  world.anchors.dealer = mkAnchor("DealerAnchor", 0.95, TABLE_Y + 0.02, 0.20);

  // Community cards: higher so you can read them
  world.anchors.community = mkAnchor("CommunityAnchor", 0.0, TABLE_Y + 1.05, 0.00);

  // Pot chips (flat)
  world.anchors.pot = mkAnchor("PotAnchor", 0.0, TABLE_Y + 0.02, 0.00);

  // HUD higher + easier to see
  world.anchors.hud = mkAnchor("HudAnchor", 0.0, TABLE_Y + 1.55, 0.25);

  // ---------- CHIPS (visible + flat) ----------
  const chipMat = new THREE.MeshStandardMaterial({
    color: 0xff2d7a,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x220010,
    emissiveIntensity: 0.25
  });

  const chipGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.012, 18);
  for (let i = 0; i < 16; i++) {
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.rotation.x = Math.PI / 2; // flat
    chip.position.set((Math.random() - 0.5) * 0.16, 0.006 + i * 0.010, (Math.random() - 0.5) * 0.16);
    world.anchors.pot.add(chip);
  }

  // ---------- TABLE HUD ----------
  try {
    const hudMod = await import(`./tableHud.js?v=${encodeURIComponent(v)}`);
    world.tableHud = hudMod.TableHud.build({
      THREE,
      parent: world.anchors.hud,
      title: "$10,000 Table",
      log
    });
    L("[world] tableHud ✅");
  } catch (e) {
    L("[world] ⚠️ tableHud import failed:", e?.message || e);
  }

  // ---------- OPTIONAL: BOTS ----------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      await botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus,
        // IMPORTANT: tell bots the “rail” radius so they don’t walk into table zone (your next request)
        rail: { center: world.tableFocus.clone(), radius: 3.85 }
      });
      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };

      L("[world] bots ✅");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  world.tick = (dt) => {
    try { world.tableHud?.update?.(dt); } catch {}
  };

  L("[world] ready ✅");
  return world;
    }
