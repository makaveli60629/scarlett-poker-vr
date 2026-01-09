// /js/world.js — Scarlett VR Poker — MASTER CASINO WORLD (Full Restore + Store + Poker Loop)
// Goals:
// - Full casino lobby back (big room, lighting, center table zone)
// - Store with outside display (4 mannequins + 2 pillars + rail)
// - 4 seated bots at table + 2 floor bots (guard + walker)
// - Basic poker simulation loop (deal/hovers/award pot visually)
// - Exports CyberAvatar for Update 4.0 integration in main.js

/* -------------------- World Init -------------------- */
export function initWorld({ THREE, scene, log = console.log }) {
  const world = {
    THREE,
    scene,
    log,
    group: new THREE.Group(),
    spawn: new THREE.Vector3(0, 0, 8.0),     // spawn behind table
    tablePos: new THREE.Vector3(0, 0, 0),
    storePos: new THREE.Vector3(10.5, 0, -4.0),
    pokerTable: null,
    store: null,
    tableBots: [],
    npcs: [],
    update(dt, camera) {
      if (world.pokerTable) world.pokerTable.update(dt, camera);
      for (const b of world.tableBots) b.update(dt, camera);
      for (const n of world.npcs) n.update(dt);
    },
  };

  scene.add(world.group);
  scene.background = new THREE.Color(0x05060a);

  /* ---------- Lighting (casino bright) ---------- */
  world.group.add(new THREE.HemisphereLight(0xcfefff, 0x0b1020, 1.1));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(6, 10, 5);
  world.group.add(key);

  const washA = new THREE.PointLight(0x7fe7ff, 0.35, 45, 2);
  washA.position.set(-10, 4.0, 6);
  world.group.add(washA);

  const washB = new THREE.PointLight(0xff2d7a, 0.22, 40, 2);
  washB.position.set(10, 3.8, -6);
  world.group.add(washB);

  /* ---------- Floor ---------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: 1.0, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  /* ---------- Big lobby shell ---------- */
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f1523, roughness: 0.95, metalness: 0.02 });
  const H = 4.2, T = 0.45;

  addWall(140, H, T, 0, H / 2, -70);
  addWall(140, H, T, 0, H / 2,  70);
  addWall(T, H, 140, -70, H / 2, 0);
  addWall(T, H, 140,  70, H / 2, 0);

  function addWall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  }

  /* ---------- Center rail + table zone ---------- */
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.08, 16, 140),
    new THREE.MeshStandardMaterial({
      color: 0x0c1622,
      roughness: 0.55,
      metalness: 0.25,
      emissive: new THREE.Color(0x06121c),
      emissiveIntensity: 0.35
    })
  );
  rail.rotation.x = -Math.PI / 2;
  rail.position.set(0, 0.05, 0);
  world.group.add(rail);

  /* ---------- Poker Table + visual sim ---------- */
  world.pokerTable = new PokerTable({ THREE, scene: world.group, log });
  world.pokerTable.group.position.copy(world.tablePos);

  /* ---------- Chairs + seated bots (4) ---------- */
  const seatAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const seatR = 2.35;
  for (let i = 0; i < 4; i++) {
    const a = seatAngles[i];
    const seatPos = new THREE.Vector3(Math.sin(a) * seatR, 0, Math.cos(a) * seatR);

    const chair = makeChair({ THREE });
    chair.position.copy(seatPos);
    chair.lookAt(0, 0, 0);
    world.group.add(chair);

    const bot = new TableBot({
      THREE,
      name: "SeatBot_" + i,
      suitColor: i % 2 === 0 ? 0x7fe7ff : 0xff2d7a,
      position: seatPos,
      lookAt: new THREE.Vector3(0, 0, 0),
      scale: 1.0
    });
    world.group.add(bot.group);
    world.tableBots.push(bot);
  }

  /* ---------- Store + outside display ---------- */
  world.store = buildStoreAndDisplay({ THREE, log });
  world.store.group.position.copy(world.storePos);
  world.group.add(world.store.group);

  // NPCs near store
  const guard = new NPCBot({
    THREE,
    name: "Guard",
    color: 0x7fe7ff,
    emissive: 0x142638,
    height: 1.62,
    start: world.store.guardSpot.clone().add(world.storePos),
    path: [world.store.guardSpot.clone().add(world.storePos)],
    speed: 0,
    idle: true
  });
  world.group.add(guard.group);
  world.npcs.push(guard);

  const walkerPath = world.store.walkPath.map(p => p.clone().add(world.storePos));
  const walker = new NPCBot({
    THREE,
    name: "Walker",
    color: 0xff2d7a,
    emissive: 0x2a0a16,
    height: 1.60,
    start: walkerPath[0],
    path: walkerPath,
    speed: 0.85,
    idle: false
  });
  world.group.add(walker.group);
  world.npcs.push(walker);

  /* ---------- Proof sign (keep for now; remove later) ---------- */
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(14, 1.6, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x071018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.6,
      roughness: 0.25,
      metalness: 0.35
    })
  );
  sign.position.set(0, 2.1, 6.2);
  world.group.add(sign);

  log("[world] MASTER CASINO loaded ✅");
  return world;
}

