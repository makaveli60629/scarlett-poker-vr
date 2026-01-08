// /js/world.js — Scarlett VR Poker — FULL WORLD 9.0 (visible + textured + bots + store + scorpion room)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "9003" }) {
  log("[world] 9.0 WORLD boot v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],

    // Expanded to include scorpion room + store, still keeps you inside
    roomClamp: { minX: -16, maxX: 10, minZ: -16, maxZ: 10 },

    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ TEXTURE LOADER (SAFE) ------------------
  const texLoader = new THREE.TextureLoader();

  const loadTex = (path, { repeat = null, srgb = true } = {}) =>
    new Promise((resolve) => {
      try {
        texLoader.load(
          encodeURI(path),
          (t) => {
            try {
              if (srgb) t.colorSpace = THREE.SRGBColorSpace;
              if (repeat) {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(repeat[0], repeat[1]);
              }
            } catch {}
            resolve(t);
          },
          undefined,
          () => {
            log("[tex] missing: " + path + " (using null)");
            resolve(null);
          }
        );
      } catch {
        log("[tex] missing: " + path + " (using null)");
        resolve(null);
      }
    });

  // Your repo files (based on your screenshots)
  const TEX = {
    carpet: "assets/textures/lobby_carpet.jpg",
    brick: "assets/textures/brickwall.jpg",
    casinoArt: "assets/textures/casino_art.jpg",
    casinoArt2: "assets/textures/Casinoart2.jpg",
    scorpionBrand: "assets/textures/Scorpion room brand.jpg",
    tableFelt: "assets/textures/table_felt_green.jpg",
    tableLeather: "assets/textures/Table leather trim.jpg",
    shirt: "assets/textures/shirt_diffuse.png",
    crown: "assets/textures/crown_diffuse.png",
    cardBack: "assets/textures/Card back.jpg",
    chip1000: "assets/textures/chip_1000.jpg",
    chip5000: "assets/textures/chip_5000.jpg",
    chip10000: "assets/textures/chip_10000.jpg",
    storeShirt: "assets/textures/store/shirt_icon.png",
    storeCrown: "assets/textures/store/crown_icon.png",
    storeHat: "assets/textures/store/hat_icon.png",
    storeChip: "assets/textures/store/chip_icon.png",
    wallPic1: "assets/textures/walls/pic1.png",
    wallPic2: "assets/textures/walls/pic2.png",
  };

  const [
    tCarpet,
    tBrick,
    tCasinoArt,
    tCasinoArt2,
    tScorpion,
    tTableFelt,
    tTableLeather,
    tShirt,
    tCrown,
    tCardBack,
    tChip1000,
    tChip5000,
    tChip10000,
    tStoreShirt,
    tStoreCrown,
    tStoreHat,
    tStoreChip,
    tWallPic1,
    tWallPic2,
  ] = await Promise.all([
    loadTex(TEX.carpet, { repeat: [8, 8] }),
    loadTex(TEX.brick, { repeat: [4, 2] }),
    loadTex(TEX.casinoArt),
    loadTex(TEX.casinoArt2),
    loadTex(TEX.scorpionBrand),
    loadTex(TEX.tableFelt, { repeat: [1, 1] }),
    loadTex(TEX.tableLeather, { repeat: [1, 1] }),
    loadTex(TEX.shirt),
    loadTex(TEX.crown),
    loadTex(TEX.cardBack),
    loadTex(TEX.chip1000),
    loadTex(TEX.chip5000),
    loadTex(TEX.chip10000),
    loadTex(TEX.storeShirt),
    loadTex(TEX.storeCrown),
    loadTex(TEX.storeHat),
    loadTex(TEX.storeChip),
    loadTex(TEX.wallPic1),
    loadTex(TEX.wallPic2),
  ]);

  // ------------------ FLOOR ------------------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b10,
    roughness: 0.98,
    map: tCarpet || null,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.group.add(floor);

  // ------------------ MAIN ROOM (WALLS) ------------------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x141826,
    roughness: 0.95,
    map: tBrick || null,
  });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    world.group.add(m);
    return m;
  };

  // Main room boundaries
  mkWall(26, 4, 0.35, -3, 2, -16); // back
  mkWall(26, 4, 0.35, -3, 2, 10);  // front
  mkWall(0.35, 4, 26, -16, 2, -3); // left
  mkWall(0.35, 4, 26, 10, 2, -3);  // right

  // Ceiling (subtle)
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 1.0 })
  );
  ceil.position.y = 4;
  ceil.rotation.x = Math.PI / 2;
  world.group.add(ceil);

  // ------------------ WALL PICTURES ------------------
  function addWallPicture(tex, x, y, z, ry, w = 3.0, h = 1.8) {
    const mat = new THREE.MeshStandardMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0x1a2233,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x05070a,
      emissiveIntensity: 0.4,
    });

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.9 })
    );
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    world.group.add(frame);

    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    pic.position.set(x, y, z + (Math.sin(ry) * 0.05));
    pic.rotation.y = ry;
    world.group.add(pic);
  }

  addWallPicture(tWallPic1 || tCasinoArt, -12.4, 2.1, -2.0, Math.PI / 2);
  addWallPicture(tWallPic2 || tCasinoArt2, 6.8, 2.1, -9.0, -Math.PI / 2);

  // ------------------ TABLE (CENTERPIECE) ------------------
  const table = new THREE.Group();
  table.name = "Table";
  table.position.set(0, 0, -6.5);
  world.group.add(table);

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0f5d3a,
    roughness: 0.92,
    map: tTableFelt || null,
  });

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), feltMat);
  felt.position.y = 0.92;
  felt.receiveShadow = true;
  table.add(felt);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x2a1b10,
    roughness: 0.8,
    map: tTableLeather || null,
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.02;
  table.add(rim);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.85, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
  );
  stem.position.y = 0.45;
  table.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.1, 32),
    new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1.0 })
  );
  base.position.y = 0.05;
  table.add(base);

  world.tableFocus.set(0, 0, -6.5);

  // Debug beacon (so you ALWAYS find the table)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff44ff, emissiveIntensity: 2.0 })
  );
  beacon.position.set(0, 2.2, -6.5);
  world.group.add(beacon);

  // ------------------ SEATS (6) ------------------
  const c = world.tableFocus.clone();
  const r = 3.15;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // ------------------ RAILS AROUND TABLE ------------------
  const rails = new THREE.Group();
  rails.name = "Rails";

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0f,
    roughness: 0.85,
    metalness: 0.15,
  });

  const railR = 3.6;
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2;
    const x = c.x + Math.cos(a0) * railR;
    const z = c.z + Math.sin(a0) * railR;

    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.7), railMat);
    seg.position.set(x, 0.27, z);
    seg.rotation.y = -a0;
    rails.add(seg);
  }
  world.group.add(rails);

  // ------------------ CHAIRS (6) ------------------
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x151721, roughness: 0.9 });

  function addChair(p, yaw) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = yaw;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), chairMat);
    seat.position.y = 0.45;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.12), chairMat);
    back.position.set(0, 0.82, -0.24);
    g.add(back);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10);
    for (const sx of [-0.25, 0.25]) {
      for (const sz of [-0.25, 0.25]) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(sx, 0.22, sz);
        g.add(leg);
      }
    }

    world.group.add(g);
    return g;
  }

  for (let i = 0; i < 6; i++) addChair(world.seats[i].position, world.seats[i].yaw);

  // ------------------ CARDS (HOVER VISUAL) ------------------
  const cards = new THREE.Group();
  cards.name = "CardsHover";
  cards.position.set(c.x, 1.28, c.z);
  world.group.add(cards);

  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.05,
    map: tCardBack || null,
  });

  // 5 cards line
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), cardMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((i - 2) * 0.48, 0.0, 0);
    cards.add(m);
  }

  // ------------------ CHIPS (STACKED CORRECTLY) ------------------
  function chipMat(tex, fallbackColor) {
    return new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : fallbackColor,
      map: tex || null,
      roughness: 0.6,
      metalness: 0.1,
    });
  }

  function addChipStack(x, z, tex, colorFallback) {
    const stack = new THREE.Group();
    stack.position.set(c.x + x, 0.98, c.z + z);
    world.group.add(stack);

    const mat = chipMat(tex, colorFallback);
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24);

    const count = 10;
    for (let i = 0; i < count; i++) {
      const chip = new THREE.Mesh(geo, mat);
      chip.position.y = i * 0.031; // stack upward (correct)
      stack.add(chip);
    }
    return stack;
  }

  addChipStack(-0.8, 0.6, tChip1000, 0xff4444);
  addChipStack(0.0, 0.75, tChip5000, 0x44ff44);
  addChipStack(0.8, 0.6, tChip10000, 0x4444ff);

  // ------------------ STORE AREA ------------------
  const store = new THREE.Group();
  store.name = "Store";
  store.position.set(6.5, 0, 6.0);
  world.group.add(store);

  const storeBase = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 1.4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.9 })
  );
  storeBase.position.y = 0.7;
  store.add(storeBase);

  const storeTop = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.12, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.85 })
  );
  storeTop.position.y = 1.45;
  store.add(storeTop);

  // Store sign
  store.add(makeTextPanel(THREE, "STORE", 0, 2.05, 1.26, 0, 0.55));

  function addStoreItem(iconTex, label, x) {
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.5, 20),
      new THREE.MeshStandardMaterial({ color: 0x121727, roughness: 0.85 })
    );
    pedestal.position.set(x, 0.25, 0.4);
    store.add(pedestal);

    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshStandardMaterial({
        map: iconTex || null,
        color: iconTex ? 0xffffff : 0x2a3350,
        transparent: true,
        roughness: 0.9,
        emissive: 0x101820,
        emissiveIntensity: 0.6,
      })
    );
    icon.position.set(x, 1.15, 0.9);
    icon.rotation.y = Math.PI;
    store.add(icon);

    store.add(makeTextPanel(THREE, label, x, 1.0, 0.65, Math.PI, 0.25));
  }

  addStoreItem(tStoreShirt, "Shirt", -1.2);
  addStoreItem(tStoreCrown, "Crown", -0.4);
  addStoreItem(tStoreHat, "Hat", 0.4);
  addStoreItem(tStoreChip, "Chips", 1.2);

  // ------------------ SCORPION ROOM (SIDE AREA) ------------------
  const scorpion = new THREE.Group();
  scorpion.name = "ScorpionRoom";
  scorpion.position.set(-12.0, 0, -6.0);
  world.group.add(scorpion);

  // Small room box
  const sWallMat = new THREE.MeshStandardMaterial({
    color: 0x0f1220,
    roughness: 0.95,
    map: tBrick || null,
  });

  function sWall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sWallMat);
    m.position.set(x, y, z);
    scorpion.add(m);
    return m;
  }

  // room boundaries (5 walls + doorway gap implied)
  sWall(6, 4, 0.35, 0, 2, -3);
  sWall(6, 4, 0.35, 0, 2, 3);
  sWall(0.35, 4, 6.35, -3, 2, 0);
  sWall(0.35, 4, 6.35, 3, 2, 0);

  // floor plate
  const sFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshStandardMaterial({ color: 0x07080f, roughness: 1 })
  );
  sFloor.rotation.x = -Math.PI / 2;
  scorpion.add(sFloor);

  // branding sign
  const signTex = tScorpion || tCasinoArt;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.4),
    new THREE.MeshStandardMaterial({
      map: signTex || null,
      color: signTex ? 0xffffff : 0x202a44,
      roughness: 0.85,
      emissive: 0x06080e,
      emissiveIntensity: 0.8,
    })
  );
  sign.position.set(0, 2.0, -2.82);
  scorpion.add(sign);

  scorpion.add(makeTextPanel(THREE, "SCORPION ROOM", 0, 2.9, -2.75, 0, 0.36));

  // ------------------ TELEPORT MACHINE (YOUR MODULE) ------------------
  // NOTE: your teleport_machine.js should NOT import its own three.
  // It should export: TeleportMachine.build({ THREE, scene, texLoader }) OR TeleportMachine.build(scene, texLoader, THREE).
  let teleLoaded = false;

  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);

    // Support BOTH signatures:
    // A) build(scene, texLoader)
    // B) build({THREE, scene, texLoader})
    if (mod?.TeleportMachine?.build) {
      let tele = null;

      try {
        tele = mod.TeleportMachine.build({ THREE, scene, texLoader }); // preferred
      } catch {
        tele = mod.TeleportMachine.build(scene, texLoader, THREE); // fallback
      }

      if (tele) {
        // force correct placement
        tele.position.set(0, 0, 2.2);
        teleLoaded = true;

        // safe spawn from teleporter
        if (typeof mod.TeleportMachine.getSafeSpawn === "function") {
          const s = mod.TeleportMachine.getSafeSpawn();
          if (s?.position) world.spawnPads = [s.position.clone()];
        }

        // tick fx if available
        if (typeof mod.TeleportMachine.tick === "function") {
          const prev = world.tick;
          world.tick = (dt) => {
            prev(dt);
            try { mod.TeleportMachine.tick(dt); } catch {}
          };
        }

        log("[world] ✅ teleport_machine.js loaded");
      } else {
        log("[world] ⚠️ teleport_machine.js build returned null");
      }
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  if (!teleLoaded) {
    // Safe fallback portal ring if teleporter fails
    const fallback = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.07, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x6a2bff, emissive: 0x6a2bff, emissiveIntensity: 1.2 })
    );
    fallback.rotation.x = Math.PI / 2;
    fallback.position.set(0, 1.0, 2.2);
    world.group.add(fallback);
    log("[world] ⚠️ Using fallback teleporter ring");
  }

  // ------------------ BOTS (SHIRT + NAME TAGS + WINNER CROWN) ------------------
  const bots = buildBots9(THREE, scene, world, {
    shirtTex: tShirt,
    crownTex: tCrown,
  });
  world.bots = bots;

  {
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      bots.update(dt);
    };
  }

  // ------------------ POKER LOOP (VISUAL ONLY, CRASH SAFE) ------------------
  // This just animates “round heartbeat”: card hover bob + picks a winner crown every ~20s.
  let t = 0;
  let winner = 0;

  const prevTick = world.tick;
  world.tick = (dt) => {
    prevTick(dt);

    t += dt;
    cards.position.y = 1.26 + Math.sin(t * 2.2) * 0.02;

    if (t > 20) {
      t = 0;
      winner = (winner + 1) % 6;
      bots.setWinner(winner);
      log("[Poker] Winner bot #" + winner);
    }
  };

  log("[world] 9.0 WORLD ready ✅");
  return world;
}

