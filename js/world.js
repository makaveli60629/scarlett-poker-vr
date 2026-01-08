// /js/world.js — Scarlett Poker VR WORLD v10.4 (Teleporter + Lobby Props + Brighter)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> world object

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

    // teleporter
    teleporter: null,
    teleportModule: null,
    fallbackTeleporter: null,

    bots: null,

    connect({ playerRig, controllers }) {
      // If real TeleportMachine exists, connect it
      try {
        if (world.teleportModule?.TeleportMachine?.connect) {
          world.teleportModule.TeleportMachine.connect({ playerRig, controllers });
          L("[world] TeleportMachine connected ✅");
        }
      } catch (e) {
        L("[world] TeleportMachine connect failed:", e?.message || e);
      }
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
        () => {
          L("[tex] missing:", url);
          resolve(null);
        }
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
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    neon: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      emissive: 0xff2d7a,
      emissiveIntensity: 2.2,
      roughness: 0.25
    }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    }),
    plant: new THREE.MeshStandardMaterial({ color: 0x1ea35c, roughness: 0.95 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.9 })
  };

  // ---------- LIGHTING (BRIGHTER) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(7, 12, 6);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 1.0, 32);
  fill.position.set(0, 2.7, 1.2);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 1.0, 32);
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

  // ---------- TABLE ----------
  const TABLE_Y = 0.92;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

  // rails glow ring
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

  // ---------- CHAIRS + SEATS ----------
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

    const chairPos = new THREE.Vector3(
      c.x + Math.cos(a) * seatR,
      0,
      c.z + Math.sin(a) * seatR
    );

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

  // ---------- LOBBY PROPS ----------
  function addNeonSign() {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.08), mat.neon);
    sign.position.set(0, 2.6, 6.8);
    world.group.add(sign);

    const glow = new THREE.PointLight(0xff2d7a, 1.2, 18);
    glow.position.copy(sign.position);
    world.group.add(glow);
  }

  function addKiosk() {
    const kiosk = new THREE.Group();
    kiosk.name = "StoreKiosk";
    kiosk.position.set(-4.8, 0, 7.8);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.1), mat.metalDark);
    base.position.y = 0.6;
    kiosk.add(base);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.06), mat.holo);
    screen.position.set(0, 1.1, 0.58);
    kiosk.add(screen);

    const light = new THREE.PointLight(0x7fe7ff, 0.7, 10);
    light.position.set(-4.8, 1.8, 7.8);
    world.group.add(light);

    world.group.add(kiosk);
  }

  function addPlanters() {
    const spots = [
      new THREE.Vector3(5.7, 0, 7.2),
      new THREE.Vector3(5.7, 0, 10.8),
      new THREE.Vector3(-5.7, 0, 10.8),
    ];

    for (let i = 0; i < spots.length; i++) {
      const p = spots[i];
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.45, 18), mat.pot);
      pot.position.set(p.x, 0.225, p.z);
      world.group.add(pot);

      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat.plant);
      plant.position.set(p.x, 0.85, p.z);
      world.group.add(plant);

      const pl = new THREE.PointLight(0x2bff9a, 0.25, 6);
      pl.position.set(p.x, 1.2, p.z);
      world.group.add(pl);
    }
  }

  function addVipDoorway() {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 0.22), mat.metalDark);
    frame.position.set(0, 1.5, 7.85);
    world.group.add(frame);

    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), mat.holo);
    portal.position.set(0, 1.5, 7.75);
    world.group.add(portal);

    const glow = new THREE.PointLight(0x7fe7ff, 0.55, 10);
    glow.position.set(0, 2.1, 7.2);
    world.group.add(glow);
  }

  addNeonSign();
  addKiosk();
  addPlanters();
  addVipDoorway();

  // ---------- TELEPORTER (FALLBACK VISUAL ALWAYS) ----------
  function buildFallbackTeleporter(pos) {
    const g = new THREE.Group();
    g.name = "FallbackTeleporter";
    g.position.copy(pos);

    // pad
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.06, 48),
      mat.metalDark
    );
    pad.position.y = 0.03;
    g.add(pad);

    // glow ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.05, 16, 64),
      mat.holo
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);

    // arch
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.07, 16, 90, Math.PI),
      mat.holo
    );
    arch.rotation.z = Math.PI;
    arch.position.y = 1.05;
    g.add(arch);

    // center column
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.14, 1.25, 18),
      mat.metalDark
    );
    col.position.y = 0.70;
    g.add(col);

    // particles (simple points)
    const pts = new THREE.BufferGeometry();
    const N = 120;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.35 + Math.random() * 0.35;
      arr[i * 3 + 0] = Math.cos(a) * r;
      arr[i * 3 + 1] = 0.20 + Math.random() * 1.15;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    pts.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pm = new THREE.PointsMaterial({ size: 0.02, color: 0x7fe7ff, transparent: true, opacity: 0.9 });
    const particles = new THREE.Points(pts, pm);
    particles.name = "TP_Particles";
    g.add(particles);

    // light
    const light = new THREE.PointLight(0x7fe7ff, 1.0, 18);
    light.position.set(0, 1.6, 0);
    g.add(light);

    world.group.add(g);
    return { g, ring, arch, particles };
  }

  world.fallbackTeleporter = buildFallbackTeleporter(world.spawnPads[0].clone());

  // ---------- OPTIONAL: REAL TELEPORT MACHINE MODULE ----------
  try {
    const tm = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (tm?.TeleportMachine?.build) {
      world.teleportModule = tm;

      const tele = tm.TeleportMachine.build({ THREE, scene: world.group, log });
      tele.position.copy(world.spawnPads[0]);
      world.teleporter = tele;

      // If module has tick, chain it
      if (typeof tm.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); try { tm.TeleportMachine.tick(dt); } catch {} };
      }

      L("[world] ✅ TeleportMachine loaded (real)");
    }
  } catch (e) {
    L("[world] ⚠️ teleport_machine.js missing or failed:", e?.message || e);
  }

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

    // fallback teleporter animation (always)
    if (world.fallbackTeleporter) {
      const { ring, arch, particles } = world.fallbackTeleporter;
      ring.rotation.z += dt * 0.9;
      arch.rotation.y += dt * 0.6;
      particles.rotation.y -= dt * 0.35;
      particles.position.y = 0.0 + Math.sin(tickState.t * 2.2) * 0.02;
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
