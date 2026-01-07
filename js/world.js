// /js/world.js — Scarlett VR Poker — Update 9.0 (Patch C)
// Fixes:
// - No read-only position assignments
// - Chair + bot lookAt is yaw-only (no reclining/pitch)
// - Crown spikes upright (not inverted cups)
// Adds:
// - Neon/glassy leaderboard hovering above table
// - Turn indicator system (ring + countdown label)
// - Card placeholders (community + hole cards)

export async function initWorld(ctx) {
  const { THREE, scene, hubLog } = ctx;
  const log = (m) => { try { hubLog?.(String(m)); } catch {} };

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

  const texCarpet = await loadTex("./assets/textures/lobby_carpet.jpg", 6, 6);
  const texRosewood = await loadTex("./assets/textures/rosewood_veneer1_4k.jpg", 2, 2);
  const texShirt = await loadTex("./assets/textures/shirt_diffuse.png", 1, 1);
  const texCrown = await loadTex("./assets/textures/crown_diffuse.png", 1, 1);
  const texCardBack = await loadTex("./assets/textures/Card back.jpg", 1, 1);

  // Room
  const ROOM = 34;
  const wallH = 3.9;
  const wallT = 0.45;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.95,
    metalness: 0.0,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: texCarpet ? 0xffffff : 0x101010,
    map: texCarpet || null,
    roughness: 1.0,
    metalness: 0.0,
  });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  addWall(0, wallH / 2, ROOM, ROOM * 2, wallH, wallT);
  addWall(0, wallH / 2, -ROOM, ROOM * 2, wallH, wallT);
  addWall(ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);
  addWall(-ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = wallH;
  scene.add(ceil);

  // Pads / spawns
  const teleportPads = [];
  const spawnPads = [];

  const padMat = new THREE.MeshStandardMaterial({
    color: 0x0a2a18,
    roughness: 0.8,
    emissive: new THREE.Color(0x062010),
    emissiveIntensity: 0.25,
  });

  const padSpawnMat = new THREE.MeshStandardMaterial({
    color: 0x113018,
    roughness: 0.6,
    emissive: new THREE.Color(0x22ff55),
    emissiveIntensity: 0.25,
  });

  function makePad(x, z, isSpawn = false) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.09, 32),
      isSpawn ? padSpawnMat : padMat
    );
    pad.position.set(x, 0.045, z);
    scene.add(pad);
    teleportPads.push(pad);
    if (isSpawn) spawnPads.push(new THREE.Vector3(x, 0, z));

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.40, 0.58, 32),
      new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.10, z);
    scene.add(ring);

    return pad;
  }

  // Spawn pads (in front of table area)
  makePad(0, 18, true);
  makePad(-2.6, 18, true);
  makePad(2.6, 18, true);

  // Extra pads
  makePad(0, 10, false);
  makePad(-10, 8, false);
  makePad(10, 8, false);
  makePad(0, -14, false);

  // Materials
  const woodMat = new THREE.MeshStandardMaterial({
    color: texRosewood ? 0xffffff : 0x2b1d12,
    map: texRosewood || null,
    roughness: 0.75,
    metalness: 0.05,
  });

  // Teleport machine (keep it behind spawn)
  const machine = new THREE.Group();
  {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.26, 32), woodMat);
    base.position.set(0, 0.13, 22);
    machine.add(base);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.95, 24),
      new THREE.MeshStandardMaterial({
        color: 0x131313,
        roughness: 0.35,
        metalness: 0.7,
        emissive: new THREE.Color(0x081808),
        emissiveIntensity: 0.32,
      })
    );
    core.position.set(0, 0.70, 22);
    machine.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.07, 16, 50),
      new THREE.MeshStandardMaterial({
        color: 0x33ff66,
        emissive: new THREE.Color(0x22ff55),
        emissiveIntensity: 0.5,
        roughness: 0.4,
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.18, 22);
    machine.add(halo);
  }
  scene.add(machine);

  // TABLE
  const tableFocus = new THREE.Vector3(0, 0, 6);

  const table = new THREE.Group();
  table.position.copy(tableFocus);
  scene.add(table);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.16, 64), woodMat);
  tableTop.position.set(0, 0.88, 0);
  table.add(tableTop);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.10, 2.10, 0.11, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.set(0, 0.89, 0);
  table.add(felt);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.75, 0.88, 24),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
  );
  pedestal.position.set(0, 0.44, 0);
  table.add(pedestal);

  // Hover neon leaderboard ABOVE table
  const board = makeNeonBoard(THREE, "LEADERBOARD\n1) Player\n2) Ace of Spades\n3) Bot King\n\n(placeholder)");
  board.position.set(table.position.x, 3.05, table.position.z);
  board.lookAt(table.position.x, 3.05, table.position.z - 2);
  scene.add(board);

  // Store kiosk marker
  const store = makeKiosk(THREE, woodMat, "STORE\nHats / Shirts\n(placeholder)");
  store.position.set(12.0, 0, 9);
  store.rotation.y = -Math.PI / 2.3;
  scene.add(store);

  // Bots / chairs
  const bots = [];
  const seatCount = 8;
  const radius = 3.05;

  const botSuitMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.92 });
  const botHeadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });

  // “Better body” for shirt: use a wider torso capsule + shoulders
  const shirtMat = new THREE.MeshStandardMaterial({
    color: texShirt ? 0xffffff : 0x444444,
    map: texShirt || null,
    roughness: 0.9,
  });

  // Crown
  const crown = makeCrown(THREE, texCrown);
  crown.visible = false;
  scene.add(crown);

  // Turn indicator ring + countdown label (attached to current bot)
  const turnIndicator = makeTurnIndicator(THREE);
  scene.add(turnIndicator.group);

  // Cards (placeholders)
  const community = makeCommunityCards(THREE, texCardBack);
  community.group.position.set(table.position.x, 1.05, table.position.z);
  scene.add(community.group);

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = table.position.x + Math.cos(a) * radius;
    const z = table.position.z + Math.sin(a) * radius;

    const chair = makeChair(THREE, woodMat);
    chair.position.set(x, 0, z);

    // ✅ FIX: yaw-only “look at table”
    yawLookAt(chair, table.position);

    scene.add(chair);

    const bot = new THREE.Group();

    // Better torso for shirt fit
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.52, 6, 14), i === 0 ? shirtMat : botSuitMat);
    torso.position.set(0, 1.02, 0);
    bot.add(torso);

    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), i === 0 ? shirtMat : botSuitMat);
    shoulders.scale.set(1.35, 0.65, 1.1);
    shoulders.position.set(0, 1.20, 0);
    bot.add(shoulders);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), botHeadMat);
    head.position.set(0, 1.55, 0);
    bot.add(head);

    bot.position.set(x, 0, z);
    yawLookAt(bot, table.position);
    scene.add(bot);

    const tag = makeNameTag(THREE, `BOT ${i + 1}\n$${(1000 + i * 250).toLocaleString()}`);
    tag.position.set(0, 1.92, 0);
    bot.add(tag);

    // Hole cards placeholders above bot hands area
    const hole = makeHoleCards(THREE, texCardBack);
    hole.group.position.set(0, 1.12, 0.28);
    bot.add(hole.group);

    bots.push({ bot, hole });
  }

  // Pot
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.20, 0.09, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd36a, roughness: 0.35, metalness: 0.4 })
  );
  pot.position.set(table.position.x, 0.97, table.position.z);
  scene.add(pot);

  // Crown cycle / light animation stub
  let t = 0;
  let dealTimer = 0;
  let winnerIndex = 0;

  function setWinner(idx) {
    winnerIndex = ((idx % bots.length) + bots.length) % bots.length;
    const w = bots[winnerIndex].bot;
    crown.visible = true;
    crown.position.set(w.position.x, 1.78, w.position.z);
  }
  setWinner(0);

  function tick(dt) {
    t += dt;

    // subtle idle
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i].bot;
      b.position.y = Math.sin(t * 1.2 + i) * 0.01;
    }

    if (crown.visible) {
      const w = bots[winnerIndex].bot;
      crown.position.x = w.position.x;
      crown.position.z = w.position.z;
      crown.rotation.y += dt * 1.2;
    }

    pot.scale.setScalar(1 + Math.sin(t * 2.2) * 0.05);

    dealTimer += dt;
    if (dealTimer > 4.0) {
      dealTimer = 0;
      setWinner(winnerIndex + 1);
    }

    // Animate community cards slightly
    community.group.rotation.y = Math.sin(t * 0.6) * 0.03;
  }

  // Expose turn indicator control to main.js
  turnIndicator.setTurn = (idx, secondsLeft) => {
    if (!bots.length) return;
    const i = ((idx % bots.length) + bots.length) % bots.length;
    const b = bots[i].bot;

    // ring on floor under bot
    turnIndicator.group.position.set(b.position.x, 0.03, b.position.z);
    turnIndicator.group.visible = true;

    turnIndicator.setText(`TURN: BOT ${i + 1}\n${Math.ceil(secondsLeft)}s`);
  };

  log("✅ World loaded (Patch C)");

  return {
    floorMesh,
    teleportPads,
    spawnPads,
    roomClamp: { minX: -ROOM + 1.2, maxX: ROOM - 1.2, minZ: -ROOM + 1.2, maxZ: ROOM - 1.2 },
    tableFocus,
    tick,
    turnIndicator,
  };

  function addWall(x, y, z, sx, sy, sz) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
    w.position.set(x, y, z);
    scene.add(w);
  }
}

