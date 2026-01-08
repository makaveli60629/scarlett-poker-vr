// /js/world.js — Scarlett Poker VR WORLD v10.7 (Table-centered HUD + Flat Dealer + True Anchors)
// Key fixes:
// - Panels above table (readable from afar)
// - Dealer button is flat and larger
// - Table-local placement used for dealer spots
// - Grid floor still enabled for debugging

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    viz: {
      pot: null,
      dealerBtn: null,
      dealerSpotsLocal: [],
      panels: null
    },

    bots: null,

    panels: { root: null, visible: true },
    togglePanels() {
      if (!world.panels.root) return;
      world.panels.visible = !world.panels.visible;
      world.panels.root.visible = world.panels.visible;
    },

    _playerRig: null,
    _camera: null,

    connect({ playerRig, camera }) {
      world._playerRig = playerRig || null;
      world._camera = camera || null;
      try { world.bots?.setPlayerRig?.(playerRig, camera); } catch {}
    },

    tick: (dt) => {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------- GRID TEXTURE ----------
  function makeGridTexture({ size = 1024, cells = 16 } = {}) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0c0f18";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    ctx.strokeStyle = "rgba(127,231,255,0.20)";
    ctx.lineWidth = 4;
    for (let i = 0; i <= cells; i += 4) {
      const p = (i / cells) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.needsUpdate = true;
    return tex;
  }

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, map: makeGridTexture({ cells: 16 }) }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, side: THREE.BackSide }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9
    }),
    chip: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x220010,
      emissiveIntensity: 0.35
    }),
    chipStripe: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: 0x111111,
      emissiveIntensity: 0.25
    })
  };

  // ---------- LIGHTING (brighter) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 2.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.85);
  key.position.set(7, 12, 6);
  world.group.add(key);
  world.group.add(new THREE.AmbientLight(0xffffff, 0.35));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------- WALLS ----------
  const wallH = 6.2;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  };
  mkWall(16, wallH, 0.3, 0, wallH / 2, -14);
  mkWall(16, wallH, 0.3, 0, wallH / 2, 8);
  mkWall(0.3, wallH, 22, -8, wallH / 2, -3);
  mkWall(0.3, wallH, 22, 8, wallH / 2, -3);

  // ---------- CEILING ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 22), mat.ceiling);
  dome.position.set(0, 6.9, -3);
  dome.scale.set(1.3, 0.9, 1.3);
  world.group.add(dome);

  // ---------- SPAWN PAD ----------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  world.group.add(spawnRing);

  // ---------- TABLE (with base) ----------
  const TABLE_Y = 0.92;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 0.70, 32), mat.metal);
  pedestal.position.y = 0.35;
  table.add(pedestal);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.wood);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  table.add(rim);

  // ---------- CHAIRS + SEATS ----------
  function makeChair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 18), mat.chairSeat);
    seat.position.y = 0.50;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.09), mat.chairFrame);
    back.position.set(0, 0.90, -0.24);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.48, 12), mat.chairFrame);
    leg.position.y = 0.24;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), mat.chairFrame);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.05;
  const SEAT_SURFACE_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const chairPos = new THREE.Vector3(c.x + Math.cos(a) * seatR, 0, c.z + Math.sin(a) * seatR);
    const yaw = Math.atan2(c.x - chairPos.x, c.z - chairPos.z);

    const chair = makeChair();
    chair.position.copy(chairPos);
    chair.rotation.y = yaw;
    world.group.add(chair);
    world.chairs.push(chair);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.position.set(0, SEAT_SURFACE_Y, 0.18);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    world.seats.push({ index: i, position: seatPos, yaw, sitY: SEAT_SURFACE_Y, lookAt: c.clone(), anchor: seatAnchor });
  }

  // ---------- POT CHIPS ----------
  function makeChip() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 24), mat.chip);
    body.position.y = 0.006;
    g.add(body);

    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 10, 40), mat.chipStripe);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 0.006;
    g.add(stripe);

    const stripe2 = stripe.clone();
    stripe2.scale.setScalar(0.82);
    g.add(stripe2);

    return g;
  }

  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(0, TABLE_Y + 0.02, 0); // table-local
  table.add(pot);
  world.viz.pot = pot;

  for (let i = 0; i < 18; i++) {
    const chip = makeChip();
    chip.position.set((Math.random() - 0.5) * 0.14, i * 0.010, (Math.random() - 0.5) * 0.14);
    pot.add(chip);
  }

  // ---------- DEALER BUTTON (flat + bigger) ----------
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 28), mat.holo);
  // ✅ cylinder is already flat on table (axis Y). No rotation needed.
  dealerBtn.position.set(0.62, TABLE_Y + 0.011, -0.18);
  table.add(dealerBtn);
  world.viz.dealerBtn = dealerBtn;

  // Dealer spots in table-local space
  const dealerSpotsLocal = world.seats.map((s) => {
    const inwardW = new THREE.Vector3(c.x - s.position.x, 0, c.z - s.position.z).normalize().multiplyScalar(0.55);
    const posW = new THREE.Vector3(s.position.x + inwardW.x, TABLE_Y + 0.011, s.position.z + inwardW.z);
    return table.worldToLocal(posW.clone());
  });
  world.viz.dealerSpotsLocal = dealerSpotsLocal;

  // ---------- PANELS ABOVE TABLE ----------
  function makePanel() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );

    mesh.userData.draw = (lines) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 56px Arial";
      ctx.fillText("SCARLETT VR POKER", 40, 75);

      ctx.fillStyle = "#ffffff";
      ctx.font = "40px Arial";
      let y = 160;
      for (const line of lines) {
        ctx.fillText(line, 40, y);
        y += 62;
      }

      tex.needsUpdate = true;
    };

    return mesh;
  }

  const panel = makePanel();
  panel.position.set(0, 2.65, 0);     // table-local
  panel.rotation.y = Math.PI;         // face toward spawn-ish
  panel.rotation.x = -0.08;
  table.add(panel);
  world.viz.panels = panel;

  // ---------- OPTIONAL: BOTS ----------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y }
      });

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- WORLD TICK (dealer seat-to-seat + panel status) ----------
  const baseTick = world.tick;
  const tickState = { t: 0, dealerIndex: 0, moveT: 0, hold: 0, pot: 1250, lastAction: "—" };

  world.tick = (dt) => {
    baseTick(dt);
    tickState.t += dt;

    // pulse spawn ring
    spawnRing.material.opacity = 0.62 + Math.sin(tickState.t * 3.0) * 0.18;

    // dealer: hold then move
    const HOLD = 1.5;
    const MOVE = 0.42;

    tickState.hold += dt;
    if (tickState.hold >= HOLD) {
      tickState.moveT += dt / MOVE;

      const from = dealerSpotsLocal[tickState.dealerIndex];
      const to = dealerSpotsLocal[(tickState.dealerIndex + 1) % dealerSpotsLocal.length];

      const t = Math.min(1, tickState.moveT);
      const e = 1 - Math.pow(1 - t, 3);

      dealerBtn.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e,
        from.z + (to.z - from.z) * e
      );

      if (t >= 1) {
        tickState.dealerIndex = (tickState.dealerIndex + 1) % dealerSpotsLocal.length;
        tickState.hold = 0;
        tickState.moveT = 0;

        // fake readable action feed (bots can overwrite later)
        const actions = ["CHECK", "BET 120", "FOLD", "CALL", "RAISE 300"];
        tickState.lastAction = actions[Math.floor(Math.random() * actions.length)];
        tickState.pot += Math.floor(Math.random() * 120);
      }
    } else {
      dealerBtn.position.copy(dealerSpotsLocal[tickState.dealerIndex]);
    }

    // pot pulse
    pot.scale.setScalar(1.0 + Math.sin(tickState.t * 2.4) * 0.03);

    // panel updated above table
    panel.userData.draw([
      `6-MAX • POT: $${tickState.pot.toLocaleString()}`,
      `DEALER: Seat ${tickState.dealerIndex}`,
      `ACTION: ${tickState.lastAction}`,
      `TURN: Seat ${tickState.dealerIndex} (temp)`,
    ]);
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
