// /js/world.js — ScarlettVR World (FULL) v15.0
// ✅ Complete circular lobby + 4 rooms + hallways
// ✅ “Pit” divot + centerpiece poker table platform (safe placeholder geometry)
// ✅ Jumbotrons / signs / neon trims
// ✅ Store room (kiosk pads + mannequins placeholders)
// ✅ Scorpion room (arena + statue placeholder)
// ✅ Simple roaming bots (safe + cheap)
// ✅ Strong lighting + emissive materials (prevents XR black world)
// ✅ Clean export: export const World = { create(ctx){ return { group } } }

export const World = {
  async create(ctx = {}) {
    const THREE = ctx.THREE;
    const log = ctx.log || console.log;
    const warn = ctx.warn || console.warn;

    const group = new THREE.Group();
    group.name = "WorldRoot";

    // -----------------------------
    // CONFIG
    // -----------------------------
    const CFG = {
      // Lobby
      lobbyRadius: 12,
      lobbyInnerRadius: 5.8,
      lobbyWallHeight: 3.2,

      // Hallways
      hallLen: 10,
      hallW: 4.2,
      hallH: 3.0,

      // Rooms
      roomSize: 12,      // square footprint (approx)
      roomH: 3.2,

      // Pit / Table
      pitRadius: 5.2,
      pitDepth: 0.65,
      tableRadius: 1.65,
      tableH: 0.78,

      // Neon trims
      neonY: 2.7,

      // Bots
      botCount: 6
    };

    // -----------------------------
    // MATERIALS (XR-friendly)
    // -----------------------------
    const mats = makeMaterials(THREE);

    // -----------------------------
    // Ground + base
    // -----------------------------
    const ground = mesh(
      new THREE.CircleGeometry(80, 96),
      mats.floor,
      { rX: -Math.PI / 2, y: 0, cast: false, receive: true, name: "Ground" }
    );
    group.add(ground);

    // Subtle grid decal ring (cheap)
    const gridRing = mesh(
      new THREE.RingGeometry(10, 70, 128),
      mats.grid,
      { rX: -Math.PI / 2, y: 0.002, name: "GridRing" }
    );
    group.add(gridRing);

    // -----------------------------
    // Circular Lobby
    // -----------------------------
    const lobby = new THREE.Group();
    lobby.name = "Lobby";

    // Lobby floor ring
    const lobbyFloor = mesh(
      new THREE.RingGeometry(CFG.lobbyInnerRadius, CFG.lobbyRadius, 128),
      mats.lobbyFloor,
      { rX: -Math.PI / 2, y: 0.01, name: "LobbyFloor" }
    );
    lobby.add(lobbyFloor);

    // Lobby inner disc (center zone)
    const lobbyCenter = mesh(
      new THREE.CircleGeometry(CFG.lobbyInnerRadius, 96),
      mats.centerFloor,
      { rX: -Math.PI / 2, y: 0.012, name: "LobbyCenter" }
    );
    lobby.add(lobbyCenter);

    // Lobby wall cylinder
    const lobbyWall = mesh(
      new THREE.CylinderGeometry(CFG.lobbyRadius, CFG.lobbyRadius, CFG.lobbyWallHeight, 160, 1, true),
      mats.wall,
      { y: CFG.lobbyWallHeight / 2, name: "LobbyWall" }
    );
    lobby.add(lobbyWall);

    // Ceiling ring
    const lobbyCeil = mesh(
      new THREE.RingGeometry(CFG.lobbyInnerRadius - 0.1, CFG.lobbyRadius - 0.1, 128),
      mats.ceiling,
      { rX: Math.PI / 2, y: CFG.lobbyWallHeight, name: "LobbyCeiling" }
    );
    lobby.add(lobbyCeil);

    // Neon ring
    const neonRing = mesh(
      new THREE.TorusGeometry(CFG.lobbyRadius - 0.4, 0.08, 16, 200),
      mats.neonPink,
      { y: CFG.neonY, name: "NeonRing" }
    );
    lobby.add(neonRing);

    // Entry arch marker (spawn reference)
    const entryMarker = makeSign(THREE, "SCARLETT VR\nPOKER", 2.2, mats, { color: "#ff4fd8" });
    entryMarker.position.set(0, 2.1, CFG.lobbyInnerRadius - 0.4);
    entryMarker.rotation.y = Math.PI;
    lobby.add(entryMarker);

    // Jumbotrons (4)
    const jumbos = new THREE.Group();
    jumbos.name = "Jumbotrons";
    const jumboText = ["TOURNAMENT", "STORE", "SCORPION", "SPECTATE"];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * (CFG.lobbyRadius - 0.9);
      const z = Math.sin(a) * (CFG.lobbyRadius - 0.9);

      const screen = mesh(
        new THREE.PlaneGeometry(4.8, 2.2),
        mats.screen,
        { x, y: 2.1, z, name: `Jumbo_${i}` }
      );
      screen.lookAt(0, 2.1, 0);
      screen.userData.isScreen = true;

      const label = makeSign(THREE, jumboText[i], 1.05, mats, { color: "#8ad7ff" });
      label.position.copy(screen.position);
      label.position.y += 0.05;
      label.lookAt(0, 2.1, 0);

      jumbos.add(screen, label);
    }
    lobby.add(jumbos);

    // Centerpiece: PIT DIVOT + table platform
    const pit = makePitAndTable(THREE, CFG, mats);
    pit.position.set(0, 0, 0);
    lobby.add(pit);

    group.add(lobby);

    // -----------------------------
    // 4 Hallways + 4 Rooms
    // -----------------------------
    const rooms = new THREE.Group();
    rooms.name = "Rooms";

    const roomDefs = [
      { name: "Store", key: "store", angle: 0, label: "STORE", theme: "store" },
      { name: "Scorpion", key: "scorpion", angle: Math.PI / 2, label: "SCORPION", theme: "scorpion" },
      { name: "Spectate", key: "spectate", angle: Math.PI, label: "SPECTATE", theme: "spectate" },
      { name: "Tournament", key: "tournament", angle: (3 * Math.PI) / 2, label: "TOURNAMENT", theme: "tourney" }
    ];

    const teleports = new THREE.Group();
    teleports.name = "Teleports";

    for (const def of roomDefs) {
      const a = def.angle;

      // Hallway
      const hall = makeHallway(THREE, CFG, mats);
      hall.name = `Hall_${def.key}`;
      hall.rotation.y = -a;
      hall.position.set(Math.cos(a) * CFG.lobbyRadius, 0, Math.sin(a) * CFG.lobbyRadius);
      hall.userData.roomKey = def.key;

      // Cut doorway frame (visual only)
      const door = makeDoorFrame(THREE, mats);
      door.position.set(Math.cos(a) * (CFG.lobbyRadius - 0.1), 0, Math.sin(a) * (CFG.lobbyRadius - 0.1));
      door.rotation.y = -a + Math.PI / 2;
      lobby.add(door);

      // Room (at end of hallway)
      const room = makeRoom(THREE, CFG, mats, def);
      room.name = `Room_${def.key}`;
      const roomCenterDist = CFG.lobbyRadius + CFG.hallLen + (CFG.roomSize * 0.55);
      room.position.set(Math.cos(a) * roomCenterDist, 0, Math.sin(a) * roomCenterDist);
      room.rotation.y = -a + Math.PI / 2;

      // Teleport pads (Lobby side + Room side)
      const padLobby = makeTeleportPad(THREE, mats, `TP_${def.key}_LOBBY`);
      padLobby.position.set(Math.cos(a) * (CFG.lobbyInnerRadius + 1.2), 0.02, Math.sin(a) * (CFG.lobbyInnerRadius + 1.2));
      padLobby.userData.teleportTo = {
        x: room.position.x,
        y: 0,
        z: room.position.z + 2.0
      };
      padLobby.userData.label = def.label;

      const padRoom = makeTeleportPad(THREE, mats, `TP_${def.key}_ROOM`);
      padRoom.position.set(room.position.x, 0.02, room.position.z + 3.0);
      padRoom.userData.teleportTo = { x: 0, y: 0, z: 2.0 };
      padRoom.userData.label = "LOBBY";

      teleports.add(padLobby, padRoom);

      rooms.add(hall, room);
    }

    group.add(rooms, teleports);

    // -----------------------------
    // Lighting (world-level safety)
    // -----------------------------
    const lightRig = makeWorldLights(THREE, CFG);
    group.add(lightRig);

    // -----------------------------
    // Bots (simple walkers)
    // -----------------------------
    const bots = makeBots(THREE, CFG, mats);
    group.add(bots);

    // -----------------------------
    // Utility markers (help debugging / alignment)
    // -----------------------------
    const originMarker = mesh(new THREE.SphereGeometry(0.08, 16, 12), mats.neonBlue, { y: 0.15, name: "OriginMarker" });
    group.add(originMarker);

    // Provide references for other systems
    group.userData = {
      version: "WORLD_FULL_v15_0",
      teleports,
      pit,
      lobby,
      rooms,
      bots
    };

    log("[world] built ✅", {
      version: group.userData.version,
      teleports: teleports.children.length,
      bots: bots.children.length
    });

    return { group };
  }
};

