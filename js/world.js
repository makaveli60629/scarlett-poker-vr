// /js/world.js — ScarlettVR FULL WORLD v8.3
// ✅ NO controls_ext import
// ✅ locomotion handled in /js/index.js
// ✅ FIXED dashed teleport arcs (no computeLineDistances crash)
// ✅ Centered + deeper sunken poker pit/table
// ✅ Proper rail w/ single entrance gap + guard post
// ✅ Balcony spectator lounge upstairs (replaces extra jumbotron concept)
// ✅ Watch UI smaller + hands toggle
// ✅ Better lighting + navigation clarity

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),

      // ray + temp
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),

      // ground for teleport targeting
      groundMeshes: [],

      // XR visuals
      lasers: [],
      reticles: [],
      arcs: { left: null, right: null },
      arcPts: { left: [], right: [] },
      lastTeleportPointL: null,
      lastTeleportPointR: null,

      // watch
      watch: { root: null, visible: true, buttons: [], labels: [] },

      // hands
      handMeshes: { left: null, right: null, visible: true },

      // grab
      grab: { interactables: [], heldRight: null },

      // ambience
      hoverCars: [],
      neonMats: [],
      dashLines: [],

      // navigation
      anchors: {},
      room: "lobby",

      // toggles
      showArcs: true,
      showLasers: true,
      showHands: true,
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    // ====== BUILD WORLD ======
    addSkyAndFog(s);
    addLightsCinematic(s);

    buildLobbyShell(s);
    buildLobbyFloorCarpet(s);

    // ✅ deeper pit + rail + guard + proper entrance
    buildPitAndDownstairs(s);

    buildRoomsAndHallways(s);
    buildPortals(s);

    buildStore(s);
    buildScorpion(s);
    buildSpectate(s);

    // ✅ upstairs spectator lounge balcony
    buildBalconySpectator(s);

    buildHoverCars(s);

    // keep one main jumbotron (not clutter)
    buildMainJumbotron(s);

    // ====== XR VISUALS + UI ======
    setupXRLasers(s);
    setupFloorReticles(s);
    setupTeleportArcs(s);

    setupControllerHandMeshes(s);
    setupPrettyWatch(s);

    // ====== POKER ROOM (foundation) ======
    buildPokerRoom(s); // ✅ centered, sunken

    // ====== ANCHORS ======
    s.anchors.lobby    = { pos: new THREE.Vector3(0, 0, 13.5),   yaw: Math.PI };
    s.anchors.poker    = { pos: new THREE.Vector3(0, -3.2, 0.0), yaw: 0 };       // ✅ pit center
    s.anchors.store    = { pos: new THREE.Vector3(-26, 0, 0),    yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0),     yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 5.2, 12.0), yaw: Math.PI }; // ✅ balcony lounge

    setRigToAnchor(s, s.anchors.lobby);

    // ====== INPUT EVENTS ======
    controllers.c1.addEventListener("selectstart", () => teleportNow(s, "right"));
    controllers.c0.addEventListener("selectstart", () => {
      if (tryClickWatch(s)) return;
      teleportNow(s, "left");
    });

    controllers.c0.addEventListener("squeezestart", () => toggleWatch(s));
    controllers.c1.addEventListener("squeezestart", () => tryGrabRight(s));
    controllers.c1.addEventListener("squeezeend",   () => releaseGrabRight(s));

    log?.(`[world] FULL WORLD v8.3 ✅ build=${BUILD}`);
    return {
      setRoom: (room) => {
        s.room = room;
        setRigToAnchor(s, s.anchors[room] || s.anchors.lobby);
        log?.(`[rm] room=${room}`);
      },
      update: (dt, t) => update(s, dt, t),
    };
  }
};

// =======================
// ENV + LIGHTING
// =======================

function addSkyAndFog(s) {
  const { THREE, scene } = s;
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 10, 110);
}

