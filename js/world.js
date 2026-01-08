// /js/world.js — Scarlett Poker VR WORLD v10.5 (Full Refinement Pass)
// - Table base (no floating)
// - Chips (flat) + pot stack
// - Dealer button moves seat-to-seat (not orbit)
// - VR-visible panels (leaderboard/info)
// - Passes playerRig to bots for billboards (cards/tags face you)

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

    teleporter: null,
    teleportModule: null,
    fallbackTeleporter: null,

    bots: null,

    panels: { root: null, left: null, right: null, visible: true },
    togglePanels() {
      if (!world.panels.root) return;
      world.panels.visible = !world.panels.visible;
      world.panels.root.visible = world.panels.visible;
    },

    // store refs so world can billboard
    _playerRig: null,
    _camera: null,

    connect({ playerRig, controllers, camera }) {
      world._playerRig = playerRig || null;
      world._camera = camera || null;

      // connect real teleporter if present
      try {
        if (world.teleportModule?.TeleportMachine?.connect) {
          world.teleportModule.TeleportMachine.connect({ playerRig, controllers });
          L("[world] TeleportMachine connected ✅");
        }
      } catch (e) {
        L("[world] TeleportMachine connect failed:", e?.message || e);
      }

      // give player rig to bots so their cards/tags face you
      try { world.bots?.setPlayerRig?.(playerRig); } catch {}
    },

    tick: (dt) => {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------- TEXTURES ----------
  const texLoader = new THREE.TextureLoader();
  const loadTex = (url, opts = {}) =>
    new Promise((resolve) => {
      texLoader.load(
        url,
        (t) => {
          try {
            if (opts.repeat) {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.repeat.set(opts.repeat[0], opts.repeat[1]);
            }
            if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
          } catch {}
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });

  const T = {
    carpet: await loadTex("./assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("./assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("./assets/textures/table_felt_green.jpg", { srgb: true }),
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.95, map: T.carpet || null }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95, map: T.brick || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, map: T.ceiling || null, side: THREE.BackSide }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null }),
    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
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
      metalness: 0.0,
      emissive: 0x111111,
      emissiveIntensity: 0.25
    })
  };

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(7, 12, 6);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 1.15, 34);
  fill.position.set(0, 2.7, 1.2);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 1.05, 34);
  purple.position.set(0, 2.9, 3.8);
  world.group.add(purple);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.22));

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
  dome.name = "CeilingDome";
  world.group.add(dome);

  // ---------- SPAWN PAD ----------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------- TABLE (WITH BASE) ----------
  const TABLE_Y = 0.92;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  // base pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.15, 0.70, 32),
    mat.metalDark
  );
  pedestal.position.y = 0.35;
  table.add(pedestal);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 14, 48), mat.wood);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.08;
  table.add(baseRing);

  // felt top
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  // rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.wood);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

  // rail glow
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.75, 0.018, 10, 120),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  table.add(glowRing);

  // ---------- CHAIRS + SEAT ANCHORS ----------
  function makeChair() {
    const g = new THREE.Group();
    g.name = "Chair";

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
    chair.name = "Chair_" + i;
    world.group.add(chair);
    world.chairs.push(chair);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = "SeatAnchor_" + i;
    seatAnchor.position.set(0, SEAT_SURFACE_Y, 0.18);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    world.seats.push({
      index: i,
      position: seatPos,
      yaw,
      sitY: SEAT_SURFACE_Y,
      lookAt: c.clone(),
      anchor: seatAnchor
    });
  }

  // ---------- CHIPS (FLAT) ----------
  function makeChip() {
    const g = new THREE.Group();
    g.name = "Chip";

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 24), mat.chip);
    body.position.y = 0.006;
    g.add(body);

    // stripes
    const stripe1 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 10, 40), mat.chipStripe);
    stripe1.rotation.x = Math.PI / 2;
    stripe1.position.y = 0.006;
    g.add(stripe1);

    const stripe2 = stripe1.clone();
    stripe2.scale.setScalar(0.82);
    g.add(stripe2);

    return g;
  }

  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(0, TABLE_Y + 0.01, 0);
  table.add(pot);

  for (let i = 0; i < 16; i++) {
    const chip = makeChip();
    chip.position.set((Math.random() - 0.5) * 0.14, i * 0.010, (Math.random() - 0.5) * 0.14);
    // flat (no rotation needed; cylinder stands upright naturally)
    pot.add(chip);
  }

  // ---------- DEALER BUTTON (MOVES SEAT-TO-SEAT) ----------
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 22), mat.holo);
  dealerBtn.name = "DealerButton";
  dealerBtn.position.set(0.55, TABLE_Y + 0.02, -0.25);
  table.add(dealerBtn);

  const dealerSpots = world.seats.map((s) => {
    // small position near each seat on inner rim
    const inward = new THREE.Vector3(c.x - s.position.x, 0, c.z - s.position.z).normalize().multiplyScalar(0.55);
    return new THREE.Vector3(s.position.x + inward.x, TABLE_Y + 0.02, s.position.z + inward.z);
  });

  let dealerIndex = 0;
  let dealerMoveT = 0;
  let dealerHold = 0;

  // ---------- PANELS (LEADERBOARD / INFO) ----------
  function makePanel(textLines) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    function draw(lines) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 54px Arial";
      ctx.fillText("SCARLETT VR POKER", 40, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "36px Arial";
      let y = 140;
      for (const line of lines) {
        ctx.fillText(line, 40, y);
        y += 54;
      }
    }

    draw(textLines);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    mesh.userData._canvas = canvas;
    mesh.userData._ctx = ctx;
    mesh.userData._tex = tex;
    mesh.userData._draw = draw;

    return mesh;
  }

  world.panels.root = new THREE.Group();
  world.panels.root.name = "WorldPanels";
  world.group.add(world.panels.root);

  world.panels.left = makePanel([
    "Table: 6-Max (TEMP HUD)",
    "Dealer: moving seat-to-seat",
    "Press M to toggle panels"
  ]);
  world.panels.left.position.set(-4.6, 2.2, 6.9);
  world.panels.left.rotation.y = 0.25;
  world.panels.root.add(world.panels.left);

  world.panels.right = makePanel([
    "Blinds: 50 / 100",
    "Pot: 1,250",
    "Bots: active + lobby crowd"
  ]);
  world.panels.right.position.set(4.6, 2.2, 6.9);
  world.panels.right.rotation.y = -0.25;
  world.panels.root.add(world.panels.right);

  // ---------- OPTIONAL: TELEPORT MACHINE (real) OR fallback stays in your current setup ----------
  // (Your fallback teleporter visuals are already working; keeping it simple here.)
  // If you want, we can re-add the fancy fallback arch again — but you said it’s okay for now.

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
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y },
      });

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- WORLD TICK ----------
  const baseTick = world.tick;
  const tickState = { t: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    tickState.t += dt;

    // spawn ring pulse
    spawnRing.material.opacity = 0.62 + Math.sin(tickState.t * 3.0) * 0.18;

    // rail pulse
    glowRing.material.emissiveIntensity = 1.25 + Math.sin(tickState.t * 3.5) * 0.35;

    // dealer button seat-to-seat
    dealerHold += dt;

    // hold at each seat for 2.0s, then move for 0.55s
    const HOLD = 2.0;
    const MOVE = 0.55;

    if (dealerHold >= HOLD) {
      dealerMoveT += dt / MOVE;
      const from = dealerSpots[dealerIndex];
      const to = dealerSpots[(dealerIndex + 1) % dealerSpots.length];

      const t = Math.min(1, dealerMoveT);
      const e = 1 - Math.pow(1 - t, 3);

      dealerBtn.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e,
        from.z + (to.z - from.z) * e
      );

      if (t >= 1) {
        dealerIndex = (dealerIndex + 1) % dealerSpots.length;
        dealerHold = 0;
        dealerMoveT = 0;
      }
    } else {
      const p = dealerSpots[dealerIndex];
      dealerBtn.position.copy(p);
    }

    // pot pulse
    const ps = 1.0 + Math.sin(tickState.t * 2.4) * 0.03;
    pot.scale.setScalar(ps);

    // panel refresh (simple animated numbers)
    if (world.panels.left?.userData?._draw) {
      const chips = 1250 + Math.floor((Math.sin(tickState.t * 0.9) * 0.5 + 0.5) * 600);
      world.panels.right.userData._draw([
        "Blinds: 50 / 100",
        "Pot: " + chips.toLocaleString(),
        "Crowd: " + (6 + 2) + " bots"
      ]);
      world.panels.right.userData._tex.needsUpdate = true;
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
