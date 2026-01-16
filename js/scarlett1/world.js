// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v5_3_BEAUTIFY_SHOWTIME_BALCONY_STAIRS_GUARD_CASES_PATTERN
// ✅ Quest-safe lowpoly beautification
// ✅ Bigger sealed walls (NO ceiling)
// ✅ Balcony ring
// ✅ Stairs down into divot + entrance gap + guard + guardrail
// ✅ Storefront display cases (2 each side)
// ✅ Table: patterned felt + neon trim
// ✅ Community cards 3x bigger
// ✅ All cards hover + billboard toward camera
// ✅ Bots: name tags + hole cards above head (billboard)
// ✅ Turn indicator: bright neon circle with text (not upside down)

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_FULL_v5_3_BEAUTIFY_SHOWTIME_BALCONY_STAIRS_GUARD_CASES_PATTERN";
  writeHud?.(`[world] build starting… ${BUILD}`);

  // Interactables list for grabbing
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
    wall:  new THREE.MeshStandardMaterial({ color: 0x151a28, roughness: 0.95, metalness: 0 }),
    trim:  new THREE.MeshStandardMaterial({ color: 0x1f2535, roughness: 0.7, metalness: 0.1 }),
    gold:  new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.3 }),
    neonBlue: new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x00333a), emissiveIntensity: 0.9 }),
    neonPink: new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x33001f), emissiveIntensity: 0.85 }),
    neonRed: new THREE.MeshStandardMaterial({ color: 0xff2a2a, roughness: 0.35, metalness: 0.15, emissive: new THREE.Color(0x3a0000), emissiveIntensity: 1.2 }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 1, metalness: 0 }),
    chip:  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.05 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1, metalness: 0, emissive: new THREE.Color(0x06080c), emissiveIntensity: 0.9 }),
  };

  // Root
  const world = new THREE.Group();
  world.name = "WORLD_ROOT";
  scene.add(world);

  // Layout
  const LOBBY_R = 14;
  const WALL_H = 7.8;           // bigger walls (you asked 2x big)
  const BALCONY_Y = 4.6;
  const HALL_LEN = 10;
  const ROOM_S = 10;

  const lobby = new THREE.Group();
  lobby.name = "LOBBY";
  world.add(lobby);

  // Lobby floor
  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 72), M.floor);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001;
  lobby.add(lobbyFloor);

  // Sealed outer walls (no ceiling)
  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, WALL_H, 64, 1, true),
    M.wall
  );
  outerWall.position.y = WALL_H / 2;
  lobby.add(outerWall);

  // Balcony ring (walkable-ish visual)
  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(LOBBY_R - 1.6, LOBBY_R - 0.6, 72),
    new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 1, metalness: 0 })
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = BALCONY_Y;
  lobby.add(balcony);

  // Balcony railing
  const balRail = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_R - 1.0, 0.06, 10, 80),
    M.neonBlue
  );
  balRail.rotation.x = Math.PI / 2;
  balRail.position.y = BALCONY_Y + 0.1;
  lobby.add(balRail);

  // Centerpiece: divot pit + rails + stairs entrance gap
  const center = new THREE.Group();
  center.name = "CENTERPIECE";
  lobby.add(center);

  const divotR = 6.4;
  const divotDepth = 0.60;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(divotR, 72), new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1, metalness: 0 }));
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -divotDepth;
  center.add(pitFloor);

  const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(divotR, divotR, divotDepth, 72, 1, true), M.trim);
  pitWall.position.y = -divotDepth / 2;
  center.add(pitWall);

  // Guard rail with an entrance gap
  const railR = divotR + 0.3;
  const rail = new THREE.Group();
  rail.name = "PIT_RAIL";
  center.add(rail);

  // Build rail segments leaving a gap at +Z (entrance)
  const SEG = 36;
  const gapStart = Math.floor(SEG * 0.20);
  const gapEnd   = Math.floor(SEG * 0.30);

  for (let i = 0; i < SEG; i++) {
    if (i >= gapStart && i <= gapEnd) continue; // entrance gap
    const a = (i / SEG) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), M.gold);
    post.position.set(Math.cos(a) * railR, 0.45, Math.sin(a) * railR);
    rail.add(post);
  }

  const topRail = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.07, 10, 80), M.gold);
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = 0.92;
  center.add(topRail);

  // Stairs down through the entrance gap
  const stairs = new THREE.Group();
  stairs.name = "STAIRS";
  center.add(stairs);

  for (let s = 0; s < 10; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.35), M.trim);
    step.position.set(0, 0.04 - s * (divotDepth / 10), railR + 0.7 - s * 0.33);
    stairs.add(step);
  }

  // Guard bot at stairs
  const guard = new THREE.Group();
  guard.name = "GUARD";
  const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 4, 10), M.trim);
  gBody.position.y = 1.0;
  const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), M.wall);
  gHead.position.y = 1.65;
  const gVis = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), M.neonRed);
  gVis.position.set(0, 1.65, 0.18);
  guard.add(gBody, gHead, gVis);
  guard.position.set(0, 0, railR + 1.4);
  guard.rotation.y = Math.PI;
  lobby.add(guard);

  // Table
  const table = new THREE.Group();
  table.name = "POKER_TABLE";
  table.position.y = -divotDepth + 0.02;
  center.add(table);

  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.55, 24), M.trim);
  tableBase.position.y = 0.28;
  table.add(tableBase);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.22, 64), M.trim);
  tableTop.position.y = 0.55;
  table.add(tableTop);

  // Patterned felt (procedural)
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0b4a3e";
    ctx.fillRect(0,0,512,512);

    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 1400; i++) {
      const x = Math.random()*512, y = Math.random()*512;
      const r = 0.5 + Math.random()*1.5;
      ctx.fillStyle = (i%3===0) ? "#0f6a58" : "#083a30";
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }

    // subtle hex / stripe
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + 14);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  const feltMat = new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 1, metalness: 0 });
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.08, 64), feltMat);
  felt.position.y = 0.66;
  table.add(felt);

  // Neon edges on table
  const neonEdge = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.05, 10, 72), M.neonBlue);
  neonEdge.rotation.x = Math.PI / 2;
  neonEdge.position.y = 0.72;
  table.add(neonEdge);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.12, 10, 72), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.70;
  table.add(rim);

  // Dealer chip (grabbable)
  const dealerChip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.chip);
  dealerChip.name = "DEALER_CHIP";
  dealerChip.position.set(0.95, 0.744, 0.35);
  dealerChip.rotation.set(-Math.PI / 2, 0, 0);
  table.add(dealerChip);
  markGrabbable(dealerChip, 0.01);

  // Cards: bigger + hover + billboard
  const cards = new THREE.Group(); cards.name = "CARDS_ROOT"; table.add(cards);

  const cardTexCache = new Map();
  function makeCardTex(label, fg="#111", bg="#f3f4f6") {
    const key = `${label}|${fg}|${bg}`;
    if (cardTexCache.has(key)) return cardTexCache.get(key);
    const c = document.createElement("canvas");
    c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 10;
    ctx.strokeRect(10,10,c.width-20,c.height-20);
    ctx.fillStyle = fg;
    ctx.font = "bold 88px system-ui, Arial";
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText(label, 26, 18);
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font = "bold 128px system-ui, Arial";
    ctx.fillText(label, c.width/2, c.height/2);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    cardTexCache.set(key, tex);
    return tex;
  }

  function makeCard(name, label="A") {
    const g = new THREE.Group(); g.name = name;
    const w = 0.22, h = 0.32, thick = 0.003;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, thick, h), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0 }));
    g.add(back);

    const faceMat = new THREE.MeshStandardMaterial({ map: makeCardTex(label), roughness: 0.95, metalness: 0 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w*0.98, h*0.98), faceMat);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0022;
    g.add(face);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(w*1.02, thick*0.8, h*1.02), M.trim);
    rim.position.y = -0.001;
    g.add(rim);

    markGrabbable(g, 0.01);
    g.userData.label = label;
    return g;
  }

  // Hole cards
  const CARD_Y = 0.765;
  const hole1 = makeCard("HOLE_1", "A"); hole1.position.set(-0.24, CARD_Y, 1.18);
  const hole2 = makeCard("HOLE_2", "K"); hole2.position.set( 0.24, CARD_Y, 1.18);
  cards.add(hole1, hole2);

  // Community cards (3x bigger request)
  const comm = [];
  const labels = ["Q","J","10","9","2"];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(`COMM_${i}`, labels[i]);
    c.scale.set(3, 3, 3);                  // ✅ 3x bigger
    c.position.set((-0.75 + i * 0.375), CARD_Y, -0.22);
    comm.push(c);
    cards.add(c);
  }

  // Turn indicator: bright neon circle + text in it (no upside-down panel)
  function makeCircleTextTex(text, color="#ff2a2a") {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,512,512);

    // glow ring
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(256,256,195,0,Math.PI*2);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(256,256,170,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px system-ui, Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(text, 256, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  const turnCircle = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 48),
    new THREE.MeshBasicMaterial({ map: makeCircleTextTex("CHECK"), transparent: true })
  );
  turnCircle.name = "TURN_CIRCLE";
  turnCircle.rotation.x = -Math.PI / 2;
  turnCircle.position.set(0, 0.748, 0);
  table.add(turnCircle);

  function setTurnText(t) {
    const mat = turnCircle.material;
    mat.map?.dispose?.();
    mat.map = makeCircleTextTex(t, "#ff2a2a");
    mat.needsUpdate = true;
  }

  // Betting pads (flat)
  const bets = new THREE.Group(); table.add(bets);
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
      new THREE.MeshBasicMaterial({ color: (i%2?0xff2bd6:0x00e5ff), transparent:true, opacity:0.35, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(bx, BET_Y, bz);
    bets.add(pad);
    betPads.push(pad);
  }

  // Bots: limbs + nametag + hole cards above head
  const bots = [];
  const seatedBots = [];
  const walkers = [];

  function makeNameTag(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0,0,512,128);
    ctx.strokeStyle = "rgba(0,229,255,0.9)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10,10,492,108);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px system-ui, Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.22),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    plane.position.set(0, 2.35, 0);
    return plane;
  }

  function makeBot(colorMat, name="BOT") {
    const b = new THREE.Group(); b.name = "BOT";

    // torso + hips
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.60, 0.24), M.trim);
    torso.position.y = 1.25;
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.22), M.wall);
    hips.position.y = 0.95;

    // head + visor
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), M.wall);
    head.position.y = 1.75;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), colorMat);
    visor.position.set(0, 1.75, 0.18);

    // shoulders/arms
    const shL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.trim);
    shL.position.set(-0.26, 1.45, 0.02);
    const shR = shL.clone(); shR.position.x = 0.26;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 0.10), M.trim);
    armL.position.set(-0.30, 1.20, 0.02);
    const armR = armL.clone(); armR.position.x = 0.30;

    // legs/knees/feet
    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.40, 0.12), M.wall);
    thighL.position.set(-0.12, 0.65, 0);
    const thighR = thighL.clone(); thighR.position.x = 0.12;

    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.trim);
    kneeL.position.set(-0.12, 0.45, 0);
    const kneeR = kneeL.clone(); kneeR.position.x = 0.12;

    const shinL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), M.wall);
    shinL.position.set(-0.12, 0.23, 0);
    const shinR = shinL.clone(); shinR.position.x = 0.12;

    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.22), M.dark);
    footL.position.set(-0.12, 0.04, 0.04);
    const footR = footL.clone(); footR.position.x = 0.12;

    // name tag
    const tag = makeNameTag(name);
    b.add(torso, hips, head, visor, shL, shR, armL, armR, thighL, thighR, kneeL, kneeR, shinL, shinR, footL, footR, tag);

    // hole cards above head (show-only)
    const hc = new THREE.Group();
    const h1 = makeCard("BOT_H1", "A"); const h2 = makeCard("BOT_H2", "K");
    h1.userData.grabbable = false; h2.userData.grabbable = false;
    h1.scale.set(0.55,0.55,0.55); h2.scale.set(0.55,0.55,0.55);
    h1.position.set(-0.13, 0, 0); h2.position.set(0.13, 0, 0);
    hc.add(h1, h2);
    hc.position.set(0, 2.10, 0);
    b.add(hc);

    b.userData = { mode:"idle", speed:0.25+Math.random()*0.25, phase:Math.random()*999, cx:0, cz:0, radius:2.5 };
    b.userData._tag = tag;
    b.userData._hole = hc;
    return b;
  }

  // Seats around table
  const seatBotPos = [];
  const SEAT_RADIUS_BOTS = 4.55;
  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    seatBotPos.push(new THREE.Vector3(Math.cos(a)*SEAT_RADIUS_BOTS, 0, Math.sin(a)*SEAT_RADIUS_BOTS));
  }

  // Seated bots (5)
  for (let i = 0; i < 5; i++) {
    const bot = makeBot(i%2?M.neonPink:M.neonBlue, `SEAT ${(i+1)%SEAT_COUNT}`);
    bot.userData.mode = "seated";
    bot.userData.seatIndex = (i+1) % SEAT_COUNT;
    const p = seatBotPos[bot.userData.seatIndex];
    bot.position.set(p.x, 0, p.z);
    bot.rotation.y = Math.atan2(-p.x, -p.z);
    lobby.add(bot);
    bots.push(bot);
    seatedBots.push(bot);
  }

  // Walkers
  function addWalker(parent, cx, cz, radius, name) {
    const bot = makeBot(M.neonBlue, name);
    bot.userData.mode = "walk";
    bot.userData.cx = cx;
    bot.userData.cz = cz;
    bot.userData.radius = radius;
    parent.add(bot);
    bots.push(bot);
    walkers.push(bot);
    return bot;
  }
  addWalker(lobby, 0, 0, 9.2, "WALKER");
  addWalker(lobby, 0, 0, 8.2, "WALKER2");

  // Store room + display cases (2 each side)
  function jumbotronFrame() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.18), M.trim);
    frame.position.y = 2.4;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.55, 0.06), M.screen);
    screen.position.set(0, 2.4, 0.11);
    g.add(frame, screen);
    return g;
  }

  function hallway(angleRad, neonMat, name) {
    const g = new THREE.Group(); g.name = name;
    const width = 4.2, height = 3.2, wallT = 0.25;
    const baseZ = -(LOBBY_R + HALL_LEN / 2 - 1.0);

    const f = new THREE.Mesh(new THREE.PlaneGeometry(width, HALL_LEN), M.floor);
    f.rotation.x = -Math.PI / 2;
    f.position.set(0, 0.001, baseZ);
    g.add(f);

    const wl = new THREE.Mesh(new THREE.BoxGeometry(wallT, height, HALL_LEN), M.wall);
    wl.position.set(-width/2, height/2, baseZ);
    g.add(wl);

    const wr = wl.clone(); wr.position.x = width/2; g.add(wr);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, HALL_LEN), neonMat);
    strip.position.set(0, height - 0.25, baseZ);
    g.add(strip);

    g.rotation.y = angleRad;
    return g;
  }

  function room(angleRad, neonMat, name) {
    const g = new THREE.Group(); g.name = name;
    const s = ROOM_S, h = 3.6;
    const baseZ = -(LOBBY_R + HALL_LEN + s / 2 - 1.0);

    const f = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.floor);
    f.rotation.x = -Math.PI / 2;
    f.position.set(0, 0.001, baseZ);
    g.add(f);

    const back = new THREE.Mesh(new THREE.BoxGeometry(s, h, 0.25), M.wall);
    back.position.set(0, h/2, baseZ - s/2);
    g.add(back);

    const label = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.18), neonMat);
    label.position.set(0, 2.95, baseZ - s/2 + 0.35);
    g.add(label);

    const j = jumbotronFrame();
    j.position.set(0, 0, baseZ - s/2 + 0.2);
    g.add(j);

    g.rotation.y = angleRad;
    return g;
  }

  world.add(hallway(0, M.neonBlue, "HALL_N"));
  world.add(hallway(-Math.PI/2, M.neonBlue, "HALL_E"));
  world.add(hallway(Math.PI, M.neonPink, "HALL_S"));
  world.add(hallway(Math.PI/2, M.neonPink, "HALL_W"));

  const roomE = room(-Math.PI/2, M.neonBlue, "ROOM_E_STORE");
  world.add(roomE);

  // Store cases
  (function addStoreCases() {
    const s = ROOM_S;
    const baseZ = -(LOBBY_R + HALL_LEN + s / 2 - 1.0);

    function caseBox(x, z) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.55), M.trim);
      base.position.y = 0.18;
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.45, 0.50),
        new THREE.MeshStandardMaterial({ color: 0x99ccff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18 })
      );
      glass.position.y = 0.58;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.04, 0.52), M.neonBlue);
      glow.position.y = 0.80;
      g.add(base, glass, glow);
      g.position.set(x, 0, z);
      return g;
    }

    // two cases left side + two cases right side
    roomE.add(caseBox(-2.6, baseZ + 1.4));
    roomE.add(caseBox(-2.6, baseZ - 0.2));
    roomE.add(caseBox( 2.6, baseZ + 1.4));
    roomE.add(caseBox( 2.6, baseZ - 0.2));
  })();

  // TURN SYSTEM (simple showtime)
  const occupied = new Array(SEAT_COUNT).fill(false);
  occupied[0] = true;
  for (const b of seatedBots) occupied[b.userData.seatIndex] = true;

  const turn = { seat: 0, t: 0, period: 3.0 };

  function actionForSeat(seat) {
    if (seat === 0) return "YOUR TURN: CHECK";
    const r = seat % 3;
    if (r === 0) return `SEAT ${seat}: BET $50`;
    if (r === 1) return `SEAT ${seat}: RAISE $120`;
    return `SEAT ${seat}: CHECK`;
  }

  function moveTurnCircle(seat) {
    const p = seatBetPos[seat];
    turnCircle.position.set(p.x, 0.748, p.z);
    // Keep it readable: face camera
    turnCircle.rotation.x = -Math.PI/2;
  }

  moveTurnCircle(0);
  setTurnText("CHECK");

  // World tick: hover + billboard + bots + ring flat
  const state = { t: 0 };
  scene.userData.worldTick = (dt) => {
    state.t += dt;

    // neon pulse
    const pulse = 0.9 + 0.25*Math.sin(state.t*1.3);
    M.neonBlue.emissiveIntensity = pulse;
    M.neonPink.emissiveIntensity = 0.8 + 0.22*Math.sin(state.t*1.45);

    // Cards hover
    const bob = 0.010 * Math.sin(state.t * 1.6);
    const allCards = [hole1, hole2, ...comm];
    for (const c of allCards) {
      if (c.parent === cards) c.position.y = CARD_Y + bob;
    }

    // Billboard cards toward camera (so they "face you")
    const q = new THREE.Quaternion();
    camera.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    const yaw = e.y;

    for (const c of allCards) {
      if (c.parent === cards) c.rotation.y = yaw; // ✅ face viewer
    }

    // Force pads flat
    for (const pad of betPads) pad.rotation.x = -Math.PI/2;

    // Dealer chip flat if on table
    if (dealerChip.parent === table) dealerChip.rotation.set(-Math.PI/2, 0, 0);

    // Bots: walkers + billboard tags/cards
    for (const bot of walkers) {
      const u = bot.userData;
      const a = u.phase + state.t*u.speed;
      bot.position.x = u.cx + Math.cos(a)*u.radius;
      bot.position.z = u.cz + Math.sin(a)*u.radius;
      bot.rotation.y = -a + Math.PI/2;
    }

    for (const bot of bots) {
      // name tags + hole cards face camera
      if (bot.userData._tag) bot.userData._tag.lookAt(camera.position);
      if (bot.userData._hole) bot.userData._hole.lookAt(camera.position);
    }

    // Turn cycle
    turn.t += dt;
    if (turn.t >= turn.period) {
      turn.t = 0;
      for (let i = 1; i <= SEAT_COUNT; i++) {
        const n = (turn.seat + i) % SEAT_COUNT;
        if (occupied[n]) { turn.seat = n; break; }
      }
      moveTurnCircle(turn.seat);
      const text = actionForSeat(turn.seat);
      setTurnText(text.includes("CHECK") ? "CHECK" : (text.includes("RAISE") ? "RAISE" : "BET"));
    }
  };

  writeHud?.("[world] build done ✅ (beautify + showtime + balcony/stairs/guard/cases + billboard cards)");
}