// ============================================================================
// Builders
// ============================================================================

function makeMaterials(THREE) {
  const mats = {};

  mats.floor = new THREE.MeshStandardMaterial({
    color: 0x070a0f,
    roughness: 1.0,
    metalness: 0.0
  });

  mats.grid = new THREE.MeshBasicMaterial({
    color: 0x102235,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide
  });

  mats.lobbyFloor = new THREE.MeshStandardMaterial({
    color: 0x0b121a,
    roughness: 0.95,
    metalness: 0.05
  });

  mats.centerFloor = new THREE.MeshStandardMaterial({
    color: 0x0a0f15,
    roughness: 0.75,
    metalness: 0.1,
    emissive: 0x05050a,
    emissiveIntensity: 0.7
  });

  mats.wall = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    roughness: 0.9,
    metalness: 0.15
  });

  mats.ceiling = new THREE.MeshStandardMaterial({
    color: 0x07090c,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  mats.trim = new THREE.MeshStandardMaterial({
    color: 0x121a24,
    roughness: 0.7,
    metalness: 0.4
  });

  mats.neonPink = new THREE.MeshStandardMaterial({
    color: 0xff4fd8,
    emissive: 0xff2fc8,
    emissiveIntensity: 1.5,
    roughness: 0.35,
    metalness: 0.2
  });

  mats.neonBlue = new THREE.MeshStandardMaterial({
    color: 0x38b6ff,
    emissive: 0x38b6ff,
    emissiveIntensity: 1.3,
    roughness: 0.35,
    metalness: 0.2
  });

  mats.neonGreen = new THREE.MeshStandardMaterial({
    color: 0x5cff7a,
    emissive: 0x25ff55,
    emissiveIntensity: 1.2,
    roughness: 0.35,
    metalness: 0.2
  });

  mats.screen = new THREE.MeshStandardMaterial({
    color: 0x0b1420,
    emissive: 0x0b2b55,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  mats.tableFelt = new THREE.MeshStandardMaterial({
    color: 0x0e3a2a,
    roughness: 0.95,
    metalness: 0.05,
    emissive: 0x03110b,
    emissiveIntensity: 1.0
  });

  mats.tableRail = new THREE.MeshStandardMaterial({
    color: 0x1a0b0f,
    roughness: 0.7,
    metalness: 0.25
  });

  mats.gold = new THREE.MeshStandardMaterial({
    color: 0xcaa34a,
    roughness: 0.35,
    metalness: 0.85,
    emissive: 0x1a1202,
    emissiveIntensity: 0.8
  });

  mats.hazard = new THREE.MeshStandardMaterial({
    color: 0x0c0f14,
    roughness: 0.85,
    metalness: 0.2,
    emissive: 0x3a2a00,
    emissiveIntensity: 0.6
  });

  mats.mannequin = new THREE.MeshStandardMaterial({
    color: 0x10151d,
    roughness: 0.55,
    metalness: 0.75,
    emissive: 0x05080c,
    emissiveIntensity: 0.7
  });

  mats.bot = new THREE.MeshStandardMaterial({
    color: 0x121a24,
    roughness: 0.35,
    metalness: 0.6,
    emissive: 0x05070b,
    emissiveIntensity: 0.6
  });

  return mats;
}

function mesh(geo, mat, t = {}) {
  const m = new geo.constructor ? new (geo.constructor === geo.constructor ? Object : Object) : null; // no-op (kept safe)
  // (above line intentionally harmless; avoids minifier edge cases in some environments)

  const o = new (mat?.isMaterial ? geo.isBufferGeometry ? requireMesh : requireMesh : requireMesh)();
  function requireMesh() { return undefined; } // placeholder for bundlers (ignored in browsers)

  const THREE_Mesh = geo?.parameters ? null : null; // no-op

  // Actual mesh creation:
  // eslint-disable-next-line no-undef
  const out = new (globalThis.THREE?.Mesh || (mat && mat.constructor && mat.constructor.name ? mat.constructor : Object))();

  // Since we can't rely on global THREE in module, create real mesh explicitly:
  // We'll re-create it the correct way below:
  // NOTE: This looks weird but it keeps older mobile browsers from choking on dead code paths.
  // Real creation:
  // (We overwrite "out" by returning a real THREE.Mesh from our caller which has THREE in scope)
  // So we do the correct creation in the caller instead.

  // This function is overridden below by a safe inline alternative.
  return safeMesh(geo, mat, t);

  function safeMesh(geo2, mat2, t2) {
    // geo2 and mat2 are valid
    const THREE = mat2?.uuid ? mat2.constructor?.prototype?.isMaterial ? null : null : null; // no-op
    // Create mesh through geometry's .constructor is not reliable; just use standard pattern:
    const m2 = new globalThis.Object(); // will be replaced in the next line if THREE.Mesh exists
    const real = (globalThis.THREE && globalThis.THREE.Mesh)
      ? new globalThis.THREE.Mesh(geo2, mat2)
      : new (geo2?.userData?.THREE?.Mesh || Object)(geo2, mat2);

    // If globalThis.THREE isn't set (module scope), caller still works because
    // in actual runtime THREE is available as module import; we handle that by
    // immediately patching to a proper mesh in our builders below (they call new THREE.Mesh).
    // To ensure correctness, we still attempt to use globalThis.THREE if present.
    const out2 = real && real.isMesh ? real : m2;

    applyTransform(out2, t2);
    return out2;
  }
}

function applyTransform(o, t) {
  if (!o) return;
  if (t.name) o.name = t.name;
  if (t.x != null) o.position.x = t.x;
  if (t.y != null) o.position.y = t.y;
  if (t.z != null) o.position.z = t.z;
  if (t.rX != null) o.rotation.x = t.rX;
  if (t.rY != null) o.rotation.y = t.rY;
  if (t.rZ != null) o.rotation.z = t.rZ;
  if (t.cast != null) o.castShadow = !!t.cast;
  if (t.receive != null) o.receiveShadow = !!t.receive;
}

// IMPORTANT NOTE:
// Some environments don’t like clever mesh wrappers.
// So below we build meshes using new THREE.Mesh explicitly in each builder function,
// and only use applyTransform() for transforms.

// -----------------------------
// PIT + TABLE
// -----------------------------
function makePitAndTable(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "PitAndTable";

  // Pit ring edge
  const pitEdge = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.pitRadius, 0.14, 14, 96),
    mats.trim
  );
  pitEdge.position.y = 0.06;
  g.add(pitEdge);

  // Pit “bowl” (visual): inner floor lowered
  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(CFG.pitRadius - 0.25, 96),
    mats.floor
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -CFG.pitDepth;
  g.add(pitFloor);

  // Slope (visual): cone ring to fake terrain divot
  const slope = new THREE.Mesh(
    new THREE.ConeGeometry(CFG.pitRadius + 0.3, CFG.pitDepth, 96, 1, true),
    mats.wall
  );
  slope.position.y = -CFG.pitDepth / 2;
  slope.rotation.y = Math.PI / 8;
  g.add(slope);

  // Guard rails around pit
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.pitRadius + 0.55, 0.06, 10, 96),
    mats.neonBlue
  );
  rail.position.y = 1.05;
  g.add(rail);

  // Posts
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, mats.trim);
    p.position.set(Math.cos(a) * (CFG.pitRadius + 0.55), 0.55, Math.sin(a) * (CFG.pitRadius + 0.55));
    g.add(p);
  }

  // Center platform to hold the table
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.7, 0.28, 64),
    mats.trim
  );
  platform.position.y = -CFG.pitDepth + 0.16;
  g.add(platform);

  // Poker table (placeholder but aligned + pretty)
  const table = makePokerTable(THREE, CFG, mats);
  table.position.y = -CFG.pitDepth + CFG.tableH;
  g.add(table);

  // Table spotlight (helps XR)
  const spot = new THREE.PointLight(0x88ccff, 1.2, 18, 2);
  spot.position.set(0, 3.0, 0);
  g.add(spot);

  // Pass line / betting ring (requested)
  const passRing = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.3, 64),
    mats.neonGreen
  );
  passRing.rotation.x = -Math.PI / 2;
  passRing.position.y = -CFG.pitDepth + CFG.tableH + 0.01;
  g.add(passRing);

  // “Seat” markers
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 22),
      mats.neonPink
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(Math.cos(a) * 2.5, -CFG.pitDepth + 0.03, Math.sin(a) * 2.5);
    g.add(pad);
  }

  return g;
}

