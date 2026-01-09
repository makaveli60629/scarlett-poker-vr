// /js/world.js — Scarlett Poker VR WORLD v11.2 (BIGGER ROOM + DOORS + PADS + SOLID)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> returns world object

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // doubled room size (and used for player clamp)
    roomClamp: { minX: -15.5, maxX: 15.5, minZ: -28.5, maxZ: 15.5 },

    // metrics so other modules can align
    metrics: { tableY: 0.92, seatY: 0.52 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    // interactables (pads, etc.)
    interactables: [],

    // info for HUD
    game: { tableName: "$10,000 Table", pot: 0, turn: "—", phase: "Waiting" },

    // hooks
    connect() {},
    tick(dt) {}
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
    // floor
    tile: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [8, 8], srgb: true }),

    // walls: user requested this exact file
    wall: await loadTex("./assets/textures/1767279790736.jpg", { repeat: [6, 3], srgb: true }),

    // doors (same png can be used for both; you said you’ll use both names)
    doorStore: await loadTex("./assets/textures/door_store.png", { srgb: true }),
    doorPoker: await loadTex("./assets/textures/door_poker.png", { srgb: true }),
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x101018,
      roughness: 0.95,
      map: T.tile || null,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x151a2a,
      roughness: 0.95,
      map: T.wall || null,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x0d0f16,
      roughness: 0.65,
      metalness: 0.15,
    }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88
    }),
    neonPink: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      emissive: 0xff2d7a,
      emissiveIntensity: 1.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.9
    }),
    door: (tex) => new THREE.MeshStandardMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0x222233,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    })
  };

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(10, 18, 10);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 0.95, 50);
  fill.position.set(0, 3.2, 2.0);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 1.05, 50);
  purple.position.set(0, 3.2, 6.8);
  world.group.add(purple);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.18));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 90), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  floor.receiveShadow = false;
  world.group.add(floor);
  world.floor = floor;

  // ---------- WALLS (solid) ----------
  // room bounds: x in [-16,16], z in [-29,16]
  const wallH = 7.2;

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);

    // trim
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d + 0.02), mat.trim);
    t.position.set(x, 0.09, z);
    world.group.add(t);

    return m;
  };

  // back/front
  mkWall(32, wallH, 0.35, 0, wallH / 2, -29);
  mkWall(32, wallH, 0.35, 0, wallH / 2, 16);

  // left/right
  mkWall(0.35, wallH, 45, -16, wallH / 2, -6.5);
  mkWall(0.35, wallH, 45, 16, wallH / 2, -6.5);

  // ---------- TABLE ----------
  const TABLE_Y = world.metrics.tableY;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.65, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.18, 18, 90), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

  // table stand (so it’s not floating)
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.95, 0.82, 24), mat.metalDark);
  pedestal.position.y = TABLE_Y - 0.50;
  pedestal.name = "TablePedestal";
  table.add(pedestal);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.10, 30), mat.metalDark);
  base.position.y = 0.05;
  base.name = "TableBase";
  table.add(base);

  // ---------- RAILS (solid ring) ----------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.85;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.065, 12, 120), mat.metalDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.80;
  rails.add(ring);

  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.020, 10, 160), mat.holo);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.86;
  rails.add(glowRing);

  // ---------- CHAIRS + SEATS (6-max + 1 player seat extra = seat 0) ----------
  function makeChair() {
    const g = new THREE.Group();
    g.name = "Chair";

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 18), mat.chairSeat);
    seat.position.y = 0.52;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.66, 0.09), mat.chairFrame);
    back.position.set(0, 0.94, -0.25);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.50, 12), mat.chairFrame);
    leg.position.y = 0.25;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), mat.chairFrame);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.15;
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

  // ---------- TELEPORTER VISUAL (always exists) ----------
  const tele = new THREE.Group();
  tele.name = "TeleportMachineVisual";

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.66, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.02;
  tele.add(ringMesh);

  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 12, 64, Math.PI), mat.neonPink);
  arc.rotation.z = Math.PI;
  arc.position.set(0, 1.12, 0);
  tele.add(arc);

  tele.position.set(0, 0, 3.6);
  world.group.add(tele);
  world.teleporter = tele;

  // ---------- DOORS + PADS (STORE / POKER ROOM) ----------
  // Put them on opposite sides, near middle of the wall
  function makeDoor({ name, z, label, tex, padColor = 0x7fe7ff, targetPos }) {
    const g = new THREE.Group();
    g.name = name;

    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.4, 0.28), mat.trim);
    frame.position.set(0, 2.7, z);
    world.group.add(frame);

    // door plane
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 5.0), mat.door(tex));
    door.position.set(0, 2.55, z + 0.17);
    door.name = name + "_Door";
    world.group.add(door);

    // neon label above
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 0.12), mat.neonPink);
    sign.position.set(0, 5.25, z + 0.20);
    sign.name = name + "_Sign";
    world.group.add(sign);

    // teleport pad in front
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.60, 0.86, 64),
      new THREE.MeshBasicMaterial({ color: padColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.03, z - (z > 0 ? 2.0 : -2.0));
    pad.name = name + "_Pad";
    world.group.add(pad);

    // interactable
    pad.userData.action = {
      type: "teleport",
      target: targetPos || new THREE.Vector3(0, 0, 3.6),
      label: label || name
    };

    world.interactables.push(pad);

    return { door, pad, sign };
  }

  // Poker room door on BACK wall side (near z = -29)
  makeDoor({
    name: "PokerDoor",
    z: -28.5,
    label: "Poker Room",
    tex: T.doorPoker,
    padColor: 0x7fe7ff,
    targetPos: new THREE.Vector3(0, 0, -6.0) // near table
  });

  // Store door on FRONT wall side (near z = +16)
  makeDoor({
    name: "StoreDoor",
    z: 15.5,
    label: "Store",
    tex: T.doorStore,
    padColor: 0xff2d7a,
    targetPos: new THREE.Vector3(10, 0, 8) // store corner
  });

  // ---------- SIMPLE STORE KIOSK (corner) ----------
  const kiosk = new THREE.Group();
  kiosk.name = "StoreKiosk";
  kiosk.position.set(10, 0, 8);
  world.group.add(kiosk);

  const kBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.0), mat.metalDark);
  kBase.position.y = 0.55;
  kiosk.add(kBase);

  const kTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.10, 2.1), mat.holo);
  kTop.position.y = 1.12;
  kiosk.add(kTop);

  // mannequin near kiosk
  const mannequin = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.10, 10, 16), mat.trim);
  mannequin.position.set(11.8, 1.0, 7.0);
  mannequin.name = "Mannequin";
  world.group.add(mannequin);

  // guard at rails
  const guard = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.05, 10, 16), mat.metalDark);
  guard.position.set(world.tableFocus.x + 4.8, 0.95, world.tableFocus.z + 0.2);
  guard.name = "RailGuard";
  world.group.add(guard);

  // ---------- WORLD TICK ----------
  const viz = { t: 0 };
  world.tick = (dt) => {
    viz.t += dt;

    // pulse rail glow
    glowRing.material.emissiveIntensity = 1.05 + Math.sin(viz.t * 3.5) * 0.40;

    // pulse teleporter ring
    ringMesh.material.opacity = 0.68 + Math.sin(viz.t * 4.2) * 0.18;
  };

  L("[world] ready ✅ seats=" + world.seats.length + " interact=" + world.interactables.length);
  return world;
    }
