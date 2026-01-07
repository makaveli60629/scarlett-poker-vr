// /js/world.js — Scarlett VR Poker — Update 9.2
// Big room + table + chairs + bots + crowns + cards + hovering leaderboard
// + Teleport Machine (portal FX version)
// NOTE: This file is CLEAN (no stray returns, no RoundedBoxGeometry).

export async function initWorld(ctx) {
  const { THREE, scene, log } = ctx;

  // ---------- texture helper ----------
  const loader = new THREE.TextureLoader();
  const loadTex = (url, rx = 1, ry = 1) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (t) => {
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(rx, ry);
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });

  // Textures in your repo
  const carpet = await loadTex("./assets/textures/lobby_carpet.jpg", 7, 7);
  const brick = await loadTex("./assets/textures/brickwall.jpg", 5, 2);

  // ---------- ROOM ----------
  const ROOM = 46;      // bigger so you never spawn outside
  const wallH = 4.6;
  const wallT = 0.55;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
    new THREE.MeshStandardMaterial({
      color: carpet ? 0xffffff : 0x101010,
      map: carpet || null,
      roughness: 1,
      metalness: 0,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: brick || null,
    roughness: 0.95,
    metalness: 0,
  });

  addWall(0, wallH / 2, ROOM,  ROOM * 2, wallH, wallT);
  addWall(0, wallH / 2, -ROOM, ROOM * 2, wallH, wallT);
  addWall(ROOM, wallH / 2, 0,  wallT, wallH, ROOM * 2);
  addWall(-ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  scene.add(ceiling);

  // ---------- Spawn pads near lobby entrance ----------
  const spawnPads = [
    new THREE.Vector3(0, 0, 22),
    new THREE.Vector3(-3.0, 0, 22),
    new THREE.Vector3(3.0, 0, 22),
  ];

  for (let i = 0; i < spawnPads.length; i++) {
    makePad(spawnPads[i].x, spawnPads[i].z, i === 0);
  }

  // ---------- Teleport Machine (Portal FX) ----------
  const teleportMachine = createTeleportMachine(THREE, {
    texUrl: "./assets/textures/Teleport glow.jpg",
    pos: new THREE.Vector3(0, 0, 26),
    yaw: Math.PI,
    scale: 1.0,
  });
  scene.add(teleportMachine.group);

  // ---------- Table ----------
  const tableFocus = new THREE.Vector3(0, 0, 6);

  const tableGroup = new THREE.Group();
  tableGroup.position.copy(tableFocus);
  scene.add(tableGroup);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 2.65, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.75 })
  );
  rim.position.set(0, 0.90, 0);
  tableGroup.add(rim);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.11, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.set(0, 0.91, 0);
  tableGroup.add(felt);

  // ---------- Leaderboard (hovering neon glass) ----------
  const lb = makeLeaderboard(THREE);
  lb.position.set(tableFocus.x, 3.0, tableFocus.z);
  scene.add(lb);

  // ---------- Chairs + bots + crowns + cards ----------
  const bots = [];
  const crowns = [];
  const seatCount = 8;
  const radius = 3.35;

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = tableFocus.x + Math.cos(a) * radius;
    const z = tableFocus.z + Math.sin(a) * radius;

    const chair = makeChair(THREE);
    chair.position.set(x, 0, z);
    chair.lookAt(tableFocus.x, chair.position.y, tableFocus.z);
    scene.add(chair);

    // bot body (simple but stable)
    const bot = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.60, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.95 })
    );
    body.position.y = 1.05;
    bot.add(body);

    // shirt band
    const shirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.275, 0.275, 0.30, 18),
      new THREE.MeshStandardMaterial({ color: 0x1b2a9e, roughness: 0.8 })
    );
    shirt.position.y = 1.05;
    bot.add(shirt);

    bot.position.set(x, 0, z);
    bot.lookAt(tableFocus.x, 1.05, tableFocus.z);
    scene.add(bot);
    bots.push(bot);

    // crown (spikes UP)
    const crown = makeCrown(THREE);
    crown.position.set(x, 1.62, z);
    crown.lookAt(tableFocus.x, crown.position.y, tableFocus.z);
    scene.add(crown);
    crowns.push(crown);

    // visible hand cards
    const c1 = makeCard(THREE, 0xffffff);
    const c2 = makeCard(THREE, 0xffffff);
    c1.position.set(x + Math.cos(a) * -0.25, 1.02, z + Math.sin(a) * -0.25);
    c2.position.set(x + Math.cos(a) * -0.15, 1.02, z + Math.sin(a) * -0.15);
    c1.lookAt(tableFocus.x, 1.02, tableFocus.z);
    c2.lookAt(tableFocus.x, 1.02, tableFocus.z);
    scene.add(c1, c2);
  }

  // community cards that “flip on” so you see the game playing
  const community = [];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(THREE, 0x111111);
    c.position.set(tableFocus.x + (i - 2) * 0.22, 1.01, tableFocus.z);
    c.rotation.x = -Math.PI / 2;
    scene.add(c);
    community.push(c);
  }

  log("✅ world.js 9.2 loaded (room/table/bots/portal machine/cards)");

  return {
    spawnPads,
    tableFocus,
    teleportMachine,
    roomClamp: { minX: -ROOM + 1.6, maxX: ROOM - 1.6, minZ: -ROOM + 1.6, maxZ: ROOM - 1.6 },
    tick: (dt) => {
      const t = performance.now() * 0.001;

      // portal FX
      teleportMachine.tick(dt, t);

      // idle movement + crown spin
      for (let i = 0; i < bots.length; i++) {
        const body = bots[i].children[0];
        body.position.y = 1.05 + Math.sin(t * 1.4 + i) * 0.01;

        crowns[i].position.y = 1.62 + Math.sin(t * 2.0 + i) * 0.02;
        crowns[i].rotation.y += dt * 0.6;
      }

      // reveal community cards in a loop so it looks alive
      const phase = Math.floor((t * 0.7) % 6); // 0..5
      for (let i = 0; i < community.length; i++) {
        const revealed = i < phase;
        community[i].material.emissiveIntensity = revealed ? 0.2 : 0.0;
        community[i].material.color.setHex(revealed ? 0xffffff : 0x111111);
      }
    },
  };

  // ---------- helpers ----------
  function addWall(x, y, z, sx, sy, sz) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
    w.position.set(x, y, z);
    scene.add(w);
  }

  function makePad(x, z, isMain) {
    const mat = new THREE.MeshStandardMaterial({
      color: isMain ? 0x113018 : 0x0a2a18,
      roughness: 0.85,
      emissive: new THREE.Color(0x22ff55),
      emissiveIntensity: isMain ? 0.25 : 0.12,
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.10, 32), mat);
    pad.position.set(x, 0.05, z);
    scene.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 36),
      new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.11, z);
    scene.add(ring);
  }
}

