// /js/scarlett1/world.js — Scarlett World (UPDATED • FULL • MODULAR SAFE)
// ✅ Exports initWorld() for boot2.js
// ✅ Circular lobby + 4 hallways + 4 rooms (STORE / VIP / SCORP / GAMES)
// ✅ Center “divot” pit with poker table + chairs (no more “pill-only”)
// ✅ Spawn pads (never spawn on table). Spawns in a ROOM by default.
// ✅ Solid-looking walls + floors + lighting
// ✅ Simple roaming bots (optional, lightweight)
// ✅ No undefined materials (fixes MAT_BALC / missing const crashes)

export const WORLD_BUILD = "WORLD_SCARLETT1_v3_2";

export function initWorld(ctx = {}) {
  const {
    THREE,
    scene,          // optional
    log = (...a) => console.log("[world]", ...a),
  } = ctx;

  if (!THREE) throw new Error("initWorld requires {THREE}");
  log(`initWorld() start (${WORLD_BUILD})`);

  const world = {
    group: new THREE.Group(),
    colliders: [],
    spawns: {},
    named: {},
  };

  // If boot passes a scene, attach; otherwise caller can attach group.
  if (scene) scene.add(world.group);

  // -----------------------------
  // Materials (SAFE: no undefined)
  // -----------------------------
  const MAT = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0b1020, metalness: 0.15, roughness: 0.95 }),
    floor2: new THREE.MeshStandardMaterial({ color: 0x101a33, metalness: 0.10, roughness: 0.90 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.10, roughness: 0.85 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1b2c66, metalness: 0.30, roughness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x86b7ff, metalness: 0.0, roughness: 0.10, transparent: true, opacity: 0.10 }),
    neon: new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x3aa0ff, emissiveIntensity: 1.6, metalness: 0.0, roughness: 0.55 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f6b43, metalness: 0.05, roughness: 0.95 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.15, roughness: 0.65 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x18254f, metalness: 0.15, roughness: 0.80 }),
    bot: new THREE.MeshStandardMaterial({ color: 0xbad1ff, emissive: 0x1c4cff, emissiveIntensity: 0.35, metalness: 0.05, roughness: 0.55 }),
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const add = (m) => (world.group.add(m), m);
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rTop, rBot, h, mat, radial = 48) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, radial, 1, false), mat);

  function setName(obj, name) {
    obj.name = name;
    world.named[name] = obj;
    return obj;
  }

  function makeSign(text) {
    const g = new THREE.Group();
    const plate = box(3.2, 0.9, 0.12, MAT.wall);
    plate.material = plate.material.clone();
    plate.material.emissive = new THREE.Color(0x0a1a3a);
    plate.material.emissiveIntensity = 0.45;
    g.add(plate);

    // Simple “neon stripe” (no canvas text to keep it safe on mobile)
    const stripe = box(3.0, 0.08, 0.08, MAT.neon);
    stripe.position.y = 0.34;
    g.add(stripe);

    // Small dot pattern as pseudo-text
    const dots = new THREE.Group();
    for (let i = 0; i < Math.min(12, text.length); i++) {
      const d = box(0.12, 0.12, 0.05, MAT.neon);
      d.position.set(-1.35 + i * 0.25, -0.10, 0.09);
      dots.add(d);
    }
    g.add(dots);
    return g;
  }

  function makeSpawnPad(name, pos, yaw = 0) {
    const pad = new THREE.Group();
    const base = cyl(0.55, 0.55, 0.06, MAT.floor2, 40);
    base.position.y = 0.03;
    pad.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.03, 10, 64),
      MAT.neon
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    pad.add(ring);

    pad.position.copy(pos);
    pad.rotation.y = yaw;

    setName(pad, name);
    add(pad);

    world.spawns[name] = {
      pos: pad.position.clone(),
      yaw: pad.rotation.y,
    };

    return pad;
  }

  // -----------------------------
  // Lighting
  // -----------------------------
  const amb = new THREE.AmbientLight(0x99bbff, 0.35);
  add(amb);

  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(8, 16, 8);
  key.castShadow = false;
  add(key);

  const rim = new THREE.DirectionalLight(0x6aa7ff, 0.45);
  rim.position.set(-10, 10, -6);
  add(rim);

  const glow = new THREE.PointLight(0x3aa0ff, 0.95, 40, 2.0);
  glow.position.set(0, 5.5, 0);
  add(glow);

  // -----------------------------
  // Main layout sizes
  // -----------------------------
  const LOBBY_R = 11.5;
  const LOBBY_H = 4.2;

  const HALL_W = 3.2;
  const HALL_L = 8.5;
  const HALL_H = 3.4;

  const ROOM_W = 12.0;
  const ROOM_D = 12.0;
  const ROOM_H = 3.8;

  // -----------------------------
  // Lobby floor + inner divot pit
  // -----------------------------
  const lobbyFloor = cyl(LOBBY_R, LOBBY_R, 0.18, MAT.floor, 80);
  lobbyFloor.position.y = -0.09;
  add(lobbyFloor);

  // “Divot” pit: outer ring lowered + inner platform
  const PIT_R = 4.4;
  const PIT_DEPTH = 1.0;

  const pitCut = cyl(PIT_R, PIT_R, 0.18, MAT.floor2, 64);
  pitCut.position.y = -0.09 - PIT_DEPTH; // lowered
  add(pitCut);

  // Pit wall ring
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT_R + 0.06, PIT_R + 0.06, PIT_DEPTH, 64, 1, true),
    MAT.trim
  );
  pitWall.position.y = -0.09 - PIT_DEPTH / 2;
  add(pitWall);

  // Inner pit platform (table stands here)
  const pitPlatform = cyl(PIT_R - 0.75, PIT_R - 0.75, 0.12, MAT.floor, 64);
  pitPlatform.position.y = -0.09 - PIT_DEPTH + 0.06;
  add(pitPlatform);

  // Steps into pit (north + south)
  function makeSteps(zSign) {
    const steps = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const s = box(1.6, 0.18, 0.55, MAT.floor2);
      s.position.set(0, -0.09 - (i + 1) * (PIT_DEPTH / 6), zSign * (PIT_R - 0.6 + i * 0.45));
      steps.add(s);
    }
    add(steps);
  }
  makeSteps(1);
  makeSteps(-1);

  // -----------------------------
  // Lobby walls (circular feel)
  // -----------------------------
  // Use segmented wall panels to approximate a round wall.
  const WALL_SEG = 18;
  for (let i = 0; i < WALL_SEG; i++) {
    const a = (i / WALL_SEG) * Math.PI * 2;
    const panel = box(2.2, LOBBY_H, 0.35, MAT.wall);
    panel.position.set(Math.cos(a) * (LOBBY_R - 0.2), LOBBY_H / 2 - 0.09, Math.sin(a) * (LOBBY_R - 0.2));
    panel.lookAt(0, panel.position.y, 0);
    add(panel);

    // neon trim
    const trim = box(2.1, 0.08, 0.10, MAT.neon);
    trim.position.set(0, 1.6, 0.22);
    panel.add(trim);
  }

  // Ceiling disc
  const ceiling = cyl(LOBBY_R - 0.2, LOBBY_R - 0.2, 0.14, MAT.wall, 80);
  ceiling.position.y = LOBBY_H - 0.02;
  add(ceiling);

  // -----------------------------
  // Hallways and Rooms
  // Directions: N, E, S, W
  // -----------------------------
  const dirs = [
    { key: "N", x: 0, z: -(LOBBY_R + HALL_L / 2), yaw: Math.PI },
    { key: "E", x: (LOBBY_R + HALL_L / 2), z: 0, yaw: -Math.PI / 2 },
    { key: "S", x: 0, z: (LOBBY_R + HALL_L / 2), yaw: 0 },
    { key: "W", x: -(LOBBY_R + HALL_L / 2), z: 0, yaw: Math.PI / 2 },
  ];

  function buildHall(dir) {
    const hall = new THREE.Group();
    hall.position.set(dir.x, 0, dir.z);
    hall.rotation.y = dir.yaw;

    // floor
    const f = box(HALL_W, 0.14, HALL_L, MAT.floor2);
    f.position.y = -0.07;
    hall.add(f);

    // walls
    const wl = box(0.22, HALL_H, HALL_L, MAT.wall);
    wl.position.set(-HALL_W / 2, HALL_H / 2 - 0.07, 0);
    hall.add(wl);

    const wr = box(0.22, HALL_H, HALL_L, MAT.wall);
    wr.position.set(HALL_W / 2, HALL_H / 2 - 0.07, 0);
    hall.add(wr);

    // ceiling
    const c = box(HALL_W, 0.14, HALL_L, MAT.wall);
    c.position.set(0, HALL_H - 0.02, 0);
    hall.add(c);

    // neon strip
    const n = box(HALL_W * 0.8, 0.08, HALL_L * 0.9, MAT.neon);
    n.position.set(0, 2.2, 0);
    hall.add(n);

    setName(hall, `HALL_${dir.key}`);
    add(hall);
    return hall;
  }

  function buildRoom(dir, label) {
    // Place room at end of hall
    const room = new THREE.Group();

    const endOffset = (LOBBY_R + HALL_L + ROOM_D / 2);
    const px = dir.key === "E" ? endOffset : dir.key === "W" ? -endOffset : 0;
    const pz = dir.key === "S" ? endOffset : dir.key === "N" ? -endOffset : 0;

    room.position.set(px, 0, pz);
    room.rotation.y = dir.yaw;

    // floor
    const rf = box(ROOM_W, 0.16, ROOM_D, MAT.floor);
    rf.position.y = -0.08;
    room.add(rf);

    // walls (box room)
    const back = box(ROOM_W, ROOM_H, 0.25, MAT.wall);
    back.position.set(0, ROOM_H / 2 - 0.08, -ROOM_D / 2);
    room.add(back);

    const front = box(ROOM_W, ROOM_H, 0.25, MAT.wall);
    front.position.set(0, ROOM_H / 2 - 0.08, ROOM_D / 2);
    room.add(front);

    const leftW = box(0.25, ROOM_H, ROOM_D, MAT.wall);
    leftW.position.set(-ROOM_W / 2, ROOM_H / 2 - 0.08, 0);
    room.add(leftW);

    const rightW = box(0.25, ROOM_H, ROOM_D, MAT.wall);
    rightW.position.set(ROOM_W / 2, ROOM_H / 2 - 0.08, 0);
    room.add(rightW);

    // ceiling
    const rc = box(ROOM_W, 0.14, ROOM_D, MAT.wall);
    rc.position.y = ROOM_H - 0.02;
    room.add(rc);

    // doorway “cut” visual (just an opening frame)
    const doorFrame = new THREE.Group();
    const fw = 3.2, fh = 2.6, ft = 0.18;
    const top = box(fw, ft, ft, MAT.trim);
    top.position.set(0, fh, ROOM_D / 2 - 0.12);
    doorFrame.add(top);

    const s1 = box(ft, fh, ft, MAT.trim);
    s1.position.set(-fw / 2, fh / 2, ROOM_D / 2 - 0.12);
    doorFrame.add(s1);

    const s2 = box(ft, fh, ft, MAT.trim);
    s2.position.set(fw / 2, fh / 2, ROOM_D / 2 - 0.12);
    doorFrame.add(s2);

    room.add(doorFrame);

    // sign
    const sign = makeSign(label);
    sign.position.set(0, 2.9, ROOM_D / 2 - 0.35);
    room.add(sign);
    log(`sign: ${label}`);

    setName(room, `ROOM_${label}`);
    add(room);
    return room;
  }

  // Build halls
  const halls = {};
  dirs.forEach((d) => (halls[d.key] = buildHall(d)));

  // Rooms assigned
  const roomN = buildRoom(dirs.find(d => d.key === "N"), "STORE");
  const roomE = buildRoom(dirs.find(d => d.key === "E"), "VIP");
  const roomS = buildRoom(dirs.find(d => d.key === "S"), "SCORP");
  const roomW = buildRoom(dirs.find(d => d.key === "W"), "GAMES");

  // -----------------------------
  // Store balcony + stairs (simple)
  // -----------------------------
  function addBalconyToStore() {
    // balcony platform at back of STORE room
    const balcony = new THREE.Group();
    balcony.position.copy(roomN.position);
    balcony.rotation.copy(roomN.rotation);

    const plat = box(ROOM_W * 0.55, 0.18, 3.2, MAT.floor2);
    plat.position.set(0, 2.2, -ROOM_D / 2 + 2.2);
    balcony.add(plat);

    const rail = box(ROOM_W * 0.55, 0.12, 0.12, MAT.neon);
    rail.position.set(0, 2.95, -ROOM_D / 2 + 0.6);
    balcony.add(rail);

    // stairs from store floor to balcony (left side)
    const stairs = new THREE.Group();
    const stepCount = 10;
    for (let i = 0; i < stepCount; i++) {
      const s = box(1.4, 0.16, 0.42, MAT.floor2);
      s.position.set(-ROOM_W * 0.22, 0.08 + i * 0.22, ROOM_D / 2 - 2.0 - i * 0.35);
      stairs.add(s);
    }
    balcony.add(stairs);

    setName(balcony, "STORE_BALCONY");
    add(balcony);
  }
  addBalconyToStore();

  // -----------------------------
  // Poker table + chairs in pit
  // -----------------------------
  function buildPokerTable() {
    const table = new THREE.Group();

    // base pedestal
    const base = cyl(0.65, 0.95, 0.9, MAT.rail, 40);
    base.position.y = -0.09 - PIT_DEPTH + 0.45;
    table.add(base);

    // top rail + felt
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.22, 64), MAT.rail);
    rail.position.y = -0.09 - PIT_DEPTH + 1.02;
    table.add(rail);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 0.12, 64), MAT.felt);
    felt.position.y = -0.09 - PIT_DEPTH + 1.09;
    table.add(felt);

    // dealer chip spot (visual)
    const dc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 10, 28), MAT.neon);
    dc.rotation.x = Math.PI / 2;
    dc.position.set(0.95, -0.09 - PIT_DEPTH + 1.16, 0);
    table.add(dc);

    // chair ring (8 seats)
    const seats = 8;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const chair = new THREE.Group();

      const seat = box(0.70, 0.16, 0.70, MAT.chair);
      seat.position.y = -0.09 - PIT_DEPTH + 0.55;
      chair.add(seat);

      const back = box(0.70, 0.70, 0.12, MAT.chair);
      back.position.y = -0.09 - PIT_DEPTH + 0.95;
      back.position.z = -0.29;
      chair.add(back);

      chair.position.set(Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05);
      chair.rotation.y = -a + Math.PI;
      table.add(chair);
    }

    setName(table, "POKER_TABLE");
    add(table);
    return table;
  }
  buildPokerTable();

  // -----------------------------
  // Spawn pads (spawn in ROOMS)
  // -----------------------------
  // Default spawns inside rooms, facing inward.
  // IMPORTANT: you asked “spawn in a room instead of middle of lobby”
  makeSpawnPad("SPAWN_STORE", roomN.position.clone().add(new THREE.Vector3(0, 0, 3.6)), Math.PI);
  makeSpawnPad("SPAWN_VIP", roomE.position.clone().add(new THREE.Vector3(0, 0, 3.6)), Math.PI);
  makeSpawnPad("SPAWN_SCORP", roomS.position.clone().add(new THREE.Vector3(0, 0, 3.6)), Math.PI);
  makeSpawnPad("SPAWN_GAMES", roomW.position.clone().add(new THREE.Vector3(0, 0, 3.6)), Math.PI);

  // Extra lobby spawns (safe, not on table)
  makeSpawnPad("SPAWN_LOBBY_N", new THREE.Vector3(0, 0, -7.2), Math.PI);
  makeSpawnPad("SPAWN_LOBBY_S", new THREE.Vector3(0, 0, 7.2), 0);

  // Choose a default spawn: STORE room
  world.defaultSpawn = "SPAWN_STORE";
  log(`spawn ✅ ${world.defaultSpawn}`);

  // -----------------------------
  // Bots (lightweight roamers)
  // -----------------------------
  const bots = [];
  const botCount = 7;

  function makeBot() {
    // capsule-ish: cylinder + 2 spheres
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.40, 18), MAT.bot);
    g.add(body);

    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), MAT.bot);
    s1.position.y = 0.20;
    g.add(s1);

    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), MAT.bot);
    s2.position.y = -0.20;
    g.add(s2);

    g.position.y = 0.35;
    return g;
  }

  for (let i = 0; i < botCount; i++) {
    const b = makeBot();
    b.userData.t = Math.random() * 1000;
    b.userData.r = 6.4 + Math.random() * 2.8;
    b.userData.spd = 0.22 + Math.random() * 0.22;
    b.userData.yaw = Math.random() * Math.PI * 2;
    b.position.x = Math.cos(b.userData.yaw) * b.userData.r;
    b.position.z = Math.sin(b.userData.yaw) * b.userData.r;
    add(b);
    bots.push(b);
  }

  world.tick = (dt) => {
    // roam bots around lobby perimeter
    for (const b of bots) {
      b.userData.t += dt * b.userData.spd;
      const a = b.userData.t;
      const r = b.userData.r;
      b.position.x = Math.cos(a) * r;
      b.position.z = Math.sin(a) * r;
      b.rotation.y = -a + Math.PI / 2;
    }
  };

  // -----------------------------
  // Return (boot2 expects initWorld)
  // -----------------------------
  // Provide helper for spawns
  world.getSpawn = (name) => world.spawns[name] || world.spawns[world.defaultSpawn];

  log("initWorld() completed ✅");
  return world;
}
```0
