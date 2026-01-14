// /js/world.js — ScarlettVR World (FULL) v15.1 CLEAN
// ✅ Exports World.create(ctx) -> { group }
// ✅ No wrappers, no globals, no surprises
// ✅ Circular lobby + pit/table + 4 halls + 4 rooms + telepads + bots + strong lights

export const World = {
  async create(ctx = {}) {
    const { THREE } = ctx;
    const log = ctx.log || console.log;

    const group = new THREE.Group();
    group.name = "WorldRoot";

    // -----------------------------
    // CONFIG
    // -----------------------------
    const CFG = {
      lobbyRadius: 12,
      lobbyInnerRadius: 5.8,
      lobbyWallHeight: 3.2,

      hallLen: 10,
      hallW: 4.2,
      hallH: 3.0,

      roomSize: 12,
      roomH: 3.2,

      pitRadius: 5.2,
      pitDepth: 0.65,
      tableRadius: 1.65,
      tableH: 0.78,

      neonY: 2.7,
      botCount: 6
    };

    const mats = makeMaterials(THREE);

    // -----------------------------
    // Ground
    // -----------------------------
    const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 96), mats.floor);
    ground.name = "Ground";
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    group.add(ground);

    const gridRing = new THREE.Mesh(new THREE.RingGeometry(10, 70, 128), mats.grid);
    gridRing.name = "GridRing";
    gridRing.rotation.x = -Math.PI / 2;
    gridRing.position.y = 0.002;
    group.add(gridRing);

    // -----------------------------
    // Lobby
    // -----------------------------
    const lobby = new THREE.Group();
    lobby.name = "Lobby";

    const lobbyFloor = new THREE.Mesh(
      new THREE.RingGeometry(CFG.lobbyInnerRadius, CFG.lobbyRadius, 128),
      mats.lobbyFloor
    );
    lobbyFloor.name = "LobbyFloor";
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.y = 0.01;
    lobby.add(lobbyFloor);

    const lobbyCenter = new THREE.Mesh(new THREE.CircleGeometry(CFG.lobbyInnerRadius, 96), mats.centerFloor);
    lobbyCenter.name = "LobbyCenter";
    lobbyCenter.rotation.x = -Math.PI / 2;
    lobbyCenter.position.y = 0.012;
    lobby.add(lobbyCenter);

    const lobbyWall = new THREE.Mesh(
      new THREE.CylinderGeometry(CFG.lobbyRadius, CFG.lobbyRadius, CFG.lobbyWallHeight, 160, 1, true),
      mats.wall
    );
    lobbyWall.name = "LobbyWall";
    lobbyWall.position.y = CFG.lobbyWallHeight / 2;
    lobby.add(lobbyWall);

    const lobbyCeil = new THREE.Mesh(
      new THREE.RingGeometry(CFG.lobbyInnerRadius - 0.1, CFG.lobbyRadius - 0.1, 128),
      mats.ceiling
    );
    lobbyCeil.name = "LobbyCeiling";
    lobbyCeil.rotation.x = Math.PI / 2;
    lobbyCeil.position.y = CFG.lobbyWallHeight;
    lobby.add(lobbyCeil);

    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(CFG.lobbyRadius - 0.4, 0.08, 16, 200),
      mats.neonPink
    );
    neonRing.name = "NeonRing";
    neonRing.position.y = CFG.neonY;
    lobby.add(neonRing);

    // Entry sign
    const entryMarker = makeSign(THREE, "SCARLETT VR\nPOKER", 2.2, "#ff4fd8");
    entryMarker.position.set(0, 2.1, CFG.lobbyInnerRadius - 0.4);
    entryMarker.rotation.y = Math.PI;
    lobby.add(entryMarker);

    // Jumbotrons
    const jumboText = ["TOURNAMENT", "STORE", "SCORPION", "SPECTATE"];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * (CFG.lobbyRadius - 0.9);
      const z = Math.sin(a) * (CFG.lobbyRadius - 0.9);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.2), mats.screen);
      screen.name = `Jumbo_${i}`;
      screen.position.set(x, 2.1, z);
      screen.lookAt(0, 2.1, 0);
      lobby.add(screen);

      const label = makeSign(THREE, jumboText[i], 1.05, "#8ad7ff");
      label.position.copy(screen.position);
      label.position.y += 0.05;
      label.lookAt(0, 2.1, 0);
      lobby.add(label);
    }

    // Pit + table
    const pit = makePitAndTable(THREE, CFG, mats);
    lobby.add(pit);

    group.add(lobby);

    // -----------------------------
    // Rooms + Teleports
    // -----------------------------
    const rooms = new THREE.Group();
    rooms.name = "Rooms";

    const teleports = new THREE.Group();
    teleports.name = "Teleports";

    const roomDefs = [
      { key: "store", angle: 0, label: "STORE", color: "#5cff7a" },
      { key: "scorpion", angle: Math.PI / 2, label: "SCORPION", color: "#ff4fd8" },
      { key: "spectate", angle: Math.PI, label: "SPECTATE", color: "#38b6ff" },
      { key: "tournament", angle: (3 * Math.PI) / 2, label: "TOURNAMENT", color: "#8ad7ff" }
    ];

    for (const def of roomDefs) {
      const a = def.angle;

      // Hallway from lobby out
      const hall = makeHallway(THREE, CFG, mats);
      hall.name = `Hall_${def.key}`;
      hall.rotation.y = -a;
      hall.position.set(Math.cos(a) * CFG.lobbyRadius, 0, Math.sin(a) * CFG.lobbyRadius);
      rooms.add(hall);

      // Room at end
      const room = makeRoom(THREE, CFG, mats, def);
      const roomCenterDist = CFG.lobbyRadius + CFG.hallLen + (CFG.roomSize * 0.55);
      room.position.set(Math.cos(a) * roomCenterDist, 0, Math.sin(a) * roomCenterDist);
      room.rotation.y = -a + Math.PI / 2;
      rooms.add(room);

      // Teleport pads
      const padLobby = makeTeleportPad(THREE, mats, `TP_${def.key}_LOBBY`);
      padLobby.position.set(
        Math.cos(a) * (CFG.lobbyInnerRadius + 1.2),
        0.02,
        Math.sin(a) * (CFG.lobbyInnerRadius + 1.2)
      );
      padLobby.userData.teleportTo = { x: room.position.x, y: 0, z: room.position.z + 2.0 };
      padLobby.userData.label = def.label;
      teleports.add(padLobby);

      const padRoom = makeTeleportPad(THREE, mats, `TP_${def.key}_ROOM`);
      padRoom.position.set(room.position.x, 0.02, room.position.z + 3.0);
      padRoom.userData.teleportTo = { x: 0, y: 0, z: 2.0 };
      padRoom.userData.label = "LOBBY";
      teleports.add(padRoom);
    }

    group.add(rooms, teleports);

    // -----------------------------
    // Lights (world-level)
    // -----------------------------
    group.add(makeWorldLights(THREE));

    // -----------------------------
    // Bots
    // -----------------------------
    group.add(makeBots(THREE, CFG, mats));

    group.userData = {
      version: "WORLD_FULL_v15_1_CLEAN",
      teleports,
      lobby,
      rooms,
      pit
    };

    log("[world] built ✅", group.userData.version);
    return { group };
  }
};

