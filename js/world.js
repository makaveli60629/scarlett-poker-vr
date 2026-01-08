// /js/world.js — Scarlett VR Poker 9.2 FULL WORLD (spawn circle + taller walls + rail glow + bot shirts)
// IMPORTANT: Do NOT import THREE here. main.js passes THREE in.

export async function initWorld({ THREE, scene, log = console.log, v = "9020" }) {
  log("[world] init v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    teleporter: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ TEXTURES (safe) ------------------
  const texLoader = new THREE.TextureLoader();

  const loadTex = (url, opts = {}) =>
    new Promise((resolve) => {
      texLoader.load(
        url,
        (t) => {
          if (opts.repeat) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(opts.repeat[0], opts.repeat[1]);
          }
          if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
          resolve(t);
        },
        undefined,
        () => {
          log(`[tex] missing: ${url} (using null)`);
          resolve(null);
        }
      );
    });

  const T = {
    carpet: await loadTex("assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    ceiling: await loadTex("assets/textures/ceiling_dome_main.jpg", { repeat: [1, 1], srgb: true }),
    felt: await loadTex("assets/textures/table_felt_green.jpg", { repeat: [1, 1], srgb: true }),
    trim: await loadTex("assets/textures/Table leather trim.jpg", { repeat: [1, 1], srgb: true }),
    casinoArt1: await loadTex("assets/textures/casino_art.jpg", { repeat: [1, 1], srgb: true }),
    casinoArt2: await loadTex("assets/textures/Casinoart2.jpg", { repeat: [1, 1], srgb: true }),
    scorpionBrand: await loadTex("assets/textures/Scorpion room brand.jpg", { repeat: [1, 1], srgb: true }),
    shirt: await loadTex("assets/textures/shirt_diffuse.png", { srgb: true }),
  };

  // ------------------ LIGHTING (MORE) ------------------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.05));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(6, 10, 4);
  world.group.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-6, 7, -2);
  world.group.add(fill);

  const accent1 = new THREE.PointLight(0xb46bff, 0.8, 16);
  accent1.position.set(0, 2.4, 1.8);
  world.group.add(accent1);

  const accent2 = new THREE.PointLight(0x33aaff, 0.65, 18);
  accent2.position.set(0, 2.4, -7.5);
  world.group.add(accent2);

  // ------------------ FLOOR ------------------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111118,
    roughness: 0.95,
    map: T.carpet || null,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  // ------------------ TALLER ROOM BOX ------------------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x141826,
    roughness: 0.95,
    map: T.brick || null,
  });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  };

  // was 4 high → now 6 high
  const WALL_H = 6.0;
  const WALL_Y = WALL_H / 2;

  mkWall(16, WALL_H, 0.3, 0, WALL_Y, -14);
  mkWall(16, WALL_H, 0.3, 0, WALL_Y, 8);
  mkWall(0.3, WALL_H, 22, -8, WALL_Y, -3);
  mkWall(0.3, WALL_H, 22, 8, WALL_Y, -3);

  // ------------------ CEILING DOME ------------------
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x0b0c12,
    roughness: 0.9,
    map: T.ceiling || null,
    side: THREE.BackSide,
  });
  const ceiling = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 22), ceilingMat);
  ceiling.position.set(0, 7.2, -3);
  ceiling.scale.set(1.4, 0.85, 1.4);
  world.group.add(ceiling);

  // ------------------ WALL ART ------------------
  addWallArt(THREE, world.group, T.casinoArt1, -4.5, 2.3, -13.85, 0, 3.2, 2.0);
  addWallArt(THREE, world.group, T.casinoArt2, 4.5, 2.3, -13.85, 0, 3.2, 2.0);

  // ------------------ TABLE ------------------
  const table = new THREE.Group();
  table.name = "PokerTable";
  table.position.set(0, 0, -6.5);
  world.group.add(table);

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0f5d3a,
    roughness: 0.92,
    map: T.felt || null,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x2a1b10,
    roughness: 0.82,
    map: T.trim || null,
  });

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), feltMat);
  felt.position.y = 0.92;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), trimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  table.add(rim);

  table.add(makeStem(THREE, 0.46));
  table.add(makeBase(THREE, 0.06));

  world.tableFocus.set(0, 0, -6.5);

  // ------------------ RAILS (BIGGER RADIUS + GLOW TOP) ------------------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.55; // ✅ bigger so it doesn't clip chairs
  const railMat = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10), railMat);
    post.position.set(Math.cos(a) * railR, 0.28, Math.sin(a) * railR);
    rails.add(post);
  }

  const railRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.05, 10, 90),
    new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.85 })
  );
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.58;
  rails.add(railRing);

  // ✅ glow ring on top (blue)
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.028, 10, 90),
    new THREE.MeshStandardMaterial({
      color: 0x2bd7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.0,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.63;
  rails.add(glowRing);

  // subtle pulse
  const prevTickGlow = world.tick;
  world.tick = (dt) => {
    prevTickGlow(dt);
    glowRing.userData.t = (glowRing.userData.t || 0) + dt;
    const t = glowRing.userData.t;
    glowRing.material.emissiveIntensity = 0.85 + Math.sin(t * 3.2) * 0.25;
  };

  // ------------------ CHAIRS (6) ------------------
  const chairR = 3.45; // ✅ slightly out for better alignment with rails
  const c = world.tableFocus.clone();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * chairR, 0, c.z + Math.sin(a) * chairR);
    const yaw = Math.atan2(c.x - p.x, c.z - p.z);
    world.seats.push({ position: p, yaw });

    const chair = makeChair(THREE);
    chair.position.set(p.x, 0, p.z);
    chair.rotation.y = yaw;
    world.group.add(chair);
  }

  // ------------------ POKER VIEW (NOT BLOCKING) ------------------
  // Put it over the pot area, angled toward players.
  const pokerView = buildPokerView(THREE);
  pokerView.position.set(0, 1.22, -6.5);   // ✅ higher & centered
  pokerView.rotation.y = Math.PI;          // face toward spawn side
  world.group.add(pokerView);

  // ------------------ TELEPORT MACHINE + OFFICIAL SPAWN CIRCLE ------------------
  let teleLoaded = false;

  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);

    if (mod?.TeleportMachine?.build) {
      let tele = null;
      try {
        tele = mod.TeleportMachine.build({ THREE, scene, texLoader });
      } catch {
        tele = mod.TeleportMachine.build(scene, texLoader, THREE);
      }

      if (tele) {
        tele.position.set(0, 0, 2.2);
        world.teleporter = tele;
        teleLoaded = true;

        // safe spawn from teleporter
        if (typeof mod.TeleportMachine.getSafeSpawn === "function") {
          let s = null;
          try { s = mod.TeleportMachine.getSafeSpawn(THREE); } catch { s = mod.TeleportMachine.getSafeSpawn(); }
          if (s?.position) world.spawnPads = [s.position.clone()];
        }

        // tick fx
        if (typeof mod.TeleportMachine.tick === "function") {
          const prev = world.tick;
          world.tick = (dt) => {
            prev(dt);
            try { mod.TeleportMachine.tick(dt); } catch {}
          };
        }

        log("[world] ✅ TeleportMachine loaded + ticking");
      }
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  if (!teleLoaded) {
    const fallback = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.07, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x6a2bff, emissive: 0x6a2bff, emissiveIntensity: 1.2 })
    );
    fallback.rotation.x = Math.PI / 2;
    fallback.position.set(0, 1.0, 2.2);
    world.group.add(fallback);
    log("[world] ⚠️ Using fallback teleporter ring");
  }

  // ✅ OFFICIAL SPAWN CIRCLE (always visible)
  const spawnPos = world.spawnPads[0].clone();
  const spawnCircle = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.52, 64),
    new THREE.MeshStandardMaterial({
      color: 0x33ff66,
      emissive: 0x33ff66,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })
  );
  spawnCircle.rotation.x = -Math.PI / 2;
  spawnCircle.position.set(spawnPos.x, 0.02, spawnPos.z);
  spawnCircle.name = "SpawnCircle";
  world.group.add(spawnCircle);

  const prevSpawnTick = world.tick;
  world.tick = (dt) => {
    prevSpawnTick(dt);
    spawnCircle.userData.t = (spawnCircle.userData.t || 0) + dt;
    const t = spawnCircle.userData.t;
    spawnCircle.material.emissiveIntensity = 0.95 + Math.sin(t * 3.5) * 0.35;
  };

  // ------------------ BOTS (SAFE) with SHIRT + SHOULDERS ------------------
  world.bots = buildSafeBotsWithShirt(THREE, scene, world, T.shirt);

  const prevBots = world.tick;
  world.tick = (dt) => {
    prevBots(dt);
    world.bots.update(dt);
  };

  log("[world] ready ✅");
  return world;
}

