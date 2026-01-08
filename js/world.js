// /js/world.js — Scarlett Poker VR WORLD v10.8 (ALIGNMENT AUDIT + BIG ROOM)
// No "three" import here. main.js passes THREE in.
// Goals:
// - Hard “audit floor” tile texture (easy to see height issues)
// - Bigger room + stronger lighting
// - Walls feel solid (via controls clamp ranges)
// - Table has a stand (no floating)
// - Community cards are BIG, HOVER, and FACE the player direction
// - Chips are FLAT (not vertical)
// - Keeps TeleportMachine + Bots imports optional + safe

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),

    // “center of show” table focus
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // spawn pad (in front of teleporter)
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],

    // Bigger room clamp (controls.js uses this to prevent walking through walls)
    roomClamp: { minX: -16.0, maxX: 16.0, minZ: -26.0, maxZ: 12.0 },

    // Lobby zone for walkers/observers
    lobbyZone: { min: new THREE.Vector3(-14, 0, 2), max: new THREE.Vector3(14, 0, 11) },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    viz: {
      communityCards: [],
      potStack: null,
      dealerButton: null,
      headerSign: null
    },

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

  // IMPORTANT: Put this file in /assets/textures/
  // /assets/textures/scarlett_floor_tile_seamless.png
  const T = {
    floorTile: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [10, 10], srgb: true }),
    brick: await loadTex("./assets/textures/brickwall.jpg", { repeat: [5, 2], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("./assets/textures/table_felt_green.jpg", { srgb: true }),
    cardBack: await loadTex("./assets/textures/cards/scarlett_card_back_512.jpg", { srgb: true })
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: 0.95, map: T.floorTile || null }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95, map: T.brick || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, map: T.ceiling || null, side: THREE.BackSide }),

    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null }),
    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.8, metalness: 0.18 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),

    card: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.0,
      emissive: 0x101010,
      emissiveIntensity: 0.25,
      map: T.cardBack || null,
      side: THREE.DoubleSide
    }),

    chip: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.28,
      metalness: 0.15,
      emissive: 0x220010,
      emissiveIntensity: 0.32
    }),

    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.25,
      roughness: 0.18,
      transparent: true,
      opacity: 0.85
    })
  };

  // ---------- LIGHTING (BRIGHTER) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(10, 16, 8);
  world.group.add(key);

  const fillA = new THREE.PointLight(0x7fe7ff, 1.05, 60);
  fillA.position.set(0, 3.4, 0.0);
  world.group.add(fillA);

  const fillB = new THREE.PointLight(0xff2d7a, 0.65, 55);
  fillB.position.set(-6, 3.0, -8);
  world.group.add(fillB);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.24));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  floor.receiveShadow = false;
  world.group.add(floor);
  world.floor = floor;

  // ---------- WALLS (BIGGER ROOM) ----------
  const wallH = 7.5;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    world.group.add(m);
    return m;
  };

  // Room bounds match roomClamp: X [-16,16], Z [-26,12]
  mkWall(34, wallH, 0.4, 0, wallH / 2, -26); // back
  mkWall(34, wallH, 0.4, 0, wallH / 2, 12);  // front
  mkWall(0.4, wallH, 38, -16, wallH / 2, -7); // left
  mkWall(0.4, wallH, 38, 16, wallH / 2, -7);  // right

  // ---------- CEILING ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(26, 36, 24), mat.ceiling);
  dome.position.set(0, 10.0, -8.0);
  dome.scale.set(1.25, 0.75, 1.25);
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

  // ---------- TABLE (WITH STAND) ----------
  const TABLE_Y = 0.92;  // felt height (authoritative for dealing + chips)
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

  // Table stand + base (fix floating look)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.80, 18), mat.metalDark);
  stem.position.y = 0.42;
  stem.name = "TableStem";
  table.add(stem);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.10, 24), mat.metalDark);
  base.position.y = 0.05;
  base.name = "TableBase";
  table.add(base);

  // ---------- RAILS ----------
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
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

  // ---------- HEADER SIGN (above table) ----------
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 1024;
  signCanvas.height = 256;
  const sctx = signCanvas.getContext("2d");
  function redrawSign(textTop, textBottom) {
    sctx.clearRect(0, 0, signCanvas.width, signCanvas.height);
    sctx.fillStyle = "rgba(0,0,0,0.55)";
    sctx.fillRect(0, 0, signCanvas.width, signCanvas.height);
    sctx.strokeStyle = "rgba(127,231,255,0.40)";
    sctx.lineWidth = 10;
    sctx.strokeRect(10, 10, signCanvas.width - 20, signCanvas.height - 20);

    sctx.fillStyle = "#e8ecff";
    sctx.font = "bold 70px Arial";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText(textTop, 512, 92);

    sctx.fillStyle = "#7fe7ff";
    sctx.font = "bold 44px Arial";
    sctx.fillText(textBottom, 512, 170);
  }
  redrawSign("Scarlett VR Poker — 6-Max", "AUDIT MODE: FLOOR/TABLE ALIGN");

  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.needsUpdate = true;
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), signMat);
  sign.position.set(0, TABLE_Y + 2.6, 0);
  sign.rotation.y = Math.PI; // face toward player at +Z
  sign.name = "HeaderSign";
  table.add(sign);
  world.viz.headerSign = sign;

  // ---------- COMMUNITY CARDS (BIG + HOVER + FACE PLAYER) ----------
  // (Temporary visual. DealingMix can replace later.)
  const cardW = 0.62, cardH = 0.88;
  const cardGeo = new THREE.PlaneGeometry(cardW, cardH);

  const COMM_Y = TABLE_Y + 0.70;  // high hover so you can SEE it
  const COMM_Z = -0.20;          // slightly toward dealer side
  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(cardGeo, mat.card);
    card.name = "CommunityCard_" + i;

    // FACE player at +Z: plane “front” points +Z, so rotate Y=PI
    card.rotation.set(0, Math.PI, 0);
    card.position.set(-1.55 + i * 0.78, COMM_Y, COMM_Z);

    // small float animation starts visible
    card.scale.setScalar(1.0);
    table.add(card);
    world.viz.communityCards.push(card);
  }

  // ---------- POT CHIPS (FLAT) ----------
  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(0, TABLE_Y + 0.02, 0.35);
  table.add(pot);
  world.viz.potStack = pot;

  // flat chips: cylinder axis is Y, so do NOT rotate X.
  const chipGeo = new THREE.CylinderGeometry(0.070, 0.070, 0.014, 22);
  for (let i = 0; i < 18; i++) {
    const chip = new THREE.Mesh(chipGeo, mat.chip);
    chip.position.set((Math.random() - 0.5) * 0.18, 0.007 + i * 0.012, (Math.random() - 0.5) * 0.18);
    pot.add(chip);
  }

  // Dealer button (flat puck on table)
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.020, 28), mat.holo);
  dealerBtn.position.set(0.65, TABLE_Y + 0.02, -0.55);
  dealerBtn.name = "DealerButton";
  table.add(dealerBtn);
  world.viz.dealerButton = dealerBtn;

  // ---------- CHAIRS + SEATS (authoritative seat height) ----------
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

    // SeatAnchor: where pelvis “butt” should land
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
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y }
      });

      world.bots = botsMod.Bots;

      // If bots supports setPlayerRig, hook it lazily (main calls bots.setPlayerRig too)
      try {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };
      } catch {}

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- WORLD TICK (VISUAL ANIM) ----------
  const baseTick = world.tick;
  const viz = { t: 0, dealerSeat: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    viz.t += dt;

    // Spawn ring pulse
    spawnRing.material.opacity = 0.65 + Math.sin(viz.t * 3.0) * 0.18;

    // Rail glow pulse
    glowRing.material.emissiveIntensity = 1.25 + Math.sin(viz.t * 3.5) * 0.35;

    // Community hover float
    for (let i = 0; i < world.viz.communityCards.length; i++) {
      const card = world.viz.communityCards[i];
      card.position.y = COMM_Y + Math.sin(viz.t * 2.0 + i) * 0.03;
      // keep facing player direction
      card.rotation.y = Math.PI;
    }

    // Dealer button moves seat-to-seat (not orbit spin)
    // We “snap” every 2 seconds
    if (Math.floor(viz.t / 2.0) !== Math.floor((viz.t - dt) / 2.0)) {
      viz.dealerSeat = (viz.dealerSeat + 1) % 6;
    }
    const s = world.seats[viz.dealerSeat];
    if (s && world.viz.dealerButton) {
      // place dealer button on table edge near that seat, inward a bit
      const inward = new THREE.Vector3(world.tableFocus.x - s.position.x, 0, world.tableFocus.z - s.position.z)
        .normalize().multiplyScalar(0.70);
      world.viz.dealerButton.position.set(
        s.position.x + inward.x,
        TABLE_Y + 0.02,
        s.position.z + inward.z
      );
    }

    // Pot pulse
    if (world.viz.potStack) {
      const ps = 1.0 + Math.sin(viz.t * 2.4) * 0.03;
      world.viz.potStack.scale.setScalar(ps);
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
         }