// ---------- Chair ----------
function makeChair(THREE) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.10, 0.64), wood);
  seat.position.set(0, 0.48, 0);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.66, 0.10), wood);
  back.position.set(0, 0.82, -0.27);
  g.add(back);

  for (const [lx, lz] of [[-0.23,-0.23],[0.23,-0.23],[-0.23,0.23],[0.23,0.23]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 12), metal);
    leg.position.set(lx, 0.24, lz);
    g.add(leg);
  }
  return g;
}

// ---------- Crown (spikes UP) ----------
function makeCrown(THREE) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    roughness: 0.35,
    metalness: 0.8,
    emissive: new THREE.Color(0x221400),
    emissiveIntensity: 0.08,
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 12, 26), gold);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  const spikeGeo = new THREE.ConeGeometry(0.05, 0.14, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spike = new THREE.Mesh(spikeGeo, gold);
    spike.position.set(Math.cos(a) * 0.19, 0.11, Math.sin(a) * 0.19);
    // upright spikes (no inversion)
    spike.rotation.x = 0;
    g.add(spike);
  }
  return g;
}

// ---------- Card ----------
function makeCard(THREE, base = 0xffffff) {
  const mat = new THREE.MeshStandardMaterial({
    color: base,
    roughness: 0.7,
    metalness: 0.0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0,
  });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.0025, 0.20), mat);
  card.rotation.x = -Math.PI / 2;
  return card;
}

// ---------- Leaderboard (safe geometry only) ----------
function makeLeaderboard(THREE) {
  const g = new THREE.Group();

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.55, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x0b0b0b,
      roughness: 0.25,
      metalness: 0.15,
      emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.75,
    })
  );
  g.add(glass);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(2.32, 0.60, 0.01),
    new THREE.MeshBasicMaterial({ color: 0x33ff66 })
  );
  trim.position.z = 0.04;
  g.add(trim);

  return g;
}