// ===================== HELPERS =====================

function makeStem(THREE, y) {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.9, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
  );
  stem.position.y = y;
  return stem;
}

function makeBase(THREE, y) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1.0 })
  );
  base.position.y = y;
  return base;
}

function addWallArt(THREE, parent, tex, x, y, z, ry, w = 3.2, h = 2.0) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    map: tex || null,
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.position.set(x, y, z);
  p.rotation.y = ry;
  parent.add(p);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x111018, roughness: 0.85 })
  );
  frame.position.set(x, y, z - Math.cos(ry) * 0.02);
  frame.rotation.y = ry;
  parent.add(frame);
}

function makeChair(THREE) {
  const g = new THREE.Group();
  g.name = "Chair";

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 });
  const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 });

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 18), chairSeatMat);
  seat.position.y = 0.48;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.60, 0.08), chairMat);
  back.position.set(0, 0.85, -0.25);
  g.add(back);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.46, 12), chairMat);
  leg.position.y = 0.22;
  g.add(leg);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 16), chairMat);
  foot.position.y = 0.03;
  g.add(foot);

  return g;
}

function buildPokerView(THREE) {
  const g = new THREE.Group();
  g.name = "PokerView";

  // simple visible community cards
  const community = new THREE.Group();
  community.name = "community";

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xf4f5ff, roughness: 0.65 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.95 });

  for (let i = 0; i < 5; i++) {
    const card = new THREE.Group();

    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.30), cardMat);
    face.position.z = 0.003;
    card.add(face);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.30), backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.003;
    card.add(back);

    card.position.set((i - 2) * 0.26, 0, 0);
    card.rotation.x = -0.9;
    community.add(card);
  }

  community.position.y = 0.02;
  g.add(community);

  return g;
}

