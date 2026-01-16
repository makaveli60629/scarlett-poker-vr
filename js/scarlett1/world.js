// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v4_0_POKER_MECHANICS_LITE_BOTS
// ✅ Restores: lobby + 4 rooms + divot table + store mannequins + scorpion room
// ✅ Adds: hovering cards, turn indicator, dealer chip locked flat, chip stacks
// ✅ Adds: simple bot walkers (Quest-safe, no skeletons)
// ✅ World tick is lightweight (Quest safe)

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_FULL_v4_0_POKER_MECHANICS_LITE_BOTS";
  writeHud?.(`[world] build starting… ${BUILD}`);

  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1, metalness: 0 }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x171a24, roughness: 0.95, metalness: 0 }),
    trim:  new THREE.MeshStandardMaterial({ color: 0x1f2535, roughness: 0.7, metalness: 0.1 }),
    neonBlue: new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x00333a), emissiveIntensity: 0.6 }),
    neonPink: new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x33001f), emissiveIntensity: 0.55 }),
    gold:  new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.3 }),
    felt:  new THREE.MeshStandardMaterial({ color: 0x0b4a3e, roughness: 1, metalness: 0 }),
    chip:  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.05 }),
    cardBack: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 }),
    cardFace: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9, metalness: 0.0 }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 1, metalness: 0 }),
  };

  const world = new THREE.Group();
  world.name = "WORLD_ROOT";
  scene.add(world);

  const LOBBY_RADIUS = 14;
  const WALL_H = 4.2;
  const HALL_LEN = 10;
  const ROOM_SIZE = 10;

  // Lobby floor
  const lobby = new THREE.Group(); lobby.name = "LOBBY"; world.add(lobby);

  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_RADIUS, 64), M.floor);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001;
  lobby.add(lobbyFloor);

  // Lobby walls (cheap cylinder)
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, WALL_H, 48, 1, true),
    M.wall
  );
  lobbyWall.position.y = WALL_H / 2;
  lobbyWall.rotation.y = Math.PI / 48;
  lobby.add(lobbyWall);

  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_RADIUS - 0.35, 0.08, 12, 64),
    M.neonBlue
  );
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.03;
  lobby.add(neonRing);

  // Center divot + table
  const center = new THREE.Group(); center.name = "CENTERPIECE"; lobby.add(center);

  const divotR = 6.4;
  const divotDepth = 0.55;

  const divotFloor = new THREE.Mesh(new THREE.CircleGeometry(divotR, 64), new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 1, metalness: 0 }));
  divotFloor.rotation.x = -Math.PI / 2;
  divotFloor.position.y = -divotDepth;
  center.add(divotFloor);

  const divotWall = new THREE.Mesh(new THREE.CylinderGeometry(divotR, divotR, divotDepth, 64, 1, true), M.trim);
  divotWall.position.y = -divotDepth / 2;
  center.add(divotWall);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(divotR + 0.3, 0.07, 10, 64), M.gold);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.08;
  center.add(rail);

  const table = new THREE.Group(); table.name = "POKER_TABLE";
  table.position.y = -divotDepth + 0.02;
  center.add(table);

  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.55, 24), M.trim);
  tableBase.position.y = 0.28;
  table.add(tableBase);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.22, 48), M.trim);
  tableTop.position.y = 0.55;
  table.add(tableTop);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.08, 48), M.felt);
  felt.position.y = 0.66;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.12, 10, 48), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.70;
  table.add(rim);

  // Dealer chip (LOCKED)
  const dealerChip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.chip);
  dealerChip.name = "DEALER_CHIP";
  dealerChip.position.set(0.95, 0.74, 0.35);
  dealerChip.rotation.set(-Math.PI / 2, 0, 0);
  dealerChip.userData.spin = false;
  dealerChip.material.emissive = new THREE.Color(0x000000);
  dealerChip.material.emissiveIntensity = 0;
  table.add(dealerChip);

  // Chip stacks (visual)
  function chipStack(x, z, h = 9) {
    const g = new THREE.Group(); g.name = "ChipStack";
    for (let i = 0; i < h; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18), M.chip);
      c.position.set(0, i * 0.032, 0);
      g.add(c);
    }
    g.position.set(x, 0.72, z);
    return g;
  }
  table.add(chipStack(-1.1, -0.55, 10));
  table.add(chipStack(-0.7, -1.0, 8));
  table.add(chipStack( 1.4, -0.9, 7));

  // -----------------------------
  // Hovering cards (two hole cards + 5 community placeholders)
  // -----------------------------
  const cards = new THREE.Group(); cards.name = "CARDS_ROOT"; table.add(cards);

  function makeCard() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.0025, 0.23), M.cardBack);
    body.position.y = 0.0;
    g.add(body);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.158, 0.228), M.cardFace);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0016;
    g.add(face);

    // tiny rim so it reads in VR
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.0015, 0.235), M.trim);
    rim.position.y = -0.001;
    g.add(rim);
    return g;
  }

  // Hover height above felt
  const CARD_Y = 0.745; // table felt ~0.66, rim ~0.70, so hover above
  const HOLE_Z = 1.15;

  const hole1 = makeCard(); hole1.name = "HOLE_1"; hole1.position.set(-0.18, CARD_Y, HOLE_Z); hole1.rotation.y = 0.12;
  const hole2 = makeCard(); hole2.name = "HOLE_2"; hole2.position.set( 0.18, CARD_Y, HOLE_Z); hole2.rotation.y = -0.12;
  cards.add(hole1, hole2);

  // Community cards in a line
  const comm = [];
  for (let i = 0; i < 5; i++) {
    const c = makeCard();
    c.name = `COMM_${i}`;
    c.position.set((-0.4 + i * 0.2), CARD_Y, -0.15);
    c.rotation.y = 0;
    cards.add(c);
    comm.push(c);
  }

  // Subtle hover animation
  const hover = { t: 0 };

  // -----------------------------
  // Turn Indicator (who’s up)
  // -----------------------------
  const turnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.44, 44),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  turnRing.rotation.x = -Math.PI / 2;
  turnRing.position.set(0, 0.03, 0);
  turnRing.name = "TURN_RING";
  lobby.add(turnRing);

  const SEATS = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    SEATS.push(new THREE.Vector3(Math.cos(a) * 4.9, 0, Math.sin(a) * 4.9));
  }
  let activeSeat = 0;

  // -----------------------------
  // Rooms & hallways (same as before, simplified)
  // -----------------------------
  function hallway(angleRad, neonMat) {
    const g = new THREE.Group();
    const width = 4.2, height = 3.2, wallT = 0.25;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, HALL_LEN), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(floor);

    const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallT, height, HALL_LEN), M.wall);
    wallL.position.set(-width / 2, height / 2, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(wallL);

    const wallR = new THREE.Mesh(new THREE.BoxGeometry(wallT, height, HALL_LEN), M.wall);
    wallR.position.set(width / 2, height / 2, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(wallR);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, HALL_LEN), neonMat);
    strip.position.set(0, height - 0.25, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(strip);

    g.rotation.y = angleRad;
    return g;
  }

  function room(angleRad, neonMat, name) {
    const g = new THREE.Group(); g.name = name;
    const s = ROOM_SIZE, h = 3.6;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, baseZ);
    g.add(floor);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(s, h, 0.25), M.wall);
    wallBack.position.set(0, h / 2, baseZ - s / 2);
    g.add(wallBack);

    const label = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.18), neonMat);
    label.position.set(0, 2.95, baseZ - s / 2 + 0.35);
    g.add(label);

    g.rotation.y = angleRad;
    return g;
  }

  world.add(hallway(0, M.neonBlue));
  world.add(hallway(-Math.PI / 2, M.neonBlue));
  world.add(hallway(Math.PI, M.neonPink));
  world.add(hallway(Math.PI / 2, M.neonPink));

  const roomN = room(0, M.neonBlue, "ROOM_N_LOUNGE");
  const roomE = room(-Math.PI / 2, M.neonBlue, "ROOM_E_STORE");
  const roomS = room(Math.PI, M.neonPink, "ROOM_S_SCORPION");
  const roomW = room(Math.PI / 2, M.neonPink, "ROOM_W_TOURNAMENT");
  world.add(roomN, roomE, roomS, roomW);

  // Store mannequins (cheap)
  (function buildStore() {
    const content = new THREE.Group(); content.name = "STORE_CONTENT";
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);
    content.position.set(0, 0, baseZ);
    roomE.add(content);

    function mannequin(x, z, neonMat) {
      const g = new THREE.Group(); g.name = "MANNEQUIN";
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.28), neonMat); torso.position.y = 1.35;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), M.trim); head.position.y = 1.95;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.22), M.wall); legs.position.y = 0.85;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 18), M.dark); base.position.y = 0.03;
      g.add(torso, head, legs, base);
      g.position.set(x, 0, z);
      return g;
    }

    content.add(mannequin(-1.6, -1.2, M.neonPink));
    content.add(mannequin( 0.0, -1.2, M.neonBlue));
    content.add(mannequin( 1.6, -1.2, M.neonPink));
  })();

  // Scorpion vibe
  (function buildScorpion() {
    const content = new THREE.Group(); content.name = "SCORPION_CONTENT";
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);
    content.position.set(0, 0, baseZ);
    roomS.add(content);

    const sting = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 24, Math.PI * 1.25), M.neonPink);
    sting.position.set(0, 2.05, -s / 2 + 0.65);
    sting.rotation.set(0, Math.PI, Math.PI / 2);
    content.add(sting);
  })();

  // -----------------------------
  // Simple bot walkers (Quest-safe)
  // -----------------------------
  const bots = [];
  function makeBot() {
    const b = new THREE.Group(); b.name = "BOT";
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 10), M.trim);
    body.position.y = 1.0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), M.neonBlue);
    visor.position.set(0, 1.2, 0.18);
    b.add(body, visor);
    b.position.set((Math.random() * 8 - 4), 0, (Math.random() * 8 - 4));
    b.userData = {
      angle: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.25,
      radius: 6.5 + Math.random() * 2.5,
      phase: Math.random() * 1000
    };
    return b;
  }

  for (let i = 0; i < 4; i++) {
    const bot = makeBot();
    bots.push(bot);
    lobby.add(bot);
  }

  // Lighting accents
  const accent1 = new THREE.PointLight(0x00e5ff, 0.9, 18);
  accent1.position.set(5, 2.6, 0);
  world.add(accent1);

  const accent2 = new THREE.PointLight(0xff2bd6, 0.9, 18);
  accent2.position.set(-5, 2.6, 0);
  world.add(accent2);

  // -----------------------------
  // World tick (lightweight)
  // -----------------------------
  scene.userData.worldTick = (dt) => {
    hover.t += dt;

    // neon pulse
    const pulse = 0.45 + 0.20 * Math.sin(hover.t * 1.2);
    M.neonBlue.emissiveIntensity = pulse;
    M.neonPink.emissiveIntensity = 0.40 + 0.18 * Math.sin(hover.t * 1.35);

    // card hover
    const bob = 0.006 * Math.sin(hover.t * 1.6);
    hole1.position.y = CARD_Y + bob;
    hole2.position.y = CARD_Y + bob;
    for (const c of comm) c.position.y = CARD_Y + bob * 0.8;

    // turn indicator rotates seat every ~3.5s (placeholder for real game state)
    const seatPeriod = 3.5;
    const seatIndex = Math.floor(hover.t / seatPeriod) % SEATS.length;
    if (seatIndex !== activeSeat) activeSeat = seatIndex;
    const p = SEATS[activeSeat];
    turnRing.position.set(p.x, 0.03, p.z);
    turnRing.material.opacity = 0.55 + 0.35 * Math.sin(hover.t * 3.0);

    // bot walkers orbit lobby center
    for (const bot of bots) {
      const u = bot.userData;
      const a = u.angle + hover.t * u.speed;
      bot.position.x = Math.cos(a + u.phase) * u.radius;
      bot.position.z = Math.sin(a + u.phase) * u.radius;
      bot.rotation.y = -a - u.phase + Math.PI / 2;
    }

    // dealer chip stays flat and above table (hard lock)
    dealerChip.rotation.set(-Math.PI / 2, 0, 0);
    dealerChip.position.y = 0.74;
  };

  writeHud?.("[world] build done ✅ (poker mechanics + bots)");
    }
