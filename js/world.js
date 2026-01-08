// /js/world.js — Scarlett VR Poker WORLD v11.1 (SOLID + HUD + ANCHORS)
// No "three" import. main.js passes THREE in.

export async function initWorld({ THREE, scene, log = console.log, v = "0" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    floor: null,
    table: null,
    tableFocus: new THREE.Vector3(0, 0, -6),
    seats: [],
    anchors: {
      dealer: null,      // where the deck sits
      community: null,   // where community cards float
      pot: null,         // chips stack
      hud: null          // table hud mount
    },
    rail: { center: new THREE.Vector3(0,0,-6), radius: 3.85 },
    tableHud: null,
    connect() {},
    tick: (dt) => {}
  };

  world.group.name = "WorldRoot";
  scene.add(world.group);

  // ---------------- LIGHTING ----------------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(10, 14, 8);
  world.group.add(key);

  const tableLight = new THREE.PointLight(0x7fe7ff, 1.35, 22);
  tableLight.position.set(0, 3.2, world.tableFocus.z);
  world.group.add(tableLight);

  const purple = new THREE.PointLight(0xb46bff, 0.9, 30);
  purple.position.set(0, 3.6, 3.8);
  world.group.add(purple);

  // ---------------- FLOOR ----------------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------------- ROOM (2x bigger) ----------------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x171b2a, roughness: 0.96 });
  const H = 7.0;

  function wall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  }

  // bigger bounds
  wall(90, H, 0.6, 0, H / 2, -50);
  wall(90, H, 0.6, 0, H / 2, 50);
  wall(0.6, H, 100, -45, H / 2, 0);
  wall(0.6, H, 100, 45, H / 2, 0);

  // ---------------- TABLE ----------------
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

  // table stand (so it doesn’t float)
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.2, 0.75, 28),
    new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.95 })
  );
  stand.position.y = 0.38;
  table.add(stand);

  // ---------------- SOLID RAIL BARRIER ----------------
  // Visual ring
  const railRing = new THREE.Mesh(
    new THREE.TorusGeometry(world.rail.radius, 0.07, 12, 120),
    new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85 })
  );
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.65;
  table.add(railRing);

  // (For AI / movement blocking) we expose rail radius. Bots should clamp outside it.
  world.rail.center.copy(world.tableFocus);

  // ---------------- SEATS ----------------
  const seatRadius = 3.1;
  const SEAT_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pos = new THREE.Vector3(
      world.tableFocus.x + Math.cos(a) * seatRadius,
      SEAT_Y,
      world.tableFocus.z + Math.sin(a) * seatRadius
    );

    const yaw = Math.atan2(world.tableFocus.x - pos.x, world.tableFocus.z - pos.z);
    world.seats.push({ index: i, position: pos, yaw });
  }

  // ---------------- ANCHORS (single authoritative) ----------------
  const dealer = new THREE.Group();
  dealer.name = "DealerAnchor";
  dealer.position.set(0.95, TABLE_Y + 0.02, 0.20); // deck in front of dealer button
  table.add(dealer);
  world.anchors.dealer = dealer;

  const community = new THREE.Group();
  community.name = "CommunityAnchor";
  // community cards float above table (you asked bigger + visible)
  community.position.set(0.0, TABLE_Y + 0.40, 0.00);
  table.add(community);
  world.anchors.community = community;

  const pot = new THREE.Group();
  pot.name = "PotAnchor";
  pot.position.set(0.0, TABLE_Y + 0.02, 0.00);
  table.add(pot);
  world.anchors.pot = pot;

  const hud = new THREE.Group();
  hud.name = "HudAnchor";
  hud.position.set(0.0, TABLE_Y + 1.25, 0.35);
  table.add(hud);
  world.anchors.hud = hud;

  // ---------------- TABLE HUD MODULE ----------------
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

  // allow main to set billboard target
  world.connect = ({ camera }) => {
    world.tableHud?.setTarget?.(camera);
  };

  // tick
  world.tick = (dt) => {
    world.tableHud?.update?.(dt);
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