function addLightsCinematic(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.2);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(35, 70, 35);
  scene.add(sun);

  // stronger lobby glow (so you can navigate)
  const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.35, 110, 2);
  lobbyGlow.position.set(0, 9.5, 0);
  root.add(lobbyGlow);

  // warm fill so it isn't “too dark”
  const warmFill = new THREE.PointLight(0xffe6b0, 0.35, 65, 2);
  warmFill.position.set(0, 3.2, 10);
  root.add(warmFill);

  const magenta = new THREE.PointLight(0xff6bd6, 0.85, 95, 2);
  magenta.position.set(0, 2.8, 0);
  root.add(magenta);

  const pitGlow = new THREE.PointLight(0x66ccff, 0.75, 55, 2);
  pitGlow.position.set(0, 1.0, 0);
  root.add(pitGlow);
}

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

// =======================
// LOBBY BEAUTY
// =======================

function buildLobbyShell(s) {
  const { THREE, root } = s;

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x66ccff,
    roughness: 0.3, metalness: 0.6,
    emissive: new THREE.Color(0x66ccff),
    emissiveIntensity: 0.5
  });
  s.neonMats.push(ringMat);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(16.5, 0.12, 12, 96), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 8.8, 0);
  root.add(ring);
}

function buildLobbyFloorCarpet(s) {
  const { THREE, root } = s;

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  const carpet = new THREE.Mesh(
    new THREE.CircleGeometry(14.8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0f1a2d, roughness: 1.0, metalness: 0.0,
      emissive: new THREE.Color(0x0b1220),
      emissiveIntensity: 0.07
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.002;
  root.add(carpet);

  const decalMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const wedge = new THREE.Mesh(new THREE.RingGeometry(10.2, 14.4, 32, 1, i*Math.PI/2, Math.PI/4), decalMat);
    wedge.rotation.x = -Math.PI/2;
    wedge.position.y = 0.004;
    root.add(wedge);
  }
}

// =======================
// PIT + RAIL + STAIRS (fixed)
// =======================

function buildPitAndDownstairs(s) {
  const { THREE, root } = s;

  // ✅ deeper pit + table can sit “sunken”
  const pitRadius = 7.2;
  const pitDepth = 3.4;
  const pitFloorY = -pitDepth;

  // pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 72),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  // pit wall (inside)
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY/2, 0);
  root.add(pitWall);

  // ✅ rail around pit edge with ONE entrance gap (south side)
  const railR = pitRadius + 0.35;
  const railH = 1.05;
  const railY = 0.55;

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.55, metalness: 0.22,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.06
  });

  // split rail into 2 arcs leaving an entrance gap
  const gapAngle = 0.45;      // entrance size (radians)
  const gapCenter = Math.PI;  // south side

  const makeRailArc = (start, len) => {
    const g = new THREE.TorusGeometry(railR, 0.08, 12, 120, len);
    const m = new THREE.Mesh(g, railMat);
    m.rotation.x = Math.PI/2;
    m.rotation.z = start;
    m.position.y = railY;
    root.add(m);
    return m;
  };

  // left arc
  makeRailArc(gapCenter + gapAngle/2, Math.PI*2 - gapAngle);
  // guard posts near entrance
  const postMat = new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.7, metalness: 0.15 });
  const mkPost = (ang) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, railH, 12), postMat);
    p.position.set(Math.cos(ang) * railR, railY + railH/2 - 0.1, Math.sin(ang) * railR);
    root.add(p);
  };
  mkPost(gapCenter - gapAngle/2);
  mkPost(gapCenter + gapAngle/2);

  // ✅ fitted ramp down into pit (south entrance)
  const stairW = 2.2;
  const stairL = 9.6;

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, pitDepth + 0.1, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );

  // start at lobby level, go down to pit floor
  const rampCenterZ = (pitRadius + (stairL * 0.36));
  ramp.position.set(0, pitFloorY/2, rampCenterZ);
  ramp.rotation.x = -Math.atan2(pitDepth, stairL);
  root.add(ramp);

  // ✅ guard “checkpoint” at entrance
  const guard = new THREE.Group();
  guard.position.set(0, 0.0, railR + 0.65);
  root.add(guard);

  const guardStand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.6), matFloor(THREE, 0x111a28));
  guardStand.position.y = 0.1;
  guard.add(guardStand);

  const guardPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12), postMat);
  guardPillar.position.set(0.5, 0.8, 0);
  guard.add(guardPillar);

  const guardLight = new THREE.PointLight(0x66ccff, 0.55, 18, 2);
  guardLight.position.set(0, 1.2, 0);
  guard.add(guardLight);
}

