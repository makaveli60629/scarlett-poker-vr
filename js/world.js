// /js/world.js — Scarlett VR Poker — Update 9.0 WORLD (FULL)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "9004" }) {
  log("[world] 9.0 WORLD boot v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    tick: (dt) => {},
    // references
    table: null,
    teleporter: null,
    rails: null,
    cards: null,
    chips: null,
    store: null,
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ TEXTURE LOADER (SAFE) ------------------
  const texLoader = new THREE.TextureLoader();

  const loadTex = (url, onOK) =>
    new Promise((resolve) => {
      try {
        texLoader.load(
          url,
          (t) => {
            try {
              t.colorSpace = THREE.SRGBColorSpace;
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              onOK?.(t);
            } catch (_) {}
            resolve(t);
          },
          undefined,
          () => resolve(null)
        );
      } catch {
        resolve(null);
      }
    });

  // ------------------ FLOOR / ROOM ------------------
  // Try carpet texture if exists; otherwise fallback solid.
  const carpetTex = await loadTex("assets/textures/carpet.png", (t) => t.repeat.set(6, 6));
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b10,
    roughness: 0.98,
    map: carpetTex || null,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  };

  // room box (visual; hard collision is in main clamp)
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ------------------ WALL ART (from your pack) ------------------
  // Uses: assets/textures/walls/pic1.png + pic2.png
  await addWallArt(THREE, world.group, texLoader);

  // ------------------ TABLE (ALWAYS BUILT) ------------------
  const table = buildTable(THREE);
  table.position.set(0, 0, -6.5);
  world.group.add(table);
  world.table = table;

  world.tableFocus.set(0, 0, -6.5);

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // ------------------ RAILS AROUND TABLE (9.0) ------------------
  const rails = buildRails(THREE);
  rails.position.copy(world.tableFocus);
  world.group.add(rails);
  world.rails = rails;

  // ------------------ TELEPORTER (YOUR MODULE + FX) ------------------
  // ------------------ TELEPORTER (YOUR MODULE) ------------------
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      const texLoader = new THREE.TextureLoader();

      const tele = mod.TeleportMachine.build({
        THREE,
        scene,
        texLoader
      });

      // keep it where we expect
      tele.position.set(0, 0, 2.2);

      // safe spawn from teleporter
      if (typeof mod.TeleportMachine.getSafeSpawn === "function") {
        const s = mod.TeleportMachine.getSafeSpawn(THREE);
        if (s?.position) world.spawnPads = [s.position.clone()];
      }

      // tick FX
      if (typeof mod.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          mod.TeleportMachine.tick(dt);
        };
      }

      log("[world] ✅ teleport_machine.js loaded (no three imports)");
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }
  // ------------------ BOTS (UPGRADED: shirts + nametags) ------------------
  const bots = buildBotsWithShirts(THREE, scene, world, texLoader);
  world.bots = bots;

  const prevBots = world.tick;
  world.tick = (dt) => {
    prevBots(dt);
    bots.update(dt);
  };

  // ------------------ CHIPS (STACKED + FLAT) ------------------
  const chips = buildChipStacks(THREE);
  chips.position.copy(world.tableFocus);
  world.group.add(chips);
  world.chips = chips;

  // ------------------ CARDS (HOVERING + WATCHABLE DEAL) ------------------
  const cards = buildCardSystem(THREE);
  cards.group.position.copy(world.tableFocus);
  world.group.add(cards.group);
  world.cards = cards;

  const prevCards = world.tick;
  world.tick = (dt) => {
    prevCards(dt);
    cards.tick(dt);
  };

  // ------------------ STORE KIOSK (VISIBLE) ------------------
  const store = await buildStoreKiosk(THREE, texLoader);
  store.position.set(-5.4, 0, 1.2);
  store.rotation.y = Math.PI / 2;
  world.group.add(store);
  world.store = store;

  // ------------------ POKER SIM (placeholder heartbeat) ------------------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    const PS = pokerSim?.PokerSimulation;
    if (PS?.init) {
      PS.init({ bots, world });
      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        const prev = world.tick;
        world.tick = (dt) => {
          prev(dt);
          try { tfn(dt); } catch (e) { log("❌ poker tick crash: " + (e?.message || e)); }
        };
      }
      log("[world] ✅ poker_simulation init");
    }
  } catch (e) {
    log("[world] ⚠️ poker_simulation import failed: " + (e?.message || e));
  }

  log("[world] 9.0 WORLD ready ✅");
  return world;
}

