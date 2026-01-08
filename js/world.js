// /js/world.js — Scarlett Poker VR WORLD v10.6 (Bigger Room + Solid + Kiosks + ONE Poker Source)
// Changes:
// - Uses your new floor/wall textures (tile + matching wall)
// - Room is bigger (2x-ish) and solid walls
// - Adds "Store" portal + "Poker Room" portal visuals (pads + neon sign planes)
// - Removes the old fake community-card display (DealingMix is now the only poker visuals)
// - Adds more lights
// - Exposes metrics { tableY, seatY } for dealing/bots alignment

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    lobbyZone: { min: new THREE.Vector3(-10, 0, 6), max: new THREE.Vector3(10, 0, 18) },
    roomClamp: { minX: -15.6, maxX: 15.6, minZ: -22.6, maxZ: 15.6 },

    metrics: { tableY: 0.92, seatY: 0.52, railR: 3.75 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    teleporter: null,
    teleportModule: null,
    bots: null,

    portals: { store: null, poker: null },

    connect({ playerRig, controllers }) {
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
        () => { L("[tex] missing:", url); resolve(null); }
      );
    });

  // Put these in your repo:
  // assets/textures/scarlett_floor_tile_seamless.png
  // assets/textures/scarlett_wall_seamless.png
  const T = {
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),
    wall: await loadTex("./assets/textures/scarlett_wall_seamless.png", { repeat: [5, 2], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("./assets/textures/table_felt_green.jpg", { srgb: true }),
  };

  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.85, map: T.floor || null }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.92, map: T.wall || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, map: T.ceiling || null, side: THREE.BackSide }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null }),
    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    neonAqua: new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x2bd7ff, emissiveIntensity: 1.4, roughness: 0.2, transparent: true, opacity: 0.95 }),
    neonPink: new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 1.1, roughness: 0.25, transparent: true, opacity: 0.95 }),
  };

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.35));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(10, 16, 8);
  world.group.add(key);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.20));

  // extra point lights around table
  const p1 = new THREE.PointLight(0x7fe7ff, 0.85, 40); p1.position.set(0, 3.2, 2.0); world.group.add(p1);
  const p2 = new THREE.PointLight(0xb46bff, 0.85, 40); p2.position.set(0, 3.4, 5.0); world.group.add(p2);
  const p3 = new THREE.PointLight(0xff2d7a, 0.45, 36); p3.position.set(-6, 2.8, 10); world.group.add(p3);

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------- SOLID WALLS (BIGGER ROOM) ----------
  const wallH = 7.2;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  };

  // Big room bounds
  // back/front
  mkWall(32, wallH, 0.35, 0, wallH / 2, -24);
  mkWall(32, wallH, 0.35, 0, wallH / 2, 16);
  // left/right
  mkWall(0.35, wallH, 40, -16, wallH / 2, -4);
  mkWall(0.35, wallH, 40,  16, wallH / 2, -4);

  // ---------- CEILING DOME ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(26, 36, 26), mat.ceiling);
  dome.position.set(0, 9.2, -5);
  dome.scale.set(1.15, 0.75, 1.15);
  dome.name = "CeilingDome";
  world.group.add(dome);

  // ---------- SPAWN PAD (Teleport circle) ----------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.46, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.90, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------- TABLE ----------
  const TABLE_Y = world.metrics.tableY;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  // felt
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  // rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

  // pedestal so table not floating
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.90, 24), mat.metalDark);
  pedestal.position.y = 0.45;
  pedestal.name = "TablePedestal";
  table.add(pedestal);

  // ---------- RAILS ----------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = world.metrics.railR;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 10), mat.metalDark);
    post.position.set(Math.cos(a) * railR, 0.31, Math.sin(a) * railR);
    rails.add(post);
  }

  const railRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.05, 10, 90), mat.metalDark);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.62;
  rails.add(railRing);

  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.018, 10, 120), mat.neonAqua);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

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
  const SEAT_SURFACE_Y = world.metrics.seatY;

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

  // ---------- LEADERBOARD (BIG BACK WALL) ----------
  function makeTextPlane(text, w = 6.6, h = 1.6) {
    const cvs = document.createElement("canvas");
    cvs.width = 1024; cvs.height = 256;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 74px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cvs.width / 2, cvs.height / 2);

    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const matp = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matp);
    return mesh;
  }

  const leaderboard = makeTextPlane("Scarlett VR Poker • 6-Max • Pot / Turn / Action", 9.5, 1.8);
  leaderboard.position.set(0, 5.6, -23.75);
  world.group.add(leaderboard);

  // ---------- PORTALS (STORE + POKER ROOM) ----------
  function makePortal(name, pos, colorMat) {
    const g = new THREE.Group();
    g.name = name;
    g.position.copy(pos);

    // pad
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.70, 32), colorMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.02;
    g.add(pad);

    // sign
    const sign = makeTextPlane(name.toUpperCase(), 2.6, 0.8);
    sign.position.set(0, 2.0, 0);
    g.add(sign);

    // frame
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 10, 60), colorMat);
    frame.rotation.x = Math.PI / 2;
    frame.position.y = 0.03;
    g.add(frame);

    world.group.add(g);
    return { group: g, pad, sign };
  }

  world.portals.store = makePortal("Store", new THREE.Vector3(-12.0, 0, 10.8), mat.neonPink);
  world.portals.poker = makePortal("Poker Room", new THREE.Vector3(12.0, 0, 10.8), mat.neonAqua);

  // ---------- OPTIONAL: TELEPORT MACHINE ----------
  try {
    const tm = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (tm?.TeleportMachine?.build) {
      world.teleportModule = tm;
      const tele = tm.TeleportMachine.build({ THREE, scene: world.group, log });
      // Put it exactly at spawn
      tele.position.set(world.spawnPads[0].x, 0, world.spawnPads[0].z);
      world.teleporter = tele;

      if (typeof tm.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); try { tm.TeleportMachine.tick(dt); } catch {} };
      }
      L("[world] ✅ TeleportMachine loaded");
    }
  } catch (e) {
    L("[world] ⚠️ teleport_machine.js missing or failed:", e?.message || e);
  }

  // ---------- OPTIONAL: BOTS ----------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      await botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y },
        railR
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
  const viz = { t: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    viz.t += dt;

    // spawn ring pulse
    spawnRing.material.opacity = 0.72 + Math.sin(viz.t * 3.0) * 0.16;

    // rail pulse
    glowRing.material.emissiveIntensity = 1.15 + Math.sin(viz.t * 3.5) * 0.35;

    // portal pulse
    if (world.portals.store?.pad?.material) world.portals.store.pad.material.emissiveIntensity = 0.9 + Math.sin(viz.t * 2.6) * 0.25;
    if (world.portals.poker?.pad?.material) world.portals.poker.pad.material.emissiveIntensity = 1.0 + Math.sin(viz.t * 2.8) * 0.25;
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
