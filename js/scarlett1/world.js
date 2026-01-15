// /js/scarlett1/world.js — Scarlett World (FULL / Modular / No Bare Imports)
// ✅ export initWorld()
// ✅ works on GitHub Pages (no "import three")
// ✅ Lobby + 4 halls + 4 rooms + store zone
// ✅ Pit divot + table + chairs + rails + stairs + balcony + telepad marker
// ✅ Bright lights
// ✅ Simple humanoid bots (not pills)
// ✅ Hover cards

export async function initWorld(ctx) {
  const { THREE, scene, camera, player, log } = ctx;
  const L = log || console.log;

  const WORLD = {
    floorY: 0,
    floorMeshes: [],
    bots: [],
    cards: [],
    t: 0,
  };

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.05 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, metalness: 0.05 });
  const matTrim  = new THREE.MeshStandardMaterial({ color: 0x22335f, roughness: 0.5, metalness: 0.25 });
  const matGlow  = new THREE.MeshStandardMaterial({ color: 0x66aaff, emissive: 0x2a5cff, emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.2 });
  const matFelt  = new THREE.MeshStandardMaterial({ color: 0x0b6b3a, roughness: 0.95, metalness: 0.05 });
  const matWood  = new THREE.MeshStandardMaterial({ color: 0x3a2a1b, roughness: 0.85, metalness: 0.05 });
  const matSeat  = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.8, metalness: 0.1 });
  const matSkin  = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: 0.75, metalness: 0.1 });

  // ---------- Helpers ----------
  function add(mesh) { scene.add(mesh); return mesh; }

  function floorPlane(w, d, y = 0, x = 0, z = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    const m = new THREE.Mesh(g, matFloor);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = false;
    add(m);
    WORLD.floorMeshes.push(m);
    return m;
  }

  function wallBox(w, h, d, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, matWall);
    m.position.set(x, y + h / 2, z);
    add(m);
    return m;
  }

  function ringWall(radius, height, thickness, y = 0) {
    // approximate ring walls with segments
    const segs = 28;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      const x = nx * radius;
      const z = nz * radius;
      const w = thickness;
      const d = 3.1;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), matWall);
      mesh.position.set(x, y + height / 2, z);
      mesh.rotation.y = -a;
      add(mesh);
    }
  }

  function neonStrip(w, h, d, x, y, z, ry = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matGlow);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    add(mesh);
    return mesh;
  }

  function sign(text, x, y, z) {
    // Simple sign panel (no font dependency)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 0.08), matTrim);
    panel.position.set(x, y, z);
    add(panel);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.9, 0.03), matGlow);
    glow.position.set(x, y, z + 0.06);
    add(glow);

    L("sign:", text);
    return panel;
  }

  function makeTelepad(x, y, z) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32), matGlow);
    pad.position.set(x, y + 0.04, z);
    add(pad);
    return pad;
  }

  function makeStairs(x, y, z, steps = 7, up = 1.6, run = 2.8, width = 2.2, ry = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = ry;
    add(group);

    for (let i = 0; i < steps; i++) {
      const stepH = up / steps;
      const stepD = run / steps;
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, stepH, stepD), matTrim);
      step.position.set(0, stepH * (i + 0.5), -stepD * (i + 0.5));
      group.add(step);
    }
    return group;
  }

  function makeRailCircle(radius, y) {
    const segs = 40;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12), matGlow);
      post.position.set(x, y + 0.45, z);
      add(post);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.03, 10, 80), matGlow);
    ring.position.set(0, y + 0.9, 0);
    ring.rotation.x = Math.PI / 2;
    add(ring);
  }

  function makeChair(x, y, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    add(g);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), matSeat);
    seat.position.set(0, 0.45, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.12), matSeat);
    back.position.set(0, 0.82, -0.22);
    g.add(back);

    const legG = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10);
    const offs = [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]];
    offs.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legG, matTrim);
      leg.position.set(ox, 0.22, oz);
      g.add(leg);
    });

    return g;
  }

  function makePokerTable(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    add(g);

    // Felt
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.12, 48), matFelt);
    felt.position.y = 0.9;
    g.add(felt);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.18, 14, 80), matWood);
    rim.position.y = 0.96;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    // Legs
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.9, 16), matWood);
    leg.position.y = 0.45;
    g.add(leg);

    // Dealer chip glow
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24), matGlow);
    chip.position.set(0, 1.03, 0);
    g.add(chip);

    return g;
  }

  function makeHumanoid(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    add(g);

    // body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 12), matSkin);
    body.position.y = 0.95;
    g.add(body);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), matSkin);
    head.position.y = 1.34;
    g.add(head);

    // arms
    const armG = new THREE.CapsuleGeometry(0.06, 0.34, 6, 10);
    const aL = new THREE.Mesh(armG, matSkin);
    const aR = new THREE.Mesh(armG, matSkin);
    aL.position.set(-0.26, 1.02, 0);
    aR.position.set( 0.26, 1.02, 0);
    aL.rotation.z = 0.25;
    aR.rotation.z = -0.25;
    g.add(aL, aR);

    // legs
    const legG = new THREE.CapsuleGeometry(0.07, 0.38, 6, 10);
    const lL = new THREE.Mesh(legG, matSkin);
    const lR = new THREE.Mesh(legG, matSkin);
    lL.position.set(-0.12, 0.47, 0);
    lR.position.set( 0.12, 0.47, 0);
    g.add(lL, lR);

    WORLD.bots.push({ root: g, phase: Math.random() * Math.PI * 2 });
    return g;
  }

  function makeHoverCard(x, y, z) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.02), matTrim);
    c.position.set(x, y, z);
    add(c);
    WORLD.cards.push({ mesh: c, baseY: y, phase: Math.random() * Math.PI * 2 });
    return c;
  }

  // ---------- Build World (MODULAR) ----------
  // NOTE: User said “world too big” => keep it reasonable.
  const LOBBY_RADIUS = 12;
  const WALL_H = 6.5;
  const HALL_LEN = 10;
  const HALL_W = 4;

  // Strong lighting
  {
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(10, 18, 10);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xaad0ff, 0.55);
    fill.position.set(-12, 10, -6);
    scene.add(fill);

    const amb = new THREE.AmbientLight(0x7aa2ff, 0.22);
    scene.add(amb);

    neonStrip(10, 0.08, 0.25, 0, 6.2, 0, 0);
    neonStrip(10, 0.08, 0.25, 0, 6.2, 0, Math.PI / 2);
  }

  // Lobby floor + ring walls
  floorPlane(LOBBY_RADIUS * 2.3, LOBBY_RADIUS * 2.3, 0, 0, 0);
  ringWall(LOBBY_RADIUS, WALL_H, 0.6, 0);

  // Ceiling trim ring
  const ceilingRing = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_RADIUS, 0.16, 12, 120), matTrim);
  ceilingRing.position.set(0, WALL_H - 0.35, 0);
  ceilingRing.rotation.x = Math.PI / 2;
  add(ceilingRing);

  // Hallways in 4 directions and rooms at end
  const dirs = [
    { name: "STORE",  a: 0,                 sx: 0,  sz: -LOBBY_RADIUS, ex: 0,  ez: -(LOBBY_RADIUS + HALL_LEN + 5) },
    { name: "VIP",    a: Math.PI / 2,       sx: LOBBY_RADIUS, sz: 0,   ex: (LOBBY_RADIUS + HALL_LEN + 5), ez: 0 },
    { name: "SCORP",  a: Math.PI,           sx: 0,  sz: LOBBY_RADIUS, ex: 0,  ez: (LOBBY_RADIUS + HALL_LEN + 5) },
    { name: "GAMES",  a: -Math.PI / 2,      sx: -LOBBY_RADIUS,sz: 0,   ex: -(LOBBY_RADIUS + HALL_LEN + 5), ez: 0 },
  ];

  dirs.forEach((d) => sign(d.name, d.sx * 0.85, 3.2, d.sz * 0.85));

  dirs.forEach((d) => {
    // hallway floor
    const midx = d.sx + Math.cos(d.a) * (HALL_LEN / 2);
    const midz = d.sz + Math.sin(d.a) * (HALL_LEN / 2);

    const hall = floorPlane(HALL_W, HALL_LEN, 0, midx, midz);
    hall.rotation.z = 0;

    // hallway walls
    const sideOff = (HALL_W / 2) + 0.2;
    const wx = Math.cos(d.a + Math.PI / 2) * sideOff;
    const wz = Math.sin(d.a + Math.PI / 2) * sideOff;

    wallBox(0.5, WALL_H, HALL_LEN + 0.5, midx + wx, 0, midz + wz).rotation.y = d.a;
    wallBox(0.5, WALL_H, HALL_LEN + 0.5, midx - wx, 0, midz - wz).rotation.y = d.a;

    // room at end
    const roomW = 10, roomD = 10;
    floorPlane(roomW, roomD, 0, d.ex, d.ez);
    wallBox(roomW, WALL_H, 0.5, d.ex, 0, d.ez - roomD / 2);
    wallBox(roomW, WALL_H, 0.5, d.ex, 0, d.ez + roomD / 2);
    wallBox(0.5, WALL_H, roomD, d.ex - roomW / 2, 0, d.ez);
    wallBox(0.5, WALL_H, roomD, d.ex + roomW / 2, 0, d.ez);

    neonStrip(roomW * 0.8, 0.08, 0.25, d.ex, WALL_H - 0.5, d.ez, 0);
  });

  // PIT divot (center)
  // create a lowered circle floor (divot)
  {
    const pitRadius = 5.5;
    const pitDepth = -1.2;

    const pit = new THREE.Mesh(new THREE.CylinderGeometry(pitRadius, pitRadius, 0.08, 64), matFloor);
    pit.position.set(0, pitDepth + 0.04, 0);
    add(pit);
    WORLD.floorMeshes.push(pit);

    // rim/guard ring
    const rim = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.22, 14, 100), matTrim);
    rim.position.set(0, 0.04, 0);
    rim.rotation.x = Math.PI / 2;
    add(rim);

    makeRailCircle(pitRadius - 0.25, 0.0);

    // stairs down into pit + small glow
    makeStairs(-3.6, 0, 0.0, 7, 1.2, 2.8, 2.0, Math.PI / 2);
    neonStrip(0.25, 1.8, 0.25, -2.8, 0.9, -1.2, 0);

    // table in pit
    makePokerTable(0, pitDepth, 0);

    // chairs around table
    const seats = 8;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const r = 3.3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      makeChair(x, pitDepth, z, -a + Math.PI);
    }

    // bots seated / facing table
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 3.1;
      const bx = Math.cos(a) * r;
      const bz = Math.sin(a) * r;
      const bot = makeHumanoid(bx, pitDepth, bz);
      bot.rotation.y = -a + Math.PI;
    }

    // hover cards above felt
    for (let i = 0; i < 5; i++) {
      makeHoverCard(-0.6 + i * 0.3, pitDepth + 1.25, -0.4 + (i % 2) * 0.12);
    }
  }

  // STORE balcony + stairs + telepad (above the STORE room)
  // STORE direction = north (z negative). Put balcony above that room.
  {
    const storeRoom = dirs[0];
    const bx = storeRoom.ex;
    const bz = storeRoom.ez;

    const balconyY = 3.0;
    floorPlane(10, 6, balconyY, bx, bz);
    makeRailCircle(5.0, balconyY);

    makeTelepad(bx, balconyY, bz);
    makeStairs(bx - 3.8, 0, bz + 3.0, 7, balconyY, 3.0, 2.1, Math.PI);

    // store kiosk marker
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.2), matTrim);
    kiosk.position.set(bx, 0.65, bz);
    add(kiosk);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.12), new THREE.MeshStandardMaterial({
      color: 0x88bbff, transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.1
    }));
    glass.position.set(bx, 1.25, bz - 2.2);
    add(glass);
  }

  // Spawn point (north side of lobby facing table)
  {
    const spawnName = "SPAWN_N";
    const spawn = new THREE.Object3D();
    spawn.name = spawnName;
    spawn.position.set(0, 0, -7.5);
    scene.add(spawn);
    L("spawn ✅", spawnName);

    // place player facing table
    player.position.set(0, 0, -7.5);
    player.rotation.y = 0; // facing toward +Z => toward table center
  }

  // ---------- Raycast floor (teleport) ----------
  function raycastFloor(raycaster) {
    const hits = raycaster.intersectObjects(WORLD.floorMeshes, false);
    if (!hits || hits.length === 0) return null;
    return hits[0].point;
  }

  // ---------- Update loop ----------
  function update(dt) {
    WORLD.t += dt;

    // bots idle sway
    for (const b of WORLD.bots) {
      const p = b.phase + WORLD.t * 1.6;
      b.root.position.x += Math.sin(p) * 0.0008;
      b.root.position.z += Math.cos(p) * 0.0008;
      b.root.rotation.y += Math.sin(p) * 0.00035;
    }

    // cards hover
    for (const c of WORLD.cards) {
      const p = c.phase + WORLD.t * 2.0;
      c.mesh.position.y = c.baseY + Math.sin(p) * 0.06;
      c.mesh.rotation.y = Math.sin(p * 0.7) * 0.25;
    }
  }

  return {
    update,
    raycastFloor
  };
}
