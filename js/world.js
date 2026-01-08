// /js/world.js — Scarlett FULL WORLD 9.0 (watchable poker)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "9009" }) {
  log("[world] init v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    roomClampMargin: 0.28,
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    tick: (dt) => {},
    // visuals
    table: null,
    cards: null,
    chipPiles: [],
    // systems
    bots: null,
    teleporter: null,
  };

  world.group.name = "World";
  scene.add(world.group);

  const texLoader = new THREE.TextureLoader();

  // ---------- FLOOR (carpet hook) ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.group.add(floor);

  // Optional: if you have assets/textures/carpet.png or .jpg, load it here
  // (won't crash if missing)
  safeLoadTexture(texLoader, "assets/textures/carpet.png", (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.colorSpace = THREE.SRGBColorSpace;
    floor.material.map = t;
    floor.material.needsUpdate = true;
  });

  // ---------- WALLS (brick hook) ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });
  const walls = [];

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    walls.push(m);
    world.group.add(m);
    return m;
  };

  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  safeLoadTexture(texLoader, "assets/textures/brick.png", (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    for (const w of walls) {
      w.material = w.material.clone();
      w.material.map = t;
      w.material.needsUpdate = true;
    }
  });

  // ---------- TABLE ----------
  const table = new THREE.Group();
  table.name = "Table";
  table.position.set(0, 0, -6.5);
  world.group.add(table);
  world.table = table;

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

  world.tableFocus.set(0, 0, -6.5);

  // ---------- RAILS (so it feels like a table area) ----------
  const rails = buildRails(THREE);
  rails.position.set(0, 0, -6.5);
  world.group.add(rails);

  // ---------- SEATS (6) ----------
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // ---------- CHIPS (correct orientation: stack up on Y) ----------
  world.chipPiles = buildChipPiles(THREE, world.seats, world.tableFocus, world.group);

  // ---------- HOVER CARDS (watch mode) ----------
  world.cards = buildHoverCards(THREE, world.group, world.tableFocus);

  // ---------- TELEPORTER (YOUR MODULE) ----------
  // Uses your current teleport_machine.js which takes {THREE, texLoader}
  let teleLoaded = false;

  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    const TM = mod?.TeleportMachine;

    if (TM?.build) {
      const tele = TM.build({ THREE, texLoader });
      tele.position.set(0, 0, 2.2);
      world.group.add(tele);

      world.teleporter = TM;
      teleLoaded = true;

      // safe spawn if present
      if (typeof TM.getSafeSpawn === "function") {
        const s = TM.getSafeSpawn(THREE);
        if (s?.position?.clone) world.spawnPads = [s.position.clone()];
      }

      // tick teleporter every frame
      const prevTick = world.tick;
      world.tick = (dt) => {
        prevTick(dt);
        if (world.teleporter?.tick) world.teleporter.tick(dt);
      };

      log("[world] ✅ TeleportMachine loaded + ticking");
    } else {
      log("[world] ⚠️ TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine import failed: " + (e?.message || e));
  }

  if (!teleLoaded) {
    // fallback ring
    const fallback = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.07, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x6a2bff, emissive: 0x6a2bff, emissiveIntensity: 1.2 })
    );
    fallback.rotation.x = Math.PI / 2;
    fallback.position.set(0, 1.0, 2.2);
    world.group.add(fallback);
    log("[world] ⚠️ Using fallback teleporter ring");
  }

  // ---------- BOTS (shirts + name tags + stacks) ----------
  const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
  world.bots = botsMod?.Bots;
  if (world.bots?.init) {
    world.bots.init({
      THREE,
      scene,
      getSeats: () => world.seats,
      getLobbyZone: () => world.lobbyZone,
      tableFocus: world.tableFocus,
      texLoader,
    });
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      world.bots.update(dt);
    };
    log("[world] ✅ bots init");
  } else {
    log("[world] ⚠️ bots.js missing Bots.init");
  }

  // ---------- POKER (watch mode placeholder: updates cards + chip tags) ----------
  const pokerMod = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
  if (pokerMod?.PokerSimulation?.init) {
    pokerMod.PokerSimulation.init({
      THREE,
      world,
      bots: world.bots,
      log,
    });
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      pokerMod.PokerSimulation.update(dt);
    };
    log("[world] ✅ PokerSimulation init");
  }

  log("[world] ready ✅");
  return world;
}

// ================= helpers =================

function safeLoadTexture(loader, url, onOk) {
  try {
    loader.load(url, (t) => onOk && onOk(t), undefined, () => {});
  } catch {}
}

function buildRails(THREE) {
  const g = new THREE.Group();
  g.name = "Rails";

  const mat = new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.9 });
  const post = (x, z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12), mat);
    p.position.set(x, 0.5, z);
    g.add(p);
  };
  const bar = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 10), mat);
    b.position.set((x1 + x2) * 0.5, 0.95, (z1 + z2) * 0.5);
    b.rotation.x = Math.PI / 2;
    b.rotation.z = Math.atan2(z2 - z1, x2 - x1);
    g.add(b);
  };

  const R = 4.4;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  for (const [x, z] of pts) post(x, z);
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    bar(x1, z1, x2, z2);
  }
  return g;
}

function buildChipPiles(THREE, seats, tableFocus, parent) {
  const piles = [];

  const chipMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.6, metalness: 0.05 });
  const chipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.018, 22);

  for (let i = 0; i < Math.min(6, seats.length); i++) {
    const s = seats[i].position;
    const dirToCenter = new THREE.Vector3().subVectors(tableFocus, s).normalize();
    const spot = new THREE.Vector3(s.x, 0, s.z).addScaledVector(dirToCenter, 0.85);

    const pile = new THREE.Group();
    pile.name = `ChipPile_${i}`;
    pile.position.set(spot.x, 0.92, spot.z);

    const n = 10 + Math.floor(Math.random() * 10);
    for (let k = 0; k < n; k++) {
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.rotation.x = Math.PI / 2; // ✅ flat
      chip.position.y = k * 0.019;   // ✅ stacked upward
      pile.add(chip);
    }

    parent.add(pile);
    piles.push(pile);
  }
  return piles;
}

function buildHoverCards(THREE, parent, tableFocus) {
  const g = new THREE.Group();
  g.name = "HoverCards";
  g.position.set(tableFocus.x, 1.25, tableFocus.z);

  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.0,
  });

  const cards = [];
  const spacing = 0.18;

  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), cardMat.clone());
    card.rotation.x = -Math.PI / 2;
    card.position.set((i - 2) * spacing, 0, 0);
    card.name = `CommunityCard_${i}`;
    g.add(card);
    cards.push(card);
  }

  parent.add(g);

  return {
    group: g,
    cards,
    setRevealedCount(n) {
      for (let i = 0; i < cards.length; i++) {
        cards[i].visible = i < n;
      }
    },
    setPulse(t) {
      g.position.y = 1.20 + Math.sin(t * 2.0) * 0.03;
    }
  };
}