// ============================================================================
// Builders
// ============================================================================

function makeMaterials(THREE) {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0x070a0f, roughness: 1, metalness: 0 }),
    grid: new THREE.MeshBasicMaterial({ color: 0x102235, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    lobbyFloor: new THREE.MeshStandardMaterial({ color: 0x0b121a, roughness: 0.95, metalness: 0.05 }),
    centerFloor: new THREE.MeshStandardMaterial({
      color: 0x0a0f15, roughness: 0.75, metalness: 0.1, emissive: 0x05050a, emissiveIntensity: 0.7
    }),
    wall: new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.9, metalness: 0.15 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ color: 0x121a24, roughness: 0.7, metalness: 0.4 }),
    neonPink: new THREE.MeshStandardMaterial({
      color: 0xff4fd8, emissive: 0xff2fc8, emissiveIntensity: 1.5, roughness: 0.35, metalness: 0.2
    }),
    neonBlue: new THREE.MeshStandardMaterial({
      color: 0x38b6ff, emissive: 0x38b6ff, emissiveIntensity: 1.3, roughness: 0.35, metalness: 0.2
    }),
    neonGreen: new THREE.MeshStandardMaterial({
      color: 0x5cff7a, emissive: 0x25ff55, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.2
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x0b1420, emissive: 0x0b2b55, emissiveIntensity: 2.0, roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide
    }),
    tableFelt: new THREE.MeshStandardMaterial({
      color: 0x0e3a2a, roughness: 0.95, metalness: 0.05, emissive: 0x03110b, emissiveIntensity: 1.0
    }),
    tableRail: new THREE.MeshStandardMaterial({ color: 0x1a0b0f, roughness: 0.7, metalness: 0.25 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xcaa34a, roughness: 0.35, metalness: 0.85, emissive: 0x1a1202, emissiveIntensity: 0.8 }),
    hazard: new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.85, metalness: 0.2, emissive: 0x3a2a00, emissiveIntensity: 0.6 }),
    mannequin: new THREE.MeshStandardMaterial({ color: 0x10151d, roughness: 0.55, metalness: 0.75, emissive: 0x05080c, emissiveIntensity: 0.7 }),
    bot: new THREE.MeshStandardMaterial({ color: 0x121a24, roughness: 0.35, metalness: 0.6, emissive: 0x05070b, emissiveIntensity: 0.6 })
  };
}