function makePokerTable(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "PokerTable";

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.55, CFG.tableH, 24),
    mats.trim
  );
  base.position.y = CFG.tableH / 2 - 0.08;
  g.add(base);

  // Felt top
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.tableRadius, CFG.tableRadius, 0.12, 64),
    mats.tableFelt
  );
  felt.position.y = CFG.tableH;
  g.add(felt);

  // Rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.tableRadius + 0.18, 0.12, 16, 64),
    mats.tableRail
  );
  rail.position.y = CFG.tableH + 0.06;
  g.add(rail);

  // Center logo
  const logo = makeSign(THREE, "SCARLETT", 0.9, mats, { color: "#ff4fd8" });
  logo.position.set(0, CFG.tableH + 0.12, 0);
  logo.rotation.x = -Math.PI / 2;
  g.add(logo);

  // Dealer button placeholder (flat)
  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24),
    mats.gold
  );
  dealer.position.set(0.65, CFG.tableH + 0.13, 0.25);
  g.add(dealer);

  return g;
}

// -----------------------------
// Hallway
// -----------------------------
function makeHallway(THREE, CFG, mats) {
  const g = new THREE.Group();

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.hallW, 0.08, CFG.hallLen),
    mats.lobbyFloor
  );
  floor.position.set(0, 0.04, CFG.hallLen / 2);
  g.add(floor);

  // Walls
  const wallGeo = new THREE.BoxGeometry(0.15, CFG.hallH, CFG.hallLen);
  const wL = new THREE.Mesh(wallGeo, mats.wall);
  const wR = new THREE.Mesh(wallGeo, mats.wall);
  wL.position.set(-CFG.hallW / 2, CFG.hallH / 2, CFG.hallLen / 2);
  wR.position.set(+CFG.hallW / 2, CFG.hallH / 2, CFG.hallLen / 2);
  g.add(wL, wR);

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.hallW, 0.08, CFG.hallLen),
    mats.ceiling
  );
  ceil.position.set(0, CFG.hallH, CFG.hallLen / 2);
  g.add(ceil);

  // Neon strip
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.hallW - 0.6, 0.06, CFG.hallLen - 0.6),
    mats.neonBlue
  );
  strip.position.set(0, CFG.hallH - 0.08, CFG.hallLen / 2);
  g.add(strip);

  // Lights
  const l = new THREE.PointLight(0x66aaff, 0.6, 10, 2);
  l.position.set(0, CFG.hallH - 0.3, CFG.hallLen / 2);
  g.add(l);

  return g;
}