// =======================
// ROOMS + PORTALS
// =======================

function buildRoomsAndHallways(s) {
  const { THREE, root } = s;

  const roomDist = 28, roomSize = 10, wallH = 4.6;
  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, 0.35, roomSize * 2.2),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);
    s.groundMeshes.push(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220, roughness: 0.92, metalness: 0.08,
        transparent: true, opacity: 0.45
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    const hallLen = 12;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, hallLen), matFloor(THREE, 0x121c2c));
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI/2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI/2; }

    root.add(hall);
    s.groundMeshes.push(hall);
  }
}

function buildPortals(s) {
  const { THREE, root } = s;

  const portalMat = new THREE.MeshStandardMaterial({
    color: 0x66ccff, roughness: 0.3, metalness: 0.65,
    emissive: new THREE.Color(0x66ccff),
    emissiveIntensity: 0.6
  });
  s.neonMats.push(portalMat);

  const portals = [
    { x: 0, z: -18, ry: 0 },
    { x: 0, z: 18, ry: Math.PI },
    { x: -18, z: 0, ry: Math.PI/2 },
    { x: 18, z: 0, ry: -Math.PI/2 },
  ];

  for (const p of portals) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 12, 64), portalMat);
    ring.position.set(p.x, 2.0, p.z);
    ring.rotation.y = p.ry;
    ring.rotation.x = Math.PI/2;
    root.add(ring);
  }
}

// =======================
// ROOMS
// =======================

function buildStore(s) {
  const { THREE, root } = s;
  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);
  s.groundMeshes.push(floor);

  const glow = new THREE.PointLight(0x66ccff, 1.05, 55, 2);
  glow.position.set(0, 3.8, 0);
  store.add(glow);

  const sign = makeLabelPlate(THREE, "STORE", 0x0a1020, 0x66ccff, 768, 192);
  sign.position.set(0, 3.2, -7.5);
  store.add(sign);

  // mannequins
  const mm = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.65, metalness: 0.08 });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), mm);
    m.position.set(-7 + i*2.8, 1.1, -4.2);
    store.add(m);
  }
}

function buildScorpion(s) {
  const { THREE, root } = s;
  const sc = new THREE.Group();
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);
  s.groundMeshes.push(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.2, 60, 2);
  light.position.set(0, 3.8, 0);
  sc.add(light);

  const sign = makeLabelPlate(THREE, "SCORPION ROOM", 0x0a1020, 0xff6bd6);
  sign.position.set(0, 3.2, -7.5);
  sc.add(sign);

  // simple table placeholders (you asked for tables out there)
  const tmat = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.6, metalness: 0.2 });
  for (let i = 0; i < 3; i++) {
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.15, 24), tmat);
    tbl.position.set(-5 + i*5, 0.85, 0.8);
    sc.add(tbl);
  }
}

function buildSpectate(s) {
  // legacy ground spectate pad (kept)
  const { THREE, root } = s;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
  s.groundMeshes.push(plat);
}

function buildBalconySpectator(s) {
  const { THREE, root } = s;

  const y = 5.1;
  const rInner = 14.8;
  const rOuter = 18.3;

  const deck = new THREE.Mesh(
    new THREE.RingGeometry(rInner, rOuter, 96),
    matFloor(THREE, 0x101a2a)
  );
  deck.rotation.x = -Math.PI/2;
  deck.position.y = y;
  root.add(deck);
  s.groundMeshes.push(deck);

  // rail around balcony
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.55, metalness: 0.22,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.07
  });

  const rail = new THREE.Mesh(new THREE.TorusGeometry((rOuter + rInner)/2 + 1.1, 0.06, 10, 140), railMat);
  rail.rotation.x = Math.PI/2;
  rail.position.y = y + 1.05;
  root.add(rail);

  // lounge lights
  const lounge = new THREE.PointLight(0x66ccff, 0.65, 65, 2);
  lounge.position.set(0, y + 2.2, 0);
  root.add(lounge);

  // simple lounge label
  const sign = makeLabelPlate(THREE, "UPSTAIRS LOUNGE / SPECTATOR", 0x0a1020, 0xc8d3ff, 1024, 256);
  sign.position.set(0, y + 2.0, 13.8);
  sign.rotation.y = Math.PI;
  root.add(sign);
}