function yawLookAt(obj, targetPos) {
  // yaw-only: match Y so lookAt doesn't pitch
  const p = obj.position;
  obj.lookAt(targetPos.x, p.y, targetPos.z);
}

function makeChair(THREE, woodMat) {
  const g = new THREE.Group();

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), woodMat);
  seat.position.set(0, 0.46, 0);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.09), woodMat);
  back.position.set(0, 0.78, -0.26);
  g.add(back);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  for (const [lx, lz] of [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.22],
    [0.22, 0.22],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 10), legMat);
    leg.position.set(lx, 0.23, lz);
    g.add(leg);
  }

  return g;
}

function makeCrown(THREE, texCrown) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: texCrown ? 0xffffff : 0xffd36a,
    map: texCrown || null,
    roughness: 0.35,
    metalness: 0.55,
    emissive: new THREE.Color(0x222200),
    emissiveIntensity: 0.12,
  });

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 14, 28), mat);
  band.rotation.x = Math.PI / 2;
  g.add(band);

  // ✅ FIX: spikes upright (no upside-down cones)
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 10), mat);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.16, 0.12, Math.sin(a) * 0.16);
    spike.rotation.x = 0; // upright
    g.add(spike);
  }

  g.position.y = 1.78;
  return g;
}

function makeNameTag(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.fillStyle = "rgba(0,0,0,0.55)";
  c.fillRect(0, 0, 512, 256);
  c.strokeStyle = "rgba(51,255,102,0.55)";
  c.lineWidth = 6;
  c.strokeRect(16, 16, 480, 224);

  c.fillStyle = "white";
  c.font = "bold 40px system-ui, Arial";
  c.textBaseline = "top";

  const lines = String(text).split("\n");
  let y = 34;
  for (const line of lines) {
    c.fillText(line, 36, y);
    y += 54;
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.38), mat);
  mesh.renderOrder = 9999;
  return mesh;
}