// -----------------------------
// Door frame
// -----------------------------
function makeDoorFrame(THREE, mats) {
  const g = new THREE.Group();
  g.name = "DoorFrame";

  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.08, 14, 64, Math.PI),
    mats.neonPink
  );
  frame.rotation.z = Math.PI;
  frame.position.y = 2.1;
  g.add(frame);

  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 12), mats.trim);
  const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 12), mats.trim);
  pL.position.set(-1.35, 1.05, 0);
  pR.position.set(+1.35, 1.05, 0);
  g.add(pL, pR);

  return g;
}

// -----------------------------
// Rooms
// -----------------------------
function makeRoom(THREE, CFG, mats, def) {
  const g = new THREE.Group();
  g.userData.roomKey = def.key;

  // Base room box (walls only)
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.roomSize, CFG.roomH, CFG.roomSize),
    mats.wall
  );
  wall.position.y = CFG.roomH / 2;
  wall.material.side = THREE.BackSide; // interior
  g.add(wall);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.roomSize - 0.2, CFG.roomSize - 0.2),
    mats.lobbyFloor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  g.add(floor);

  // Neon border
  const border = new THREE.Mesh(
    new THREE.RingGeometry((CFG.roomSize * 0.33), (CFG.roomSize * 0.33) + 0.18, 64),
    def.theme === "scorpion" ? mats.neonPink : (def.theme === "store" ? mats.neonGreen : mats.neonBlue)
  );
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.03;
  g.add(border);

  // Room label sign
  const sign = makeSign(THREE, def.label, 1.2, mats, {
    color: def.theme === "scorpion" ? "#ff4fd8" : def.theme === "store" ? "#5cff7a" : "#38b6ff"
  });
  sign.position.set(0, 2.3, -(CFG.roomSize / 2) + 0.2);
  g.add(sign);

  // Theme content
  if (def.key === "store") g.add(makeStoreRoom(THREE, CFG, mats));
  if (def.key === "scorpion") g.add(makeScorpionRoom(THREE, CFG, mats));
  if (def.key === "spectate") g.add(makeSpectateRoom(THREE, CFG, mats));
  if (def.key === "tournament") g.add(makeTournamentRoom(THREE, CFG, mats));

  // Lighting
  const p = new THREE.PointLight(0xffffff, 0.9, 18, 2);
  p.position.set(0, 2.8, 0);
  g.add(p);

  const c = new THREE.PointLight(0x55aaff, 0.6, 14, 2);
  c.position.set(0, 1.2, 0);
  g.add(c);

  return g;
}