// ---------- SAFE BOTS fallback (with shirt + shoulders) ----------
function buildSafeBotsWithShirt(THREE, scene, world, shirtTex) {
  const bots = [];

  const bodyMatA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
  const bodyMatB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  // shirt material (texture optional)
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    map: shirtTex || null
  });

  function makeBot(i) {
    const g = new THREE.Group();
    g.name = `Bot_${i}`;

    // lower body (simple)
    const lower = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.35, 6, 12),
      i % 2 ? bodyMatA : bodyMatB
    );
    lower.position.y = 0.35;
    g.add(lower);

    // ✅ torso "shirt" (box gives better UV wrap than capsule)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.40, 0.26), shirtMat);
    torso.position.y = 0.75;
    torso.name = "TorsoShirt";
    g.add(torso);

    // ✅ shoulders so shirt looks filled-out
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), shirtMat);
    shoulderL.position.set(-0.27, 0.83, 0);
    g.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), shirtMat);
    shoulderR.position.set(0.27, 0.83, 0);
    g.add(shoulderR);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.15;
    g.add(head);

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

      // ✅ seat alignment: move slightly toward table so they don't "lean past chair"
      const towardTable = world.tableFocus.clone().sub(s.position).setY(0).normalize();
      const seatPos = s.position.clone().addScaledVector(towardTable, 0.18);

      b.position.set(seatPos.x, 0, seatPos.z);
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
