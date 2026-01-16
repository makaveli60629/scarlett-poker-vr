// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v3_0_LOBBY_4ROOMS_TABLE_DIVOT_STORE_SCORPION
// ✅ Quest-safe geometry (no heavy textures, no shadows)
// ✅ Restores: circular lobby, 4 rooms, hallways, centerpiece table in a divot
// ✅ Adds: store room + mannequins, scorpion room theme, jumbotron frames, signage pylons
// ✅ Fixes: dealer chip is FLAT, not spinning, not sunk

export function buildWorld({ THREE, scene, rig, renderer, camera, writeHud }) {
  const BUILD = "WORLD_FULL_v3_0_LOBBY_4ROOMS_TABLE_DIVOT_STORE_SCORPION";
  writeHud?.(`[world] build starting… ${BUILD}`);

  // -----------------------------
  // Helpers
  // -----------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
  };

  function add(obj, name) { if (name) obj.name = name; scene.add(obj); return obj; }
  function group(name) { const g = new THREE.Group(); g.name = name; return g; }

  function ringWall(radius, height, thickness, mat) {
    // Cheap circular wall via CylinderGeometry (open top)
    const geom = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = height / 2;
    mesh.rotation.y = Math.PI / 48;
    return mesh;
  }

  function box(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  }

  function signPylon(textColorMat) {
    const g = group("SignPylon");
    const post = box(0.18, 2.2, 0.18, M.trim);
    post.position.y = 1.1;
    const panel = box(1.6, 0.55, 0.12, textColorMat);
    panel.position.set(0, 1.85, 0);
    g.add(post, panel);
    return g;
  }

  function jumbotronFrame() {
    const g = group("Jumbotron");
    const frame = box(3.2, 1.8, 0.18, M.trim);
    frame.position.y = 2.4;
    const screen = box(2.9, 1.55, 0.06, M.dark);
    screen.position.set(0, 2.4, 0.11);
    g.add(frame, screen);
    return g;
  }

  // -----------------------------
  // WORLD ROOT
  // -----------------------------
  const world = group("WORLD_ROOT");
  add(world);

  // Expand your space (twice as big vibe)
  const LOBBY_RADIUS = 14;         // larger lobby
  const WALL_H = 4.2;
  const HALL_LEN = 10;
  const ROOM_SIZE = 10;

  // -----------------------------
  // LOBBY FLOOR + WALLS
  // -----------------------------
  const lobby = group("LOBBY");
  world.add(lobby);

  // Lobby floor disk
  const lobbyFloor = new THREE.Mesh(
    new THREE.CircleGeometry(LOBBY_RADIUS, 64),
    M.floor
  );
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.y = 0.001; // avoid z-fight with base floor
  lobby.add(lobbyFloor);

  // Outer ring wall
  const lobbyWall = ringWall(LOBBY_RADIUS, WALL_H, 0.3, M.wall);
  lobbyWall.position.y = 0;
  lobby.add(lobbyWall);

  // Neon ring trim
  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_RADIUS - 0.35, 0.08, 12, 64),
    M.neonBlue
  );
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.03;
  lobby.add(neonRing);

  // Cardinal markers
  const markerN = box(0.4, 0.05, 1.6, M.neonPink); markerN.position.set(0, 0.03, -LOBBY_RADIUS + 1.2);
  const markerS = box(0.4, 0.05, 1.6, M.neonPink); markerS.position.set(0, 0.03,  LOBBY_RADIUS - 1.2);
  const markerE = box(1.6, 0.05, 0.4, M.neonPink); markerE.position.set( LOBBY_RADIUS - 1.2, 0.03, 0);
  const markerW = box(1.6, 0.05, 0.4, M.neonPink); markerW.position.set(-LOBBY_RADIUS + 1.2, 0.03, 0);
  lobby.add(markerN, markerS, markerE, markerW);

  // 4 sign pylons at entrances
  const pN = signPylon(M.neonBlue); pN.position.set(0, 0, -LOBBY_RADIUS + 2.2);
  const pS = signPylon(M.neonPink); pS.position.set(0, 0,  LOBBY_RADIUS - 2.2); pS.rotation.y = Math.PI;
  const pE = signPylon(M.neonBlue); pE.position.set( LOBBY_RADIUS - 2.2, 0, 0); pE.rotation.y = -Math.PI / 2;
  const pW = signPylon(M.neonPink); pW.position.set(-LOBBY_RADIUS + 2.2, 0, 0); pW.rotation.y = Math.PI / 2;
  lobby.add(pN, pS, pE, pW);

  // -----------------------------
  // CENTERPIECE TABLE IN A DIVOT
  // -----------------------------
  const center = group("CENTERPIECE");
  lobby.add(center);

  // Divot: a lowered circular platform (visual pit)
  const divotR = 6.4;
  const divotDepth = 0.55;

  const divotFloor = new THREE.Mesh(
    new THREE.CircleGeometry(divotR, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 1, metalness: 0 })
  );
  divotFloor.rotation.x = -Math.PI / 2;
  divotFloor.position.y = -divotDepth;
  center.add(divotFloor);

  // Divot wall (inner cylinder)
  const divotWall = new THREE.Mesh(
    new THREE.CylinderGeometry(divotR, divotR, divotDepth, 64, 1, true),
    M.trim
  );
  divotWall.position.y = -divotDepth / 2;
  center.add(divotWall);

  // Guardrail ring around divot edge
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(divotR + 0.3, 0.07, 10, 64),
    M.gold
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.08;
  center.add(rail);

  // Main poker table (simple but iconic)
  const table = group("POKER_TABLE");
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

  // Dealer chip (FIXED: flat, slightly above table, not spinning, no glow)
  const dealerChip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.chip);
  dealerChip.name = "DEALER_CHIP";
  dealerChip.position.set(0.95, 0.74, 0.35);
  dealerChip.rotation.set(-Math.PI / 2, 0, 0); // ✅ FLAT
  dealerChip.userData.spin = false;
  // ensure no emissive glow
  if (dealerChip.material) {
    dealerChip.material.emissive = new THREE.Color(0x000000);
    dealerChip.material.emissiveIntensity = 0;
  }
  table.add(dealerChip);

  // A few chips stacks (visual anchors)
  function chipStack(x, z, h = 9) {
    const g = group("ChipStack");
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

  // Seat markers (for future player spots)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), (i % 2 ? M.neonPink : M.neonBlue));
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(Math.cos(a) * 4.9, 0.03, Math.sin(a) * 4.9);
    spot.name = `SEAT_SPOT_${i}`;
    lobby.add(spot);
  }

  // -----------------------------
  // HALLWAYS + FOUR ROOMS
  // N: Poker lounge (extra seating / future bots)
  // E: Store (mannequins)
  // S: Scorpion room (theme)
  // W: Utility / future tournament room
  // -----------------------------
  function hallway(dirName, angleRad) {
    const g = group(`HALL_${dirName}`);
    const width = 4.2;
    const height = 3.2;
    const wallT = 0.25;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, HALL_LEN), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(width, HALL_LEN), M.dark);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, height, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(ceil);

    const wallL = box(wallT, height, HALL_LEN, M.wall);
    wallL.position.set(-width / 2, height / 2, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(wallL);

    const wallR = box(wallT, height, HALL_LEN, M.wall);
    wallR.position.set(width / 2, height / 2, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(wallR);

    // Neon strip
    const strip = box(width, 0.08, HALL_LEN, (dirName === "E" || dirName === "N") ? M.neonBlue : M.neonPink);
    strip.position.set(0, height - 0.25, -(LOBBY_RADIUS + HALL_LEN / 2 - 1.0));
    g.add(strip);

    g.rotation.y = angleRad;
    return g;
  }

  function room(dirName, angleRad, labelColorMat) {
    const g = group(`ROOM_${dirName}`);
    const s = ROOM_SIZE;
    const h = 3.6;

    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, baseZ);
    g.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.dark);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, h, baseZ);
    g.add(ceil);

    const wallBack = box(s, h, 0.25, M.wall);
    wallBack.position.set(0, h / 2, baseZ - s / 2);
    g.add(wallBack);

    const wallLeft = box(0.25, h, s, M.wall);
    wallLeft.position.set(-s / 2, h / 2, baseZ);
    g.add(wallLeft);

    const wallRight = box(0.25, h, s, M.wall);
    wallRight.position.set(s / 2, h / 2, baseZ);
    g.add(wallRight);

    // doorway is open (no front wall)

    // Jumbotron on back wall
    const j = jumbotronFrame();
    j.position.set(0, 0, baseZ - s / 2 + 0.2);
    g.add(j);

    // Label slab
    const label = box(3.2, 0.22, 0.18, labelColorMat);
    label.position.set(0, 2.95, baseZ - s / 2 + 0.35);
    g.add(label);

    g.rotation.y = angleRad;
    return g;
  }

  // Build the four hallways
  world.add(hallway("N", 0));
  world.add(hallway("E", -Math.PI / 2));
  world.add(hallway("S", Math.PI));
  world.add(hallway("W", Math.PI / 2));

  // Build rooms
  const roomN = room("N_POKER_LOUNGE", 0, M.neonBlue);
  const roomE = room("E_STORE", -Math.PI / 2, M.neonBlue);
  const roomS = room("S_SCORPION", Math.PI, M.neonPink);
  const roomW = room("W_TOURNAMENT", Math.PI / 2, M.neonPink);

  world.add(roomN, roomE, roomS, roomW);

  // -----------------------------
  // Room content: STORE + MANNEQUINS
  // -----------------------------
  (function buildStore() {
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const content = group("STORE_CONTENT");
    content.position.set(0, 0, baseZ);
    roomE.add(content);

    // Shelf walls
    const shelfL = box(0.35, 2.4, 6.8, M.trim); shelfL.position.set(-3.4, 1.2, 0);
    const shelfR = box(0.35, 2.4, 6.8, M.trim); shelfR.position.set( 3.4, 1.2, 0);
    content.add(shelfL, shelfR);

    // Mannequins (low poly)
    function mannequin(x, z, colorMat) {
      const g = group("MANNEQUIN");
      const torso = box(0.55, 0.85, 0.28, colorMat);
      torso.position.y = 1.35;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), M.trim);
      head.position.y = 1.95;
      const legs = box(0.45, 0.75, 0.22, M.wall);
      legs.position.y = 0.85;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 18), M.dark);
      base.position.y = 0.03;

      g.add(torso, head, legs, base);
      g.position.set(x, 0, z);
      return g;
    }

    content.add(mannequin(-1.6, -1.2, M.neonPink));
    content.add(mannequin( 0.0, -1.2, M.neonBlue));
    content.add(mannequin( 1.6, -1.2, M.neonPink));

    // Counter
    const counter = box(3.2, 0.95, 1.0, M.trim);
    counter.position.set(0, 0.48, 2.0);
    content.add(counter);
  })();

  // -----------------------------
  // Room content: SCORPION THEME
  // -----------------------------
  (function buildScorpion() {
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const content = group("SCORPION_CONTENT");
    content.position.set(0, 0, baseZ);
    roomS.add(content);

    // Scorpion emblem (abstract)
    const plate = box(4.8, 2.2, 0.14, M.dark);
    plate.position.set(0, 2.0, -s / 2 + 0.5);
    content.add(plate);

    const sting = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 24, Math.PI * 1.25), M.neonPink);
    sting.position.set(0, 2.05, -s / 2 + 0.65);
    sting.rotation.set(0, Math.PI, Math.PI / 2);
    content.add(sting);

    // Neon floor pattern
    const grid = box(6.5, 0.02, 6.5, M.neonPink);
    grid.position.set(0, 0.02, 0);
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    content.add(grid);

    // Pillars
    for (let i = -1; i <= 1; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.1, 18), M.trim);
      p.position.set(i * 2.2, 1.55, 1.4);
      content.add(p);
    }
  })();

  // -----------------------------
  // Room content: Poker lounge seating (simple)
  // -----------------------------
  (function buildLounge() {
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const content = group("LOUNGE_CONTENT");
    content.position.set(0, 0, baseZ);
    roomN.add(content);

    function chair(x, z) {
      const g = group("CHAIR");
      const seat = box(0.75, 0.12, 0.75, M.trim); seat.position.y = 0.55;
      const back = box(0.75, 0.85, 0.12, M.wall); back.position.set(0, 1.05, -0.33);
      const leg1 = box(0.08, 0.55, 0.08, M.dark); leg1.position.set(-0.28, 0.28, -0.28);
      const leg2 = box(0.08, 0.55, 0.08, M.dark); leg2.position.set( 0.28, 0.28, -0.28);
      const leg3 = box(0.08, 0.55, 0.08, M.dark); leg3.position.set(-0.28, 0.28,  0.28);
      const leg4 = box(0.08, 0.55, 0.08, M.dark); leg4.position.set( 0.28, 0.28,  0.28);
      g.add(seat, back, leg1, leg2, leg3, leg4);
      g.position.set(x, 0, z);
      return g;
    }

    // lounge rows
    content.add(chair(-2.2,  1.8));
    content.add(chair( 0.0,  1.8));
    content.add(chair( 2.2,  1.8));
    content.add(chair(-2.2, -0.6));
    content.add(chair( 0.0, -0.6));
    content.add(chair( 2.2, -0.6));
  })();

  // -----------------------------
  // Room content: Tournament (placeholder big open)
  // -----------------------------
  (function buildTournament() {
    const s = ROOM_SIZE;
    const baseZ = -(LOBBY_RADIUS + HALL_LEN + s / 2 - 1.0);

    const content = group("TOURNAMENT_CONTENT");
    content.position.set(0, 0, baseZ);
    roomW.add(content);

    // Big center circle + podium
    const circle = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), M.neonBlue);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.02;
    content.add(circle);

    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.28, 24), M.trim);
    podium.position.y = 0.14;
    content.add(podium);
  })();

  // -----------------------------
  // Lighting accents (cheap)
  // -----------------------------
  const accent1 = new THREE.PointLight(0x00e5ff, 0.9, 18);
  accent1.position.set(5, 2.6, 0);
  world.add(accent1);

  const accent2 = new THREE.PointLight(0xff2bd6, 0.9, 18);
  accent2.position.set(-5, 2.6, 0);
  world.add(accent2);

  // -----------------------------
  // Spawn polish: bring player near lobby center facing table
  // (doesn't overwrite if you already moved)
  // -----------------------------
  if (rig && rig.position) {
    // keep y untouched
    rig.position.x = clamp(rig.position.x, -20, 20);
    rig.position.z = clamp(rig.position.z, -20, 20);
  }

  // -----------------------------
  // World tick (very light)
  // -----------------------------
  const t = { time: 0 };
  scene.userData.worldTick = (dt) => {
    t.time += dt;

    // Subtle neon pulse (cheap)
    const pulse = 0.45 + 0.20 * Math.sin(t.time * 1.2);
    M.neonBlue.emissiveIntensity = pulse;
    M.neonPink.emissiveIntensity = 0.40 + 0.18 * Math.sin(t.time * 1.35);

    // DO NOT SPIN dealer chip (explicit)
    // dealerChip.userData.spin is false; we do nothing here.
  };

  writeHud?.("[world] build done ✅ (FULL WORLD)");
      }