function buildHoverCars(s) {
  const { THREE, root } = s;

  const carGroup = new THREE.Group();
  carGroup.position.set(0, 0, 36);
  root.add(carGroup);

  const carMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.55, metalness: 0.25 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x66ccff, roughness: 0.3, metalness: 0.4,
    emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.45
  });

  for (let i = 0; i < 7; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.4), carMat);
    body.position.y = 0.4;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), glowMat);
    canopy.position.set(0, 0.85, -0.3);
    car.add(body, canopy);

    car.position.set(-14 + i * 4.6, 2.4, 0);
    car.rotation.y = (i - 3) * 0.14;
    carGroup.add(car);

    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.7 });
  }
}

function buildMainJumbotron(s) {
  const { THREE, root, BUILD } = s;

  const panel = new THREE.Group();
  panel.position.set(0, 6.2, 13.0);
  panel.rotation.y = Math.PI;
  root.add(panel);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 2.2, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.55, metalness: 0.25 })
  );
  panel.add(frame);

  const face = makeLabelPlate(THREE, `SCARLETT VR POKER`, 0x0b1220, 0x66ccff, 1280, 320);
  face.position.z = 0.08;
  panel.add(face);

  const build = makeLabelPlate(THREE, `BUILD: ${String(BUILD).slice(-10)}`, 0x0b1220, 0xc8d3ff, 1280, 240);
  build.position.set(0, -0.95, 0.08);
  build.scale.set(0.95, 0.55, 1);
  panel.add(build);

  const glow = new THREE.PointLight(0x66ccff, 0.85, 22, 2);
  glow.position.set(0, 0, 1.0);
  panel.add(glow);
}

// =======================
// XR: lasers, reticle, arc
// =======================

function setupXRLasers(s) {
  const { THREE, controllers } = s;

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geom, mat);
    line.scale.z = 12;
    return line;
  }

  const l0 = makeLaser();
  const l1 = makeLaser();
  controllers.c0.add(l0);
  controllers.c1.add(l1);

  s.lasers.push({ controller: controllers.c0, line: l0, hand: "left" });
  s.lasers.push({ controller: controllers.c1, line: l1, hand: "right" });
}

function setupFloorReticles(s) {
  const { THREE, root } = s;

  function makeReticle() {
    const g = new THREE.RingGeometry(0.13, 0.20, 36);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.98 });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    root.add(r);
    return r;
  }

  s.reticles.push({ hand: "left", mesh: makeReticle() });
  s.reticles.push({ hand: "right", mesh: makeReticle() });
}

// ✅ FIXED + “glowier”: tighter dashes + animated color
function setupTeleportArcs(s) {
  const { THREE, root } = s;

  const makeArc = () => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -0.001)
    ]);

    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.12,
      gapSize: 0.06
    });

    const line = new THREE.Line(geom, mat);
    line.visible = false;

    if (line.geometry?.attributes?.position?.count >= 2) {
      line.computeLineDistances();
    }

    root.add(line);
    s.dashLines.push(line);
    return line;
  };

  s.arcs.left = makeArc();
  s.arcs.right = makeArc();

  s.arcPts.left = new Array(28).fill(0).map(() => new THREE.Vector3());
  s.arcPts.right = new Array(28).fill(0).map(() => new THREE.Vector3());
}

// =======================
// HANDS + WATCH
// =======================

