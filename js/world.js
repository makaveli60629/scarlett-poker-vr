// /js/world.js — Scarlett Poker VR WORLD v11.0 (Floor-First, Solid, Bigger Room)
// main.js passes THREE in.

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // BIGGER ROOM clamp (twice-ish)
    roomClamp: { minX: -16.0, maxX: 16.0, minZ: -26.0, maxZ: 14.0 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    // Visual HUD objects in-world
    viz: {
      commAnchor: null,
      joinButton: null,
      topBillboard: null,
    },

    // optional modules
    teleportModule: null,
    teleporter: null,
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

    // called when user presses “action” in Controls
    onAction({ player, camera } = {}) {
      // If near join button, snap to seat 0
      try {
        if (!world.viz.joinButton) return;
        const p = player?.position || camera?.position;
        if (!p) return;

        const jp = new THREE.Vector3();
        world.viz.joinButton.getWorldPosition(jp);
        const d = jp.distanceTo(new THREE.Vector3(p.x, 0, p.z));
        if (d < 1.0 && world.seats[0]) {
          const s = world.seats[0];
          player.position.set(s.position.x, 0, s.position.z + 0.20);
          player.rotation.y = s.yaw;
          window.dispatchEvent(new Event("scarlett-recenter"));
          L("[world] join seat ✅");
        }
      } catch {}
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
    // Floor: your new tile grid
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 9], srgb: true }),
    brick: await loadTex("./assets/textures/brickwall.jpg", { repeat: [4, 2], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("./assets/textures/table_felt_green.jpg", { srgb: true }),
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95, map: T.floor || null }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95, map: T.brick || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, map: T.ceiling || null, side: THREE.BackSide }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null }),
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
      opacity: 0.85
    }),
  };

  // ---------- LIGHTING (BOOSTED) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(10, 18, 8);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 1.05, 38);
  fill.position.set(0, 3.2, 1.0);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 1.10, 42);
  purple.position.set(0, 3.5, 4.6);
  world.group.add(purple);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.28));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------- SOLID WALLS (BIGGER ROOM) ----------
  const wallH = 7.2;
  const thickness = 0.35;

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  };

  // Room extents
  const minX = world.roomClamp.minX, maxX = world.roomClamp.maxX;
  const minZ = world.roomClamp.minZ, maxZ = world.roomClamp.maxZ;

  // North/South
  mkWall((maxX - minX) + 2, wallH, thickness, 0, wallH / 2, minZ - 1);
  mkWall((maxX - minX) + 2, wallH, thickness, 0, wallH / 2, maxZ + 1);

  // West/East
  mkWall(thickness, wallH, (maxZ - minZ) + 2, minX - 1, wallH / 2, (minZ + maxZ) / 2);
  mkWall(thickness, wallH, (maxZ - minZ) + 2, maxX + 1, wallH / 2, (minZ + maxZ) / 2);

  // ---------- CEILING DOME ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(28, 42, 26), mat.ceiling);
  dome.position.set(0, 10.0, -6);
  dome.scale.set(1.5, 0.9, 1.5);
  dome.name = "CeilingDome";
  world.group.add(dome);

  // ---------- TABLE (with BASE so not floating) ----------
  const TABLE_Y = 0.92;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.1, 0.72, 28),
    new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 0.9 })
  );
  base.position.y = 0.36;
  base.name = "TableBase";
  table.add(base);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

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

  // ---------- JOIN BUTTON (seat 0) ----------
  const join = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 48), mat.holo);
  join.rotation.x = -Math.PI / 2;
  join.position.set(world.seats[0].position.x, 0.02, world.seats[0].position.z + 0.55);
  join.name = "JoinButton";
  world.group.add(join);
  world.viz.joinButton = join;

  // ---------- TOP BILLBOARD (your “always visible” header in-world) ----------
  world.viz.topBillboard = makeTopBillboard(THREE, mat);
  world.viz.topBillboard.position.set(0, 4.8, -4.0);
  world.group.add(world.viz.topBillboard);

  // ---------- TELEPORT MACHINE (optional) ----------
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
    L("[world] ⚠️ teleport_machine.js missing/failed:", e?.message || e);
  }

  // ---------- BOTS (optional) ----------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      await botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y }
      });
      // Let bots billboard to player/camera if they support it
      try { botsMod.Bots.setPlayerRig?.(scene.getObjectByName("PlayerRig"), null); } catch {}
      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };
      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- WORLD TICK ----------
  let t = 0;
  const baseTick = world.tick;
  world.tick = (dt) => {
    baseTick(dt);
    t += dt;

    // join pulse
    if (world.viz.joinButton) {
      world.viz.joinButton.material.opacity = 0.70 + Math.sin(t * 3.2) * 0.18;
      world.viz.joinButton.material.emissiveIntensity = 1.05 + Math.sin(t * 3.2) * 0.25;
    }

    // keep billboard readable
    if (world.viz.topBillboard) {
      // mild float
      world.viz.topBillboard.position.y = 4.8 + Math.sin(t * 0.6) * 0.06;
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
}

function makeTopBillboard(THREE, mat) {
  const g = new THREE.Group();
  g.name = "TopBillboard";

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      emissive: 0x000000,
      roughness: 0.65,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    })
  );
  g.add(panel);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 1.35),
    mat.holo
  );
  glow.position.z = -0.01;
  glow.material.opacity = 0.35;
  g.add(glow);

  return g;
                                                                    }
