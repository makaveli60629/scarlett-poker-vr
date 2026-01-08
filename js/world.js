// /js/world.js — Scarlett VR Poker WORLD v11.0 (FOUNDATION STABLE)
// Single authoritative world. One table. One game. Solid geometry.
// No "three" import — main.js passes THREE in.

export async function initWorld({ THREE, scene, log = console.log, v = "0" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    table: null,
    tableFocus: new THREE.Vector3(0, 0, -6),
    floor: null,
    seats: [],
    bots: null,
    tableHud: null,
    tick: (dt) => {},
    connect() {}
  };

  world.group.name = "WorldRoot";
  scene.add(world.group);

  /* ------------------------------------------------------------------ */
  /* FLOOR (authoritative Y = 0)                                         */
  /* ------------------------------------------------------------------ */
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x10131c,
    roughness: 0.9
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  floor.receiveShadow = true;
  world.group.add(floor);
  world.floor = floor;

  /* ------------------------------------------------------------------ */
  /* ROOM (solid walls)                                                  */
  /* ------------------------------------------------------------------ */
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x161a28,
    roughness: 0.95
  });

  function wall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    world.group.add(m);
  }

  const H = 6;
  wall(60, H, 0.5, 0, H / 2, -35);
  wall(60, H, 0.5, 0, H / 2, 35);
  wall(0.5, H, 70, -30, H / 2, 0);
  wall(0.5, H, 70, 30, H / 2, 0);

  /* ------------------------------------------------------------------ */
  /* LIGHTING                                                            */
  /* ------------------------------------------------------------------ */
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.4));

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(10, 14, 8);
  world.group.add(key);

  const tableLight = new THREE.PointLight(0x7fe7ff, 1.2, 18);
  tableLight.position.set(0, 3.2, -6);
  world.group.add(tableLight);

  /* ------------------------------------------------------------------ */
  /* TABLE (single source of truth)                                      */
  /* ------------------------------------------------------------------ */
  const TABLE_Y = 0.95;

  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.85 })
  );
  felt.position.y = TABLE_Y;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.18, 16, 80),
    new THREE.MeshStandardMaterial({ color: 0x1a0f0a })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.1;
  table.add(rim);

  /* ------------------------------------------------------------------ */
  /* RAIL (solid boundary)                                               */
  /* ------------------------------------------------------------------ */
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.06, 12, 100),
    new THREE.MeshStandardMaterial({ color: 0x12131a })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.65;
  table.add(rail);

  /* ------------------------------------------------------------------ */
  /* SEATS (authoritative sit anchors)                                   */
  /* ------------------------------------------------------------------ */
  const seatRadius = 3.1;
  const SEAT_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pos = new THREE.Vector3(
      world.tableFocus.x + Math.cos(a) * seatRadius,
      SEAT_Y,
      world.tableFocus.z + Math.sin(a) * seatRadius
    );

    const yaw = Math.atan2(
      world.tableFocus.x - pos.x,
      world.tableFocus.z - pos.z
    );

    world.seats.push({
      index: i,
      position: pos,
      yaw
    });
  }

  /* ------------------------------------------------------------------ */
  /* COMMUNITY CARD ANCHOR (ONE ONLY)                                    */
  /* ------------------------------------------------------------------ */
  const communityAnchor = new THREE.Group();
  communityAnchor.position.set(0, TABLE_Y + 0.32, 0);
  table.add(communityAnchor);
  world.communityAnchor = communityAnchor;

  /* ------------------------------------------------------------------ */
  /* TABLE HUD (single board)                                            */
  /* ------------------------------------------------------------------ */
  try {
    const hudMod = await import(`./tableHud.js?v=${encodeURIComponent(v)}`);
    world.tableHud = hudMod.TableHud.build({
      THREE,
      parent: table,
      title: "$10,000 Table",
      pos: { x: 0, y: TABLE_Y + 1.15, z: 0.35 },
      log
    });

    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      world.tableHud?.update(dt);
    };

    L("[world] table HUD ready ✅");
  } catch (e) {
    L("[world] tableHud missing ⚠️");
  }

  /* ------------------------------------------------------------------ */
  /* CONNECT (called from main.js)                                       */
  /* ------------------------------------------------------------------ */
  world.connect = ({ camera }) => {
    world.tableHud?.setTarget(camera);
  };

  L("[world] ready ✅");
  return world;
}