function setupControllerHandMeshes(s) {
  const { THREE, controllers } = s;

  function makeHand(isLeft) {
    const g = new THREE.Group();

    // (still “temp style” but less chunky)
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8c7b2, roughness: 0.85, metalness: 0.03 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.95, metalness: 0.02 });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.055), glove);
    palm.position.set(0, 0, -0.018);
    g.add(palm);

    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.010, 0.022), skin);
    knuckle.position.set(0, 0.011, -0.032);
    g.add(knuckle);

    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.009, 0.028), skin);
      f.position.set(-0.014 + i * 0.014, 0.011, -0.058);
      g.add(f);
    }

    const th = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.009, 0.026), skin);
    th.position.set(isLeft ? -0.028 : 0.028, 0.006, -0.028);
    th.rotation.y = isLeft ? 0.55 : -0.55;
    g.add(th);

    g.position.set(isLeft ? -0.010 : 0.010, -0.010, -0.018);
    g.rotation.set(-0.18, 0, 0);
    return g;
  }

  const hl = makeHand(true);
  const hr = makeHand(false);
  controllers.c0.add(hl);
  controllers.c1.add(hr);

  s.handMeshes.left = hl;
  s.handMeshes.right = hr;

  applyHandsVisible(s, true);
}

function applyHandsVisible(s, on) {
  s.showHands = !!on;
  if (s.handMeshes.left) s.handMeshes.left.visible = s.showHands;
  if (s.handMeshes.right) s.handMeshes.right.visible = s.showHands;
}

function setupPrettyWatch(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  // ✅ smaller watch overall
  watchRoot.scale.set(0.62, 0.62, 0.62);

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x182743, roughness: 0.35, metalness: 0.35,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.12
  });

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x0d1324, roughness: 0.25, metalness: 0.25,
    emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.18
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.140, 0.090, 0.014), plateMat);
  watchRoot.add(body);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.078, 0.005), faceMat);
  face.position.z = 0.010;
  watchRoot.add(face);

  // ✅ smaller buttons + tighter spacing
  const items = [
    { label: "POKER", room: "poker" },
    { label: "LOBBY", room: "lobby" },
    { label: "STORE", room: "store" },
    { label: "UP",    room: "spectate" },
    { label: "SCORP", room: "scorpion" },
    { label: "ARC",   action: (st)=>{ st.showArcs = !st.showArcs; } },
    { label: "LASER", action: (st)=>{ st.showLasers = !st.showLasers; } },
    { label: "HANDS", action: (st)=>{ applyHandsVisible(st, !st.showHands); } },
  ];

  const btnGeo = new THREE.BoxGeometry(0.110, 0.014, 0.010);

  for (let i = 0; i < items.length; i++) {
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x2b3b5f, roughness: 0.65, metalness: 0.14,
      emissive: new THREE.Color(0x000000), emissiveIntensity: 0
    });

    const b = new THREE.Mesh(btnGeo, btnMat);
    b.position.set(0, 0.034 - i * 0.0185, 0.016);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);

    const label = makeLabelPlate(THREE, items[i].label, 0x0a1020, 0x66ccff, 512, 128);
    label.scale.set(0.19, 0.052, 1);
    label.position.set(0.0, 0.034 - i * 0.0185, 0.024);
    watchRoot.add(label);
    s.watch.labels.push(label);
  }

  // attach to LEFT controller
  watchRoot.position.set(0.050, 0.012, -0.070);
  watchRoot.rotation.set(-0.72, 0.0, 0.22);
  controllers.c0.add(watchRoot);

  s.watch.root = watchRoot;
  s.watch.visible = true;
  watchRoot.visible = true;
}

function toggleWatch(s) {
  if (!s.watch.root) return;
  s.watch.visible = !s.watch.visible;
  s.watch.root.visible = s.watch.visible;
}

function tryClickWatch(s) {
  if (!s.watch.visible || !s.watch.buttons.length) return false;

  const ctrl = s.controllers.c0; // left
  s.tmpM.identity().extractRotation(ctrl.matrixWorld);
  const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
  s.tmpDir.set(0, 0, -1).applyMatrix4(s.tmpM).normalize();

  s.raycaster.set(origin, s.tmpDir);
  const hits = s.raycaster.intersectObjects(s.watch.buttons, false);
  if (!hits.length) return false;

  const btn = hits[0].object;
  const item = btn.userData.watchItem;

  if (item?.action) item.action(s);
  if (item?.room) setRigToAnchor(s, s.anchors[item.room] || s.anchors.lobby);

  if (btn.material?.emissive) {
    btn.material.emissive.setHex(0x223cff);
    btn.material.emissiveIntensity = 0.75;
  }
  return true;
}