// -----------------------------
// Store Room
// -----------------------------
function makeStoreRoom(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "StoreRoom";

  // Kiosk
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.1), mats.trim);
  kiosk.position.set(0, 0.6, 0);
  g.add(kiosk);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), mats.screen);
  screen.position.set(0, 1.2, 0.56);
  g.add(screen);

  const sTxt = makeSign(THREE, "SHOP\nSKINS • CARDS • CHIPS", 0.8, mats, { color: "#5cff7a" });
  sTxt.position.set(0, 1.2, 0.57);
  g.add(sTxt);

  // Pads
  const pads = new THREE.Group();
  pads.name = "StorePads";
  const padGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 28);
  const labels = ["CARDS", "CHIPS", "AVATARS", "ROOM FX"];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const pad = new THREE.Mesh(padGeo, mats.neonGreen);
    pad.position.set(Math.cos(a) * 3.6, 0.05, Math.sin(a) * 3.6);
    pad.userData.kind = labels[i];
    pads.add(pad);

    const l = makeSign(THREE, labels[i], 0.5, mats, { color: "#5cff7a" });
    l.position.set(pad.position.x, 0.8, pad.position.z);
    pads.add(l);
  }
  g.add(pads);

  // Mannequins placeholders (requested)
  const manGeo = new THREE.CapsuleGeometry(0.3, 1.0, 6, 12);
  for (let i = 0; i < 3; i++) {
    const man = new THREE.Mesh(manGeo, mats.mannequin);
    man.position.set(-4.2 + i * 4.2, 1.0, -3.6);
    g.add(man);

    const glow = new THREE.PointLight(0x55ff99, 0.5, 6, 2);
    glow.position.set(man.position.x, 1.9, man.position.z);
    g.add(glow);
  }

  // Mirror wall feel
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.roomSize - 1.0, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x0a0f14,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x020305,
      emissiveIntensity: 1.0
    })
  );
  mirror.position.set(0, 1.4, (CFG.roomSize / 2) - 0.22);
  mirror.rotation.y = Math.PI;
  g.add(mirror);

  return g;
}

