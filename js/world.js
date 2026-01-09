// /js/world.js — Scarlett Poker VR WORLD v11.0 (Upgraded Lobby + Doors + Giveaway + Fountain)
// GitHub Pages safe module (no "three" import). main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> world
//
// Key upgrades:
// - Bigger, nicer room + trims + ceiling lights + wall lamps
// - LEFT/RIGHT door entrances (Poker Room + Store) with teleport pads
// - Daily Giveaway table (gaze HUD + claim pad event)
// - Corner water fountain + plants + furniture props
// - Chairs face table correctly
// - Solid wall meshes + collider list
//
// Textures:
// - Floor: ./assets/textures/scarlett_floor_tile_seamless.png
// - Walls: ./assets/textures/1767279790736.jpg  (per your instruction)
// - Optional doors: ./assets/textures/doors/door_portal.png (put your transparent PNG here)

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const world = {
    v,
    group: new THREE.Group(),

    // Center of poker table
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // Player spawn pad
    spawnPads: [new THREE.Vector3(0, 0, 5.0)],

    // Room bounds (for future collision clamp)
    roomClamp: { minX: -14.5, maxX: 14.5, minZ: -20.5, maxZ: 12.5 },

    // Zones (for bots/logic later)
    lobbyZone: { min: new THREE.Vector3(-12, 0, -2), max: new THREE.Vector3(12, 0, 11.5) },

    // Refs
    floor: null,
    table: null,
    chairs: [],
    seats: [],
    colliders: [],

    // Entrances
    entrances: {
      store: { name: "Store", pos: new THREE.Vector3(-12.0, 0, -6.5) },
      poker: { name: "Poker Room", pos: new THREE.Vector3(12.0, 0, -6.5) },
    },

    // Giveaway
    giveaway: {
      table: null,
      pad: null,
      hud: null,
      claimedToday: false,
      amount: 2500
    },

    // Visual poker elements
    viz: {
      communityCards: [],
      potStack: null,
      dealerButton: null,
      tableHudTop: null,
      tableHudState: null
    },

    // Optional modules
    teleporter: null,
    teleportModule: null,
    bots: null,

    // Player refs (for gaze HUD and future UI)
    _playerRig: null,
    _camera: null,

    connect({ playerRig, controllers, camera }) {
      world._playerRig = playerRig || null;
      world._camera = camera || null;

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

  // ---------------- TEXTURES ----------------
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
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),
    wall:  await loadTex("./assets/textures/1767279790736.jpg", { repeat: [6, 2], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { repeat: [1, 1], srgb: true }),
    felt: await loadTex("./assets/textures/table_felt_green.jpg", { repeat: [1, 1], srgb: true }),
    door: await loadTex("./assets/textures/doors/door_portal.png", { repeat: [1, 1], srgb: true }) // put your transparent PNG here
  };

  // ---------------- MATERIALS ----------------
  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x151823,
      roughness: 0.92,
      metalness: 0.0,
      map: T.floor || null
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x151926,
      roughness: 0.95,
      metalness: 0.0,
      map: T.wall || null
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x0d0f18,
      roughness: 0.65,
      metalness: 0.15
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x12131a,
      roughness: 0.55,
      metalness: 0.25
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.15,
      metalness: 0.15,
      transparent: true,
      opacity: 0.35
    }),
    neonAqua: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.92
    }),
    neonPink: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      emissive: 0xff2d7a,
      emissiveIntensity: 1.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.92
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
    rim: new THREE.MeshStandardMaterial({
      color: 0x1b0f0c,
      roughness: 0.85
    }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.92 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),

    // door plane uses alpha
    door: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: T.door || null,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.7,
      metalness: 0.05
    })
  };

  // ---------------- LIGHTING ----------------
  // Baseline
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x1d2233, 1.15));
  world.group.add(new THREE.AmbientLight(0xffffff, 0.15));

  // Key
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(8, 14, 10);
  world.group.add(key);

  // Ceiling ring lights (nice & bright)
  const ceilingLights = new THREE.Group();
  ceilingLights.name = "CeilingLights";
  world.group.add(ceilingLights);

  const ringR = 8.6;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.PointLight(0xffffff, 0.55, 22);
    p.position.set(Math.cos(a) * ringR, 6.4, -6.5 + Math.sin(a) * ringR * 0.75);
    ceilingLights.add(p);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), mat.neonAqua);
    bulb.position.copy(p.position);
    ceilingLights.add(bulb);
  }

  // Wall lamps
  function addWallLamp(x, y, z, color = 0x7fe7ff) {
    const lamp = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.06), mat.trim);
    lamp.add(plate);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.04),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2
      })
    );
    glow.position.z = 0.04;
    lamp.add(glow);

    const l = new THREE.PointLight(color, 0.45, 10);
    l.position.set(0, 0, 0.35);
    lamp.add(l);

    lamp.position.set(x, y, z);
    world.group.add(lamp);
  }

  // Place lamps along long walls
  for (let i = 0; i < 5; i++) {
    addWallLamp(-14.2, 2.4, -18 + i * 7.2, 0x7fe7ff);
    addWallLamp( 14.2, 2.4, -18 + i * 7.2, 0xff2d7a);
  }

  // ---------------- ROOM GEOMETRY ----------------
  const ROOM_W = 30;
  const ROOM_D = 34;
  const WALL_H = 7.2;
  const wallThickness = 0.45;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // Walls (solid)
  function mkWall(w, h, d, x, y, z, name) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = name || "Wall";
    world.group.add(m);
    world.colliders.push(m);
    return m;
  }

  // Back / front / left / right
  mkWall(ROOM_W, WALL_H, wallThickness, 0, WALL_H / 2, -20.5, "WallBack");
  mkWall(ROOM_W, WALL_H, wallThickness, 0, WALL_H / 2, 12.5,  "WallFront");
  mkWall(wallThickness, WALL_H, ROOM_D, -15.0, WALL_H / 2, -4.0, "WallLeft");
  mkWall(wallThickness, WALL_H, ROOM_D,  15.0, WALL_H / 2, -4.0, "WallRight");

  // Ceiling dome + trim ring
  const dome = new THREE.Mesh(new THREE.SphereGeometry(18, 36, 26), mat.ceiling);
  dome.position.set(0, 7.6, -6.5);
  dome.scale.set(1.15, 0.88, 1.15);
  dome.name = "CeilingDome";
  world.group.add(dome);

  const ceilingTrim = new THREE.Mesh(new THREE.TorusGeometry(12.3, 0.10, 16, 90), mat.trim);
  ceilingTrim.rotation.x = Math.PI / 2;
  ceilingTrim.position.set(0, 6.7, -6.5);
  world.group.add(ceilingTrim);

  // Baseboard trim
  const baseTrimMat = mat.trim;
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.18, 0.18), baseTrimMat);
  base1.position.set(0, 0.09, -20.5 + 0.28);
  world.group.add(base1);

  const base2 = base1.clone(); base2.position.set(0, 0.09, 12.5 - 0.28);
  world.group.add(base2);

  const base3 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM_D), baseTrimMat);
  base3.position.set(-15 + 0.28, 0.09, -4.0);
  world.group.add(base3);

  const base4 = base3.clone(); base4.position.set(15 - 0.28, 0.09, -4.0);
  world.group.add(base4);

  // Spawn ring
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.30, 0.46, 56),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------------- DECOR: PILLARS + PLANTS + BENCHES ----------------
  function addPillar(x, z) {
    const p = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 5.8, 18), mat.trim);
    col.position.y = 2.9;
    p.add(col);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.22, 18), mat.metal);
    cap.position.y = 5.8;
    p.add(cap);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.24, 18), mat.metal);
    base.position.y = 0.12;
    p.add(base);

    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 12, 40), mat.neonAqua);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 1.4;
    p.add(glow);

    p.position.set(x, 0, z);
    world.group.add(p);
    world.colliders.push(col);
  }

  addPillar(-10.8, -15.5);
  addPillar( 10.8, -15.5);
  addPillar(-10.8,  6.5);
  addPillar( 10.8,  6.5);

  function addPlant(x, z) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, 0.36, 16), mat.trim);
    pot.position.y = 0.18;
    g.add(pot);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1c6b3a, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.55, 10), leavesMat);
      leaf.position.set((Math.random()-0.5)*0.18, 0.45 + Math.random()*0.18, (Math.random()-0.5)*0.18);
      leaf.rotation.x = -0.4;
      leaf.rotation.z = (Math.random()-0.5)*0.6;
      g.add(leaf);
    }

    g.position.set(x, 0, z);
    world.group.add(g);
    world.colliders.push(pot);
  }

  addPlant(-13.0, -18.6);
  addPlant( 13.0, -18.6);
  addPlant(-13.0,  10.5);
  addPlant( 13.0,  10.5);

  function addBench(x, z, rotY = 0) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.75), mat.trim);
    seat.position.y = 0.45;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.14), mat.trim);
    back.position.set(0, 0.95, -0.31);
    g.add(back);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 10);
    for (const sx of [-1.1, 1.1]) {
      for (const sz of [-0.25, 0.25]) {
        const leg = new THREE.Mesh(legGeo, mat.metal);
        leg.position.set(sx, 0.25, sz);
        g.add(leg);
      }
    }

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    world.group.add(g);
    world.colliders.push(seat);
  }

  addBench(0, 10.2, 0);
  addBench(0, -19.2, Math.PI);

  // ---------------- CORNER WATER FOUNTAIN ----------------
  function addFountain(x, z) {
    const g = new THREE.Group();
    g.name = "WaterFountain";

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.55, 28), mat.trim);
    basin.position.y = 0.275;
    g.add(basin);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.18, 28),
      new THREE.MeshStandardMaterial({
        color: 0x2bd7ff,
        emissive: 0x1aa8ff,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15
      })
    );
    water.position.y = 0.50;
    g.add(water);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.05, 14), mat.metal);
    spout.position.y = 1.05;
    g.add(spout);

    const spray = new THREE.PointLight(0x7fe7ff, 0.55, 10);
    spray.position.set(0, 1.55, 0);
    g.add(spray);

    g.position.set(x, 0, z);
    world.group.add(g);
    world.colliders.push(basin);

    // animate water slightly in tick
    g.userData.water = water;
    return g;
  }

  const fountain = addFountain(-12.2, 10.2);

  // ---------------- POKER TABLE (WITH SURFACE MARKS) ----------------
  const TABLE_Y = 0.92; // felt top height
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  // Felt
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.75, 0.20, 72), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);
  world.colliders.push(felt);

  // Rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.20, 18, 90), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.10;
  rim.name = "TableRim";
  table.add(rim);
  world.colliders.push(rim);

  // Table base (fix floating look)
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 0.85, 24), mat.metal);
  pedestal.position.y = 0.42;
  table.add(pedestal);
  world.colliders.push(pedestal);

  const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.14, 28), mat.metal);
  baseFoot.position.y = 0.07;
  table.add(baseFoot);
  world.colliders.push(baseFoot);

  // Pass line + edge line (visual “surface point” + rules)
  const lineOuter = new THREE.Mesh(
    new THREE.RingGeometry(2.18, 2.30, 120),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  lineOuter.rotation.x = -Math.PI / 2;
  lineOuter.position.y = TABLE_Y + 0.012;
  table.add(lineOuter);

  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(1.72, 1.78, 120),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.y = TABLE_Y + 0.013;
  table.add(passLine);

  // Center “pot point” indicator (invisible-ish target)
  const potTarget = new THREE.Object3D();
  potTarget.name = "PotTarget";
  potTarget.position.set(0, TABLE_Y + 0.02, 0);
  table.add(potTarget);

  // Rails + glow (solid barrier)
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.85;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), mat.metal);
    post.position.set(Math.cos(a) * railR, 0.36, Math.sin(a) * railR);
    rails.add(post);
    world.colliders.push(post);
  }

  const railRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.06, 10, 110), mat.metal);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.72;
  rails.add(railRing);
  world.colliders.push(railRing);

  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.020, 10, 140), mat.neonAqua);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.78;
  rails.add(glowRing);

  // ---------------- CHAIRS + SEATS (FIXED FACING) ----------------
  function makeChair() {
    const g = new THREE.Group();
    g.name = "Chair";

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20), mat.chairSeat);
    seat.position.y = 0.52;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.70, 0.10), mat.chairFrame);
    back.position.set(0, 0.95, -0.26);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.52, 12), mat.chairFrame);
    leg.position.y = 0.26;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), mat.chairFrame);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.12;
  const SEAT_SURFACE_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;

    const chairPos = new THREE.Vector3(
      c.x + Math.cos(a) * seatR,
      0,
      c.z + Math.sin(a) * seatR
    );

    // Chair model faces +Z (front is +Z). We want +Z to point toward center.
    const dirToCenter = new THREE.Vector3(c.x - chairPos.x, 0, c.z - chairPos.z).normalize();
    const yaw = Math.atan2(dirToCenter.x, dirToCenter.z);

    const chair = makeChair();
    chair.position.copy(chairPos);
    chair.rotation.y = yaw;
    chair.name = "Chair_" + i;
    world.group.add(chair);
    world.chairs.push(chair);
    world.colliders.push(chair);

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

  // ---------------- TABLE HUDS (higher / clearer) ----------------
  function makeHudCanvas(w = 768, h = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    return { canvas, ctx };
  }

  function hudTexture(drawFn) {
    const { canvas, ctx } = makeHudCanvas();
    drawFn(ctx, canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function makeHudPlane(drawFn, sizeX = 2.8, sizeY = 0.9) {
    const tex = hudTexture(drawFn);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(sizeX, sizeY), m);
    p.renderOrder = 999;
    p.userData.redraw = (fn) => {
      const ctx = tex.image.getContext("2d");
      fn(ctx, tex.image);
      tex.needsUpdate = true;
    };
    return p;
  }

  const hudTop = makeHudPlane((ctx, c) => {
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 28, 40, c.width-56, c.height-80, 32, true);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Scarlett Poker • 6-Max • $10,000 Table", c.width/2, 106);
    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 44px Arial";
    ctx.fillText("Pot: $0   •   Turn: Preflop", c.width/2, 170);
  }, 3.6, 1.05);

  hudTop.position.set(0, 2.65, -6.5);
  world.group.add(hudTop);
  world.viz.tableHudTop = hudTop;

  const hudState = makeHudPlane((ctx, c) => {
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    roundRect(ctx, 54, 52, c.width-108, c.height-104, 28, true);

    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 58px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WHOSE TURN?", c.width/2, 118);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Arial";
    ctx.fillText("—", c.width/2, 182);
  }, 2.9, 0.95);

  // sits above community cards
  hudState.position.set(0, TABLE_Y + 1.25, 0);
  hudState.rotation.y = Math.PI; // will be billboarding in tick
  table.add(hudState);
  world.viz.tableHudState = hudState;

  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  // ---------------- ENTRANCES: LEFT (Store) + RIGHT (Poker) ----------------
  function makeEntrance({ label, x, z, color = 0x7fe7ff }) {
    const g = new THREE.Group();
    g.name = "Entrance_" + label;

    // arch frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, 3.2), mat.trim);
    frame.position.set(0, 1.6, 0);
    g.add(frame);

    // “door window” plane with alpha PNG
    const doorPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.9), mat.door);
    doorPlane.position.set(0.34, 1.55, 0);
    doorPlane.rotation.y = Math.PI / 2;
    g.add(doorPlane);

    // neon header sign
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.65),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.45,
        transparent: true,
        opacity: 0.92
      })
    );
    sign.position.set(0.36, 3.05, 0);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);

    const signLight = new THREE.PointLight(color, 0.7, 10);
    signLight.position.set(0.8, 2.9, 0);
    g.add(signLight);

    // teleport pad in front
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.02, 0);
    g.add(pad);

    // pulse orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), mat.neonPink);
    orb.position.set(0, 0.12, 0);
    g.add(orb);

    g.userData = { pad, orb, label, color };
    g.position.set(x, 0, z);
    world.group.add(g);

    // collider-ish
    world.colliders.push(frame);

    return g;
  }

  // Left wall: Store
  const storeEntrance = makeEntrance({ label: "STORE", x: -14.2, z: world.tableFocus.z, color: 0xff2d7a });
  storeEntrance.rotation.y = 0; // faces inward already with plane rotated

  // Right wall: Poker Room
  const pokerEntrance = makeEntrance({ label: "POKER ROOM", x: 14.2, z: world.tableFocus.z, color: 0x7fe7ff });
  pokerEntrance.rotation.y = Math.PI; // mirror side

  // ---------------- DAILY GIVEAWAY TABLE ----------------
  function addGiveawayTable(x, z) {
    const g = new THREE.Group();
    g.name = "DailyGiveawayTable";

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.10, 22), mat.trim);
    top.position.y = 0.82;
    g.add(top);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.26, 0.72, 18), mat.metal);
    stem.position.y = 0.41;
    g.add(stem);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 18), mat.metal);
    foot.position.y = 0.06;
    g.add(foot);

    // claim pad
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 56),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.88, 0);
    g.add(pad);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffcc00,
        emissiveIntensity: 1.0,
        roughness: 0.25
      })
    );
    gem.position.set(0, 1.06, 0);
    g.add(gem);

    // HUD (hidden unless gaze)
    const hud = makeHudPlane((ctx, c) => {
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(0,0,0,0.60)";
      roundRect(ctx, 40, 44, c.width-80, c.height-88, 30, true);

      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 58px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DAILY CLAIM", c.width/2, 104);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px Arial";
      ctx.fillText("+$2,500 CHIPS", c.width/2, 172);
    }, 2.1, 0.85);

    hud.position.set(0, 1.75, 0);
    hud.visible = false;
    g.add(hud);

    g.userData = { pad, gem, hud };
    g.position.set(x, 0, z);
    world.group.add(g);

    world.colliders.push(top);
    return g;
  }

  const giveaway = addGiveawayTable(-9.5, 9.2);
  world.giveaway.table = giveaway;
  world.giveaway.pad = giveaway.userData.pad;
  world.giveaway.hud = giveaway.userData.hud;

  // ---------------- OPTIONAL: TELEPORT MACHINE (your module if present) ----------------
  try {
    const tm = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (tm?.TeleportMachine?.build) {
      world.teleportModule = tm;
      const tele = tm.TeleportMachine.build({ THREE, scene: world.group, log });
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

  // ---------------- OPTIONAL: BOTS ----------------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      await botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y }
      });

      // Feed player rig into bots (for avoidance)
      if (botsMod.Bots.setPlayerRig) {
        // will be set in connect() too, but safe
        botsMod.Bots.setPlayerRig(world._playerRig, world._camera);
      }

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => {
        prev(dt);
        try {
          if (world._playerRig && botsMod.Bots.setPlayerRig) botsMod.Bots.setPlayerRig(world._playerRig, world._camera);
          botsMod.Bots.update(dt);
        } catch {}
      };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------------- WORLD TICK (animations + gaze HUD) ----------------
  const raycaster = new THREE.Raycaster();
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();

  const baseTick = world.tick;
  const vizTick = { t: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    vizTick.t += dt;

    // spawn ring pulse
    spawnRing.material.opacity = 0.65 + Math.sin(vizTick.t * 3.0) * 0.18;

    // rail glow pulse
    glowRing.material.emissiveIntensity = 1.25 + Math.sin(vizTick.t * 3.2) * 0.45;

    // fountain water bob
    if (fountain?.userData?.water) {
      fountain.userData.water.position.y = 0.50 + Math.sin(vizTick.t * 1.8) * 0.015;
      fountain.userData.water.material.opacity = 0.50 + Math.sin(vizTick.t * 2.0) * 0.05;
    }

    // Entrance pad pulses
    for (const e of [storeEntrance, pokerEntrance]) {
      if (!e?.userData?.pad) continue;
      e.userData.pad.material.opacity = 0.62 + Math.sin(vizTick.t * 3.5) * 0.18;
      if (e.userData.orb) {
        e.userData.orb.position.y = 0.12 + Math.sin(vizTick.t * 2.4) * 0.05;
      }
    }

    // Giveaway gem spin
    if (world.giveaway?.table?.userData?.gem) {
      world.giveaway.table.userData.gem.rotation.y += dt * 1.2;
      world.giveaway.table.userData.pad.material.opacity = 0.65 + Math.sin(vizTick.t * 3.0) * 0.18;
    }

    // Billboard table HUD state to player camera (so it always faces you)
    const cam = world._camera;
    if (cam && world.viz.tableHudState) {
      cam.getWorldPosition(tmpPos);
      world.viz.tableHudState.lookAt(tmpPos.x, world.viz.tableHudState.position.y, tmpPos.z);
    }

    // GAZE HUD: show giveaway HUD only when you look at it
    if (cam && world.giveaway?.hud && world.giveaway?.table) {
      cam.getWorldPosition(tmpPos);
      cam.getWorldDirection(tmpDir);
      raycaster.set(tmpPos, tmpDir);
      raycaster.far = 6.0;

      const hits = raycaster.intersectObject(world.giveaway.table, true);
      const looking = !!(hits && hits.length);

      world.giveaway.hud.visible = looking;
      if (looking) {
        // subtle hover
        world.giveaway.hud.position.y = 1.75 + Math.sin(vizTick.t * 2.2) * 0.03;
      }
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
      }
