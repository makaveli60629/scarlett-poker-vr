// /js/world.js — Scarlett Poker VR WORLD v10.1 (SeatAnchors + stable)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> returns world object

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  // ---------------- WORLD OBJECT ----------------
  const world = {
    v,
    group: new THREE.Group(),
    // core points
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },

    // physical refs
    floor: null,
    table: null,
    chairs: [],
    seats: [], // seat anchors (position + yaw + sitY + anchor)

    // optional modules
    teleporter: null,
    teleportModule: null,
    bots: null,

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

  // ---------------- SAFE TEXTURE LOADER ----------------
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
    carpet: await loadTex("assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    ceiling: await loadTex("assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("assets/textures/table_felt_green.jpg", { srgb: true })
  };

  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.95,
      map: T.carpet || null
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x141826,
      roughness: 0.95,
      map: T.brick || null
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0x070812,
      roughness: 0.9,
      map: T.ceiling || null,
      side: THREE.BackSide
    }),
    felt: new THREE.MeshStandardMaterial({
      color: 0x0f5d3a,
      roughness: 0.92,
      map: T.felt || null
    }),
    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 })
  };

  // ---------------- LIGHTING (WORLD LOCAL) ----------------
  // Slightly brighter than v10.0 to reduce "dark room" complaints
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(7, 12, 6);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 0.60, 22);
  fill.position.set(0, 2.4, 2.0);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 0.72, 22);
  purple.position.set(0, 2.6, 3.6);
  world.group.add(purple);

  // ---------------- FLOOR (TELEPORT TARGET) ----------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------------- WALLS (SOLID ROOM) ----------------
  const wallH = 6.0;
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

  // ---------------- CEILING DOME ----------------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 22), mat.ceiling);
  dome.position.set(0, 6.8, -3);
  dome.scale.set(1.3, 0.9, 1.3);
  dome.name = "CeilingDome";
  world.group.add(dome);

  // ---------------- SPAWN PAD ----------------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({
      color: 0x7fe7ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------------- TABLE ----------------
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = 0.92;
  felt.name = "TableFelt";
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  rim.name = "TableRim";
  table.add(rim);

  // Rails ring + glow
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
      emissiveIntensity: 1.35,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

  // ---------------- CHAIRS + SEATS (SeatAnchors) ----------------
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

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;

    // chair base position
    const chairPos = new THREE.Vector3(
      c.x + Math.cos(a) * seatR,
      0,
      c.z + Math.sin(a) * seatR
    );

    // yaw so chair faces table
    const yaw = Math.atan2(c.x - chairPos.x, c.z - chairPos.z);

    const chair = makeChair();
    chair.position.copy(chairPos);
    chair.rotation.y = yaw;
    chair.name = "Chair_" + i;
    world.group.add(chair);
    world.chairs.push(chair);

    // ✅ SeatAnchor: authoritative seat placement
    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = "SeatAnchor_" + i;

    // Toward table (+Z in chair local because chair faces table via yaw)
    const ANCHOR_INWARD_Z = 0.18;
    const SEAT_SURFACE_Y = 0.52;

    seatAnchor.position.set(0, SEAT_SURFACE_Y, ANCHOR_INWARD_Z);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    world.seats.push({
      index: i,
      position: seatPos,     // compatibility
      yaw,
      sitY: SEAT_SURFACE_Y,  // seat surface height
      lookAt: c.clone(),
      anchor: seatAnchor     // ✅ NEW
    });
  }

  // ---------------- OPTIONAL: TELEPORT MACHINE ----------------
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

  // ---------------- OPTIONAL: BOTS ----------------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus
      });

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => {
        prev(dt);
        try { botsMod.Bots.update(dt); } catch {}
      };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------------- WORLD ANIMATION LOOP ----------------
  const baseTick = world.tick;
  world.tick = (dt) => {
    baseTick(dt);

    // spawn ring pulse
    spawnRing.userData.t = (spawnRing.userData.t || 0) + dt;
    spawnRing.material.opacity = 0.65 + Math.sin(spawnRing.userData.t * 3.0) * 0.18;

    // rail glow pulse
    glowRing.userData.t = (glowRing.userData.t || 0) + dt;
    glowRing.material.emissiveIntensity = 1.15 + Math.sin(glowRing.userData.t * 3.5) * 0.35;
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
      }
