// /js/world.js — Scarlett VR Poker WORLD v11.3
// - Stand-up by default
// - Rail Guard interaction -> seat player at seat0
// - Centered anchors for dealer/deck + community + pot + HUD
// - Optional bots import stays safe

export async function initWorld({ THREE, scene, log = console.log, v = "0" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    floor: null,
    table: null,
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // authoritative metrics
    metrics: { tableY: 0.95, seatY: 0.52, standCamY: 1.65, sitCamY: 1.25 },

    seats: [],
    anchors: { dealer: null, community: null, pot: null, hud: null },
    tableHud: null,

    bots: null,

    // player state
    playerSeated: false,
    flags: { teleport: true },

    // interactions
    interactions: [],
    onAction: null, // assigned below

    connect({ camera, player, renderer, controllers, grips, dealing }) {
      scene.userData.cameraRef = camera;
      world._refs = { camera, player, renderer, controllers, grips, dealing };
      try { world.tableHud?.setTarget?.(camera); } catch {}
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

  const tableLight = new THREE.PointLight(0x7fe7ff, 1.45, 30);
  tableLight.position.set(0, 3.6, world.tableFocus.z);
  world.group.add(tableLight);

  const purple = new THREE.PointLight(0xb46bff, 0.95, 35);
  purple.position.set(0, 3.8, 4.0);
  world.group.add(purple);

  // ---------- FLOOR (debug gray + grid) ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6f6f74, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  const grid = new THREE.GridHelper(160, 160, 0x2b2b33, 0x40404a);
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

  wall(120, H, 0.8, 0, H / 2, -60);
  wall(120, H, 0.8, 0, H / 2, 60);
  wall(0.8, H, 130, -60, H / 2, 0);
  wall(0.8, H, 130, 60, H / 2, 0);

  // ---------- TABLE ----------
  const TABLE_Y = world.metrics.tableY;

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

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.2, 0.75, 28),
    new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.95 })
  );
  stand.position.y = 0.38;
  table.add(stand);

  // ---------- RAIL (visual + collision boundary value for bots) ----------
  const railR = 3.85;
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.08, 12, 90),
    new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.70;
  table.add(rail);

  // ---------- SEATS (seat 0 = YOU) ----------
  const seatRadius = 3.1;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pos = new THREE.Vector3(
      world.tableFocus.x + Math.cos(a) * seatRadius,
      world.metrics.seatY,
      world.tableFocus.z + Math.sin(a) * seatRadius
    );
    const yaw = Math.atan2(world.tableFocus.x - pos.x, world.tableFocus.z - pos.z);
    world.seats.push({ index: i, position: pos, yaw });
  }

  // ---------- ANCHORS (CENTERED ON TABLE) ----------
  const mkAnchor = (name, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    table.add(g);
    return g;
  };

  // Dealer deck / dealer button area: FRONT-RIGHT quadrant but still table-centered
  world.anchors.dealer = mkAnchor("DealerAnchor", 0.65, TABLE_Y + 0.02, 0.30);

  // Community cards: centered and hovering above table
  world.anchors.community = mkAnchor("CommunityAnchor", 0.0, TABLE_Y + 1.20, 0.00);

  // Pot chips: center of table, flat
  world.anchors.pot = mkAnchor("PotAnchor", 0.0, TABLE_Y + 0.02, 0.00);

  // HUD: centered above community
  world.anchors.hud = mkAnchor("HudAnchor", 0.0, TABLE_Y + 1.75, 0.25);

  // ---------- CHIPS (flat, visible) ----------
  const chipMat = new THREE.MeshStandardMaterial({
    color: 0xff2d7a,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x220010,
    emissiveIntensity: 0.25
  });

  const chipGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.012, 18);
  for (let i = 0; i < 18; i++) {
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.rotation.x = Math.PI / 2;
    chip.position.set((Math.random() - 0.5) * 0.18, 0.006 + i * 0.010, (Math.random() - 0.5) * 0.18);
    world.anchors.pot.add(chip);
  }

  // Dealer button
  const dealerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.02, 22),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.1,
      roughness: 0.25
    })
  );
  dealerBtn.rotation.x = Math.PI / 2;
  dealerBtn.position.set(0.20, TABLE_Y + 0.03, 0.00);
  world.anchors.dealer.add(dealerBtn);

  // ---------- RAIL GUARD + JOIN PAD ----------
  function makeGuard() {
    const g = new THREE.Group();
    g.name = "RailGuard";

    const suit = new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 0.85 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x2bd7ff, emissiveIntensity: 0.6, roughness: 0.35 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 8, 16), suit);
    body.position.y = 1.05;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.6 }));
    head.position.y = 1.48;
    g.add(head);

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.02), accent);
    badge.position.set(0.0, 1.12, 0.18);
    g.add(badge);

    // Action ring at feet
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 48),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.name = "JoinRing";
    g.add(ring);

    return g;
  }

  const guard = makeGuard();
  guard.position.set(2.8, 0, world.tableFocus.z + 4.2);
  guard.rotation.y = Math.PI;
  world.group.add(guard);

  // Join pad near table edge too
  const joinPad = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.48, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  joinPad.rotation.x = -Math.PI / 2;
  joinPad.position.set(world.tableFocus.x, 0.02, world.tableFocus.z + 4.0);
  joinPad.name = "JoinPad";
  world.group.add(joinPad);

  world.interactions.push(
    { name: "GUARD_JOIN", obj: guard, radius: 1.25 },
    { name: "PAD_JOIN", obj: joinPad, radius: 1.25 }
  );

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
        rail: { center: world.tableFocus.clone(), radius: railR }
      });
      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };
      L("[world] bots ✅");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- PLAYER SIT/JOIN LOGIC ----------
  function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.hypot(dx, dz);
  }

  function seatPlayerAtSeat0() {
    const refs = world._refs || {};
    const player = refs.player;
    const camera = refs.camera;
    const dealing = refs.dealing;

    if (!player || !camera) return;

    const seat0 = world.seats[0];
    if (!seat0) return;

    // Place rig at seat0 position (XZ). Keep floor Y=0, adjust camera height to seated.
    player.position.set(seat0.position.x, 0, seat0.position.z);
    player.rotation.y = seat0.yaw;

    camera.position.y = world.metrics.sitCamY; // seated view
    world.playerSeated = true;

    // Start a hand including player seat
    try { dealing?.setIncludePlayer?.(true); } catch {}
    try { dealing?.startHand?.(); } catch {}

    try {
      world.tableHud?.setGameState?.({
        street: "Preflop",
        pot: 15000,
        turnName: "YOU",
        action: "You joined. Dealing…"
      });
    } catch {}

    L("[world] YOU sat down ✅");
  }

  function standPlayer() {
    const refs = world._refs || {};
    const camera = refs.camera;
    if (!camera) return;

    camera.position.y = world.metrics.standCamY;
    world.playerSeated = false;

    try { refs.dealing?.setIncludePlayer?.(false); } catch {}
    L("[world] YOU standing ✅");
  }

  // Default: stand up always
  world.onAction = () => {
    const refs = world._refs || {};
    const player = refs.player;
    if (!player) return;

    // If already seated, ignore action for now (later we can use it for betting UI).
    if (world.playerSeated) return;

    // Find nearest interaction
    const p = player.position;
    for (const it of world.interactions) {
      const wp = new THREE.Vector3();
      it.obj.getWorldPosition(wp);
      if (distanceXZ(p, wp) <= it.radius) {
        // “Accept” is automatic for now (you said: talk to guard and accept).
        // Next step: we can add a confirm UI panel.
        seatPlayerAtSeat0();
        return;
      }
    }

    // no interaction found
    L("[world] action: nothing nearby");
  };

  // ---------- WORLD TICK ----------
  const baseTick = world.tick;
  const pulse = { t: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    pulse.t += dt;

    // pulse join rings
    joinPad.material.opacity = 0.65 + Math.sin(pulse.t * 3.0) * 0.18;
    const ring = guard.getObjectByName("JoinRing");
    if (ring?.material) ring.material.opacity = 0.65 + Math.sin(pulse.t * 3.0 + 1.2) * 0.18;

    // keep HUD facing camera
    try { world.tableHud?.update?.(dt); } catch {}
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
}
