// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v5_2_SHOWTIME_CARDS_BIGGER_FACE_TEXTURES_BOT_HOLECARDS_TURN_PANEL
// ✅ Cards bigger + simple face textures (see ranks)
// ✅ Turn indicator is a TABLE PANEL (box) with BET/RAISE/CHECK + amount
// ✅ Bots show hole cards hovering above heads (for show)
// ✅ Rings forced flat (fix upright circles)
// ✅ Bots knock animation on check
// ✅ More “modules” activated (extra signage/jumbos/accents) Quest-safe
// ✅ Interactables registered for grabbing

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_FULL_v5_2_SHOWTIME_CARDS_BIGGER_FACE_TEXTURES_BOT_HOLECARDS_TURN_PANEL";
  writeHud?.(`[world] build starting… ${BUILD}`);

  // Interactables list for index.js raycast
  const interactables = [];
  scene.userData.interactables = interactables;

  function markGrabbable(obj, dropLift = 0.0) {
    obj.userData.grabbable = true;
    obj.userData.dropLift = dropLift;
    interactables.push(obj);
  }

  // Materials
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
    screen: new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1, metalness: 0, emissive: new THREE.Color(0x05070a), emissiveIntensity: 0.75 }),
  };

  // World root
  const world = new THREE.Group();
  world.name = "WORLD_ROOT";
  scene.add(world);

  // Layout
  const LOBBY_RADIUS = 14;
  const WALL_H = 4.2;
  const HALL_LEN = 10;
  const ROOM_SIZE = 10;

  const lobby = new THREE.Group();
  lobby.name = "LOBBY";
  world.add(lobby);

  // Lobby floor + wall
  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_RADIUS, 64), M.floor);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001;
  lobby.add(lobbyFloor);

  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, WALL_H, 48, 1, true),
    M.wall
  );
  lobbyWall.position.y = WALL_H / 2;
  lobbyWall.rotation.y = Math.PI / 48;
  lobby.add(lobbyWall);

  // Neon ring + extra “module” accents
  const neonRing = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_RADIUS - 0.35, 0.08, 12, 64), M.neonBlue);
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.03;
  lobby.add(neonRing);

  const accent1 = new THREE.PointLight(0x00e5ff, 0.9, 20);
  accent1.position.set(6, 2.6, 0);
  world.add(accent1);

  const accent2 = new THREE.PointLight(0xff2bd6, 0.9, 20);
  accent2.position.set(-6, 2.6, 0);
  world.add(accent2);

  // Centerpiece: divot + table
  const center = new THREE.Group();
  center.name = "CENTERPIECE";
  lobby.add(center);

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

  // Betting zones (rings) — force flat
  const bets = new THREE.Group();
  bets.name = "BETTING_ZONES";
  table.add(bets);

  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(2.85, 3.05, 64),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  passLine.name = "PASS_LINE";
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.y = 0.742;
  bets.add(passLine);

  const SEAT_COUNT = 8;
  const SEAT_RADIUS_TABLE = 3.05;
  const BET_Y = 0.742;

  const seatBetPos = [];
  const betPads = [];

  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
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
    pad.name = `BET_PAD_${i}`;
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(bx, BET_Y, bz);
    bets.add(pad);
    betPads.push(pad);
  }

  // Dealer chip (grabbable)
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

  function chipStack(x, z, h = 8) {
    const g = new THREE.Group();
    g.name = "ChipStack";
    for (let i = 0; i < h; i++) {
      const c = makeChip(0xf2f2f2);
      c.position.set(0, i * 0.032, 0);
      g.add(c);
    }
    g.position.set(x, 0.72, z);
    return g;
  }
  table.add(chipStack(-1.1, -0.55, 9));
  table.add(chipStack(-0.7, -1.0, 8));
  table.add(chipStack( 1.4, -0.9, 7));

  // -----------------------------
  // CARD TEXTURES (simple canvas faces so you can see ranks)
  // -----------------------------
  const cardTexCache = new Map();

  function makeCardTexture(label, fg = "#111", bg = "#f3f4f6") {
    const key = `${label}|${fg}|${bg}`;
    if (cardTexCache.has(key)) return cardTexCache.get(key);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");

    ctx.fillStyle = bg;
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10,10,c.width-20,c.height-20);

    ctx.fillStyle = fg;
    ctx.font = "bold 84px system-ui, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, 28, 24);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 120px system-ui, Arial";
    ctx.fillText(label, c.width/2, c.height/2);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 84px system-ui, Arial";
    ctx.fillText(label, c.width-28, c.height-24);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 1;
    tex.needsUpdate = true;
    cardTexCache.set(key, tex);
    return tex;
  }

  function cardMaterialFace(label) {
    const tex = makeCardTexture(label, "#111", "#f3f4f6");
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
  }

  // Cards (bigger + grabbable)
  const cards = new THREE.Group();
  cards.name = "CARDS_ROOT";
  table.add(cards);

  function makeCard(name, label = "A") {
    const g = new THREE.Group();
    g.name = name;

    // Bigger card dimensions
    const w = 0.22, h = 0.32;
    const thick = 0.003;

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, thick, h), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0 }));
    g.add(back);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), cardMaterialFace(label));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0022;
    g.add(face);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, thick * 0.8, h * 1.02), M.trim);
    rim.position.y = -0.001;
    g.add(rim);

    markGrabbable(g, 0.01);
    g.userData.label = label;
    return g;
  }

  const CARD_Y = 0.765; // slightly higher since bigger
  const hole1 = makeCard("HOLE_1", "A"); hole1.position.set(-0.24, CARD_Y, 1.18); hole1.rotation.y = 0.12;
  const hole2 = makeCard("HOLE_2", "K"); hole2.position.set( 0.24, CARD_Y, 1.18); hole2.rotation.y = -0.12;
  cards.add(hole1, hole2);

  const comm = [];
  const labels = ["Q","J","10","9","2"];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(`COMM_${i}`, labels[i]);
    c.position.set((-0.55 + i * 0.275), CARD_Y, -0.18);
    cards.add(c);
    comm.push(c);
  }

  // -----------------------------
  // TURN PANEL (box) on table with action + amount
  // -----------------------------
  function makePanelTexture(lines) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(5,8,12,1)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(0,229,255,0.85)";
    ctx.lineWidth = 8;
    ctx.strokeRect(12,12,c.width-24,c.height-24);

    ctx.fillStyle = "rgba(0,229,255,0.9)";
    ctx.font = "bold 54px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(lines[0] || "", c.width/2, 26);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 42px system-ui, Arial";
    ctx.textBaseline = "middle";
    ctx.fillText(lines[1] || "", c.width/2, 140);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  const turnPanel = new THREE.Group();
  turnPanel.name = "TURN_PANEL";
  table.add(turnPanel);

  const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.38), M.trim);
  panelBox.position.y = 0.77;
  turnPanel.add(panelBox);

  let panelTex = makePanelTexture(["YOUR TURN", "CHECK"]);
  const panelFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.34),
    new THREE.MeshStandardMaterial({ map: panelTex, roughness: 1, metalness: 0, emissive: new THREE.Color(0x00333a), emissiveIntensity: 0.6 })
  );
  panelFace.rotation.x = -Math.PI / 2;
  panelFace.position.set(0, 0.812, 0);
  turnPanel.add(panelFace);

  function setTurnPanel(title, actionLine) {
    panelTex.dispose?.();
    panelTex = makePanelTexture([title, actionLine]);
    panelFace.material.map = panelTex;
    panelFace.material.needsUpdate = true;
  }

  // -----------------------------
  // Rooms / halls / jumbotrons (modules activated)
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

    // Extra module: corner neon pillars
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), neonMat);
      const sx = (i < 2 ? -1 : 1) * (s/2 - 0.6);
      const sz = (i % 2 ? -1 : 1) * (s/2 - 0.6);
      p.position.set(sx, 1.3, baseZ + sz);
      g.add(p);
    }

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

  // Store mannequins (still stylized)
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

  // Scorpion emblem
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
  // BOTS: upgraded “humanoid-ish” (Quest-avatar-like silhouette)
  // + seated players + spectators + walkers
  // + SHOW hole cards above heads
  // -----------------------------
  const bots = [];
  const seatedBots = [];
  const walkers = [];

  function makeHumanoidBot(colorMat) {
    const b = new THREE.Group(); b.name = "BOT";

    // torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.6, 0.22), M.trim);
    torso.position.y = 1.15;

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), M.wall);
    head.position.y = 1.65;

    // visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), colorMat);
    visor.position.set(0, 1.65, 0.18);

    // arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.46, 0.10), M.trim);
    armL.position.set(-0.26, 1.18, 0.02);
    const armR = armL.clone();
    armR.position.x = 0.26;

    // legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.52, 0.16), M.wall);
    legs.position.y = 0.72;

    // feet base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), M.dark);
    base.position.y = 0.03;

    b.add(torso, head, visor, armL, armR, legs, base);

    b.userData = {
      mode: "idle",
      t: Math.random() * 999,
      speed: 0.25 + Math.random() * 0.25,
      knock: 0,
      seatIndex: -1,
      holeCards: null
    };

    return b;
  }

  function addBotHoleCards(bot, labelA="A", labelB="K") {
    const g = new THREE.Group();
    g.name = "BOT_HOLECARDS";

    const c1 = makeCard("BOT_H1", labelA);
    const c2 = makeCard("BOT_H2", labelB);
    c1.scale.set(0.65, 0.65, 0.65);
    c2.scale.set(0.65, 0.65, 0.65);

    c1.position.set(-0.13, 0, 0);
    c2.position.set( 0.13, 0, 0);
    c1.rotation.y = 0.18;
    c2.rotation.y = -0.18;

    // NOT grabbable (show-only)
    c1.userData.grabbable = false;
    c2.userData.grabbable = false;

    g.add(c1, c2);
    g.position.set(0, 2.05, 0); // above head
    bot.add(g);
    bot.userData.holeCards = g;
  }

  const SEAT_RADIUS_BOTS = 4.55;
  const seatBotPos = [];
  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    seatBotPos.push(new THREE.Vector3(Math.cos(a) * SEAT_RADIUS_BOTS, 0, Math.sin(a) * SEAT_RADIUS_BOTS));
  }

  // Seated bot players (leave seat 0 for player)
  for (let i = 0; i < 5; i++) {
    const bot = makeHumanoidBot(i % 2 ? M.neonPink : M.neonBlue);
    bot.userData.mode = "seated";
    bot.userData.seatIndex = (i + 1) % SEAT_COUNT;

    const p = seatBotPos[bot.userData.seatIndex];
    bot.position.set(p.x, 0, p.z);
    bot.rotation.y = Math.atan2(-p.x, -p.z);
    lobby.add(bot);

    // show hole cards above head
    addBotHoleCards(bot, ["A","K","Q","J","10"][i%5], ["9","8","7","6","2"][i%5]);

    bots.push(bot);
    seatedBots.push(bot);
  }

  // Spectators
  for (let i = 0; i < 3; i++) {
    const bot = makeHumanoidBot(i % 2 ? M.neonBlue : M.neonPink);
    bot.userData.mode = "spectate";
    const a = Math.random() * Math.PI * 2;
    bot.position.set(Math.cos(a) * 7.8, 0, Math.sin(a) * 7.8);
    bot.rotation.y = Math.atan2(-bot.position.x, -bot.position.z);
    lobby.add(bot);
    bots.push(bot);
  }

  function addWalker(parent, cx, cz, radius) {
    const bot = makeHumanoidBot(M.neonBlue);
    bot.userData.mode = "walk";
    bot.userData.cx = cx;
    bot.userData.cz = cz;
    bot.userData.radius = radius;
    bot.userData.phase = Math.random() * 1000;
    parent.add(bot);
    bots.push(bot);
    walkers.push(bot);
    return bot;
  }

  addWalker(lobby, 0, 0, 9.5);
  addWalker(lobby, 0, 0, 8.6);

  // One walker in each room (local space)
  const baseZRoom = -(LOBBY_RADIUS + HALL_LEN + ROOM_SIZE / 2 - 1.0);
  addWalker(roomN, 0, baseZRoom, 2.4);
  addWalker(roomE, 0, baseZRoom, 2.2);
  addWalker(roomS, 0, baseZRoom, 2.2);
  addWalker(roomW, 0, baseZRoom, 2.6);

  // -----------------------------
  // TURN SYSTEM (showtime)
  // seat 0 is player
  // -----------------------------
  const occupied = new Array(SEAT_COUNT).fill(false);
  occupied[0] = true;
  for (const b of seatedBots) occupied[b.userData.seatIndex] = true;

  const turn = { seat: 0, t: 0, period: 3.2 };

  // Position turn panel near active bet pad
  function moveTurnPanelToSeat(seat) {
    const p = seatBetPos[seat];
    turnPanel.position.set(p.x, 0, p.z);
    // face toward table center
    const yaw = Math.atan2(-p.x, -p.z);
    turnPanel.rotation.y = yaw;
  }
  moveTurnPanelToSeat(0);

  // “Action generator” (demo)
  function actionForSeat(seat) {
    if (seat === 0) return { title: "YOUR TURN", line: "CHECK" };
    const r = (seat % 3);
    if (r === 0) return { title: `SEAT ${seat}`, line: "BET $50" };
    if (r === 1) return { title: `SEAT ${seat}`, line: "RAISE $120" };
    return { title: `SEAT ${seat}`, line: "CHECK" };
  }

  // -----------------------------
  // World tick
  // -----------------------------
  const state = { t: 0 };

  scene.userData.worldTick = (dt) => {
    state.t += dt;

    // Pulse neon
    const pulse = 0.45 + 0.20 * Math.sin(state.t * 1.2);
    M.neonBlue.emissiveIntensity = pulse;
    M.neonPink.emissiveIntensity = 0.40 + 0.18 * Math.sin(state.t * 1.35);

    // Cards hover (only if still on table group)
    const bob = 0.006 * Math.sin(state.t * 1.6);
    for (const c of [hole1, hole2, ...comm]) {
      if (c.parent === cards) c.position.y = CARD_Y + bob;
    }

    // Force rings flat (fix upright)
    passLine.rotation.x = -Math.PI / 2;
    for (const pad of betPads) pad.rotation.x = -Math.PI / 2;

    // Lock dealer chip flat if not grabbed
    if (dealerChip.parent === table) {
      dealerChip.rotation.set(-Math.PI / 2, 0, 0);
      dealerChip.position.y = 0.744;
    }

    // Turn advance
    turn.t += dt;
    if (turn.t >= turn.period) {
      turn.t = 0;

      for (let i = 1; i <= SEAT_COUNT; i++) {
        const n = (turn.seat + i) % SEAT_COUNT;
        if (occupied[n]) { turn.seat = n; break; }
      }

      // Update turn panel text + position
      const act = actionForSeat(turn.seat);
      setTurnPanel(act.title, act.line);
      moveTurnPanelToSeat(turn.seat);

      // If seat checks and it’s a bot seat, do a “knock” animation
      if (act.line.includes("CHECK") && turn.seat !== 0) {
        const bot = seatedBots.find(b => b.userData.seatIndex === turn.seat);
        if (bot) bot.userData.knock = 0.22; // short tap
      }
    }

    // Bot motion
    for (const bot of walkers) {
      const u = bot.userData;
      const a = (u.phase + state.t * u.speed);
      bot.position.x = u.cx + Math.cos(a) * u.radius;
      bot.position.z = u.cz + Math.sin(a) * u.radius;
      bot.rotation.y = -a + Math.PI / 2;
    }

    // Seated bots: idle + knock
    for (const bot of seatedBots) {
      const u = bot.userData;

      // idle
      bot.rotation.y += 0.002 * Math.sin(state.t * 1.4 + u.seatIndex);

      // knock: quick down bob (visual “tap”)
      if (u.knock > 0) {
        u.knock -= dt;
        bot.position.y = (u.knock > 0.11) ? -0.03 : 0.0;
      } else {
        bot.position.y = 0.0;
      }

      // keep hole cards facing camera a bit (showtime)
      if (u.holeCards) {
        const q = new THREE.Quaternion();
        camera.getWorldQuaternion(q);
        const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
        u.holeCards.rotation.y = -e.y; // billboard-ish
      }
    }
  };

  writeHud?.("[world] build done ✅ (showtime modules + bigger visible cards + turn panel)");
      }
