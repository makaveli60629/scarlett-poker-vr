// /js/world.js — Scarlett VR Poker — Update 9.1 (Bigger room + bots + crown fixed + visible cards)

export async function initWorld(ctx) {
  const { THREE, scene, log } = ctx;

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

  // Textures you showed in repo
  const carpet = await loadTex("./assets/textures/lobby_carpet.jpg", 7, 7);
  const brick = await loadTex("./assets/textures/brickwall.jpg", 5, 2);

  // ROOM
  const ROOM = 40;        // bigger
  const wallH = 4.2;
  const wallT = 0.5;

  // floor
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
  scene.add(floor);

  // walls (one consistent style)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: brick || null,
    roughness: 0.95,
    metalness: 0,
  });

  addWall(0, wallH / 2, ROOM, ROOM * 2, wallH, wallT);
  addWall(0, wallH / 2, -ROOM, ROOM * 2, wallH, wallT);
  addWall(ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);
  addWall(-ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);

  // ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  scene.add(ceiling);

  // spawn pads near lobby entrance
  const spawnPads = [
    new THREE.Vector3(0, 0, 20),
    new THREE.Vector3(-2.8, 0, 20),
    new THREE.Vector3(2.8, 0, 20),
  ];

  for (let i = 0; i < spawnPads.length; i++) {
    makePad(spawnPads[i].x, spawnPads[i].z, i === 0);
  }

  // TELEPORT MACHINE (simple visual marker near spawn)
  const machine = new THREE.Group();
  machine.position.set(0, 0, 24);
  scene.add(machine);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.25, 28),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  );
  base.position.y = 0.125;
  machine.add(base);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.08, 14, 42),
    new THREE.MeshStandardMaterial({
      color: 0x0b3,
      emissive: new THREE.Color(0x22ff55),
      emissiveIntensity: 0.6,
      roughness: 0.4,
    })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.34;
  machine.add(glow);

  // TABLE
  const tableFocus = new THREE.Vector3(0, 0, 6);

  const tableGroup = new THREE.Group();
  tableGroup.position.copy(tableFocus);
  scene.add(tableGroup);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.55, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.75 })
  );
  rim.position.set(0, 0.90, 0);
  tableGroup.add(rim);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, 0.11, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.set(0, 0.91, 0);
  tableGroup.add(felt);

  // LEADERBOARD (hovering neon glass look)
  const lb = makeLeaderboard(THREE);
  lb.position.set(tableFocus.x, 2.9, tableFocus.z);
  scene.add(lb);

  // BOTS + CHAIRS
  const bots = [];
  const crowns = [];
  const cards = [];

  const seatCount = 8;
  const radius = 3.2;

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = tableFocus.x + Math.cos(a) * radius;
    const z = tableFocus.z + Math.sin(a) * radius;

    // chair (fixed upright)
    const chair = makeChair(THREE);
    chair.position.set(x, 0, z);
    chair.lookAt(tableFocus.x, chair.position.y, tableFocus.z);
    scene.add(chair);

    // bot body
    const bot = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.95 })
    );
    body.position.y = 1.05;
    bot.add(body);

    // simple shirt band (so it looks like shirt fits a body)
    const shirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.255, 0.255, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0x1b2a9e, roughness: 0.8 })
    );
    shirt.position.y = 1.05;
    bot.add(shirt);

    bot.position.set(x, 0, z);
    bot.lookAt(tableFocus.x, 1.05, tableFocus.z);
    scene.add(bot);
    bots.push(bot);

    // crown (FIXED upright spikes)
    const crown = makeCrown(THREE);
    crown.position.set(x, 1.58, z);
    crown.lookAt(tableFocus.x, crown.position.y, tableFocus.z);
    scene.add(crown);
    crowns.push(crown);

    // visible "hand cards" (placeholders)
    const c1 = makeCard(THREE);
    const c2 = makeCard(THREE);
    c1.position.set(x + Math.cos(a) * -0.25, 1.02, z + Math.sin(a) * -0.25);
    c2.position.set(x + Math.cos(a) * -0.15, 1.02, z + Math.sin(a) * -0.15);
    c1.lookAt(tableFocus.x, 1.02, tableFocus.z);
    c2.lookAt(tableFocus.x, 1.02, tableFocus.z);
    scene.add(c1, c2);
    cards.push(c1, c2);
  }

  // COMMUNITY CARDS (center of table, animate so you SEE “play”)
  const community = [];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(THREE, 0x111111);
    c.position.set(tableFocus.x + (i - 2) * 0.22, 1.01, tableFocus.z);
    c.rotation.x = -Math.PI / 2;
    scene.add(c);
    community.push(c);
  }

  log("✅ world.js 9.1 loaded (room/table/bots/crowns/cards visible)");

  return {
    spawnPads,
    tableFocus,
    roomClamp: { minX: -ROOM + 1.4, maxX: ROOM - 1.4, minZ: -ROOM + 1.4, maxZ: ROOM - 1.4 },
    tick: (dt) => {
      const t = performance.now() * 0.001;

      // subtle idle
      for (let i = 0; i < bots.length; i++) {
        bots[i].children[0].position.y = 1.05 + Math.sin(t * 1.4 + i) * 0.01;
        crowns[i].position.y = 1.58 + Math.sin(t * 2.0 + i) * 0.02;
        crowns[i].rotation.y += dt * 0.6;
      }

      // "gameplay" demo: flip community cards in sequence
      const phase = Math.floor((t * 0.7) % 6); // 0..5
      for (let i = 0; i < community.length; i++) {
        const revealed = i < phase;
        community[i].material.emissiveIntensity = revealed ? 0.2 : 0.0;
        community[i].material.color.setHex(revealed ? 0xffffff : 0x111111);
      }
    },
  };

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

function makeCrown(THREE) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    roughness: 0.35,
    metalness: 0.8,
    emissive: new THREE.Color(0x221400),
    emissiveIntensity: 0.08,
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 12, 26), gold);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // spikes UP (your old issue was they were inverted)
  const spikeGeo = new THREE.ConeGeometry(0.045, 0.12, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spike = new THREE.Mesh(spikeGeo, gold);
    spike.position.set(Math.cos(a) * 0.18, 0.10, Math.sin(a) * 0.18);
    spike.rotation.x = 0; // upright
    g.add(spike);
  }

  return g;
}

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

function makeLeaderboard(THREE) {
  const g = new THREE.Group();

  const glass = new THREE.Mesh(
    new THREE.RoundedBoxGeometry(2.2, 0.55, 0.06, 8, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x0b0b0b,
      roughness: 0.25,
      metalness: 0.1,
      emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.72,
    })
  );
  g.add(glass);

  const bar = new THREE.Mesh(
    new THREE.RoundedBoxGeometry(2.05, 0.10, 0.02, 6, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x33ff66 })
  );
  bar.position.y = -0.19;
  bar.position.z = 0.04;
  g.add(bar);

  return g;
}
