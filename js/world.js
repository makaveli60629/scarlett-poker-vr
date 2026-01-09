// /js/world.js — Scarlett Poker VR WORLD v11.0 (Lobby + Doors + Pads + Solid Colliders)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> returns world object

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  L("[world] init v=" + v);

  // ------------------------------------------------------------
  // WORLD STATE
  // ------------------------------------------------------------
  const world = {
    v,
    group: new THREE.Group(),

    // center of the lobby poker table (grand table)
    tableFocus: new THREE.Vector3(0, 0, -6.5),

    // where player spawns (you said: spawn on teleport circle)
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],

    // used for walkers
    lobbyZone: { min: new THREE.Vector3(-10, 0, -1), max: new THREE.Vector3(10, 0, 12) },

    // clamp movement (your controls may clamp later; still handy)
    roomClamp: { minX: -12.6, maxX: 12.6, minZ: -22.6, maxZ: 12.6 },

    // surfaces
    floor: null,
    table: null,
    chairs: [],
    seats: [],

    // colliders
    colliders: [],
    railCollider: null,
    tableCollider: null,

    // door system
    doors: {
      poker: null,
      store: null
    },
    pads: {
      poker: null,
      store: null,
      spawn: null
    },

    // kiosk/display
    storeKiosk: null,

    // modules
    teleporter: null,
    teleportModule: null,
    bots: null,

    // poker viz refs (temp)
    viz: {
      communityCards: [],
      potStack: null,
      dealerButton: null,
      tableHud: null,
      tableHud2: null
    },

    // connect from main (playerRig + controllers)
    connect({ playerRig, camera, controllers }) {
      // attach teleport machine if it supports connect
      try {
        if (world.teleportModule?.TeleportMachine?.connect) {
          world.teleportModule.TeleportMachine.connect({ playerRig, controllers });
          L("[world] TeleportMachine connected ✅");
        }
      } catch (e) {
        L("[world] TeleportMachine connect failed:", e?.message || e);
      }

      // bind player to bots (tag billboarding + avoid player)
      try {
        if (world.bots?.setPlayerRig) {
          world.bots.setPlayerRig(playerRig, camera || null);
          L("[world] bots setPlayerRig ✅");
        }
      } catch (e) {
        L("[world] bots setPlayerRig failed:", e?.message || e);
      }
    },

    tick: (dt) => {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------------------------------------------------
  // TEXTURE LOADER
  // ------------------------------------------------------------
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
            t.anisotropy = 4;
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

  // ------------------------------------------------------------
  // TEXTURES (use your wall jpg path)
  // ------------------------------------------------------------
  const T = {
    // floor tile you already used before (or swap later)
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),

    // wall: user requested this specifically
    wall: await loadTex("./assets/textures/1767279790736.jpg", { repeat: [3, 1.5], srgb: true }),

    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),

    felt: await loadTex("./assets/textures/table_felt_green.jpg", { srgb: true }),

    // doors (transparent png)
    doorStore: await loadTex("./assets/textures/doors/door_store.png", { srgb: true }),
    doorPoker: await loadTex("./assets/textures/doors/door_poker.png", { srgb: true })
  };

  // ------------------------------------------------------------
  // MATERIALS
  // ------------------------------------------------------------
  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x0f1018,
      roughness: 0.95,
      metalness: 0.0,
      map: T.floor || null
    }),

    wall: new THREE.MeshStandardMaterial({
      color: 0x141826,
      roughness: 0.95,
      metalness: 0.0,
      map: T.wall || null
    }),

    ceiling: new THREE.MeshStandardMaterial({
      color: 0x070812,
      roughness: 0.92,
      metalness: 0.0,
      map: T.ceiling || null,
      side: THREE.BackSide
    }),

    felt: new THREE.MeshStandardMaterial({
      color: 0x0f5d3a,
      roughness: 0.92,
      metalness: 0.0,
      map: T.felt || null
    }),

    rim: new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),

    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),

    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),

    // neon / holo
    holoAqua: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.35,
      roughness: 0.22,
      transparent: true,
      opacity: 0.88
    }),
    holoPink: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      emissive: 0xff2d7a,
      emissiveIntensity: 1.0,
      roughness: 0.22,
      transparent: true,
      opacity: 0.86
    }),

    // door planes (alpha)
    doorStore: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: T.doorStore || null,
      transparent: true,
      alphaTest: 0.25,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x1a0b12,
      emissiveIntensity: 0.25
    }),
    doorPoker: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: T.doorPoker || null,
      transparent: true,
      alphaTest: 0.25,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x08121a,
      emissiveIntensity: 0.28
    }),

    // poker viz placeholders
    card: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
    chip: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x1a0010,
      emissiveIntensity: 0.22
    })
  };

  // ------------------------------------------------------------
  // LIGHTING (more elegant + bright)
  // ------------------------------------------------------------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(10, 16, 8);
  world.group.add(key);

  // ceiling “ring” lights
  const ceilingRing = new THREE.Group();
  ceilingRing.name = "CeilingLights";
  world.group.add(ceilingRing);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.PointLight(0x7fe7ff, 0.45, 18);
    p.position.set(Math.cos(a) * 6.5, 4.6, -6.5 + Math.sin(a) * 6.5);
    ceilingRing.add(p);
  }

  const purple = new THREE.PointLight(0xb46bff, 0.75, 26);
  purple.position.set(0, 3.1, 2.8);
  world.group.add(purple);

  const pink = new THREE.PointLight(0xff2d7a, 0.55, 18);
  pink.position.set(0, 2.5, -6.5);
  world.group.add(pink);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.18));

  // ------------------------------------------------------------
  // FLOOR (solid)
  // ------------------------------------------------------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  floor.receiveShadow = true;
  world.group.add(floor);
  world.floor = floor;
  world.colliders.push(floor);

  // ------------------------------------------------------------
  // ROOM (twice as big)
  // ------------------------------------------------------------
  const wallH = 7.0;
  const roomW = 26.0;
  const roomD = 34.0;

  function mkWall(w, h, d, x, y, z, name) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = name || "Wall";
    world.group.add(m);
    world.colliders.push(m);
    return m;
  }

  // Back wall (behind table)
  const backZ = -22;
  const frontZ = 12;
  const leftX = -13;
  const rightX = 13;

  mkWall(roomW, wallH, 0.35, 0, wallH / 2, backZ, "WallBack");
  mkWall(roomW, wallH, 0.35, 0, wallH / 2, frontZ, "WallFront");
  mkWall(0.35, wallH, roomD, leftX, wallH / 2, (backZ + frontZ) / 2, "WallLeft");
  mkWall(0.35, wallH, roomD, rightX, wallH / 2, (backZ + frontZ) / 2, "WallRight");

  // Ceiling dome + trims
  const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 22), mat.ceiling);
  dome.position.set(0, 8.2, -6.5);
  dome.scale.set(1.2, 0.9, 1.2);
  dome.name = "CeilingDome";
  world.group.add(dome);

  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(11.0, 0.12, 16, 120),
    mat.metalDark
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.set(0, 6.2, -6.5);
  world.group.add(trim);

  const trimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(11.0, 0.04, 10, 140),
    mat.holoAqua
  );
  trimGlow.rotation.x = Math.PI / 2;
  trimGlow.position.set(0, 6.25, -6.5);
  world.group.add(trimGlow);

  // ------------------------------------------------------------
  // SPAWN PAD (you spawn here)
  // ------------------------------------------------------------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.48, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);
  world.pads.spawn = spawnRing;

  // ------------------------------------------------------------
  // TABLE (with real “surface height” reference)
  // ------------------------------------------------------------
  const TABLE_Y = 0.92;     // felt top surface height
  const TABLE_RADIUS = 2.65;

  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  // Felt top
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  // Rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(TABLE_RADIUS, 0.18, 18, 90), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  rim.name = "TableRim";
  table.add(rim);

  // Table base / stand (so it doesn't float)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.85, 28), mat.metalDark);
  base.position.y = 0.42;
  base.name = "TableBase";
  table.add(base);

  // Invisible collider for table body
  const tableCol = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS + 0.15, TABLE_RADIUS + 0.15, 1.25, 40),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 })
  );
  tableCol.position.y = 0.62;
  tableCol.name = "TableCollider";
  table.add(tableCol);
  world.tableCollider = tableCol;
  world.colliders.push(tableCol);

  // ------------------------------------------------------------
  // RAILS (solid ring collider + glow)
  // ------------------------------------------------------------
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

  const railRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.05, 10, 100), mat.metalDark);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.62;
  rails.add(railRing);

  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.018, 10, 140), mat.holoAqua);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

  // solid rail collider (invisible)
  const railCol = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.22, 10, 120),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0 })
  );
  railCol.rotation.x = Math.PI / 2;
  railCol.position.y = 0.58;
  railCol.name = "RailCollider";
  table.add(railCol);
  world.railCollider = railCol;
  world.colliders.push(railCol);

  // ------------------------------------------------------------
  // POKER VIZ (placeholders: chips + dealer button + community cards)
  // ------------------------------------------------------------
  // community cards (hover + face player) are handled by main/dealingMix,
  // but we keep stable anchors here so they are centered correctly.
  const commAnchor = new THREE.Object3D();
  commAnchor.name = "CommunityAnchor";
  commAnchor.position.set(0, TABLE_Y + 0.22, 0.0); // higher
  table.add(commAnchor);

  const cardW = 0.28, cardH = 0.40;
  const cardGeo = new THREE.PlaneGeometry(cardW, cardH);

  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(cardGeo, mat.card);
    card.name = "CommunityCard_" + i;
    card.position.set(-0.70 + i * 0.35, 0.0, 0.0);
    card.rotation.x = 0; // will face player in tick
    card.scale.setScalar(1.0);
    commAnchor.add(card);
    world.viz.communityCards.push(card);
  }

  // pot stack (flat + centered)
  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(0, TABLE_Y + 0.02, 0);
  table.add(pot);
  world.viz.potStack = pot;

  const chipGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.012, 22);
  for (let i = 0; i < 18; i++) {
    const chip = new THREE.Mesh(chipGeo, mat.chip);
    chip.rotation.x = 0;          // ✅ flat (no sideways)
    chip.position.set((Math.random() - 0.5) * 0.14, i * 0.012, (Math.random() - 0.5) * 0.14);
    pot.add(chip);
  }

  // dealer button (flat)
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 28), mat.holoPink);
  dealerBtn.rotation.x = 0; // ✅ flat
  dealerBtn.position.set(0.60, TABLE_Y + 0.02, -0.30);
  table.add(dealerBtn);
  world.viz.dealerButton = dealerBtn;

  // ------------------------------------------------------------
  // CHAIRS + SEATS (rotate correctly toward table)
  // ------------------------------------------------------------
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

    const chair = makeChair();
    chair.position.copy(chairPos);

    // IMPORTANT: our chair model's "front" is +Z (because back is at -Z)
    // lookAt makes -Z face the target, so we flip 180°.
    chair.lookAt(c.x, chair.position.y, c.z);
    chair.rotation.y += Math.PI;

    chair.name = "Chair_" + i;
    world.group.add(chair);
    world.chairs.push(chair);
    world.colliders.push(chair); // chairs solid enough for collision later

    // SeatAnchor (authoritative)
    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = "SeatAnchor_" + i;
    seatAnchor.position.set(0, SEAT_SURFACE_Y, 0.18);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    // compute yaw from chair orientation
    const yaw = chair.rotation.y;

    world.seats.push({
      index: i,
      position: seatPos,
      yaw,
      sitY: SEAT_SURFACE_Y,
      lookAt: c.clone(),
      anchor: seatAnchor
    });
  }

  // ------------------------------------------------------------
  // DOORS ON LEFT + RIGHT (NOT FRONT/BACK)
  // ------------------------------------------------------------
  function makeDoorway({ name, x, z, matDoor, glowColor = 0x7fe7ff, signText = "DOOR" }) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, 0, z);
    world.group.add(g);

    // frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x10131c,
      roughness: 0.6,
      metalness: 0.2
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.30), frameMat);
    frame.position.y = 1.6;
    g.add(frame);

    // inner cutout look (visual)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.85, 0.18), new THREE.MeshStandardMaterial({
      color: 0x070913,
      emissive: glowColor,
      emissiveIntensity: 0.12,
      roughness: 0.8,
      metalness: 0.0
    }));
    inner.position.y = 1.55;
    g.add(inner);

    // door plane (transparent png)
    const doorPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 2.75), matDoor);
    doorPlane.position.set(0, 1.55, 0.17);
    g.add(doorPlane);

    // neon border
    const neon = new THREE.Mesh(new THREE.BoxGeometry(2.10, 2.95, 0.06), new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.15,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85
    }));
    neon.position.set(0, 1.55, 0.14);
    g.add(neon);

    // small sign bar above door
    const sign = makeTextBillboard(signText, glowColor);
    sign.position.set(0, 3.25, 0.12);
    g.add(sign);

    // make it face inward
    if (x < 0) {
      // left wall -> face to the right (+X)
      g.rotation.y = Math.PI / 2;
    } else {
      // right wall -> face to the left (-X)
      g.rotation.y = -Math.PI / 2;
    }

    // collider (invisible)
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 3.4, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 })
    );
    col.position.y = 1.6;
    g.add(col);
    world.colliders.push(col);

    return g;
  }

  function makeTextBillboard(text, glowColor) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 40, 45, 944, 166, 40, true);

    ctx.font = "900 92px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 512, 128);

    // glow stroke
    ctx.lineWidth = 16;
    ctx.strokeStyle = "rgba(127,231,255,0.35)";
    ctx.strokeText(text, 512, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;

    const m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), m);
    plane.renderOrder = 200;
    plane.userData.billboard = true;
    plane.userData.glow = glowColor;
    return plane;

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
  }

  // Put doors near middle walls (left/right), slightly forward from table center
  const doorZ = -6.0;

  world.doors.poker = makeDoorway({
    name: "DoorPoker",
    x: leftX + 0.22,
    z: doorZ,
    matDoor: mat.doorPoker,
    glowColor: 0x7fe7ff,
    signText: "SCORPION ROOM"
  });

  world.doors.store = makeDoorway({
    name: "DoorStore",
    x: rightX - 0.22,
    z: doorZ,
    matDoor: mat.doorStore,
    glowColor: 0xff2d7a,
    signText: "STORE"
  });

  // ------------------------------------------------------------
  // TELEPORT PADS (glowing rings in front of doors)
  // ------------------------------------------------------------
  function makePad(name, x, z, color) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 70),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.02, z);
    ring.name = name;
    world.group.add(ring);

    // small pillar “target”
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.35 })
    );
    p.position.set(x, 0.12, z);
    p.name = name + "_Pillar";
    world.group.add(p);

    ring.userData.target = new THREE.Vector3(x, 0, z);
    ring.userData.pulseT = 0;
    ring.userData.color = color;
    return ring;
  }

  // pads positioned a bit inward from the walls, in front of the door face
  world.pads.poker = makePad("PadPoker", -10.8, doorZ, 0x7fe7ff);
  world.pads.store = makePad("PadStore",  10.8, doorZ, 0xff2d7a);

  // ------------------------------------------------------------
  // STORE KIOSK + GLASS DISPLAY + MANNEQUIN (near store door)
  // ------------------------------------------------------------
  const storeKiosk = new THREE.Group();
  storeKiosk.name = "StoreKiosk";
  storeKiosk.position.set(7.8, 0, -2.8);
  world.group.add(storeKiosk);
  world.storeKiosk = storeKiosk;

  // counter
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0f1320, roughness: 0.6, metalness: 0.12 })
  );
  counter.position.set(0, 0.5, 0);
  storeKiosk.add(counter);
  world.colliders.push(counter);

  // glass display wall (like a showroom)
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.8, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      metalness: 0.0,
      emissive: 0x2bd7ff,
      emissiveIntensity: 0.15
    })
  );
  glass.position.set(0, 1.45, -0.70);
  storeKiosk.add(glass);

  // shelves
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.85 });
  for (let i = 0; i < 3; i++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.40), shelfMat);
    sh.position.set(0, 1.05 + i * 0.35, 0.45);
    storeKiosk.add(sh);
  }

  // simple mannequin placeholder (until your real avatar)
  const mannequin = new THREE.Group();
  mannequin.name = "Mannequin";
  mannequin.position.set(0.0, 0.0, -0.30);
  storeKiosk.add(mannequin);

  const manMat = new THREE.MeshStandardMaterial({ color: 0x202738, roughness: 0.7, metalness: 0.05 });
  const manBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 10, 18), manMat);
  manBody.position.y = 1.05;
  mannequin.add(manBody);

  const manHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), manMat);
  manHead.position.y = 1.55;
  mannequin.add(manHead);

  // ------------------------------------------------------------
  // OPTIONAL: TELEPORT MACHINE module (if you have it)
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // BOTS (safe import)
  // ------------------------------------------------------------
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

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ------------------------------------------------------------
  // WORLD TICK (pulses + billboarding)
  // ------------------------------------------------------------
  const baseTick = world.tick;
  const vizTick = { t: 0 };

  // helper: billboard to camera/player (fallback to scene camera is done in main via bots)
  function billboard(obj, targetPos) {
    if (!obj) return;
    obj.lookAt(targetPos.x, obj.position.y, targetPos.z);
  }

  world.tick = (dt) => {
    baseTick(dt);
    vizTick.t += dt;

    // spawn pulse
    spawnRing.material.opacity = 0.70 + Math.sin(vizTick.t * 3.2) * 0.18;

    // rails glow pulse
    glowRing.material.emissiveIntensity = 1.10 + Math.sin(vizTick.t * 3.5) * 0.38;

    // pads pulse
    for (const pad of [world.pads.poker, world.pads.store]) {
      if (!pad) continue;
      pad.userData.pulseT = (pad.userData.pulseT || 0) + dt;
      pad.material.opacity = 0.65 + Math.sin(pad.userData.pulseT * 3.6) * 0.22;
    }

    // dealer button small orbit (visual only)
    const r = 0.62;
    world.viz.dealerButton.position.x = Math.cos(vizTick.t * 0.6) * r;
    world.viz.dealerButton.position.z = Math.sin(vizTick.t * 0.6) * r;
    world.viz.dealerButton.position.y = TABLE_Y + 0.02;

    // pot pulse
    if (world.viz.potStack) {
      const ps = 1.0 + Math.sin(vizTick.t * 2.5) * 0.02;
      world.viz.potStack.scale.setScalar(ps);
    }

    // keep community cards hovering at correct surface
    if (commAnchor) {
      commAnchor.position.y = TABLE_Y + 0.22 + Math.sin(vizTick.t * 1.8) * 0.01;
    }

    // billboard door signs toward center of room so they read well
    const center = new THREE.Vector3(0, 1.8, -6.5);
    world.doors.poker?.children?.forEach((ch) => {
      if (ch?.userData?.billboard) billboard(ch, center);
    });
    world.doors.store?.children?.forEach((ch) => {
      if (ch?.userData?.billboard) billboard(ch, center);
    });
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
          }