/* -------------------- Poker Table + Simple Simulation -------------------- */
export class PokerTable {
  constructor({ THREE, scene, log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.log = log;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.community = [];
    this.pot = null;

    this._state = "idle";
    this._timer = 0;
    this._handIndex = 0;
    this._potHome = new THREE.Vector3(0, 0, 0);

    this._makeTable();
    this._makeCommunity();
    this._makePot();
    this._startHand();
  }

  _makeTable() {
    const THREE = this.THREE;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.65, metalness: 0.2 })
    );
    base.position.y = 0.11;

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.34, 1.34, 0.07, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0f6b3b,
        roughness: 0.9,
        metalness: 0.0,
        emissive: new THREE.Color(0x04160d),
        emissiveIntensity: 0.35
      })
    );
    felt.position.y = 0.20;

    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.34, 0.07, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.5, metalness: 0.35 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.23;

    this.group.add(base, felt, edge);
    this.tableTopY = 0.26;
  }

  _makeCommunity() {
    const THREE = this.THREE;
    const face = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });
    const back = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.5, metalness: 0.1 });
    const geo = new THREE.BoxGeometry(0.07, 0.0018, 0.095);
    const mats = [face, face, face, face, face, back];

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, mats);
      c.position.set((i - 2) * 0.085, this.tableTopY + 0.05, -0.20);
      c.rotation.x = -Math.PI / 2;
      c.visible = false;
      this.group.add(c);
      this.community.push(c);
    }
  }

  _makePot() {
    const THREE = this.THREE;
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.25 });
    const g = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 28);

    const stack = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const chip = new THREE.Mesh(g, chipMat);
      chip.position.y = i * 0.012;
      stack.add(chip);
    }
    stack.position.set(0, this.tableTopY + 0.02, 0.06);
    this.group.add(stack);
    this.pot = stack;
    this._potHome.copy(stack.position);
  }

  _startHand() {
    this._handIndex++;
    this._state = "deal";
    this._timer = 0;

    for (const c of this.community) c.visible = false;
    this.pot.position.copy(this._potHome);

    this.log(`[poker] hand #${this._handIndex} start`);
  }

  update(dt, camera) {
    this._timer += dt;

    // Deal sequence: flop (3), turn, river
    if (this._state === "deal") {
      if (this._timer > 1.2) { this.community[0].visible = true; this.community[1].visible = true; this.community[2].visible = true; }
      if (this._timer > 2.2) { this.community[3].visible = true; }
      if (this._timer > 3.2) { this.community[4].visible = true; this._state = "award"; this._timer = 0; }
    }

    // Hover + face player ALWAYS
    for (const c of this.community) {
      if (!c.visible) continue;
      c.position.y = this.tableTopY + 0.05 + Math.sin(performance.now() * 0.002 + c.position.x * 10) * 0.006;

      // Face camera
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
      c.rotateY(Math.PI);
      c.rotation.x = -Math.PI / 2;
    }

    // Award: move pot toward a random seat direction
    if (this._state === "award") {
      // choose a direction each hand
      if (!this._potTarget) {
        const dirs = [
          new this.THREE.Vector3(0, 0, 2.1),
          new this.THREE.Vector3(2.1, 0, 0),
          new this.THREE.Vector3(0, 0, -2.1),
          new this.THREE.Vector3(-2.1, 0, 0),
        ];
        const pick = dirs[Math.floor(Math.random() * dirs.length)];
        this._potTarget = new this.THREE.Vector3(pick.x, this.tableTopY + 0.02, pick.z);
        this._potLerp = 0;
      }

      this._potLerp = Math.min(1, (this._potLerp || 0) + dt * 0.6);
      this.pot.position.lerp(this._potTarget, this._potLerp);

      if (this._potLerp >= 1 && this._timer > 1.4) {
        this._potTarget = null;
        this._state = "reset";
        this._timer = 0;
      }
    }

    if (this._state === "reset") {
      if (this._timer > 1.0) this._startHand();
    }
  }
}