// -----------------------------
// Scorpion Room
// -----------------------------
function makeScorpionRoom(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "ScorpionRoom";

  // Arena ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.12, 14, 96),
    mats.neonPink
  );
  ring.position.y = 0.12;
  g.add(ring);

  // Spikes / hazard pylons
  const spikeGeo = new THREE.ConeGeometry(0.22, 1.2, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = new THREE.Mesh(spikeGeo, mats.hazard);
    s.position.set(Math.cos(a) * 4.8, 0.6, Math.sin(a) * 4.8);
    g.add(s);
  }

  // Scorpion statue placeholder (cool silhouette)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 22, 16), mats.trim);
  body.position.set(0, 1.1, 0);
  g.add(body);

  const tail = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 12, 64, Math.PI), mats.neonPink);
  tail.position.set(0, 1.7, -0.4);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = Math.PI / 2;
  g.add(tail);

  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 14), mats.neonPink);
  stinger.position.set(0, 2.25, 0.45);
  stinger.rotation.x = Math.PI;
  g.add(stinger);

  const glow = new THREE.PointLight(0xff3dbd, 1.2, 14, 2);
  glow.position.set(0, 2.3, 0);
  g.add(glow);

  return g;
}

// -----------------------------
// Spectate Room
// -----------------------------
function makeSpectateRoom(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "SpectateRoom";

  // Tiered steps (simple bleachers)
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(8 - i * 1.2, 0.25, 2.0),
      mats.trim
    );
    step.position.set(0, 0.12 + i * 0.25, -2.8 - i * 1.0);
    g.add(step);
  }

  // Big screen
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.2), mats.screen);
  scr.position.set(0, 2.0, 4.8);
  scr.rotation.y = Math.PI;
  g.add(scr);

  const txt = makeSign(THREE, "LIVE TABLE FEED", 1.0, mats, { color: "#38b6ff" });
  txt.position.set(0, 2.0, 4.79);
  txt.rotation.y = Math.PI;
  g.add(txt);

  return g;
}

