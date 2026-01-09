// /js/world.js — Scarlett Poker VR WORLD v10.8 (Full World, No Fake Game Props)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> world

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    lobbyZone: { min: new THREE.Vector3(-10, 0, 6), max: new THREE.Vector3(10, 0, 18) },

    // Bigger room clamp
    roomClamp: { minX: -14.0, maxX: 14.0, minZ: -22.0, maxZ: 12.0 },

    metrics: { tableY: 0.92, seatY: 0.52 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    teleporter: null,
    teleportModule: null,
    bots: null,

    playerRef: null,
    cameraRef: null,

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
        () => {
          L("[tex] missing:", url);
          resolve(null);
        }
      );
    });

  // ✅ Use your new textures (put in /assets/textures/)
  const T = {
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),
    wall:  await loadTex("./assets/textures/scarlett_wall_seamless.png", { repeat: [6, 2], srgb: true }),
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.95, map: T.floor || null }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95, map: T.wall || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, side: THREE.BackSide }),

    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 }),
    rim:  new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),

    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat:  new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
  };

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(10, 14, 6);
  world.group.add(key);

  const aqua = new THREE.PointLight(0x7fe7ff, 0.85, 42);
  aqua.position.set(0, 3.2, 2.0);
  world.group.add(aqua);

  const purple = new THREE.PointLight(0xb46bff, 0.95, 42);
  purple.position.set(0, 3.4, 5.6);
  world.group.add(purple);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.20));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------- WALLS (bigger room) ----------
  const wallH = 7.2;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  };

  // Room bounds roughly match roomClamp
  mkWall(30, wallH, 0.4, 0, wallH / 2, -23);
  mkWall(30, wallH, 0.4, 0, wallH / 2,  13);
  mkWall(0.4, wallH, 36, -15, wallH / 2, -5);
  mkWall(0.4, wallH, 36,  15, wallH / 2, -5);

  // ---------- CEILING DOME ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(26, 40, 28), mat.ceiling);
  dome.position.set(0, 9.0, -6);
  dome.scale.set(1.1, 0.8, 1.1);
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
  const TABLE_Y = world.metrics.tableY;
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

  // Table stand (so it doesn't float)
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.86, 18), mat.metalDark);
  stand.position.y = 0.43;
  stand.name = "TableStand";
  table.add(stand);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.10, 22), mat.metalDark);
  base.position.y = 0.05;
  base.name = "TableBase";
  table.add(base);

  // ---------- RAILS (solid boundary for bots) ----------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.75;
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

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.018, 10, 120),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.55,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    })
  );
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

    world.seats.push({ index: i, yaw, anchor: seatAnchor });
  }

  // ---------- OPTIONAL: TELEPORT MACHINE ----------
  try {
    const tm = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (tm?.TeleportMachine?.build) {
      world.teleportModule = tm;
      const tele = tm.TeleportMachine.build({ THREE, scene: world.group, log });
      tele.position.set(0, 0, 3.6);
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
        tableFocus: world.tableFocus,
        metrics: world.metrics
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
  const t = { v: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    t.v += dt;

    spawnRing.material.opacity = 0.65 + Math.sin(t.v * 3.0) * 0.18;
    glowRing.material.emissiveIntensity = 1.25 + Math.sin(t.v * 3.5) * 0.35;
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
      }