// =======================
// POKER ROOM (centered + sunken)
// =======================

function buildPokerRoom(s) {
  const { THREE, root } = s;

  const room = new THREE.Group();
  room.name = "POKER_ROOM";
  room.position.set(0, -3.2, 0); // ✅ centered in pit, deeper
  root.add(room);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(10, 72), matFloor(THREE, 0x0f1724));
  pad.rotation.x = -Math.PI/2;
  pad.position.y = 0.001;
  room.add(pad);
  s.groundMeshes.push(pad);

  // ✅ centered table
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.85, 3.05, 0.35, 72),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, 0.95, 0);
  room.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.12, 14, 84),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.set(0, 1.08, 0);
  room.add(rail);

  // deck + cards (grabbable)
  const deckPos = new THREE.Vector3(-1.15, 1.10, 0.0);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 })
  );
  deck.position.copy(deckPos);
  room.add(deck);

  for (let i = 0; i < 12; i++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.004, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 })
    );
    card.position.set(deckPos.x + (i % 6)*0.07, deckPos.y + 0.02 + Math.floor(i/6)*0.01, deckPos.z + 0.14);
    card.rotation.y = -0.2;
    card.userData.grabbable = true;
    room.add(card);
    s.grab.interactables.push(card);
  }

  // spotlight down into pit table
  const spot = new THREE.SpotLight(0xffffff, 1.1, 38, Math.PI/4, 0.35, 1);
  spot.position.set(0, 9.0, 0);
  spot.target.position.set(0, -2.2, 0);
  s.root.add(spot);
  s.root.add(spot.target);
}

// =======================
// GRAB (right-hand only)
// =======================

function tryGrabRight(s) {
  if (!s.renderer.xr.isPresenting) return;
  if (s.grab.heldRight) return;

  const ctrl = s.controllers.c1;

  s.tmpM.identity().extractRotation(ctrl.matrixWorld);
  const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
  s.tmpDir.set(0, 0, -1).applyMatrix4(s.tmpM).normalize();

  s.raycaster.set(origin, s.tmpDir);
  const hits = s.raycaster.intersectObjects(s.grab.interactables, false);
  if (!hits.length) return;

  const obj = hits[0].object;
  if (!obj?.userData?.grabbable) return;

  ctrl.attach(obj);
  obj.position.set(0.0, -0.01, -0.06);
  s.grab.heldRight = obj;
}

function releaseGrabRight(s) {
  const obj = s.grab.heldRight;
  if (!obj) return;
  s.root.attach(obj);
  s.grab.heldRight = null;
}

// =======================
// UPDATE LOOP
// =======================

function update(s, dt, t) {
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t*1.3 + c.phase) * 0.28;
    c.obj.rotation.y += dt * 0.10;
  }

  // dashed arc animation (glowier)
  for (const l of s.dashLines) {
    if (l.material) l.material.dashOffset = -(t * 1.05);
    if (l.material?.color) {
      const c = hsvToRgb((t*0.10) % 1, 0.55, 1.0);
      l.material.color.setRGB(c.r, c.g, c.b);
    }
  }

  updateRays(s);
  // locomotion handled in /js/index.js
}