/* -------------------- Store + Display (4 mannequins, 2 pillars + rail) -------------------- */
function buildStoreAndDisplay({ THREE, log }) {
  const group = new THREE.Group();
  const mannequins = [];

  const shellMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.9, metalness: 0.12 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x101a2a, roughness: 0.6, metalness: 0.25,
    emissive: new THREE.Color(0x081624), emissiveIntensity: 0.45
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff, transparent: true, opacity: 0.13,
    roughness: 0.15, metalness: 0.05,
    emissive: new THREE.Color(0x07121c), emissiveIntensity: 0.35
  });

  const storeW = 6.2, storeH = 2.9, storeD = 4.6, wallT = 0.18;

  // floor + roof + walls
  const floor = new THREE.Mesh(new THREE.BoxGeometry(storeW, 0.10, storeD), shellMat);
  floor.position.set(0, 0.05, 0);
  group.add(floor);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(storeW, 0.12, storeD), shellMat);
  roof.position.set(0, storeH + 0.06, 0);
  group.add(roof);

  const back = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, wallT), shellMat);
  back.position.set(0, storeH / 2 + 0.10, -storeD / 2);
  group.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(wallT, storeH, storeD), shellMat);
  left.position.set(-storeW / 2, storeH / 2 + 0.10, 0);
  group.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(wallT, storeH, storeD), shellMat);
  right.position.set(storeW / 2, storeH / 2 + 0.10, 0);
  group.add(right);

  // front with door gap
  const doorW = 2.2;
  const doorH = 2.35;

  const frontL = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2, storeH, wallT), shellMat);
  frontL.position.set(-((doorW / 2) + (storeW - doorW) / 4), storeH / 2 + 0.10, storeD / 2);
  group.add(frontL);

  const frontR = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2, storeH, wallT), shellMat);
  frontR.position.set(((doorW / 2) + (storeW - doorW) / 4), storeH / 2 + 0.10, storeD / 2);
  group.add(frontR);

  const lintelH = storeH - doorH;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallT), shellMat);
  lintel.position.set(0, doorH + lintelH / 2 + 0.10, storeD / 2);
  group.add(lintel);

  // door frame
  const frameSideL = new THREE.Mesh(new THREE.BoxGeometry(0.10, doorH, 0.10), trimMat);
  frameSideL.position.set(-doorW / 2, doorH / 2 + 0.10, storeD / 2 + 0.04);
  group.add(frameSideL);

  const frameSideR = frameSideL.clone();
  frameSideR.position.set(doorW / 2, doorH / 2 + 0.10, storeD / 2 + 0.04);
  group.add(frameSideR);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.10, 0.10, 0.10), trimMat);
  frameTop.position.set(0, doorH + 0.10, storeD / 2 + 0.04);
  group.add(frameTop);

  // glass
  const glassL = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2 - 0.15, 2.1, 0.05), glassMat);
  glassL.position.set(frontL.position.x, 1.25, storeD / 2 - 0.03);
  group.add(glassL);

  const glassR = glassL.clone();
  glassR.position.set(frontR.position.x, 1.25, storeD / 2 - 0.03);
  group.add(glassR);

  // sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.48, 0.12), trimMat);
  sign.position.set(0, storeH + 0.40, storeD / 2 + 0.08);
  group.add(sign);

  // interior props
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.6), trimMat);
  counter.position.set(0, 0.55, -0.8);
  group.add(counter);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 1.8), shellMat);
  shelf.position.set(-2.2, 1.1, -0.3);
  group.add(shelf);

  const shelf2 = shelf.clone();
  shelf2.position.set(2.2, 1.1, -0.3);
  group.add(shelf2);

  const interior = new THREE.PointLight(0x7fe7ff, 0.85, 16, 2);
  interior.position.set(0, 2.2, 0.3);
  group.add(interior);

  // outside display: 2 pillars + rail + platform + 4 mannequins
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0c1622, roughness: 0.55, metalness: 0.35,
    emissive: new THREE.Color(0x06121c), emissiveIntensity: 0.35
  });
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.75, metalness: 0.25 });

  const displayZ = storeD / 2 + 1.35;
  const pillarX = 2.55;

  const pillarA = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 18), pillarMat);
  pillarA.position.set(-pillarX, 1.1, displayZ);
  group.add(pillarA);

  const pillarB = pillarA.clone();
  pillarB.position.set(pillarX, 1.1, displayZ);
  group.add(pillarB);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(pillarX * 2.0, 0.08, 0.08), pillarMat);
  rail.position.set(0, 1.75, displayZ);
  group.add(rail);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 2.35), pedestalMat);
  pad.position.set(0, 0.04, displayZ - 0.38);
  group.add(pad);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(pillarX * 2.1, 0.05, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x0a141f,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.4,
    })
  );
  strip.position.set(0, 1.92, displayZ);
  group.add(strip);

  const stripLight = new THREE.PointLight(0x7fe7ff, 1.0, 6.5, 2);
  stripLight.position.set(0, 1.82, displayZ - 0.15);
  group.add(stripLight);

  const slots = [
    new THREE.Vector3(-1.7, 0, displayZ - 0.95),
    new THREE.Vector3( 1.7, 0, displayZ - 0.95),
    new THREE.Vector3(-1.7, 0, displayZ - 0.30),
    new THREE.Vector3( 1.7, 0, displayZ - 0.30),
  ];

  for (let i = 0; i < slots.length; i++) {
    const m = makeMannequin({ THREE });
    m.position.copy(slots[i]);
    group.add(m);
    mannequins.push(m);
  }

  const doorGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.75, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.20 })
  );
  doorGlow.rotation.x = -Math.PI / 2;
  doorGlow.position.set(0, 0.012, storeD / 2 + 0.35);
  group.add(doorGlow);

  const guardSpot = new THREE.Vector3(-2.9, 0, storeD / 2 + 0.85);
  const walkPath = [
    new THREE.Vector3(-3.3, 0, storeD / 2 + 2.25),
    new THREE.Vector3( 3.3, 0, storeD / 2 + 2.25),
    new THREE.Vector3( 3.3, 0, storeD / 2 + 0.70),
    new THREE.Vector3(-3.3, 0, storeD / 2 + 0.70),
  ];

  log("[store] built ✅");
  return { group, mannequins, guardSpot, walkPath };
}