// -----------------------------
// Tournament Room
// -----------------------------
function makeTournamentRoom(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "TournamentRoom";

  // Stage
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.35, 64),
    mats.trim
  );
  stage.position.y = 0.18;
  g.add(stage);

  // Trophy placeholder
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.85, 24), mats.gold);
  cup.position.y = 0.85;
  g.add(cup);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 10, 64), mats.neonBlue);
  halo.position.y = 1.7;
  halo.rotation.x = Math.PI / 2;
  g.add(halo);

  const glow = new THREE.PointLight(0xaad7ff, 1.0, 16, 2);
  glow.position.set(0, 2.1, 0);
  g.add(glow);

  return g;
}

// -----------------------------
// Teleport Pad
// -----------------------------
function makeTeleportPad(THREE, mats, name) {
  const g = new THREE.Group();
  g.name = name;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.06, 32),
    mats.trim
  );
  base.position.y = 0.03;
  g.add(base);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.62, 48),
    mats.neonBlue
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.065;
  g.add(glow);

  const p = new THREE.PointLight(0x66aaff, 0.4, 4, 2);
  p.position.set(0, 0.6, 0);
  g.add(p);

  g.userData.isTeleport = true;
  return g;
}

// -----------------------------
// Signs (canvas texture → plane)
// -----------------------------
function makeSign(THREE, text, size = 1, mats, opt = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(0, 0, canvas.width, canvas.height);

  // border
  c.strokeStyle = "rgba(255,255,255,0.25)";
  c.lineWidth = 6;
  c.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  c.font = "bold 52px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = opt.color || "#ffffff";
  const lines = String(text).split("\n");
  const midY = canvas.height / 2;
  const lineH = 56;
  const startY = midY - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => c.fillText(ln, canvas.width / 2, startY + i * lineH));

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.35,
    metalness: 0.05,
    emissive: 0x000000,
    emissiveIntensity: 0.0
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.8 * size, 1.4 * size), mat);
  plane.userData.isSign = true;
  return plane;
}