function makePitAndTable(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "PitAndTable";

  const pitEdge = new THREE.Mesh(new THREE.TorusGeometry(CFG.pitRadius, 0.14, 14, 96), mats.trim);
  pitEdge.position.y = 0.06;
  g.add(pitEdge);

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(CFG.pitRadius - 0.25, 96), mats.floor);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -CFG.pitDepth;
  g.add(pitFloor);

  const slope = new THREE.Mesh(
    new THREE.ConeGeometry(CFG.pitRadius + 0.3, CFG.pitDepth, 96, 1, true),
    mats.wall
  );
  slope.position.y = -CFG.pitDepth / 2;
  g.add(slope);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(CFG.pitRadius + 0.55, 0.06, 10, 96), mats.neonBlue);
  rail.position.y = 1.05;
  g.add(rail);

  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, mats.trim);
    p.position.set(Math.cos(a) * (CFG.pitRadius + 0.55), 0.55, Math.sin(a) * (CFG.pitRadius + 0.55));
    g.add(p);
  }

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.28, 64), mats.trim);
  platform.position.y = -CFG.pitDepth + 0.16;
  g.add(platform);

  const table = makePokerTable(THREE, CFG, mats);
  table.position.y = -CFG.pitDepth + CFG.tableH;
  g.add(table);

  const spot = new THREE.PointLight(0x88ccff, 1.2, 18, 2);
  spot.position.set(0, 3.0, 0);
  g.add(spot);

  const passRing = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.3, 64), mats.neonGreen);
  passRing.rotation.x = -Math.PI / 2;
  passRing.position.y = -CFG.pitDepth + CFG.tableH + 0.01;
  g.add(passRing);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.22, 22), mats.neonPink);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(Math.cos(a) * 2.5, -CFG.pitDepth + 0.03, Math.sin(a) * 2.5);
    g.add(pad);
  }

  return g;
}

function makePokerTable(THREE, CFG, mats) {
  const g = new THREE.Group();
  g.name = "PokerTable";

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, CFG.tableH, 24), mats.trim);
  base.position.y = CFG.tableH / 2 - 0.08;
  g.add(base);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(CFG.tableRadius, CFG.tableRadius, 0.12, 64), mats.tableFelt);
  felt.position.y = CFG.tableH;
  g.add(felt);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(CFG.tableRadius + 0.18, 0.12, 16, 64), mats.tableRail);
  rail.position.y = CFG.tableH + 0.06;
  g.add(rail);

  const logo = makeSign(THREE, "SCARLETT", 0.9, "#ff4fd8");
  logo.position.set(0, CFG.tableH + 0.12, 0);
  logo.rotation.x = -Math.PI / 2;
  g.add(logo);

  const dealer = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), mats.gold);
  dealer.position.set(0.65, CFG.tableH + 0.13, 0.25);
  g.add(dealer);

  return g;
}

