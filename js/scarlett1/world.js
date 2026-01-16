// /js/scarlett1/world.js — Scarlett1 ULTIMATE MASTER WORLD (FULL)
// BUILD: WORLD_MASTER_SUPREME_v6_0_PRETTY_POKER_QUEST_SAFE
// ✅ Keeps current working runtime behavior
// ✅ Full lobby + sealed tall walls (NO ceiling)
// ✅ Divot pit + rail with entrance gap + aligned stairs + guard beacon
// ✅ Balcony ring + railing
// ✅ Full rooms + halls + jumbotrons + signage
// ✅ Storefront + 2 display cases each side
// ✅ Poker table: patterned felt + neon trim + hood ring
// ✅ Cards hover + LOCKED orientation (no wobble) + community cards 3x bigger
// ✅ Turn indicator: bright neon circle text (always upright)
// ✅ Bots: seated+walking+spectate + name tags + hole cards above head
// ✅ Chairs placed with clearance; avoids stairs entrance sector
// ✅ "Devils" statues in Scorpion/Devil room (Quest safe)
// ✅ Interactables registered for grabbing

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_MASTER_SUPREME_v6_0_PRETTY_POKER_QUEST_SAFE";
  writeHud?.(`[world] build starting… ${BUILD}`);

  // -----------------------------
  // Perf/compat helpers
  // -----------------------------
  const interactables = [];
  scene.userData.interactables = interactables;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function markGrabbable(obj, dropLift = 0.0) {
    obj.userData.grabbable = true;
    obj.userData.dropLift = dropLift;
    interactables.push(obj);
  }

  function addLightSafe(light) {
    // keep intensity reasonable for Quest
    scene.add(light);
    return light;
  }

  // -----------------------------
  // Materials
  // -----------------------------
  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1, metalness: 0 }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x151a28, roughness: 0.95, metalness: 0 }),
    trim:  new THREE.MeshStandardMaterial({ color: 0x1f2535, roughness: 0.75, metalness: 0.1 }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1, metalness: 0 }),
    gold:  new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.3 }),
    chip:  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.05 }),

    neonBlue: new THREE.MeshStandardMaterial({
      color: 0x00e5ff, roughness: 0.35, metalness: 0.2,
      emissive: new THREE.Color(0x00333a), emissiveIntensity: 0.95
    }),
    neonPink: new THREE.MeshStandardMaterial({
      color: 0xff2bd6, roughness: 0.35, metalness: 0.2,
      emissive: new THREE.Color(0x33001f), emissiveIntensity: 0.85
    }),
    neonRed: new THREE.MeshStandardMaterial({
      color: 0xff2a2a, roughness: 0.35, metalness: 0.15,
      emissive: new THREE.Color(0x3a0000), emissiveIntensity: 1.2
    }),

    screen: new THREE.MeshStandardMaterial({
      color: 0x0a0b10, roughness: 1, metalness: 0,
      emissive: new THREE.Color(0x06080c), emissiveIntensity: 0.95
    }),
  };

  // -----------------------------
  // World root
  // -----------------------------
  const world = new THREE.Group();
  world.name = "WORLD_ROOT";
  scene.add(world);

  // -----------------------------
  // Lighting (bright but Quest-safe)
  // -----------------------------
  addLightSafe(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(8, 12, 6);
  addLightSafe(sun);

  const fillA = new THREE.PointLight(0x00e5ff, 0.7, 28);
  fillA.position.set(7, 4, 0);
  addLightSafe(fillA);

  const fillB = new THREE.PointLight(0xff2bd6, 0.7, 28);
  fillB.position.set(-7, 4, 0);
  addLightSafe(fillB);

  // -----------------------------
  // Layout constants
  // -----------------------------
  const LOBBY_R = 14;
  const WALL_H = 7.8;          // tall walls (2x-ish)
  const BALCONY_Y = 4.6;
  const HALL_LEN = 10;
  const ROOM_S = 10;

  // Divot/pit
  const divotR = 6.4;
  const divotDepth = 0.62;
  const railR = divotR + 0.3;

  // Stairs aligned at +Z
  const STAIRS_Z = railR + 0.75;   // top landing near entrance gap
  const STAIRS_W = 1.85;

  // -----------------------------
  // Lobby shell: floor + tall walls, no ceiling
  // -----------------------------
  const lobby = new THREE.Group();
  lobby.name = "LOBBY";
  world.add(lobby);

  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 80), M.floor);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001;
  lobby.add(lobbyFloor);

  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, WALL_H, 72, 1, true),
    M.wall
  );
  outerWall.position.y = WALL_H / 2;
  lobby.add(outerWall);

  // Neon ring on lobby floor
  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_R - 0.55, 0.08, 12, 96),
    M.neonBlue
  );
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.03;
  lobby.add(neonRing);

  // Balcony ring + rail (no ceiling)
  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(LOBBY_R - 1.6, LOBBY_R - 0.6, 80),
    new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 1, metalness: 0 })
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = BALCONY_Y;
  lobby.add(balcony);

  const balconyRail = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_R - 1.0, 0.06, 10, 96),
    M.neonBlue
  );
  balconyRail.rotation.x = Math.PI / 2;
  balconyRail.position.y = BALCONY_Y + 0.12;
  lobby.add(balconyRail);

  // -----------------------------
  // Divot pit
  // -----------------------------
  const center = new THREE.Group();
  center.name = "CENTERPIECE";
  lobby.add(center);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(divotR, 80),
    new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1, metalness: 0 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -divotDepth;
  center.add(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(divotR, divotR, divotDepth, 80, 1, true),
    M.trim
  );
  pitWall.position.y = -divotDepth / 2;
  center.add(pitWall);

  // Rail posts with entrance gap aligned with stairs at +Z
  const railPosts = new THREE.Group();
  railPosts.name = "PIT_RAIL_POSTS";
  center.add(railPosts);

  const SEG = 44;
  // gap centered at +Z direction (angle ~ +90deg in atan2 coordinates, but here we use sin/cos around Z)
  // We'll choose indices near 1/4 of circle.
  const gapCenter = Math.floor(SEG * 0.25);
  const gapHalf = 2; // width of gap
  const gapStart = gapCenter - gapHalf;
  const gapEnd = gapCenter + gapHalf;

  for (let i = 0; i < SEG; i++) {
    if (i >= gapStart && i <= gapEnd) continue;
    const a = (i / SEG) * Math.PI * 2;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.92, 8),
      M.gold
    );
    post.position.set(Math.cos(a) * railR, 0.46, Math.sin(a) * railR);
    railPosts.add(post);
  }

  const topRail = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.07, 10, 96),
    M.gold
  );
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = 0.94;
  center.add(topRail);

  // -----------------------------
  // Stairs down (aligned with rail gap)
  // -----------------------------
  const stairs = new THREE.Group();
  stairs.name = "STAIRS";
  center.add(stairs);

  // Place stairs centered at x=0 and pointing toward pit (toward -Z)
  const steps = 11;
  for (let s = 0; s < steps; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(STAIRS_W, 0.08, 0.35),
      M.trim
    );
    step.position.set(
      0,
      0.04 - s * (divotDepth / steps),
      STAIRS_Z - s * 0.33
    );
    stairs.add(step);
  }

  // Side rails for stairs (so it feels aligned/clean)
  const stairRailL = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.5, steps * 0.33 + 0.5),
    M.gold
  );
  stairRailL.position.set(-STAIRS_W / 2 - 0.12, 0.55, STAIRS_Z - (steps * 0.33) / 2);
  stairs.add(stairRailL);

  const stairRailR = stairRailL.clone();
  stairRailR.position.x = STAIRS_W / 2 + 0.12;
  stairs.add(stairRailR);

  // Entrance marker strip
  const entranceStrip = new THREE.Mesh(
    new THREE.BoxGeometry(STAIRS_W + 0.5, 0.05, 0.35),
    M.neonBlue
  );
  entranceStrip.position.set(0, 0.03, railR + 0.18);
  center.add(entranceStrip);

  // -----------------------------
  // Guard (always visible + beacon + pulse)
  // -----------------------------
  const guard = new THREE.Group();
  guard.name = "GUARD";

  const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.65, 4, 10), M.trim);
  gBody.position.y = 1.05;

  const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), M.wall);
  gHead.position.y = 1.75;

  const gVis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.02), M.neonRed);
  gVis.position.set(0, 1.75, 0.19);

  const gShoulders = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.25), M.trim);
  gShoulders.position.set(0, 1.45, 0.02);

  guard.add(gBody, gHead, gShoulders, gVis);

  // Set at top landing, facing into lobby
  guard.position.set(0, 0, railR + 1.55);
  guard.rotation.y = Math.PI;
  lobby.add(guard);

  const guardLight = new THREE.PointLight(0xff2a2a, 1.35, 20);
  guardLight.position.set(guard.position.x, 2.8, guard.position.z);
  world.add(guardLight);

  guard.userData._pulseT = Math.random() * 10;
  guard.userData._visorMat = gVis.material;

  // -----------------------------
  // Table: base + top + patterned felt + neon trim + hood ring
  // -----------------------------
  const table = new THREE.Group();
  table.name = "POKER_TABLE";
  table.position.y = -divotDepth + 0.02;
  center.add(table);

  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.55, 28), M.trim);
  tableBase.position.y = 0.28;
  table.add(tableBase);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.22, 80), M.trim);
  tableTop.position.y = 0.55;
  table.add(tableTop);

  // Felt texture (procedural)
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0b4a3e";
    ctx.fillRect(0, 0, 512, 512);

    // speckles
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 0.6 + Math.random() * 1.6;
      ctx.fillStyle = (i % 3 === 0) ? "#0f6a58" : "#083a30";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // radial pattern
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.lineTo(256 + Math.cos(a) * 260, 256 + Math.sin(a) * 260);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  const feltMat = new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 1, metalness: 0 });
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.58, 3.58, 0.08, 80), feltMat);
  felt.position.y = 0.66;
  table.add(felt);

  // Neon edge + gold rim
  const neonEdge = new THREE.Mesh(new THREE.TorusGeometry(3.58, 0.05, 10, 96), M.neonBlue);
  neonEdge.rotation.x = Math.PI / 2;
  neonEdge.position.y = 0.72;
  table.add(neonEdge);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.58, 0.12, 10, 96), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.70;
  table.add(rim);

  // Table hood ring (no ceiling; just a “hood” frame so you can see everything)
  const hood = new THREE.Group();
  hood.name = "TABLE_HOOD";
  table.add(hood);

  const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.06, 10, 96), M.neonPink);
  hoodRing.rotation.x = Math.PI / 2;
  hoodRing.position.y = 2.55;
  hood.add(hoodRing);

  const hoodPosts = new THREE.Group();
  hood.add(hoodPosts);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.35, 8), M.gold);
    post.position.set(Math.cos(a) * 4.2, 1.35, Math.sin(a) * 4.2);
    hoodPosts.add(post);
  }

  // Dealer chip (grabbable)
  const dealerChip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.chip);
  dealerChip.name = "DEALER_CHIP";
  dealerChip.position.set(0.95, 0.744, 0.35);
  dealerChip.rotation.set(-Math.PI / 2, 0, 0);
  table.add(dealerChip);
  markGrabbable(dealerChip, 0.01);

  // -----------------------------
  // Chips stacks (grabbable)
  // -----------------------------
  function makeChip(color = 0xf2f2f2) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18), mat);
    c.rotation.x = -Math.PI / 2;
    markGrabbable(c, 0.01);
    return c;
  }

  function chipStack(x, z, h = 9) {
    const g = new THREE.Group();
    for (let i = 0; i < h; i++) {
      const c = makeChip(i % 2 ? 0xf5f5f5 : 0xe8e8e8);
      c.position.set(0, i * 0.032, 0);
      g.add(c);
    }
    g.position.set(x, 0.72, z);
    return g;
  }

  table.add(chipStack(-1.1, -0.55, 10));
  table.add(chipStack(-0.7, -1.0, 9));
  table.add(chipStack( 1.4, -0.9, 8));

  // -----------------------------
  // Cards (hover + locked orientation = NO wobble)
  // -----------------------------
  const cards = new THREE.Group();
  cards.name = "CARDS_ROOT";
  table.add(cards);

  const cardTexCache = new Map();
  function makeCardTex(label, fg = "#111", bg = "#f3f4f6") {
    const key = `${label}|${fg}|${bg}`;
    if (cardTexCache.has(key)) return cardTexCache.get(key);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, c.width - 20, c.height - 20);

    ctx.fillStyle = fg;
    ctx.font = "bold 92px system-ui, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, 24, 14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 132px system-ui, Arial";
    ctx.fillText(label, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    cardTexCache.set(key, tex);
    return tex;
  }

  function makeCard(name, label = "A") {
    const g = new THREE.Group();
    g.name = name;

    const w = 0.22, h = 0.32, thick = 0.003;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(w, thick, h),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0 })
    );
    g.add(back);

    const faceMat = new THREE.MeshStandardMaterial({ map: makeCardTex(label), roughness: 0.95, metalness: 0 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), faceMat);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0022;
    g.add(face);

    const rimCard = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, thick * 0.8, h * 1.02), M.trim);
    rimCard.position.y = -0.001;
    g.add(rimCard);

    markGrabbable(g, 0.01);
    g.userData.label = label;
    return g;
  }

  const CARD_Y = 0.765;
  const hole1 = makeCard("HOLE_1", "A"); hole1.position.set(-0.24, CARD_Y, 1.18);
  const hole2 = makeCard("HOLE_2", "K"); hole2.position.set( 0.24, CARD_Y, 1.18);
  cards.add(hole1, hole2);

  // Community cards 3x bigger
  const comm = [];
  const labels = ["Q", "J", "10", "9", "2"];
  for (let i = 0; i < 5; i++) {
    const c = makeCard(`COMM_${i}`, labels[i]);
    c.scale.set(3, 3, 3);
    c.position.set((-0.75 + i * 0.375), CARD_Y, -0.22);
    comm.push(c);
    cards.add(c);
  }

  // -----------------------------
  // Betting pads + seat positions
  // -----------------------------
  const SEAT_COUNT = 8;
  const SEAT_RADIUS_TABLE = 3.05;
  const BET_Y = 0.742;

  const seatBetPos = [];
  const betPads = [];
  const bets = new THREE.Group();
  bets.name = "BETTING_ZONES";
  table.add(bets);

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

  // Pass line ring
  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(2.85, 3.05, 64),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.y = 0.742;
  bets.add(passLine);

  // -----------------------------
  // Turn indicator: neon circle + text (always upright)
  // -----------------------------
  function makeCircleTextTex(text, color = "#ff2a2a") {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 512);

    // glow ring
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(256, 256, 195, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(256, 256, 170, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 70px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
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

  function moveTurnCircleToSeat(seatIndex) {
    const p = seatBetPos[seatIndex];
    turnCircle.position.set(p.x, 0.748, p.z);
    turnCircle.rotation.x = -Math.PI / 2;
  }

  // -----------------------------
  // Chairs: placed with clearance; avoid stairs entrance sector
  // -----------------------------
  const chairs = new THREE.Group();
  chairs.name = "CHAIRS";
  lobby.add(chairs);

  const SEAT_RADIUS_CHAIR = 5.2;
  const stairsDir = new THREE.Vector3(0, 0, 1); // +Z is stairs direction
  const avoidAngle = 0.45; // radians (~25deg) avoid near stairs gap

  function makeChair() {
    const g = new THREE.Group();
    g.name = "CHAIR";

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), M.trim);
    seat.position.y = 0.48;

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.65, 0.08), M.trim);
    back.position.set(0, 0.82, -0.27);

    const legGeom = new THREE.BoxGeometry(0.08, 0.48, 0.08);
    const legMat = M.dark;
    const legs = new THREE.Group();
    const offsets = [
      [-0.25, 0.24, -0.25],
      [ 0.25, 0.24, -0.25],
      [-0.25, 0.24,  0.25],
      [ 0.25, 0.24,  0.25],
    ];
    for (const [x, y, z] of offsets) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(x, y, z);
      legs.add(leg);
    }

    g.add(seat, back, legs);
    return g;
  }

  const chairInstances = [];
  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const angleToStairs = Math.acos(clamp(dir.dot(stairsDir), -1, 1));

    // Skip chairs in the stairs entrance sector (prevents intersection / walk-by clearance)
    if (angleToStairs < avoidAngle) continue;

    const chair = makeChair();
    chair.position.set(dir.x * SEAT_RADIUS_CHAIR, 0, dir.z * SEAT_RADIUS_CHAIR);
    chair.rotation.y = Math.atan2(-chair.position.x, -chair.position.z); // face table
    chairs.add(chair);
    chairInstances.push(chair);
  }

  // -----------------------------
  // Rooms + halls + signage + jumbotrons
  // -----------------------------
  function jumbotronFrame(neonMat) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.18), M.trim);
    frame.position.y = 2.4;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.55, 0.06), M.screen);
    screen.position.set(0, 2.4, 0.11);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.22), neonMat);
    strip.position.set(0, 3.25, 0.02);

    g.add(frame, screen, strip);
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
    wl.position.set(-width / 2, height / 2, baseZ);
    g.add(wl);

    const wr = wl.clone();
    wr.position.x = width / 2;
    g.add(wr);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, HALL_LEN), neonMat);
    strip.position.set(0, height - 0.25, baseZ);
    g.add(strip);

    g.rotation.y = angleRad;
    return g;
  }

  function room(angleRad, neonMat, name, labelText) {
    const g = new THREE.Group(); g.name = name;
    const s = ROOM_S, h = 3.6;
    const baseZ = -(LOBBY_R + HALL_LEN + s / 2 - 1.0);

    const f = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.floor);
    f.rotation.x = -Math.PI / 2;
    f.position.set(0, 0.001, baseZ);
    g.add(f);

    // back wall + side walls (tightened geometry)
    const back = new THREE.Mesh(new THREE.BoxGeometry(s, h, 0.25), M.wall);
    back.position.set(0, h / 2, baseZ - s / 2);
    g.add(back);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, s), M.wall);
    sideL.position.set(-s / 2, h / 2, baseZ);
    g.add(sideL);

    const sideR = sideL.clone();
    sideR.position.x = s / 2;
    g.add(sideR);

    const label = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.26, 0.18), neonMat);
    label.position.set(0, 3.0, baseZ - s / 2 + 0.35);
    g.add(label);

    const j = jumbotronFrame(neonMat);
    j.position.set(0, 0, baseZ - s / 2 + 0.2);
    g.add(j);

    // corner pillars
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.18), neonMat);
      const sx = (i < 2 ? -1 : 1) * (s / 2 - 0.6);
      const sz = (i % 2 ? -1 : 1) * (s / 2 - 0.6);
      p.position.set(sx, 1.4, baseZ + sz);
      g.add(p);
    }

    g.userData.labelText = labelText || name;
    g.rotation.y = angleRad;
    return g;
  }

  world.add(hallway(0, M.neonBlue, "HALL_N"));
  world.add(hallway(-Math.PI / 2, M.neonBlue, "HALL_E"));
  world.add(hallway(Math.PI, M.neonPink, "HALL_S"));
  world.add(hallway(Math.PI / 2, M.neonPink, "HALL_W"));

  const roomN = room(0, M.neonBlue, "ROOM_N_LOUNGE", "LOUNGE");
  const roomE = room(-Math.PI / 2, M.neonBlue, "ROOM_E_STORE", "STORE");
  const roomS = room(Math.PI, M.neonRed, "ROOM_S_DEVIL", "DEVIL ROOM");
  const roomW = room(Math.PI / 2, M.neonPink, "ROOM_W_TOURNAMENT", "TOURNAMENT");
  world.add(roomN, roomE, roomS, roomW);

  // -----------------------------
  // Storefront: mannequins + 2 cases each side
  // -----------------------------
  (function buildStore() {
    const s = ROOM_S;
    const baseZ = -(LOBBY_R + HALL_LEN + s / 2 - 1.0);

    const content = new THREE.Group();
    content.name = "STORE_CONTENT";
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

    function displayCase(x, z) {
      const g = new THREE.Group();
      g.name = "DISPLAY_CASE";
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.55), M.trim);
      base.position.y = 0.18;

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.45, 0.50),
        new THREE.MeshStandardMaterial({
          color: 0x99ccff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18
        })
      );
      glass.position.y = 0.58;

      const glow = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.04, 0.52), M.neonBlue);
      glow.position.y = 0.80;

      // little “item”
      const item = new THREE.Mesh(new THREE.TorusKnotGeometry(0.12, 0.04, 64, 10), M.neonPink);
      item.position.y = 0.60;

      g.add(base, glass, glow, item);
      g.position.set(x, 0, z);
      return g;
    }

    // mannequins
    content.add(mannequin(-1.6, -1.2, M.neonPink));
    content.add(mannequin( 0.0, -1.2, M.neonBlue));
    content.add(mannequin( 1.6, -1.2, M.neonPink));

    // cases: 2 each side
    content.add(displayCase(-2.6,  1.4));
    content.add(displayCase(-2.6, -0.2));
    content.add(displayCase( 2.6,  1.4));
    content.add(displayCase( 2.6, -0.2));

    // store light
    const storeLight = new THREE.PointLight(0x00e5ff, 0.95, 18);
    storeLight.position.set(0, 3.2, baseZ + 1.0);
    roomE.add(storeLight);
  })();

  // -----------------------------
  // Devil room: “devils” statues (Quest safe)
  // -----------------------------
  (function buildDevilRoom() {
    const s = ROOM_S;
    const baseZ = -(LOBBY_R + HALL_LEN + s / 2 - 1.0);
    const content = new THREE.Group();
    content.name = "DEVIL_CONTENT";
    content.position.set(0, 0, baseZ);
    roomS.add(content);

    function devilStatue(x, z) {
      const g = new THREE.Group();
      g.name = "DEVIL_STATUE";

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 10), M.trim);
      body.position.y = 1.1;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 12), M.wall);
      head.position.y = 1.85;

      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 10), M.neonRed);
      hornL.position.set(-0.12, 2.05, 0);
      hornL.rotation.z = 0.25;

      const hornR = hornL.clone();
      hornR.position.x = 0.12;
      hornR.rotation.z = -0.25;

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.02), M.neonRed);
      eyes.position.set(0, 1.85, 0.20);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 18), M.dark);
      base.position.y = 0.04;

      g.add(body, head, hornL, hornR, eyes, base);
      g.position.set(x, 0, z);
      return g;
    }

    content.add(devilStatue(-2.2, -1.2));
    content.add(devilStatue( 0.0, -1.0));
    content.add(devilStatue( 2.2, -1.2));

    const devilLight = new THREE.PointLight(0xff2a2a, 1.15, 22);
    devilLight.position.set(0, 3.0, baseZ + 0.5);
    roomS.add(devilLight);
  })();

  // -----------------------------
  // Bots: seated + walkers + spectators with tags + hole cards
  // -----------------------------
  function makeNameTag(text, colorHex = 0x00e5ff) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = `rgba(${(colorHex>>16)&255},${(colorHex>>8)&255},${colorHex&255},0.9)`;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 108);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.24),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    plane.position.set(0, 2.35, 0);
    return plane;
  }

  function makeBot(colorMat, name = "BOT", tagColor = 0x00e5ff) {
    const b = new THREE.Group();
    b.name = "BOT";

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
    const tag = makeNameTag(name, tagColor);

    // hole cards (show-only)
    const hc = new THREE.Group();
    const h1 = makeCard("BOT_H1", "A");
    const h2 = makeCard("BOT_H2", "K");
    h1.userData.grabbable = false;
    h2.userData.grabbable = false;
    h1.scale.set(0.55, 0.55, 0.55);
    h2.scale.set(0.55, 0.55, 0.55);
    h1.position.set(-0.13, 0, 0);
    h2.position.set( 0.13, 0, 0);
    hc.add(h1, h2);
    hc.position.set(0, 2.10, 0);

    b.add(torso, hips, head, visor, shL, shR, armL, armR, thighL, thighR, kneeL, kneeR, shinL, shinR, footL, footR, tag, hc);

    b.userData = {
      mode: "idle",
      speed: 0.22 + Math.random() * 0.22,
      phase: Math.random() * 999,
      cx: 0, cz: 0, radius: 2.5,
      seatIndex: -1,
      knock: 0,
      _tag: tag,
      _hole: hc
    };

    return b;
  }

  const bots = [];
  const seatedBots = [];
  const walkers = [];

  // seat positions around table in lobby space
  const seatBotPos = [];
  const SEAT_RADIUS_BOTS = 4.65;
  for (let i = 0; i < SEAT_COUNT; i++) {
    const a = (i / SEAT_COUNT) * Math.PI * 2;
    seatBotPos.push(new THREE.Vector3(Math.cos(a) * SEAT_RADIUS_BOTS, 0, Math.sin(a) * SEAT_RADIUS_BOTS));
  }

  // Fill seats (leave one "player seat" open near +Z if you want)
  // We also avoid placing seated bots in the stairs/entrance sector so it stays clear.
  const occupied = new Array(SEAT_COUNT).fill(false);
  occupied[0] = true; // player seat conceptually

  for (let i = 1; i < SEAT_COUNT; i++) {
    const p = seatBotPos[i];
    const dir = new THREE.Vector3(p.x, 0, p.z).normalize();
    const angleToStairs2 = Math.acos(clamp(dir.dot(stairsDir), -1, 1));
    if (angleToStairs2 < avoidAngle) {
      // keep this seat clear near stairs entrance
      continue;
    }

    const bot = makeBot(i % 2 ? M.neonPink : M.neonBlue, `SEAT ${i}`, i % 2 ? 0xff2bd6 : 0x00e5ff);
    bot.userData.mode = "seated";
    bot.userData.seatIndex = i;

    bot.position.copy(p);
    bot.rotation.y = Math.atan2(-p.x, -p.z);
    lobby.add(bot);

    bots.push(bot);
    seatedBots.push(bot);
    occupied[i] = true;
  }

  // spectators
  for (let i = 0; i < 4; i++) {
    const bot = makeBot(i % 2 ? M.neonBlue : M.neonPink, `SPECTATE ${i + 1}`, i % 2 ? 0x00e5ff : 0xff2bd6);
    bot.userData.mode = "spectate";
    const a = Math.random() * Math.PI * 2;
    bot.position.set(Math.cos(a) * 8.2, 0, Math.sin(a) * 8.2);
    bot.rotation.y = Math.atan2(-bot.position.x, -bot.position.z);
    lobby.add(bot);
    bots.push(bot);
  }

  // walkers (lobby)
  function addWalker(parent, cx, cz, radius, name) {
    const bot = makeBot(M.neonBlue, name, 0x00e5ff);
    bot.userData.mode = "walk";
    bot.userData.cx = cx;
    bot.userData.cz = cz;
    bot.userData.radius = radius;
    parent.add(bot);
    bots.push(bot);
    walkers.push(bot);
    return bot;
  }

  addWalker(lobby, 0, 0, 9.4, "WALKER");
  addWalker(lobby, 0, 0, 8.4, "WALKER2");

  // -----------------------------
  // Turn system
  // -----------------------------
  const turn = { seat: 0, t: 0, period: 3.0 };

  function actionForSeat(seat) {
    if (seat === 0) return "CHECK";
    const r = seat % 3;
    if (r === 0) return "BET";
    if (r === 1) return "RAISE";
    return "CHECK";
  }

  moveTurnCircleToSeat(0);
  setTurnText("CHECK");

  // -----------------------------
  // World tick (animation + stability locks)
  // -----------------------------
  const state = { t: 0 };

  scene.userData.worldTick = (dt) => {
    state.t += dt;

    // Neon pulse (subtle)
    const pulseB = 0.95 + 0.22 * Math.sin(state.t * 1.25);
    const pulseP = 0.85 + 0.18 * Math.sin(state.t * 1.40);
    M.neonBlue.emissiveIntensity = pulseB;
    M.neonPink.emissiveIntensity = pulseP;

    // Guard pulse + beacon follow
    guard.userData._pulseT += dt;
    const gp = 0.75 + 0.35 * Math.sin(guard.userData._pulseT * 2.4);
    guard.userData._visorMat.emissiveIntensity = 0.9 + gp;
    guardLight.position.set(guard.position.x, 2.8, guard.position.z);

    // Cards hover (stable) + LOCK orientation (no wobble, never follows head)
    const bob = 0.010 * Math.sin(state.t * 1.6);
    const allCards = [hole1, hole2, ...comm];

    for (const c of allCards) {
      if (!c || c.parent !== cards) continue;

      c.position.y = CARD_Y + bob;

      // hard lock
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = 0;
      c.rotation.y = Math.PI; // stable facing direction
    }

    // Keep pads + pass line flat
    passLine.rotation.x = -Math.PI / 2;
    for (const pad of betPads) pad.rotation.x = -Math.PI / 2;

    // Dealer chip stays flat when on table
    if (dealerChip.parent === table) {
      dealerChip.rotation.set(-Math.PI / 2, 0, 0);
      dealerChip.position.y = 0.744;
    }

    // Walkers path
    for (const bot of walkers) {
      const u = bot.userData;
      const a = u.phase + state.t * u.speed;
      bot.position.x = u.cx + Math.cos(a) * u.radius;
      bot.position.z = u.cz + Math.sin(a) * u.radius;
      bot.rotation.y = -a + Math.PI / 2;
    }

    // Name tags + hole cards billboard (looks good; minimal wobble)
    for (const bot of bots) {
      if (bot.userData._tag) bot.userData._tag.lookAt(camera.position);
      if (bot.userData._hole) bot.userData._hole.lookAt(camera.position);
    }

    // Turn cycle
    turn.t += dt;
    if (turn.t >= turn.period) {
      turn.t = 0;

      // next occupied seat
      for (let i = 1; i <= SEAT_COUNT; i++) {
        const n = (turn.seat + i) % SEAT_COUNT;
        if (occupied[n]) { turn.seat = n; break; }
      }

      moveTurnCircleToSeat(turn.seat);
      setTurnText(actionForSeat(turn.seat));

      // optional: seated bot knock on CHECK
      if (turn.seat !== 0 && actionForSeat(turn.seat) === "CHECK") {
        const bot = seatedBots.find(b => b.userData.seatIndex === turn.seat);
        if (bot) bot.userData.knock = 0.22;
      }
    }

    // Knock bob
    for (const bot of seatedBots) {
      if (bot.userData.knock > 0) {
        bot.userData.knock -= dt;
        bot.position.y = (bot.userData.knock > 0.11) ? -0.03 : 0.0;
      } else {
        bot.position.y = 0.0;
      }
    }
  };

  writeHud?.("[world] build done ✅ MASTER WORLD loaded (supreme prettiness)");
    }