// ================== TELEPORT MACHINE (Portal FX) ==================
function createTeleportMachine(THREE, {
  texUrl = "./assets/textures/Teleport glow.jpg",
  pos = new THREE.Vector3(0, 0, 26),
  yaw = Math.PI,
  scale = 1.0
} = {}) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = yaw;
  g.scale.setScalar(scale);

  const loader = new THREE.TextureLoader();
  const portalTex = loader.load(texUrl);
  portalTex.wrapS = THREE.RepeatWrapping;
  portalTex.wrapT = THREE.RepeatWrapping;

  const W = 2.4, H = 3.2, T = 0.18;
  const INNER_W = 1.65, INNER_H = 2.55;
  const BASE_R = 1.35;

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x07121c,
    roughness: 0.55,
    metalness: 0.35,
  });

  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x0b3b55,
    roughness: 0.15,
    metalness: 0.35,
    emissive: new THREE.Color(0x33ffcc),
    emissiveIntensity: 0.9,
  });

  const portalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: portalTex,
    transparent: true,
    opacity: 0.95,
    emissive: new THREE.Color(0x66ccff),
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.0,
    depthWrite: false,
  });

  // base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_R, BASE_R, 0.22, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.9, metalness: 0.2 })
  );
  base.position.y = 0.11;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(BASE_R * 0.78, 0.06, 14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0b3,
      emissive: new THREE.Color(0x33ffcc),
      emissiveIntensity: 1.1,
      roughness: 0.3,
      metalness: 0.1,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.26;
  g.add(ring);

  // frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), frameMat);
  frame.position.y = H * 0.5;
  g.add(frame);

  // portal plane
  const portalPlane = new THREE.Mesh(new THREE.PlaneGeometry(INNER_W, INNER_H), portalMat);
  portalPlane.position.set(0, H * 0.5, T * 0.51);
  g.add(portalPlane);

  // neon trims
  const trimTop = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.07, 0.02), neonMat);
  trimTop.position.set(0, H - 0.18, T * 0.52);
  g.add(trimTop);

  const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.07, H * 0.86, 0.02), neonMat);
  trimLeft.position.set(-W * 0.43, H * 0.5, T * 0.52);
  g.add(trimLeft);

  const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.07, H * 0.86, 0.02), neonMat);
  trimRight.position.set(W * 0.43, H * 0.5, T * 0.52);
  g.add(trimRight);

  // lightning + particles
  const boltL = makeLightningBolt(THREE, 0xCC66FF);
  const boltR = makeLightningBolt(THREE, 0xCC66FF);
  boltL.position.set(-W * 0.38, H - 0.06, T * 0.55);
  boltR.position.set(W * 0.38, H - 0.06, T * 0.55);
  g.add(boltL, boltR);

  const particles = makePortalParticles(THREE, 240);
  particles.position.set(0, H * 0.52, T * 0.40);
  g.add(particles);

  return {
    group: g,
    tick(dt, time) {
      portalTex.offset.x = (portalTex.offset.x + dt * 0.05) % 1;
      portalTex.offset.y = (portalTex.offset.y + dt * 0.08) % 1;
      portalPlane.material.emissiveIntensity = 0.55 + Math.sin(time * 3.1) * 0.25;

      animateBolt(boltL, time);
      animateBolt(boltR, time + 1.7);
      animateParticles(particles, dt, time);
    }
  };
}

function makeLightningBolt(THREE, hex = 0xCC66FF) {
  const mat = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.9 });
  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(8 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const line = new THREE.Line(geo, mat);
  line.userData.ptsCount = 8;
  return line;
}

function animateBolt(line, t) {
  const pos = line.geometry.attributes.position.array;
  const n = line.userData.ptsCount;

  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const x = (Math.sin(t * 6.0 + i * 1.9) * 0.10) * (1 - p);
    const y = p * (0.45 + Math.sin(t * 4.0) * 0.05);
    const z = (Math.cos(t * 5.0 + i * 2.3) * 0.06) * (1 - p);
    pos[i * 3 + 0] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.material.opacity = 0.55 + Math.sin(t * 12.0) * 0.25;
}

function makePortalParticles(THREE, count = 200) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * 2.6;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;

    vel[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("velocity", new THREE.BufferAttribute(vel, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.035,
    color: 0x88ddff,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  const pts = new THREE.Points(geo, mat);
  pts.userData.count = count;
  return pts;
}

function animateParticles(points, dt, t) {
  const pos = points.geometry.attributes.position.array;
  const vel = points.geometry.attributes.velocity.array;
  const count = points.userData.count;

  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] += vel[i * 3 + 0] * dt;
    pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
    pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

    pos[i * 3 + 0] *= (1 - dt * 0.06);
    pos[i * 3 + 1] *= (1 - dt * 0.06);

    if (pos[i * 3 + 0] > 1.4) pos[i * 3 + 0] = -1.4;
    if (pos[i * 3 + 0] < -1.4) pos[i * 3 + 0] = 1.4;
    if (pos[i * 3 + 1] > 1.2) pos[i * 3 + 1] = -1.2;
    if (pos[i * 3 + 1] < -1.2) pos[i * 3 + 1] = 1.2;
  }

  points.material.opacity = 0.45 + Math.sin(t * 2.2) * 0.2;
  points.geometry.attributes.position.needsUpdate = true;
}