function makeHallway(THREE, CFG, mats) {
  const g = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.BoxGeometry(CFG.hallW, 0.08, CFG.hallLen), mats.lobbyFloor);
  floor.position.set(0, 0.04, CFG.hallLen / 2);
  g.add(floor);

  const wallGeo = new THREE.BoxGeometry(0.15, CFG.hallH, CFG.hallLen);
  const wL = new THREE.Mesh(wallGeo, mats.wall);
  const wR = new THREE.Mesh(wallGeo, mats.wall);
  wL.position.set(-CFG.hallW / 2, CFG.hallH / 2, CFG.hallLen / 2);
  wR.position.set(+CFG.hallW / 2, CFG.hallH / 2, CFG.hallLen / 2);
  g.add(wL, wR);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(CFG.hallW, 0.08, CFG.hallLen), mats.ceiling);
  ceil.position.set(0, CFG.hallH, CFG.hallLen / 2);
  g.add(ceil);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(CFG.hallW - 0.6, 0.06, CFG.hallLen - 0.6), mats.neonBlue);
  strip.position.set(0, CFG.hallH - 0.08, CFG.hallLen / 2);
  g.add(strip);

  const l = new THREE.PointLight(0x66aaff, 0.6, 10, 2);
  l.position.set(0, CFG.hallH - 0.3, CFG.hallLen / 2);
  g.add(l);

  return g;
}

function makeRoom(THREE, CFG, mats, def) {
  const g = new THREE.Group();
  g.name = `Room_${def.key}`;

  const wall = new THREE.Mesh(new THREE.BoxGeometry(CFG.roomSize, CFG.roomH, CFG.roomSize), mats.wall);
  wall.position.y = CFG.roomH / 2;
  wall.material.side = THREE.BackSide;
  g.add(wall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roomSize - 0.2, CFG.roomSize - 0.2), mats.lobbyFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  g.add(floor);

  const sign = makeSign(THREE, def.label, 1.2, def.color);
  sign.position.set(0, 2.3, -(CFG.roomSize / 2) + 0.2);
  g.add(sign);

  // A simple centerpiece per room
  const center = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 48), mats.trim);
  center.position.y = 0.12;
  g.add(center);

  const glow = new THREE.PointLight(hex(def.color), 1.0, 18, 2);
  glow.position.set(0, 2.4, 0);
  g.add(glow);

  // Store mannequins
  if (def.key === "store") {
    const manGeo = new THREE.CapsuleGeometry(0.3, 1.0, 6, 12);
    for (let i = 0; i < 3; i++) {
      const man = new THREE.Mesh(manGeo, mats.mannequin);
      man.position.set(-4.2 + i * 4.2, 1.0, -3.6);
      g.add(man);
    }
  }

  return g;
}

function makeTeleportPad(THREE, mats, name) {
  const g = new THREE.Group();
  g.name = name;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 32), mats.trim);
  base.position.y = 0.03;
  g.add(base);

  const glow = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 48), mats.neonBlue);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.065;
  g.add(glow);

  const p = new THREE.PointLight(0x66aaff, 0.4, 4, 2);
  p.position.set(0, 0.6, 0);
  g.add(p);

  g.userData.isTeleport = true;
  return g;
}

function makeSign(THREE, text, size, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.strokeStyle = "rgba(255,255,255,0.25)";
  c.lineWidth = 6;
  c.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  c.font = "bold 52px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = color || "#ffffff";

  const lines = String(text).split("\n");
  const midY = canvas.height / 2;
  const lineH = 56;
  const startY = midY - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => c.fillText(ln, canvas.width / 2, startY + i * lineH));

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.35,
    metalness: 0.05
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.8 * size, 1.4 * size), mat);
  plane.userData.isSign = true;
  return plane;
}

function makeWorldLights(THREE) {
  const g = new THREE.Group();
  g.name = "WorldLights";

  g.add(new THREE.AmbientLight(0xffffff, 0.55));

  const hemi = new THREE.HemisphereLight(0xbad7ff, 0x101018, 0.65);
  g.add(hemi);

  const lobbyTop = new THREE.PointLight(0x88ccff, 1.0, 40, 2);
  lobbyTop.position.set(0, 5.5, 0);
  g.add(lobbyTop);

  [
    [10, 3.0, 10],
    [-10, 3.0, 10],
    [10, 3.0, -10],
    [-10, 3.0, -10]
  ].forEach(([x, y, z]) => {
    const l = new THREE.PointLight(0xffffff, 0.45, 28, 2);
    l.position.set(x, y, z);
    g.add(l);
  });

  return g;
}

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

    const a = (i / CFG.botCount) * Math.PI * 2;
    b.position.set(Math.cos(a) * 7.2, 0, Math.sin(a) * 7.2);

    g.add(b);
  }

  return g;
}

function hex(cssColor) {
  // accepts "#rrggbb"
  if (typeof cssColor !== "string" || cssColor[0] !== "#") return 0xffffff;
  return parseInt(cssColor.slice(1), 16);
      }