/* =========================
   TABLE
========================= */
function buildTable(THREE) {
  const table = new THREE.Group();
  table.name = "Table";

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.18, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.9 })
  );
  felt.position.y = 0.9;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.18, 18, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.8 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.99;
  table.add(rim);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.85, 20),
    new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
  );
  stem.position.y = 0.45;
  table.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.1, 28),
    new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1 })
  );
  base.position.y = 0.05;
  table.add(base);

  return table;
}

/* =========================
   RAILS (simple poker pit ring)
========================= */
function buildRails(THREE) {
  const g = new THREE.Group();
  g.name = "Rails";

  const railMat = new THREE.MeshStandardMaterial({ color: 0x222733, roughness: 0.85 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.95 });

  // Outer ring
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.55, 0.09, 16, 80),
    railMat
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.95;
  g.add(rail);

  // Soft padded ring
  const pad = new THREE.Mesh(
    new THREE.TorusGeometry(4.25, 0.16, 14, 80),
    padMat
  );
  pad.rotation.x = Math.PI / 2;
  pad.position.y = 0.98;
  g.add(pad);

  // Posts
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.95, 12),
      railMat
    );
    post.position.set(Math.cos(a) * 4.4, 0.48, Math.sin(a) * 4.4);
    g.add(post);
  }

  return g;
}

/* =========================
   TELEPORTER LOAD
========================= */
async function loadTeleporter(THREE, scene, worldGroup, texLoader, v, log) {
  let tele = null;
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      tele = mod.TeleportMachine.build(scene, texLoader);
      tele.position.set(0, 0, 2.2); // keep it where you expect it
      worldGroup.add(tele);

      // tick FX if provided
      if (typeof mod.TeleportMachine.tick === "function") {
        tele.userData._tick = (dt) => mod.TeleportMachine.tick(dt);
      }
      log("[world] ✅ teleporter loaded");
    } else {
      log("[world] ⚠️ teleport_machine.js missing TeleportMachine.build");
    }
  } catch (e) {
    log("[world] ❌ teleporter import failed: " + (e?.message || e));
  }

  // Safe fallback if it failed
  if (!tele) {
    tele = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9, metalness: 0.2 })
    );
    base.position.y = 0.06;
    tele.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x6a2bff,
        emissive: 0x6a2bff,
        emissiveIntensity: 1.6,
        roughness: 0.35,
        metalness: 0.1
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    tele.add(ring);

    const glow = new THREE.PointLight(0x8f3dff, 0.8, 8);
    glow.position.set(0, 1.2, 0);
    tele.add(glow);

    tele.position.set(0, 0, 2.2);
    worldGroup.add(tele);
    log("[world] ⚠️ teleporter fallback used");
  }

  return tele;
}

/* =========================
   BOTS + SHIRTS + NAMETAGS
========================= */
function buildBotsWithShirts(THREE, scene, world, texLoader) {
  const bots = [];

  // shirt texture from your pack: assets/textures/shirt.png
  let shirtTex = null;
  try {
    shirtTex = texLoader.load("assets/textures/shirt.png", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    });
  } catch (_) {}

  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  function makeNameTag(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), mat);
    plane.position.y = 1.72;
    return plane;
  }

  function makeBot(i) {
    const g = new THREE.Group();
    g.name = "Bot_" + i;

    // body: use cylinder so the shirt texture reads better than capsule
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.78, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      map: shirtTex || null,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    g.add(body);

    // shoulders hint
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
    );
    shoulder.scale.set(1.1, 0.55, 1.0);
    shoulder.position.y = 1.05;
    g.add(shoulder);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.25;
    g.add(head);

    // nametag
    g.add(makeNameTag("BOT " + (i + 1)));

    g.userData.bot = { id: i, seated: false, target: null };
    scene.add(g);
    return g;
  }

  for (let i = 0; i < 8; i++) bots.push(makeBot(i));

  // seat 6, lobby 2
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
      b.userData.bot.target = b.position.clone();
    }
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  return {
    bots,
    update(dt) {
      for (const b of bots) {
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

/* =========================
   CHIPS (flat & stacked)
========================= */
function buildChipStacks(THREE) {
  const g = new THREE.Group();
  g.name = "Chips";

  const colors = [0xff2bd6, 0x2bd7ff, 0xffd27a, 0xffffff];
  const chipMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15 });

  // One chip mesh reused
  const chipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.018, 22);

  function stack(x, z, count, col) {
    const s = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(chipGeo, chipMat(col));
      m.rotation.x = 0; // cylinders are already vertical; we want vertical stacks
      m.position.set(0, 0.91 + i * 0.018, 0); // stack upward on the table
      s.add(m);
    }
    s.position.set(x, 0, z);
    g.add(s);
  }

  // place stacks around table top (relative to table focus)
  stack(-0.9, -0.2, 14, colors[0]);
  stack(-0.6,  0.5, 10, colors[1]);
  stack( 0.8,  0.4, 12, colors[2]);
  stack( 0.9, -0.4,  9, colors[3]);

  return g;
}