function makeNeonBoard(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // glassy background
  ctx.fillStyle = "rgba(10,10,12,0.35)";
  ctx.fillRect(0, 0, 512, 512);

  // neon border glow
  ctx.strokeStyle = "rgba(51,255,102,0.75)";
  ctx.lineWidth = 10;
  ctx.strokeRect(26, 26, 460, 460);

  ctx.strokeStyle = "rgba(51,255,102,0.22)";
  ctx.lineWidth = 28;
  ctx.strokeRect(36, 36, 440, 440);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 34px system-ui, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const lines = String(text).split("\n");
  let y = 40;
  for (const line of lines) {
    ctx.fillText(line, 54, y);
    y += 44;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  // “Glassy” material
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    roughness: 0.15,
    metalness: 0.0,
    transmission: 0.65,
    thickness: 0.18,
    emissive: new THREE.Color(0x33ff66),
    emissiveIntensity: 0.18,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), mat);

  // subtle glow backplate
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.75, 2.75),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.08 })
  );
  glow.position.z = -0.01;

  const g = new THREE.Group();
  g.add(mesh);
  g.add(glow);
  return g;
}

function makeTurnIndicator(THREE) {
  const group = new THREE.Group();
  group.visible = true;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.55, 42),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  const label = makeNameTag(THREE, "TURN\n15s");
  label.position.set(0, 2.1, 0);
  group.add(label);

  return {
    group,
    setText: (t) => {
      // recreate texture quickly (simple approach)
      group.remove(label);
      const newLabel = makeNameTag(THREE, t);
      newLabel.position.set(0, 2.1, 0);
      group.add(newLabel);
    },
  };
}

function makeCommunityCards(THREE, texCardBack) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: texCardBack || null,
    color: texCardBack ? 0xffffff : 0xdddddd,
    transparent: true,
    opacity: 0.98,
  });

  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), mat);
    card.rotation.x = -Math.PI / 2;
    card.position.set((i - 2) * 0.26, 0.01, 0);
    group.add(card);
  }

  return { group };
}

function makeHoleCards(THREE, texCardBack) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: texCardBack || null,
    color: texCardBack ? 0xffffff : 0xdddddd,
    transparent: true,
    opacity: 0.98,
  });

  const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), mat);
  const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), mat);

  c1.rotation.x = -Math.PI / 2;
  c2.rotation.x = -Math.PI / 2;

  c1.position.set(-0.11, 0.01, 0);
  c2.position.set(0.11, 0.01, 0);

  c1.rotation.z = 0.12;
  c2.rotation.z = -0.12;

  group.add(c1, c2);
  return { group };
}

function makeBillboard(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.fillStyle = "white";
  ctx.font = "bold 34px system-ui, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const lines = String(text).split("\n");
  let y = 32;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 44;
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
  mesh.position.y = 1.6;
  return mesh;
}

function makeKiosk(THREE, woodMat, label) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.1), woodMat);
  base.position.set(0, 0.5, 0);
  g.add(base);

  const sign = makeBillboard(THREE, label);
  sign.position.set(0, 1.8, 0.7);
  g.add(sign);

  return g;
      }