function makeMannequin({ THREE }) {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.75, metalness: 0.25 });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.6,
    roughness: 0.35,
    metalness: 0.35
  });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24), baseMat);
  ped.position.y = 0.06;
  g.add(ped);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.48, 8, 18), bodyMat);
  torso.position.y = 0.98;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), bodyMat);
  head.position.y = 1.48;
  g.add(head);

  return g;
}

/* -------------------- Chair -------------------- */
function makeChair({ THREE }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.8, metalness: 0.15 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat);
  seat.position.y = 0.50;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.60, 0.08), mat);
  back.position.set(0, 0.82, -0.235);
  g.add(back);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.50, 12);
  const legs = [[-0.22,0.25,-0.22],[0.22,0.25,-0.22],[-0.22,0.25,0.22],[0.22,0.25,0.22]];
  for (const [x, y, z] of legs) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, y, z);
    g.add(leg);
  }
  return g;
}

/* -------------------- Seated Table Bot -------------------- */
class TableBot {
  constructor({ THREE, name, suitColor, position, lookAt, scale = 1.0 }) {
    this.name = name;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.scale.setScalar(scale);

    const mat = new THREE.MeshStandardMaterial({
      color: suitColor,
      roughness: 0.55,
      metalness: 0.22,
      emissive: new THREE.Color(0x070a10),
      emissiveIntensity: 0.25,
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 10, 20), mat);
    torso.position.y = 1.00;
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), mat);
    head.position.y = 1.45;
    this.group.add(head);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, metalness: 0.0 });
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 14);
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.10, 0.40, 0.10);
    legR.position.set( 0.10, 0.40, 0.10);
    this.group.add(legL, legR);

    this.group.lookAt(lookAt.x, 0.9, lookAt.z);

    this._t = Math.random() * 10;
  }

  update(dt) {
    this._t += dt;
    // subtle idle bob
    const bob = Math.sin(this._t * 1.8) * 0.01;
    this.group.position.y = bob;
  }
}