/* =========================
   CARDS (hover + watchable deal)
========================= */
function buildCardSystem(THREE) {
  const group = new THREE.Group();
  group.name = "Cards";

  const cardGeo = new THREE.PlaneGeometry(0.18, 0.26);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.75, metalness: 0.05 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

  // community card slots
  const comm = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(cardGeo, i === 0 ? faceMat : faceMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set((i - 2) * 0.24, 1.03, 0); // hover above felt
    group.add(m);
    comm.push(m);
  }

  // deck position
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.30), backMat);
  deck.position.set(1.25, 1.01, -0.55);
  group.add(deck);

  // simple “deal loop”
  let t = 0;
  let phase = 0;

  return {
    group,
    tick(dt) {
      t += dt;

      // subtle hover bob
      const bob = Math.sin(t * 2.2) * 0.01;
      for (let i = 0; i < comm.length; i++) comm[i].position.y = 1.03 + bob;

      // deal one card every 2 seconds (visual only)
      if (t > 2.0) {
        t = 0;
        phase = (phase + 1) % 6; // 1-5 show, 0 reset

        for (let i = 0; i < 5; i++) {
          comm[i].visible = phase === 0 ? false : i < phase;
        }
      }
    }
  };
}

/* =========================
   STORE KIOSK (simple visible)
========================= */
async function buildStoreKiosk(THREE, texLoader) {
  const g = new THREE.Group();
  g.name = "StoreKiosk";

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.9, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x10141d, roughness: 0.9 })
  );
  base.position.y = 0.45;
  g.add(base);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.8 })
  );
  top.position.y = 0.92;
  g.add(top);

  const glow = new THREE.PointLight(0x2bd7ff, 0.55, 4);
  glow.position.set(0, 1.1, 0);
  g.add(glow);

  // icon board
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.95 })
  );
  board.position.set(0, 1.25, 0.36);
  g.add(board);

  // icons from your pack
  const icons = [
    "assets/textures/store/shirt_icon.png",
    "assets/textures/store/crown_icon.png",
    "assets/textures/store/hat_icon.png",
    "assets/textures/store/chip_icon.png",
  ];

  for (let i = 0; i < icons.length; i++) {
    let tex = null;
    try {
      tex = texLoader.load(icons[i], (t) => (t.colorSpace = THREE.SRGBColorSpace));
    } catch (_) {}
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ map: tex || null, transparent: true, opacity: tex ? 1 : 0.25, color: 0xffffff })
    );
    icon.position.set(-0.33 + i * 0.22, 1.25, 0.37);
    g.add(icon);
  }

  return g;
}

/* =========================
   WALL ART
========================= */
async function addWallArt(THREE, group, texLoader) {
  const urls = [
    "assets/textures/walls/pic1.png",
    "assets/textures/walls/pic2.png",
  ];

  function addPic(url, x, y, z, ry) {
    let t = null;
    try {
      t = texLoader.load(url, (tt) => (tt.colorSpace = THREE.SRGBColorSpace));
    } catch (_) {}

    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshStandardMaterial({ map: t || null, color: t ? 0xffffff : 0x222222, roughness: 0.95 })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
  }

  // left wall
  addPic(urls[0], -7.55, 2.0, -4.0, Math.PI / 2);
  // right wall
  addPic(urls[1], 7.55, 2.0, -4.0, -Math.PI / 2);
                                    }
