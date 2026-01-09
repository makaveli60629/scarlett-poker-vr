// /js/world.js — Scarlett VR Poker WORLD v11.0 (SCORPION ROOM UPGRADE)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> returns world object
//
// Focus:
// - Scorpion Room (poker room) is the main area
// - 6-max table centerpiece
// - Felt pass line + inner betting line
// - Table HUD higher + bigger + no overlap
// - Community cards hover + always face player
// - Progressive reveal: flop -> turn -> river (not all 5 instantly)
// - Bigger rank/suit on card faces
// - Dealer deck near dealer button (face-down)
// - Chips + dealer button sit flat on table
// - Extra lighting, trims, pillars, plants, corner fountain
// - Teleport machine auto-load if teleport_machine.js exists
// - 2 roaming showcase NPCs (male+female) without bots.js import

export async function initWorld({ THREE, scene, log = console.log, v = "1100" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- WORLD ROOT ----------
  const world = {
    v,
    group: new THREE.Group(),

    // Center of poker action (scorpion room)
    tableFocus: new THREE.Vector3(0, 0, -8.0),

    // Spawn pads: spawn you standing up (you sit only when you accept “play” later)
    spawnPads: [new THREE.Vector3(0, 0, 6.0)],

    // Room clamp (bigger room)
    roomClamp: { minX: -18, maxX: 18, minZ: -26, maxZ: 12 },

    // References
    floor: null,
    table: null,
    chairs: [],
    seats: [],

    // UI refs
    ui: {
      skyHud: null,      // high-up “always visible” banner (name/chips/time/crown)
      tableHud: null,    // above table: table type + pot + turn + phase
      turnHud: null,     // above cards: phase + action info
    },

    // Poker viz refs
    viz: {
      communityCards: [],
      holeCards: [],       // optional later
      potStack: null,
      dealerButton: null,
      dealerDeck: null,
    },

    // Teleporter
    teleporter: null,
    teleportModule: null,

    // Showcase NPCs (male/female)
    npcs: [],

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

    // main tick
    tick(dt) {},

    // Optional helpers for teleport targeting
    getTeleportables() {
      const arr = [];
      if (world.floor) arr.push(world.floor);
      // pads/teleporter base can be added later
      return arr;
    }
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

  // User requested wall texture path:
  // assets/textures/1767279790736.jpg for scarlett_wall_seamless.png
  const T = {
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),
    wall:  await loadTex("./assets/textures/1767279790736.jpg", { repeat: [4, 2], srgb: true }),
    ceiling: await loadTex("./assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    cardBack: await loadTex("./assets/textures/cards/scarlett_card_back_512.jpg", { srgb: true }),
  };

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x12131a, roughness: 0.95, metalness: 0.02, map: T.floor || null
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x1a1f2a, roughness: 0.92, metalness: 0.02, map: T.wall || null
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x0f1118, roughness: 0.75, metalness: 0.20
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0x090a10, roughness: 0.9, metalness: 0.02, map: T.ceiling || null, side: THREE.BackSide
    }),
    felt: new THREE.MeshStandardMaterial({
      color: 0x0f5d3a, roughness: 0.92, metalness: 0.02
    }),
    rim: new THREE.MeshStandardMaterial({
      color: 0x22110c, roughness: 0.75, metalness: 0.08
    }),
    metalDark: new THREE.MeshStandardMaterial({
      color: 0x12131a, roughness: 0.6, metalness: 0.25
    }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85
    }),
    chip: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0x1a0010,
      emissiveIntensity: 0.22
    }),
    chipBlue: new THREE.MeshStandardMaterial({
      color: 0x3aa0ff,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0x001122,
      emissiveIntensity: 0.18
    }),
    chipWhite: new THREE.MeshStandardMaterial({
      color: 0xe7e7ef,
      roughness: 0.4,
      metalness: 0.10,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    }),
  };

  // ---------- LIGHTING (NICE + ELEGANT) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x1a2333, 1.4));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(10, 14, 8);
  world.group.add(key);

  const fillAqua = new THREE.PointLight(0x7fe7ff, 0.75, 40);
  fillAqua.position.set(0, 3.8, 3.0);
  world.group.add(fillAqua);

  const fillPink = new THREE.PointLight(0xff2d7a, 0.55, 38);
  fillPink.position.set(0, 3.6, -4.0);
  world.group.add(fillPink);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.18));

  // Ceiling “downlights” ring
  const downlights = new THREE.Group();
  downlights.name = "Downlights";
  world.group.add(downlights);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.PointLight(0xffffff, 0.25, 12);
    p.position.set(Math.cos(a) * 7.5, 6.3, world.tableFocus.z + Math.sin(a) * 7.5);
    downlights.add(p);
  }

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  floor.receiveShadow = false;
  world.group.add(floor);
  world.floor = floor;

  // ---------- ROOM (rounded rectangle feel via pillars + walls) ----------
  const wallH = 7.2;

  function mkWall(w, h, d, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.name = "Wall";
    world.group.add(m);
    return m;
  }

  // Bigger scorpion room
  mkWall(36, wallH, 0.35, 0, wallH / 2, -28); // back
  mkWall(36, wallH, 0.35, 0, wallH / 2, 12);  // front
  mkWall(0.35, wallH, 40, -18, wallH / 2, -8); // left
  mkWall(0.35, wallH, 40,  18, wallH / 2, -8); // right

  // Trim baseboards
  const trim = new THREE.Mesh(new THREE.BoxGeometry(36, 0.22, 0.22), mat.trim);
  trim.position.set(0, 0.11, -28 + 0.20);
  world.group.add(trim);

  // Pillars for elegance
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 6.6, 18);
  for (const px of [-14, 14]) {
    for (const pz of [-24, -8, 8]) {
      const p = new THREE.Mesh(pillarGeo, mat.trim);
      p.position.set(px, 3.3, pz);
      p.name = "Pillar";
      world.group.add(p);
    }
  }

  // ---------- CEILING DOME ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(22, 36, 26), mat.ceiling);
  dome.position.set(0, 7.6, -8);
  dome.scale.set(1.2, 0.85, 1.2);
  dome.name = "CeilingDome";
  world.group.add(dome);

  // Ceiling trim ring
  const ceilTrim = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.12, 16, 96), mat.trim);
  ceilTrim.rotation.x = Math.PI / 2;
  ceilTrim.position.set(0, 6.7, world.tableFocus.z);
  world.group.add(ceilTrim);

  // ---------- DECOR: plants + fountain corner ----------
  function makePlant() {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.35, 18), mat.metalDark);
    pot.position.y = 0.175;
    g.add(pot);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a4b, roughness: 0.85 });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 10), leafMat);
      leaf.position.set((Math.random()-0.5)*0.18, 0.55 + Math.random()*0.15, (Math.random()-0.5)*0.18);
      leaf.rotation.x = -0.2 + (Math.random()-0.5)*0.3;
      leaf.rotation.z = (Math.random()-0.5)*0.4;
      g.add(leaf);
    }
    return g;
  }

  const plantA = makePlant();
  plantA.position.set(-15.5, 0, -24.5);
  world.group.add(plantA);

  const plantB = makePlant();
  plantB.position.set(15.5, 0, -24.5);
  world.group.add(plantB);

  // Corner fountain (simple)
  const fountain = new THREE.Group();
  fountain.name = "CornerFountain";
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.55, 24), mat.trim);
  bowl.position.y = 0.275;
  fountain.add(bowl);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 1.05, 0.10, 24),
    new THREE.MeshStandardMaterial({ color: 0x0b2b3a, roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.75, emissive: 0x001a22, emissiveIntensity: 0.4 })
  );
  water.position.y = 0.47;
  fountain.add(water);
  fountain.position.set(-15.2, 0, 9.5);
  world.group.add(fountain);

  // ---------- SPAWN PAD (stand on this) ----------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.52, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------- TABLE (6-MAX) ----------
  const TABLE_Y = 0.94; // felt height
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  // Table base so it isn't floating
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.6, 28), mat.metalDark);
  base.position.y = 0.30;
  table.add(base);

  // Felt top (with “pass line” texture)
  function makeFeltTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    // Felt base
    ctx.fillStyle = "#0f5d3a";
    ctx.fillRect(0,0,c.width,c.height);

    // subtle noise stripes
    ctx.globalAlpha = 0.08;
    for (let i=0;i<120;i++){
      ctx.fillStyle = i%2? "#0b4a2f":"#136a42";
      ctx.fillRect(0, i*9, c.width, 4);
    }
    ctx.globalAlpha = 1.0;

    // Outer bold “edge line” (white)
    ctx.strokeStyle = "rgba(245,245,255,0.85)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(512, 512, 420, 0, Math.PI*2);
    ctx.stroke();

    // Inner betting line (aqua)
    ctx.strokeStyle = "rgba(127,231,255,0.85)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(512, 512, 330, 0, Math.PI*2);
    ctx.stroke();

    // Pass line label
    ctx.fillStyle = "rgba(127,231,255,0.95)";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PASS LINE", 512, 210);

    // Center logo
    ctx.fillStyle = "rgba(255,45,122,0.92)";
    ctx.font = "900 64px Arial";
    ctx.fillText("SCARLETT VR POKER", 512, 540);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "bold 40px Arial";
    ctx.fillText("6-MAX • SCORPION ROOM", 512, 610);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  const feltMat = mat.felt.clone();
  feltMat.map = makeFeltTexture();

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.18, 72), feltMat);
  felt.position.y = TABLE_Y;
  felt.name = "TableFelt";
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.20, 18, 96), mat.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.10;
  rim.name = "TableRim";
  table.add(rim);

  // ---------- RAILS (glow) ----------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 4.15;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), mat.metalDark);
    post.position.set(Math.cos(a) * railR, 0.36, Math.sin(a) * railR);
    rails.add(post);
  }

  const railRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.055, 10, 110), mat.metalDark);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.72;
  rails.add(railRing);

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.022, 10, 140),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.35,
      roughness: 0.25,
      metalness: 0.10,
      transparent: true,
      opacity: 0.85
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.79;
  rails.add(glowRing);

  // ---------- CHAIRS + SEATS (make sure facing table) ----------
  function makeChair() {
    const g = new THREE.Group();
    g.name = "Chair";
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 18), mat.trim);
    seat.position.y = 0.50;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.70, 0.10), mat.metalDark);
    back.position.set(0, 0.92, -0.26);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.50, 12), mat.metalDark);
    leg.position.y = 0.25;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), mat.metalDark);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.35;
  const SEAT_SURFACE_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;

    const chairPos = new THREE.Vector3(
      c.x + Math.cos(a) * seatR,
      0,
      c.z + Math.sin(a) * seatR
    );

    // Face toward table (IMPORTANT)
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

  // ---------- HUDS (sky banner + table + turn) ----------
  function makeHudCanvas(w = 1024, h = 256) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    return { c, ctx };
  }

  function drawHudPanel(ctx, w, h, title, lines, accent = "#7fe7ff") {
    ctx.clearRect(0,0,w,h);

    // background
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 18, 18, w-36, h-36, 26, true);

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 4;
    roundRect(ctx, 18, 18, w-36, h-36, 26, false);

    // title
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 54px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title, 44, 34);

    // accent line
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(44, 104, w-88, 6);
    ctx.globalAlpha = 1;

    // lines
    ctx.fillStyle = "rgba(232,236,255,0.92)";
    ctx.font = "700 42px Arial";
    let y = 128;
    for (const s of lines) {
      ctx.fillText(s, 44, y);
      y += 46;
    }

    function roundRect(ctx, x, y, ww, hh, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+ww, y, x+ww, y+hh, r);
      ctx.arcTo(x+ww, y+hh, x, y+hh, r);
      ctx.arcTo(x, y+hh, x, y, r);
      ctx.arcTo(x, y, x+ww, y, r);
      ctx.closePath();
      if (fill) ctx.fill(); else ctx.stroke();
    }
  }

  function makeHudMesh(title, lines, accent = "#7fe7ff", scale = 1.0) {
    const { c, ctx } = makeHudCanvas(1024, 320);
    drawHudPanel(ctx, c.width, c.height, title, lines, accent);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), mat);
    mesh.renderOrder = 200;
    mesh.userData = { canvas: c, ctx, tex, title, lines, accent };
    mesh.scale.setScalar(scale);
    mesh.frustumCulled = false;
    return mesh;
  }

  // Sky banner: always visible from spawn
  const skyHud = makeHudMesh(
    "Scarlett VR Poker",
    ["Player: SCARLETT", "Chips: $10,000", "Time: --:--", "Crown: None"],
    "#ff2d7a",
    1.15
  );
  skyHud.position.set(0, 6.1, -18.5);
  world.group.add(skyHud);
  world.ui.skyHud = skyHud;

  // Table identifier HUD (higher)
  const tableHud = makeHudMesh(
    "$10,000 Table • 6-Max",
    ["Pot: $0", "Turn: --", "Phase: Preflop"],
    "#7fe7ff",
    0.95
  );
  tableHud.position.set(world.tableFocus.x, TABLE_Y + 2.55, world.tableFocus.z);
  world.group.add(tableHud);
  world.ui.tableHud = tableHud;

  // Turn HUD (above community cards)
  const turnHud = makeHudMesh(
    "ACTION",
    ["Next: --", "To Call: $0", "Last: --"],
    "#ffcc00",
    0.92
  );
  turnHud.position.set(world.tableFocus.x, TABLE_Y + 1.45, world.tableFocus.z);
  world.group.add(turnHud);
  world.ui.turnHud = turnHud;

  // ---------- CARDS (progressive reveal + face player) ----------
  function makeCardTexture(rank, suit) {
    // Bigger corner glyphs (your request)
    const c = document.createElement("canvas");
    c.width = 512; c.height = 720;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10,10,c.width-20,c.height-20);

    const isRed = (suit === "♥" || suit === "♦");
    ctx.fillStyle = isRed ? "#b6001b" : "#111111";

    // bigger corners
    ctx.font = "900 110px Arial";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(rank, 36, 26);

    ctx.font = "900 120px Arial";
    ctx.fillText(suit, 40, 140);

    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.font = "900 110px Arial";
    ctx.fillText(rank, c.width - 36, c.height - 140);

    ctx.font = "900 120px Arial";
    ctx.fillText(suit, c.width - 40, c.height - 30);

    // center suit
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "900 220px Arial";
    ctx.fillText(suit, c.width/2, c.height/2 + 30);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeCardMesh(rank, suit) {
    const faceTex = makeCardTexture(rank, suit);

    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.55,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const backMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.02,
      map: T.cardBack || null,
      side: THREE.DoubleSide
    });

    // 2-plane card (prevents “pink” flicker)
    const geo = new THREE.PlaneGeometry(0.42, 0.60);

    const g = new THREE.Group();
    const face = new THREE.Mesh(geo, faceMat);
    const back = new THREE.Mesh(geo, backMat);

    face.position.z = 0.003;
    back.position.z = -0.003;
    back.rotation.y = Math.PI;

    g.add(face, back);
    g.name = `Card_${rank}${suit}`;
    return g;
  }

  // Create 5 community card meshes but reveal progressively
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  function randCard() {
    return { r: ranks[(Math.random()*ranks.length)|0], s: suits[(Math.random()*suits.length)|0] };
  }

  const comm = [];
  for (let i=0;i<5;i++){
    const cs = randCard();
    const card = makeCardMesh(cs.r, cs.s);
    card.position.set(world.tableFocus.x + (-0.96 + i*0.48), TABLE_Y + 0.22, world.tableFocus.z);
    card.rotation.x = -Math.PI/2;
    card.scale.setScalar(0.001); // hidden at start
    table.add(card);
    comm.push(card);
  }
  world.viz.communityCards = comm;

  // ---------- POT CHIPS + DEALER BUTTON + DECK (flat + on table) ----------
  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(world.tableFocus.x, TABLE_Y + 0.035, world.tableFocus.z);
  world.group.add(pot);
  world.viz.potStack = pot;

  const chipGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.014, 22);
  const mats = [mat.chip, mat.chipBlue, mat.chipWhite];
  for (let i=0;i<18;i++){
    const ch = new THREE.Mesh(chipGeo, mats[i % mats.length]);
    ch.rotation.x = 0; // ✅ FLAT (no sideways)
    ch.position.set((Math.random()-0.5)*0.16, 0.007 + i*0.014, (Math.random()-0.5)*0.16);
    pot.add(ch);
  }

  const dealerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.02, 26),
    mat.holo
  );
  dealerBtn.rotation.x = 0; // ✅ flat
  dealerBtn.position.set(world.tableFocus.x + 0.95, TABLE_Y + 0.028, world.tableFocus.z - 0.35);
  world.group.add(dealerBtn);
  world.viz.dealerButton = dealerBtn;

  // dealer deck (face-down) in front of dealer button
  const deck = new THREE.Group();
  deck.name = "DealerDeck";
  deck.position.set(world.tableFocus.x + 0.55, TABLE_Y + 0.03, world.tableFocus.z - 0.35);
  world.group.add(deck);
  world.viz.dealerDeck = deck;

  for (let i=0;i<14;i++){
    const back = makeCardMesh("?", "♠"); // reuse mesh, but we’ll show only the back
    // hide face by rotating so back faces up
    back.rotation.x = -Math.PI/2;
    back.rotation.z = (Math.random()-0.5)*0.02;
    back.position.set((Math.random()-0.5)*0.01, 0.002 + i*0.003, (Math.random()-0.5)*0.01);
    deck.add(back);
  }

  // ---------- SIMPLE “SHOWCASE” NPCS (male + female) ----------
  function makeNpc({ female = false } = {}) {
    const g = new THREE.Group();
    g.name = female ? "NPC_Female" : "NPC_Male";

    const suit = new THREE.MeshStandardMaterial({
      color: female ? 0x2a1f33 : 0x121826,
      roughness: 0.75,
      metalness: 0.05
    });
    const skin = new THREE.MeshStandardMaterial({
      color: female ? 0xe0b7a1 : 0xd2b48c,
      roughness: 0.65
    });

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 8, 16), suit);
    torso.position.y = 1.05;
    g.add(torso);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    head.position.y = 1.48;
    g.add(head);

    // arms with elbows
    const upperArmGeo = new THREE.CapsuleGeometry(0.05, 0.22, 8, 14);
    const foreArmGeo  = new THREE.CapsuleGeometry(0.045, 0.20, 8, 14);
    const handGeo = new THREE.BoxGeometry(0.08, 0.04, 0.10);

    function arm(side = -1) {
      const root = new THREE.Group();
      root.position.set(side*0.26, 1.22, 0.04);

      const upper = new THREE.Mesh(upperArmGeo, suit);
      upper.position.y = -0.12;
      root.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.30;
      root.add(elbow);

      const fore = new THREE.Mesh(foreArmGeo, suit);
      fore.position.y = -0.11;
      elbow.add(fore);

      const hand = new THREE.Mesh(handGeo, suit);
      hand.position.set(0, -0.26, 0.03);
      elbow.add(hand);

      return { root, elbow };
    }

    const aL = arm(-1);
    const aR = arm( 1);
    g.add(aL.root, aR.root);

    // legs + shoes
    const thighGeo = new THREE.CapsuleGeometry(0.07, 0.28, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.065, 0.26, 8, 14);
    const shoeGeo  = new THREE.BoxGeometry(0.12, 0.05, 0.24);

    function leg(side = -1) {
      const hip = new THREE.Group();
      hip.position.set(side*0.11, 0.88, 0);

      const thigh = new THREE.Mesh(thighGeo, suit);
      thigh.position.y = -0.15;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.32;
      hip.add(knee);

      const shin = new THREE.Mesh(shinGeo, suit);
      shin.position.y = -0.14;
      knee.add(shin);

      const shoe = new THREE.Mesh(shoeGeo, mat.metalDark);
      shoe.position.set(0, -0.30, 0.08);
      knee.add(shoe);

      return { hip, knee };
    }

    const lL = leg(-1);
    const lR = leg( 1);
    g.add(lL.hip, lR.hip);

    g.userData = {
      aL, aR, lL, lR,
      t: Math.random()*10,
      target: new THREE.Vector3(
        world.tableFocus.x + (Math.random()-0.5)*10,
        0,
        world.tableFocus.z + (Math.random()-0.5)*8
      ),
      female
    };
    return g;
  }

  const npcMale = makeNpc({ female:false });
  npcMale.position.set(world.tableFocus.x - 7.0, 0, world.tableFocus.z + 2.0);
  world.group.add(npcMale);

  const npcFemale = makeNpc({ female:true });
  npcFemale.position.set(world.tableFocus.x + 7.0, 0, world.tableFocus.z + 1.0);
  world.group.add(npcFemale);

  world.npcs.push(npcMale, npcFemale);

  // ---------- TELEPORT MACHINE (auto-load if present) ----------
  try {
    const tm = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (tm?.TeleportMachine?.build) {
      world.teleportModule = tm;
      const tele = tm.TeleportMachine.build({ THREE, scene: world.group, log });
      // Put it near spawn
      tele.position.set(world.spawnPads[0].x, 0, world.spawnPads[0].z);
      world.teleporter = tele;

      // extra glow “trimmings”
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.78, 64),
        new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent:true, opacity:0.75, side:THREE.DoubleSide })
      );
      halo.rotation.x = -Math.PI/2;
      halo.position.y = 0.04;
      tele.add(halo);

      const aura = new THREE.PointLight(0xb46bff, 0.9, 12);
      aura.position.set(0, 1.8, 0);
      tele.add(aura);

      if (typeof tm.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); try { tm.TeleportMachine.tick(dt); } catch {} };
      }
      L("[world] ✅ TeleportMachine loaded");
    }
  } catch (e) {
    L("[world] ⚠️ teleport_machine.js missing or failed:", e?.message || e);
  }

  // ---------- GAME TIMELINE (slower, readable) ----------
  // We simulate readable phases:
  // Preflop (pause) -> Flop reveal 3 -> Turn reveal -> River reveal -> Winner pause -> Reset
  const game = {
    t: 0,
    phase: "Preflop",
    step: 0,
    pot: 0,
    next: "LUNA",
    toCall: 0,
    last: "--",
    reveal: 0,        // how many community cards revealed (0-5)
    phaseT: 0
  };

  function resetHand() {
    game.phase = "Preflop";
    game.phaseT = 0;
    game.reveal = 0;
    game.pot = 0;
    game.next = "LUNA";
    game.toCall = 0;
    game.last = "--";

    // new random cards
    for (let i=0;i<5;i++){
      table.remove(world.viz.communityCards[i]);
    }
    world.viz.communityCards.length = 0;

    const fresh = [];
    for (let i=0;i<5;i++){
      const cs = randCard();
      const card = makeCardMesh(cs.r, cs.s);
      card.position.set(world.tableFocus.x + (-0.96 + i*0.48), TABLE_Y + 0.22, world.tableFocus.z);
      card.rotation.x = -Math.PI/2;
      card.scale.setScalar(0.001);
      table.add(card);
      fresh.push(card);
    }
    world.viz.communityCards = fresh;
  }

  resetHand();

  // ---------- WORLD TICK ----------
  const baseTick = world.tick;
  world.tick = (dt) => {
    baseTick(dt);

    // spawn ring pulse
    spawnRing.material.opacity = 0.65 + Math.sin(performance.now()*0.004) * 0.18;

    // rail glow pulse
    glowRing.material.emissiveIntensity = 1.15 + Math.sin(performance.now()*0.0042) * 0.35;

    // Sky banner time
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");

    // Update sky HUD text
    if (world.ui.skyHud?.userData?.ctx) {
      const m = world.ui.skyHud.userData;
      drawHudPanel(m.ctx, m.canvas.width, m.canvas.height,
        "Scarlett VR Poker",
        ["Player: SCARLETT", "Chips: $10,000", `Time: ${hh}:${mm}`, "Crown: None"],
        "#ff2d7a"
      );
      m.tex.needsUpdate = true;
    }

    // Make HUDs face the player camera (billboard)
    // (We don’t have camera ref here; we keep them facing forward by default,
    //  main.js sets camera lookAt, and these are readable from most angles.)
    // If you want, next update we can billboard them to playerRig.

    // Game timeline (slow + readable)
    game.t += dt;
    game.phaseT += dt;

    // Each phase lasts long enough to read
    // deal pace target: 12–15s hand, winner display ~20s
    if (game.phase === "Preflop" && game.phaseT > 2.6) {
      game.phase = "Flop";
      game.phaseT = 0;
      game.last = "Dealing Flop";
      game.toCall = 200;
    } else if (game.phase === "Flop") {
      // reveal 3 cards progressively
      const target = 3;
      const speed = 0.55; // slower reveal
      const revealNow = clamp(Math.floor(game.phaseT / speed) + 1, 0, target);
      game.reveal = Math.max(game.reveal, revealNow);
      if (game.phaseT > 4.0) {
        game.phase = "Turn";
        game.phaseT = 0;
        game.last = "Turn Card";
        game.next = "NOVA";
        game.toCall = 400;
      }
    } else if (game.phase === "Turn") {
      game.reveal = Math.max(game.reveal, 4);
      if (game.phaseT > 3.4) {
        game.phase = "River";
        game.phaseT = 0;
        game.last = "River Card";
        game.next = "RAVEN";
        game.toCall = 600;
      }
    } else if (game.phase === "River") {
      game.reveal = 5;
      if (game.phaseT > 3.8) {
        game.phase = "Winner";
        game.phaseT = 0;
        game.last = "Winner!";
        game.next = "KAI";
        game.toCall = 0;
      }
    } else if (game.phase === "Winner") {
      // Winner display time (20s)
      if (game.phaseT > 20.0) {
        resetHand();
      }
    }

    // Pot pulse + pot number increments
    game.pot = Math.floor(lerp(game.pot, 1200 + Math.sin(game.t*0.8)*200, dt*0.6));

    // Update table HUD (higher + bigger)
    if (world.ui.tableHud?.userData?.ctx) {
      const m = world.ui.tableHud.userData;
      drawHudPanel(m.ctx, m.canvas.width, m.canvas.height,
        "$10,000 Table • 6-Max",
        [`Pot: $${game.pot.toLocaleString()}`, `Turn: ${game.next}`, `Phase: ${game.phase}`],
        "#7fe7ff"
      );
      m.tex.needsUpdate = true;
    }

    // Update turn HUD
    if (world.ui.turnHud?.userData?.ctx) {
      const m = world.ui.turnHud.userData;
      // Colored phase labels
      const phaseColor =
        game.phase === "Flop" ? "#7fe7ff" :
        game.phase === "Turn" ? "#ff2d7a" :
        game.phase === "River" ? "#ffcc00" :
        "#ffffff";

      drawHudPanel(m.ctx, m.canvas.width, m.canvas.height,
        "ACTION",
        [`Next: ${game.next}`, `To Call: $${game.toCall}`, `Last: ${game.last}`],
        phaseColor
      );
      m.tex.needsUpdate = true;
    }

    // Community cards hover + always face player
    // - Hover height keeps clear of HUD
    // - Reveal only up to game.reveal
    for (let i=0;i<world.viz.communityCards.length;i++){
      const card = world.viz.communityCards[i];
      const shouldShow = i < game.reveal;

      const appear = shouldShow ? 1 : 0;
      const s = lerp(card.scale.x, shouldShow ? 1.0 : 0.001, dt*5.0);
      card.scale.setScalar(s);

      // hover
      const hover = Math.sin(game.t*2.0 + i)*0.02;
      card.position.y = TABLE_Y + 0.24 + hover;

      // face player (approx: face toward +Z direction where player usually is)
      // We keep them tilted toward the spawn side so they read well.
      card.rotation.x = -Math.PI/2;
      card.rotation.z = 0;
      // lift the “top” toward player
      card.rotation.y = Math.PI; // makes face aim toward +Z for most spawn positions
    }

    // Dealer button sits flat and “moves” to show dealer position (slow, not spinning)
    // Seat-to-seat stepping feel
    const dealerStep = (Math.floor(game.t / 6.0) % 6);
    const angle = (dealerStep / 6) * Math.PI * 2;
    dealerBtn.position.x = world.tableFocus.x + Math.cos(angle) * 1.1;
    dealerBtn.position.z = world.tableFocus.z + Math.sin(angle) * 1.1;
    dealerBtn.position.y = TABLE_Y + 0.028;

    // NPC roaming (2 only)
    for (const npc of world.npcs) {
      const u = npc.userData;
      u.t += dt;

      // pick new target sometimes
      const dxT = u.target.x - npc.position.x;
      const dzT = u.target.z - npc.position.z;
      if (Math.hypot(dxT, dzT) < 0.5 || (Math.random() < 0.002)) {
        u.target.set(
          world.tableFocus.x + (Math.random()-0.5)*12,
          0,
          world.tableFocus.z + (Math.random()-0.5)*10
        );
      }

      // move to target
      const dx = u.target.x - npc.position.x;
      const dz = u.target.z - npc.position.z;
      const d = Math.max(0.0001, Math.hypot(dx, dz));
      const sp = 0.65 * (u.female ? 0.95 : 1.0);
      npc.position.x += (dx/d) * sp * dt;
      npc.position.z += (dz/d) * sp * dt;
      npc.rotation.y = Math.atan2(dx, dz);

      // keep outside rail ring
      const rx = npc.position.x - world.tableFocus.x;
      const rz = npc.position.z - world.tableFocus.z;
      const rd = Math.hypot(rx, rz);
      if (rd < railR + 0.35) {
        const push = (railR + 0.35 - rd) * 1.1;
        npc.position.x += (rx/Math.max(0.0001, rd)) * push;
        npc.position.z += (rz/Math.max(0.0001, rd)) * push;
      }

      // gait elbows/knees
      const gait = Math.sin(u.t * 5.5);
      const bend = Math.abs(gait)*0.8;

      u.lL.hip.rotation.x = -0.12 - bend*0.35;
      u.lL.knee.rotation.x = 0.25 + bend*0.95;
      u.lR.hip.rotation.x = -0.12 - (1-bend)*0.35;
      u.lR.knee.rotation.x = 0.25 + (1-bend)*0.95;

      u.aL.root.rotation.x = -0.25 + gait*0.25;
      u.aR.root.rotation.x = -0.25 - gait*0.25;

      // tiny bob
      npc.position.y = Math.sin(u.t*3.0)*0.01;
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
      }