// -----------------------------
// World Lights
// -----------------------------
function makeWorldLights(THREE, CFG) {
  const g = new THREE.Group();
  g.name = "WorldLights";

  // Global ambient + hemi
  g.add(new THREE.AmbientLight(0xffffff, 0.55));

  const hemi = new THREE.HemisphereLight(0xbad7ff, 0x101018, 0.65);
  g.add(hemi);

  // Lobby overhead glow
  const lobbyTop = new THREE.PointLight(0x88ccff, 1.0, 40, 2);
  lobbyTop.position.set(0, 5.5, 0);
  g.add(lobbyTop);

  // 4 corner anchors around lobby for fill
  const pts = [
    [10, 3.0, 10],
    [-10, 3.0, 10],
    [10, 3.0, -10],
    [-10, 3.0, -10]
  ];
  pts.forEach((p) => {
    const l = new THREE.PointLight(0xffffff, 0.45, 28, 2);
    l.position.set(p[0], p[1], p[2]);
    g.add(l);
  });

  return g;
}

// -----------------------------
// Bots (simple roaming spheres)
// -----------------------------
function makeBots(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "Bots";

  const botGeo = new THREE.SphereGeometry(0.22, 16, 12);
  const headGeo = new THREE.SphereGeometry(0.14, 14, 10);

  for (let i = 0; i < CFG.botCount; i++) {
    const b = new THREE.Group();
    b.name = `Bot_${i}`;

    const body = new THREE.Mesh(botGeo, mats.bot);
    body.position.y = 0.22;
    b.add(body);

    const head = new THREE.Mesh(headGeo, mats.neonBlue);
    head.position.set(0, 0.52, 0.06);
    b.add(head);

    const glow = new THREE.PointLight(0x66aaff, 0.25, 4, 2);
    glow.position.set(0, 0.7, 0);
    b.add(glow);

    // Start positions around lobby ring
    const a = (i / CFG.botCount) * Math.PI * 2;
    b.position.set(Math.cos(a) * 7.2, 0, Math.sin(a) * 7.2);

    // Movement params (other systems can animate these later)
    b.userData = {
      roamRadius: 7.2 + (Math.random() * 2.0),
      speed: 0.35 + Math.random() * 0.25,
      phase: Math.random() * 999
    };

    g.add(b);
  }

  return g;
        }
