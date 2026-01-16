// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v5_0_TURN_ON_TABLE_BOTS_SEATED_GRABBABLE_BETS_JUMBOS
// ✅ Full world: lobby + 4 rooms + divot + store + scorpion + tournament
// ✅ Turn ring ON TABLE near active seat bet spot
// ✅ Bots: seated players + spectators + room walkers
// ✅ Betting zones: pass-line ring + 8 seat bet pads
// ✅ Interactables: cards/chips/dealer chip are grabbable via lasers
// ✅ Quest-safe tick (no heavy assets)

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_FULL_v5_0_TURN_ON_TABLE_BOTS_SEATED_GRABBABLE_BETS_JUMBOS";
  writeHud?.(`[world] build starting… ${BUILD}`);

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1, metalness: 0 }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x171a24, roughness: 0.95, metalness: 0 }),
    trim:  new THREE.MeshStandardMaterial({ color: 0x1f2535, roughness: 0.7, metalness: 0.1 }),
    neonBlue: new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x00333a), emissiveIntensity: 0.6 }),
    neonPink: new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x33001f), emissiveIntensity: 0.55 }),
    gold:  new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.3 }),
    felt:  new THREE.MeshStandardMaterial({ color: 0x0b4a3e, roughness: 1, metalness: 0 }),
    chip:  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.05 }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 1, metalness: 0 }),
    cardBack: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 }),
    cardFace: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9, metalness: 0.0 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1, metalness: 0, emissive: new THREE.Color(0x05070a), emissiveIntensity: 0.75 }),
  };

  // Register interactables here so index.js can raycast them
  const interactables = [];
  scene.userData.interactables = interactables;

  function markGrabbable(obj, dropLift = 0.0) {
    obj.userData.grabbable = true;
    obj.userData.dropLift = dropLift;
    interactables.push(obj);
  }

  // WORLD ROOT
  const world = new THREE.Group();
  world.name = "WORLD_ROOT";
  scene.add(world);

  // Scale / layout (bigger lobby vibe)
  const LOBBY_RADIUS = 14;
  const WALL_H = 4.2;
  const HALL_LEN = 10;
  const ROOM_SIZE = 10;

  // Lobby group
  const lobby = new THREE.Group();
  lobby.name = "LOBBY";
  world.add(lobby);

  // Lobby floor disk
  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_RADIUS, 64), M.floor);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001;
  lobby.add(lobbyFloor);

  // Lobby wall cylinder
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, WALL_H, 48, 1, true),
    M.wall
  );
  lobbyWall.position.y = WALL_H / 2;
  lobbyWall.rotation.y = Math.PI / 48;
  lobby.add(lobbyWall);

  // Neon trim ring
  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_RADIUS - 0.35, 0.08, 12, 64),
    M.neonBlue
  );
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.03;
  lobby.add(neonRing);

  // Entrance pylons + signage slabs (Quest-safe)
  function signPylon(colorMat) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), M.trim);
    post.position.y = 1.1;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.12), colorMat);
    panel.position.set(0, 1.85, 0);
    g.add(post, panel);
    return g;
  }
  const pN = signPylon(M.neonBlue); pN.position.set(0,0,-LOBBY_RADIUS+2.2);
  const pS = signPylon(M.neonPink); pS.position.set(0,0, LOBBY_RADIUS-2.2); pS.rotation.y=Math.PI;
  const pE = signPylon(M.neonBlue); pE.position.set( LOBBY_RADIUS-2.2,0,0); pE.rotation.y=-Math.PI/2;
  const pW = signPylon(M.neonPink); pW.position.set(-LOBBY_RADIUS+2.2,0,0); pW.rotation.y= Math.PI/2;
  lobby.add(pN,pS,pE,pW);

  // -----------------------------
  // CENTERPIECE: divot + table
  // -----------------------------
  const center = new THREE.Group();
  center.name = "CENTERPIECE";
  lobby.add(center);

  const divotR = 6.4;
  const divotDepth = 0.55;

  const divotFloor = new THREE.Mesh(
    new THREE.CircleGeometry(divotR, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 1, metalness: 0 })
  );
  divotFloor.rotation.x = -Math.PI / 2;
  divotFloor.position.y = -divotDepth;
  center.add(divotFloor);

  const divotWall = new THREE.Mesh(
    new THREE.CylinderGeometry(divotR, divotR, divotDepth, 64, 1, true),
    M.trim
  );
  divotWall.position.y = -divotDepth / 2;
  center.add(divotWall);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(divotR + 0.3, 0.07, 10, 64),
    M.gold
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.08;
  center.add(rail);

  // Table group
  const table = new THREE.Group();
  table.name = "POKER_TABLE";
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

  // Betting zones (table top)
  const bets = new THREE.Group();
  bets.name = "BETTING_ZONES";
  table.add(bets);

  // Pass-line style ring (extra circle)
  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(2.85, 3.05, 64),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.y = 0.742;
  bets.add(passLine);

  // Seat bet pads (8)
  const SEAT_COUNT = 8;
  const SEAT_RADIUS_FLOOR = 4.9;    // around lobby floor
  const SEAT_RADIUS_TABLE = 3.05;   // around table top
  const BET_Y = 0.742;

  const seatFloorPos = [];
  const seatBetPos = [];

  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    seatFloorPos.push(new THREE.Vector3(Math.cos(a) * SEAT_RADIUS_FLOOR, 0, Math.sin(a) * SEAT_RADIUS_FLOOR));

    // Bet pads around table edge
    const bx = Math.cos(a) * SEAT_RADIUS_TABLE;
    const bz = Math.sin(a) * SEAT_RADIUS_TABLE;
    seatBetPos.push(new THREE.Vector3(bx, BET_Y, bz));

    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.23, 0.33, 40),
      new THREE.MeshBasicMaterial({
        color: (i % 2 ? 0xff2bd6 : 0x00e5ff),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(bx, BET_Y, bz);
    pad.name = `BET_PAD_${i}`;
    bets.add(pad);
  }

  // Dealer chip (flat, grabbable)
  const dealerChip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.chip);
  dealerChip.name = "DEALER_CHIP";
  dealerChip.position.set(0.95, 0.744, 0.35);
  dealerChip.rotation.set(-Math.PI / 2, 0, 0);
  dealerChip.userData.spin = false;
  dealerChip.material.emissive = new THREE.Color(0x000000);
  dealerChip.material.emissiveIntensity = 0;
  table.add(dealerChip);
  markGrabbable(dealerChip, 0.01);

  // Chips (grabbable)
  function makeChip(color = 0xf2f2f2) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18), mat);
    c.rotation.x = -Math.PI / 2;
    markGrabbable(c, 0.01);
    return c;
  }

  function chipStack(x, z, h = 9) {
    const g = new THREE.Group(); g.name = "ChipStack";
    for (let i = 0; i < h; i++) {
      const c = makeChip(0xf2f2f2);
      c.position.set(0, i * 0.032, 0);
      g.add(c);
    }
    g.position.set(x, 0.72, z);
    return g;
  }
  table.add(chipStack(-1.1, -0.55, 8));
  table.add(chipStack(-0.7, -1.0, 7));
  table.add(chipStack( 1.4, -0.9, 6));

  // Cards (grabbable)
  const cards = new THREE.Group(); cards.name = "CARDS_ROOT"; table.add(cards);

  function makeCard(name) {
    const g = new THREE.Group();
    g.name = name;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.0025, 0.23), M.cardBack);
    body.position.y = 0;
    g.add(body);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.158, 0.228), M.cardFace);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0016;
    g.add(face);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.0015, 0.235), M.trim);
    rim.position.y = -0.001;
    g.add(rim);

    // Make the GROUP grabbable (raycast hits children too)
    markGrabbable(g, 0.01);
    return g;
  }

  const CARD_Y = 0.745;
  const hole1 = makeCard("HOLE_1"); hole1.position.set(-0.18, CARD_Y, 1.15); hole1.rotation.y = 0.12;
  const hole2 = makeCard("HOLE_2"); hole2.position.set( 0.18, CARD_Y, 1.15); hole2.rotation.y = -0.12;
  cards.add(hole1, hole2);

  const comm = [];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(`COMM_${i}`);
    c.position.set((-0.4 + i * 0.2), CARD_Y, -0.15);
    cards.add(c);
    comm.push(c);
  }

  // -----------------------------
  // TURN INDICATOR (ON TABLE)
  // -----------------------------
  const turnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.36, 44),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  turnRing.name = "TURN_RING_TABLE";
  turnRing.rotation.x = -Math.PI / 2;
  turnRing.position.copy(seatBetPos[0]);
  table.add(turnRing);

  // -----------------------------
  // HALLWAYS + ROOMS + JUMBOTRONS
  // -----------------------------
  function hallway(angleRad, neonMat, name) {
    const g = new THREE.Group(); g.name = name;
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

  function jumbotronFrame() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.18), M.trim);
    frame.position.y = 2.4;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.55, 0.06), M.screen);
    screen.position.set(0, 2.4, 0.11);
    g.add(frame, screen);
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

    const j = jumbotronFrame();
    j.position.set(0, 0, baseZ - s / 2 + 0.2);
    g.add(j);

    g.rotation.y = angleRad;
    return g;
  }

  world.add(hallway(0, M.neonBlue, "HALL_N"));
  world.add(hallway(-Math.PI / 2, M.neonBlue, "HALL_E"));
  world.add(hallway(Math.PI, M.neonPink, "HALL_S"));
  world.add(hallway(Math.PI / 2, M.neonPink, "HALL_W"));

  const roomN = room(0, M.neonBlue, "ROOM_N_LOUNGE");
  const roomE = room(-Math.PI / 2, M.neonBlue, "ROOM_E_STORE");
  const roomS = room(Math.PI, M.neonPink, "ROOM_S_SCORPION");
  const roomW = room(Math.PI / 2, M.neonPink, "ROOM_W_TOURNAMENT");
  world.add(roomN, roomE, roomS, roomW);

  // Store mannequins
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

  // Scorpion emblem vibe
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
  // BOTS: seated players + spectators + room walkers
  // -----------------------------
  const bots = [];
  const seatedBots = [];
  const walkers = [];

  function makeBot(neon = true) {
    const b = new THREE.Group(); b.name = "BOT";
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 10), M.trim);
    body.position.y = 1.0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), neon ? M.neonBlue : M.neonPink);
    visor.position.set(0, 1.2, 0.18);
    b.add(body, visor);
    b.userData = { mode: "idle", t: Math.random() * 999, speed: 0.35 + Math.random() * 0.25 };
    return b;
  }

  // Seats around table (bots sit just outside rim)
  const SEAT_RADIUS_BOTS = 4.55;
  const seatBotPos = [];
  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    seatBotPos.push(new THREE.Vector3(Math.cos(a) * SEAT_RADIUS_BOTS, 0, Math.sin(a) * SEAT_RADIUS_BOTS));
  }

  // Put 5 bots at seats (playing)
  const BOT_PLAYERS = 5;
  for (let i = 0; i < BOT_PLAYERS; i++) {
    const bot = makeBot(i % 2 === 0);
    bot.userData.mode = "seated";
    bot.userData.seatIndex = (i + 1) % SEAT_COUNT; // leave seat 0 for player
    const p = seatBotPos[bot.userData.seatIndex];
    bot.position.set(p.x, 0, p.z);
    bot.rotation.y = Math.atan2(-p.x, -p.z); // face table center
    lobby.add(bot);
    bots.push(bot);
    seatedBots.push(bot);
  }

  // Spectators in lobby (standing near rail)
  for (let i = 0; i < 3; i++) {
    const bot = makeBot(i % 2 === 1);
    bot.userData.mode = "spectate";
    const a = Math.random() * Math.PI * 2;
    bot.position.set(Math.cos(a) * 7.8, 0, Math.sin(a) * 7.8);
    bot.rotation.y = Math.atan2(-bot.position.x, -bot.position.z);
    lobby.add(bot);
    bots.push(bot);
  }

  // Walkers: lobby + inside rooms
  function addWalker(parent, centerX, centerZ, radius) {
    const bot = makeBot(true);
    bot.userData.mode = "walk";
    bot.userData.cx = centerX;
    bot.userData.cz = centerZ;
    bot.userData.radius = radius;
    bot.userData.phase = Math.random() * 1000;
    bot.userData.speed = 0.25 + Math.random() * 0.25;
    parent.add(bot);
    bots.push(bot);
    walkers.push(bot);
    return bot;
  }

  // Lobby walkers
  addWalker(lobby, 0, 0, 9.5);
  addWalker(lobby, 0, 0, 8.6);

  // Room walkers (one each)
  // centers are in each room local space; rooms already rotated
  (function roomWalker(room, r) {
    addWalker(room, 0, -(LOBBY_RADIUS + HALL_LEN + ROOM_SIZE / 2 - 1.0), r);
  })(roomN, 2.4);
  (function roomWalker(room, r) {
    addWalker(room, 0, -(LOBBY_RADIUS + HALL_LEN + ROOM_SIZE / 2 - 1.0), r);
  })(roomE, 2.2);
  (function roomWalker(room, r) {
    addWalker(room, 0, -(LOBBY_RADIUS + HALL_LEN + ROOM_SIZE / 2 - 1.0), r);
  })(roomS, 2.2);
  (function roomWalker(room, r) {
    addWalker(room, 0, -(LOBBY_RADIUS + HALL_LEN + ROOM_SIZE / 2 - 1.0), r);
  })(roomW, 2.6);

  // -----------------------------
  // Lighting accents
  // -----------------------------
  const accent1 = new THREE.PointLight(0x00e5ff, 0.9, 18);
  accent1.position.set(5, 2.6, 0);
  world.add(accent1);

  const accent2 = new THREE.PointLight(0xff2bd6, 0.9, 18);
  accent2.position.set(-5, 2.6, 0);
  world.add(accent2);

  // -----------------------------
  // TURN SYSTEM (player + bots)
  // - seat 0 is the PLAYER
  // - bots occupy some other seats
  // - ring shows active seat on TABLE at that seat's bet pad
  // -----------------------------
  const occupied = new Array(SEAT_COUNT).fill(false);
  occupied[0] = true; // player seat
  for (const b of seatedBots) occupied[b.userData.seatIndex] = true;

  const turn = {
    seat: 0,
    t: 0,
    period: 3.2
  };

  // Place player near seat 0 (front)
  // Seat 0 is angle 0 → (x=1,z=0). We want player facing center from z+ side.
  // So rotate mapping by 90° for player comfort:
  // We'll just ensure rig is near +Z side of table if still near default spawn.
  if (rig?.position) {
    rig.position.z = clamp(rig.position.z, 2.0, 8.5);
  }

  // -----------------------------
  // Tick
  // -----------------------------
  const state = { t: 0 };

  scene.userData.worldTick = (dt) => {
    state.t += dt;

    // Neon pulse (cheap)
    const pulse = 0.45 + 0.20 * Math.sin(state.t * 1.2);
    M.neonBlue.emissiveIntensity = pulse;
    M.neonPink.emissiveIntensity = 0.40 + 0.18 * Math.sin(state.t * 1.35);

    // Hover cards slightly (unless grabbed: if parent is controller, stop adjusting)
    const bob = 0.006 * Math.sin(state.t * 1.6);
    if (hole1.parent === cards) hole1.position.y = CARD_Y + bob;
    if (hole2.parent === cards) hole2.position.y = CARD_Y + bob;
    for (const c of comm) {
      if (c.parent === cards) c.position.y = CARD_Y + bob * 0.8;
    }

    // Hard lock dealer chip flat if it's still on table (not grabbed)
    if (dealerChip.parent === table) {
      dealerChip.rotation.set(-Math.PI / 2, 0, 0);
      dealerChip.position.y = 0.744;
    }

    // Turn advance
    turn.t += dt;
    if (turn.t >= turn.period) {
      turn.t = 0;
      // next occupied seat
      for (let i = 1; i <= SEAT_COUNT; i++) {
        const n = (turn.seat + i) % SEAT_COUNT;
        if (occupied[n]) { turn.seat = n; break; }
      }
    }

    // Turn ring on table at bet pad for active seat
    const p = seatBetPos[turn.seat];
    turnRing.position.set(p.x, p.y, p.z);
    turnRing.material.opacity = 0.55 + 0.35 * Math.sin(state.t * 3.0);

    // Walkers motion: orbit in their parent local space
    for (const bot of walkers) {
      const u = bot.userData;
      const a = (u.phase + state.t * u.speed);
      bot.position.x = u.cx + Math.cos(a) * u.radius;
      bot.position.z = u.cz + Math.sin(a) * u.radius;

      // face direction of travel
      bot.rotation.y = -a + Math.PI / 2;
    }

    // Seated bots: small idle motion
    for (const bot of seatedBots) {
      bot.position.y = 0.0;
      bot.rotation.y += 0.0025 * Math.sin(state.t * 1.5 + bot.userData.seatIndex);
    }
  };

  writeHud?.("[world] build done ✅ (turn+table ring, grab, bets, bots, jumbos)");
      }