// ===============================
// BOT SYSTEM 9.0 (shirt + crown + tags)
// ===============================
function buildBots9(THREE, scene, world, { shirtTex = null, crownTex = null } = {}) {
  const bots = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: shirtTex ? 0xffffff : 0x2bd7ff,
    map: shirtTex || null,
    roughness: 0.85,
    metalness: 0.05,
  });

  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });
  const altBodyMat = new THREE.MeshStandardMaterial({
    color: shirtTex ? 0xffffff : 0xff2bd6,
    map: shirtTex || null,
    roughness: 0.85,
    metalness: 0.05,
  });

  const crownMat = new THREE.MeshStandardMaterial({
    color: crownTex ? 0xffffff : 0xffd27a,
    map: crownTex || null,
    roughness: 0.55,
    metalness: 0.25,
    transparent: true,
  });

  function makeNameTag(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 12, 18, 488, 92, 24);
    ctx.fill();

    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), mat);
    mesh.renderOrder = 999;
    return mesh;
  }

  function makeCrown() {
    const g = new THREE.Group();

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 20), crownMat);
    band.position.y = 0.0;
    g.add(band);

    const spikeGeo = new THREE.ConeGeometry(0.035, 0.09, 10);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = new THREE.Mesh(spikeGeo, crownMat);
      s.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
      s.rotation.y = a;
      g.add(s);
    }

    g.visible = false;
    return g;
  }

  function makeBot(i) {
    const g = new THREE.Group();

    const bmat = i % 2 ? bodyMat : altBodyMat;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), bmat);
    body.position.y = 0.55;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.25;
    g.add(head);

    const crown = makeCrown();
    crown.position.set(0, 1.42, 0);
    crown.name = "crown";
    g.add(crown);

    const tag = makeNameTag("BOT " + (i + 1));
    tag.position.set(0, 1.75, 0);
    tag.name = "tag";
    g.add(tag);

    g.userData.bot = { id: i, seated: false, target: null };
    scene.add(g);
    return g;
  }

  for (let i = 0; i < 8; i++) bots.push(makeBot(i));

  // Place: 6 seated, 2 roaming lobby
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 8) - 4, 0, 7 + Math.random() * 3);
      b.userData.bot.target = b.position.clone();
    }
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  let currentWinner = 0;

  function setWinner(idx) {
    currentWinner = idx;
    for (let i = 0; i < bots.length; i++) {
      const crown = bots[i].getObjectByName("crown");
      if (crown) crown.visible = (i === currentWinner);
    }
  }

  // start winner
  setWinner(0);

  return {
    bots,
    setWinner,
    update(dt) {
      for (const b of bots) {
        // tag faces camera in VR nicely (billboard)
        const tag = b.getObjectByName("tag");
        if (tag) {
          // lightweight billboard: look at table direction (stable)
          tag.lookAt(world.tableFocus.x, tag.getWorldPosition(new THREE.Vector3()).y, world.tableFocus.z);
          tag.rotation.y += Math.PI; // flip
        }

        const d = b.userData.bot;
        if (d.seated) continue;

        if (!d.target || b.position.distanceTo(d.target) < 0.2) d.target = pickTarget();

        const dir = d.target.clone().sub(b.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.001) {
          dir.normalize();
          b.position.addScaledVector(dir, dt * 0.7);
          b.lookAt(d.target.x, b.position.y, d.target.z);
        }
      }
    }
  };
}

// ===============================
// SMALL TEXT PANEL (3D UI)
// ===============================
function makeTextPanel(THREE, text, x, y, z, ry, scale = 0.4) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  roundRect(ctx, 18, 30, 476, 196, 26);
  ctx.fill();

  ctx.font = "bold 72px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6 * scale, 1.3 * scale),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );

  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.renderOrder = 999;
  return mesh;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  }