/* -------------------- Floor NPC Bot -------------------- */
class NPCBot {
  constructor({ THREE, name, color, emissive, height, start, path, speed, idle }) {
    this.name = name;
    this.speed = speed;
    this.path = path || [start.clone()];
    this.idle = !!idle;

    this.group = new THREE.Group();
    this.group.position.copy(start);

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.22,
      emissive: new THREE.Color(emissive || 0x080a10),
      emissiveIntensity: 0.30,
    });

    const radius = 0.175;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.6, height - radius * 2), 10, 20), mat);
    body.position.y = height * 0.50;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 18, 18), mat);
    head.position.y = height + 0.03;
    this.group.add(head);

    this._idx = 0;
    this._t = 0;
    this._walkPhase = Math.random() * 10;
  }

  update(dt) {
    if (this.idle || this.speed <= 0 || this.path.length < 2) {
      this.group.rotation.y += dt * 0.18;
      return;
    }

    const from = this.path[this._idx];
    const to = this.path[(this._idx + 1) % this.path.length];
    const dist = Math.max(0.001, from.distanceTo(to));

    this._t += (this.speed * dt) / dist;
    if (this._t >= 1) {
      this._t = 0;
      this._idx = (this._idx + 1) % this.path.length;
    }

    const p = from.clone().lerp(to, this._t);
    this.group.position.x = p.x;
    this.group.position.z = p.z;

    const dir = to.clone().sub(from);
    this.group.rotation.y = Math.atan2(dir.x, dir.z);
  }
}

/* -------------------- Cyber Avatar (Update 4.0 primitive rig) -------------------- */
export class CyberAvatar {
  constructor({ THREE, scene, camera, textureURL = "assets/textures/cyber_suit_atlas.png", log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.log = log;

    this.meshGroup = new THREE.Group();
    this.parts = { helmet: null, torso: null, leftHand: null, rightHand: null };
    this._euler = new THREE.Euler(0, 0, 0, "YXZ");
    this._handsEnabled = true;

    // Basic material (texture integration later when your atlas/UV mesh exists)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0,
      roughness: 0.35,
      metalness: 0.35,
    });

    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);

    this.parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.75, 0.25), mat);

    const gloveGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.45, 16);
    this.parts.leftHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.rightHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.leftHand.rotation.x = Math.PI / 2;
    this.parts.rightHand.rotation.x = Math.PI / 2;
    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;

    this.meshGroup.add(this.parts.helmet, this.parts.torso, this.parts.leftHand, this.parts.rightHand);
    scene.add(this.meshGroup);

    this.log("[avatar] Update 4.0 rig initialized ✅");
  }

  setHandsVisible(v) {
    this._handsEnabled = !!v;
    if (!this._handsEnabled) {
      this.parts.leftHand.visible = false;
      this.parts.rightHand.visible = false;
    }
  }

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;

    // Helmet
    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    // Torso (yaw locked)
    this.parts.torso.position.copy(camera.position);
    this.parts.torso.position.y -= 0.55;
    this._euler.setFromQuaternion(camera.quaternion, "YXZ");
    this._euler.x = 0; this._euler.z = 0;
    this.parts.torso.quaternion.setFromEuler(this._euler);

    if (!this._handsEnabled) return;

    // Hand tracking (wrist)
    const session = frame.session;
    if (!session?.inputSources) return;

    let leftSeen = false, rightSeen = false;

    for (const src of session.inputSources) {
      if (!src?.hand) continue;
      const wrist = src.hand.get("wrist");
      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const mesh = (src.handedness === "left") ? this.parts.leftHand : this.parts.rightHand;
      mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      mesh.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      mesh.visible = true;

      if (src.handedness === "left") leftSeen = true;
      if (src.handedness === "right") rightSeen = true;
    }

    if (!leftSeen) this.parts.leftHand.visible = false;
    if (!rightSeen) this.parts.rightHand.visible = false;
  }
  }