function updateRays(s) {
  const { renderer, raycaster, tmpM, tmpV, tmpDir } = s;

  for (const L of s.lasers) {
    const ctrl = L.controller;
    const line = L.line;
    const hand = L.hand;

    const showLaser = s.showLasers && renderer.xr.isPresenting;
    line.visible = showLaser;

    if (!renderer.xr.isPresenting) {
      setReticleVisible(s, hand, false);
      setArcVisible(s, hand, false);
      continue;
    }

    tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();
    raycaster.set(origin, tmpDir);

    // watch hover (left)
    if (hand === "left" && s.watch.visible && s.watch.buttons.length) {
      for (const b of s.watch.buttons) {
        if (b.material?.emissive) { b.material.emissive.setHex(0x000000); b.material.emissiveIntensity = 0; }
      }
      const uiHits = raycaster.intersectObjects(s.watch.buttons, false);
      if (uiHits.length) {
        const b = uiHits[0].object;
        if (b.material?.emissive) { b.material.emissive.setHex(0x223cff); b.material.emissiveIntensity = 0.55; }
        if (showLaser) line.scale.z = Math.min(2.0, uiHits[0].distance);
        setReticleVisible(s, hand, false);
        setArcVisible(s, hand, false);
        continue;
      }
    }

    // floor hit
    const hits = raycaster.intersectObjects(s.groundMeshes, false);
    if (hits.length) {
      const h = hits[0];
      if (showLaser) line.scale.z = Math.min(12, h.distance);

      setReticle(s, hand, h.point);

      if (s.showArcs) updateArc(s, hand, origin, h.point);
      else setArcVisible(s, hand, false);

      if (hand === "right") s.lastTeleportPointR = h.point.clone();
      else s.lastTeleportPointL = h.point.clone();
    } else {
      if (showLaser) line.scale.z = 12;
      setReticleVisible(s, hand, false);
      setArcVisible(s, hand, false);
    }
  }
}

function teleportNow(s, hand) {
  const p = hand === "right" ? s.lastTeleportPointR : s.lastTeleportPointL;
  if (!p) return;
  s.player.position.set(p.x, s.player.position.y, p.z);
}

function setReticle(s, hand, point) {
  const r = s.reticles.find(x => x.hand === hand)?.mesh;
  if (!r) return;
  r.visible = true;
  r.position.copy(point);
  r.position.y += 0.01;
}

function setReticleVisible(s, hand, v) {
  const r = s.reticles.find(x => x.hand === hand)?.mesh;
  if (r) r.visible = v;
}

// ✅ safe dashed arc update
function updateArc(s, hand, from, to) {
  const arc = s.arcs[hand];
  const pts = s.arcPts[hand];
  if (!arc || !pts) return;

  arc.visible = true;

  const mid = new s.THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mid.y += 1.15;

  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;

    pts[i].set(
      from.x * a + mid.x * b + to.x * c,
      from.y * a + mid.y * b + to.y * c,
      from.z * a + mid.z * b + to.z * c
    );
  }

  const geom = arc.geometry;
  if (!geom?.attributes?.position || geom.attributes.position.count !== N) {
    geom?.dispose?.();
    arc.geometry = new s.THREE.BufferGeometry().setFromPoints(pts);
  } else {
    const pos = geom.attributes.position;
    for (let i = 0; i < N; i++) pos.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
    pos.needsUpdate = true;
  }

  if (arc.geometry?.attributes?.position?.count >= 2) {
    arc.computeLineDistances();
  }
}

function setArcVisible(s, hand, v) {
  const arc = s.arcs[hand];
  if (arc) arc.visible = v;
}

// =======================
// UTIL
// =======================

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  s.player.rotation.set(0, 0, 0);
  if (!s.renderer.xr.isPresenting) s.camera.rotation.set(0, anchor.yaw, 0);
}

function makeLabelPlate(THREE, text, bg = 0x0a1020, fg = 0x66ccff, w = 768, h = 192) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = hex(bg);
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(102,204,255,0.55)";
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.01));
  ctx.strokeRect(10, 10, w-20, h-20);

  ctx.fillStyle = hex(fg);
  ctx.font = `900 ${Math.floor(h*0.48)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w/2, h/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), mat);
}

function hex(n) {
  const c = Number(n >>> 0).toString(16).padStart(6, "0");
  return `#${c}`;
}

function hsvToRgb(h, s, v) {
  let r=0,g=0,b=0;
  const i = Math.floor(h*6);
  const f = h*6 - i;
  const p = v*(1-s);
  const q = v*(1-f*s);
  const t = v*(1-(1-f)*s);
  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    case 5: r=v; g=p; b=q; break;
  }
  return { r, g, b };
  }
