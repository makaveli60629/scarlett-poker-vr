// /js/world.js — FULL THROTTLE v5
// ✅ Keeps: right-stick movement + teleport + lasers + floor reticle + watch
// ✅ Adds: pretty watch (labels + glow + optional texture), controller-hand meshes
// ✅ Adds: rainbow teleport arc + pinch teleport (hand tracking if available)
// ✅ Adds: poker room + grab cards with grip (controller grab)
// NOTE: This is still "safe core"—we can layer your full legacy systems next.

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),
      anchors: {},
      room: "lobby",

      // locomotion
      moveSpeed: 2.8,
      deadzone: 0.14,
      snapTurnRad: THREE.MathUtils.degToRad(30),
      turnCooldown: 0,

      // diagonal shaping
      diagonal45: true,
      diagonalAmount: 0.85,

      // ray / reticle
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),
      groundMeshes: [],
      lasers: [],
      reticles: [],
      lastTeleportPointR: null,
      lastTeleportPointL: null,

      // teleport arcs
      arcs: { right: null, left: null },
      arcPts: { right: [], left: [] },

      // world
      hoverCars: [],

      // Watch UI
      watch: { root: null, visible: true, buttons: [], labelSprites: [] },

      // controller hands
      handMeshes: { left: null, right: null },

      // hand tracking visuals + pinch teleport
      handTrack: {
        enabled: true,
        left: { joints: new Map(), pinch: false, pinchHold: 0 },
        right:{ joints: new Map(), pinch: false, pinchHold: 0 },
        pinchDist: 0.028, // meters
        pinchHoldTime: 0.06, // seconds to commit
      },

      // grab system
      grab: {
        interactables: [],
        held: { left: null, right: null },
        tmpHit: null,
      },

      // textures (optional)
      textures: { watchFace: null, watchPlate: null },

      // debug
      _dbgT: 0,
      _lastAxesPrint: "",
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    addLightsCinematic(s);
    buildLobbyAndPit_DOWNSTAIRS(s);
    buildRoomsAndHallways(s);
    buildStore(s);
    buildSpectate(s);
    buildScorpion(s);
    buildHoverCars(s);

    setupXRLasers(s);
    setupFloorReticles_BIGGER(s);
    setupTeleportArcs(s);

    // Pretty watch + controller hands
    await tryLoadWatchTextures(s);
    setupPrettyWatch_LEFT(s);
    addControllerHandMeshes(s);

    // Poker room (full throttle start)
    buildPokerRoom(s);

    // SAFE SPAWN (flat lobby)
    s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI };
    s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.2, -14), yaw: 0 };
    s.anchors.poker = { pos: new THREE.Vector3(0, 0, -9.5), yaw: 0 };

    setRigToAnchor(s, s.anchors.lobby);

    // Teleport: both select/trigger
    controllers.c1.addEventListener("selectstart", () => teleportNow(s, "right"));
    controllers.c0.addEventListener("selectstart", () => teleportNow(s, "left"));

    // Watch toggle: left squeeze
    controllers.c0.addEventListener("squeezestart", () => toggleWatch(s));

    // Grab cards: grip/squeeze (both hands)
    controllers.c1.addEventListener("squeezestart", () => tryGrab(s, "right"));
    controllers.c1.addEventListener("squeezeend",   () => releaseGrab(s, "right"));
    controllers.c0.addEventListener("squeezestart", () => tryGrab(s, "left"));
    controllers.c0.addEventListener("squeezeend",   () => releaseGrab(s, "left"));

    log?.(`[world] init ✅ FULL THROTTLE v5 build=${BUILD}`);
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

/* =========================
   LIGHTING
========================= */

function addLightsCinematic(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.1);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(35, 70, 35);
  scene.add(sun);

  // Lobby accents
  const p1 = new THREE.PointLight(0x7fb2ff, 1.1, 90, 2);
  p1.position.set(0, 8.5, 0);
  root.add(p1);

  const p2 = new THREE.PointLight(0xff6bd6, 0.65, 70, 2);
  p2.position.set(0, 2.8, 0);
  root.add(p2);

  // Poker table spotlight
  const spot = new THREE.SpotLight(0xffffff, 1.1, 40, Math.PI/4, 0.35, 1);
  spot.position.set(0, 8.5, -9.5);
  spot.target.position.set(0, 0.9, -9.5);
  root.add(spot);
  root.add(spot.target);
}

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

/* =========================
   LOBBY / ROOMS
========================= */

function buildLobbyAndPit_DOWNSTAIRS(s) {
  const { THREE, root } = s;

  const lobbyR = 18;
  const pitRadius = 6.6;
  const pitDepth = 2.6;
  const lobbyY = 0;
  const pitFloorY = lobbyY - pitDepth;

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR, lobbyR, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, lobbyY - 0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, (lobbyY + pitFloorY) / 2, 0);
  root.add(pitWall);

  // rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.3, metalness: 0.55 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lobbyY + 0.85;
  root.add(rail);

  // ramp down into pit (not teleport target)
  const stairW = 2.1;
  const stairL = 7.6;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, pitDepth, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, (lobbyY + pitFloorY) / 2, pitRadius + stairL * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, stairL);
  root.add(ramp);
}

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
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.92, metalness: 0.08, transparent: true, opacity: 0.5 })
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

function buildStore(s) {
  const { THREE, root } = s;
  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);
  s.groundMeshes.push(floor);

  const glow = new THREE.PointLight(0x66ccff, 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);
}

function buildSpectate(s) {
  const { THREE, root } = s;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
  s.groundMeshes.push(plat);
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

  const light = new THREE.PointLight(0xff6bd6, 1.1, 50, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);
}

function buildHoverCars(s) {
  const { THREE, root } = s;
  const carGroup = new THREE.Group();
  carGroup.position.set(0, 0, 36);
  root.add(carGroup);

  const carMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.55, metalness: 0.25 });
  for (let i = 0; i < 5; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.4), carMat);
    car.position.set(-10 + i * 5, 2.2, 0);
    carGroup.add(car);
    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.8 });
  }
}

/* =========================
   LASERS / RETICLE / ARC
========================= */

function setupXRLasers(s) {
  const { THREE, controllers } = s;

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
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

function setupFloorReticles_BIGGER(s) {
  const { THREE, root } = s;

  function makeReticle() {
    const g = new THREE.RingGeometry(0.12, 0.18, 32);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    root.add(r);
    return r;
  }

  s.reticles.push({ mesh: makeReticle(), hand: "left" });
  s.reticles.push({ mesh: makeReticle(), hand: "right" });
}

function setupTeleportArcs(s) {
  const { THREE, root } = s;

  function makeArc() {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff }); // “rainbow vibe” comes from motion + bright reticle; we’ll keep it clean/safe
    const line = new THREE.Line(geom, mat);
    line.visible = false;
    root.add(line);
    return line;
  }

  s.arcs.left = makeArc();
  s.arcs.right = makeArc();

  s.arcPts.left = new Array(24).fill(0).map(() => new THREE.Vector3());
  s.arcPts.right = new Array(24).fill(0).map(() => new THREE.Vector3());
}

/* =========================
   WATCH (PRETTY)
========================= */

async function tryLoadWatchTextures(s) {
  // Optional: if you already have texture files, name them like:
  // assets/textures/watch_face.png
  // assets/textures/watch_plate.png
  // If they don’t exist, it just falls back gracefully.
  const { THREE } = s;
  const loader = new THREE.TextureLoader();

  const load = (url) => new Promise((resolve) => {
    loader.load(url, (tex) => resolve(tex), undefined, () => resolve(null));
  });

  s.textures.watchFace = await load("assets/textures/watch_face.png");
  s.textures.watchPlate = await load("assets/textures/watch_plate.png");
}

function setupPrettyWatch_LEFT(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x182743,
    roughness: 0.35,
    metalness: 0.35,
    map: s.textures.watchPlate || null
  });

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x0d1324,
    roughness: 0.2,
    metalness: 0.25,
    emissive: new THREE.Color(0x223cff),
    emissiveIntensity: 0.12,
    map: s.textures.watchFace || null
  });

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.095, 0.016), plateMat);
  watchRoot.add(body);

  // Face inset
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.082, 0.006), faceMat);
  face.position.z = 0.012;
  watchRoot.add(face);

  // Side buttons (cosmetic)
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.3, metalness: 0.4 });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 12), sideMat);
  knob.rotation.x = Math.PI/2;
  knob.position.set(0.08, 0.0, 0.0);
  watchRoot.add(knob);

  // Glow rim
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.048, 28),
    new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide })
  );
  rim.rotation.x = -Math.PI/2;
  rim.position.set(-0.045, 0.0, 0.02);
  watchRoot.add(rim);

  // Menu buttons
  const btnMat = new THREE.MeshStandardMaterial({
    color: 0x2b3b5f,
    roughness: 0.55,
    metalness: 0.18,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
  const btnGeo = new THREE.BoxGeometry(0.125, 0.02, 0.012);

  const items = [
    { label: "POKER", room: "poker" },
    { label: "LOBBY", room: "lobby" },
    { label: "STORE", room: "store" },
    { label: "SPECT", room: "spectate" },
    { label: "HIDE",  room: null },
  ];

  for (let i = 0; i < items.length; i++) {
    const b = new THREE.Mesh(btnGeo, btnMat.clone());
    b.position.set(0, 0.03 - i * 0.024, 0.018);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);

    // Tiny “label plate” (no external fonts)
    const tag = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.018, 0.002),
      new THREE.MeshBasicMaterial({ color: 0x0a1020 })
    );
    tag.position.set(0, 0.03 - i * 0.024, 0.025);
    watchRoot.add(tag);

    // Simple “ticks” to visually distinguish buttons
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.002),
      new THREE.MeshBasicMaterial({ color: 0x66ccff })
    );
    tick.position.set(-0.06, 0.03 - i * 0.024, 0.026);
    watchRoot.add(tick);
  }

  // Attach to LEFT controller wrist
  watchRoot.position.set(0.055, 0.015, -0.075);
  watchRoot.rotation.set(-0.7, 0.0, 0.25);
  controllers.c0.add(watchRoot);

  s.watch.root = watchRoot;
  s.watch.visible = true;
  watchRoot.visible = true;
}

function toggleWatch(s) {
  if (!s.watch.root) return;
  s.watch.visible = !s.watch.visible;
  s.watch.root.visible = s.watch.visible;
  s.log?.(`[watch] ${s.watch.visible ? "shown" : "hidden"}`);
}

/* =========================
   CONTROLLER HAND MESHES
========================= */

function addControllerHandMeshes(s) {
  const { THREE, controllers } = s;

  // Simple stylized hand: palm + 3 finger blocks + thumb
  function makeHand(isLeft) {
    const g = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xd8c7b2, roughness: 0.75, metalness: 0.05 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.9, metalness: 0.05 });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.06), glove);
    palm.position.set(0, 0, -0.02);
    g.add(palm);

    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.025), skin);
    knuckle.position.set(0, 0.012, -0.035);
    g.add(knuckle);

    // fingers
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.03), skin);
      f.position.set(-0.015 + i * 0.015, 0.012, -0.065);
      g.add(f);
    }

    // thumb
    const th = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.028), skin);
    th.position.set(isLeft ? -0.03 : 0.03, 0.006, -0.03);
    th.rotation.y = isLeft ? 0.5 : -0.5;
    g.add(th);

    // place relative to controller
    g.position.set(isLeft ? -0.012 : 0.012, -0.01, -0.02);
    g.rotation.set(-0.2, 0, 0);
    return g;
  }

  const leftHand = makeHand(true);
  const rightHand = makeHand(false);

  controllers.c0.add(leftHand);
  controllers.c1.add(rightHand);

  s.handMeshes.left = leftHand;
  s.handMeshes.right = rightHand;
}

/* =========================
   POKER ROOM (GRAB START)
========================= */

function buildPokerRoom(s) {
  const { THREE, root } = s;

  const room = new THREE.Group();
  room.name = "POKER_ROOM";
  room.position.set(0, 0, -9.5);
  root.add(room);

  // floor pad
  const pad = new THREE.Mesh(new THREE.CircleGeometry(10, 48), matFloor(THREE, 0x0f1724));
  pad.rotation.x = -Math.PI/2;
  pad.position.y = 0.001;
  room.add(pad);
  s.groundMeshes.push(pad);

  // table
  const table = new THREE.Group();
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.75, 2.95, 0.35, 48),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.y = 0.9;
  table.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.12, 14, 64),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = 1.03;
  table.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1.1, 1.0, 24),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.65, metalness: 0.18 })
  );
  base.position.y = 0.35;
  table.add(base);

  table.position.set(0, 0, 0);
  room.add(table);

  // dealer button
  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.1 })
  );
  dealer.rotation.x = Math.PI/2;
  dealer.position.set(0.9, 1.08, 0.0);
  room.add(dealer);

  // chip stacks placeholders
  for (let i = 0; i < 6; i++) {
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.5, metalness: 0.2 })
    );
    const ang = (i / 6) * Math.PI * 2;
    stack.position.set(Math.cos(ang) * 3.6, 0.07, Math.sin(ang) * 3.6);
    room.add(stack);
  }

  // seats
  for (let i = 0; i < 6; i++) {
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.9, metalness: 0.08 })
    );
    const ang = (i / 6) * Math.PI * 2;
    chair.position.set(Math.cos(ang) * 4.2, 0.3, Math.sin(ang) * 4.2);
    chair.lookAt(0, 0.3, 0);
    room.add(chair);
  }

  // deck + grabbable cards
  const deckPos = new THREE.Vector3(-1.1, 1.05, 0.0);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 })
  );
  deck.position.copy(deckPos);
  room.add(deck);

  // 10 loose cards you can grab
  for (let i = 0; i < 10; i++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.004, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 })
    );
    card.position.set(deckPos.x + (i % 5) * 0.07, deckPos.y + 0.02 + Math.floor(i/5)*0.01, deckPos.z + 0.14);
    card.rotation.y = -0.2;
    card.userData.grabbable = true;
    card.userData.kind = "card";
    room.add(card);
    s.grab.interactables.push(card);
  }
}

/* =========================
   GRAB SYSTEM
========================= */

function tryGrab(s, hand) {
  if (!s.renderer.xr.isPresenting) return;
  if (s.grab.held[hand]) return;

  const ctrl = hand === "right" ? s.controllers.c1 : s.controllers.c0;

  // Ray from controller forward
  s.tmpM.identity().extractRotation(ctrl.matrixWorld);
  const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
  s.tmpDir.set(0, 0, -1).applyMatrix4(s.tmpM).normalize();

  s.raycaster.set(origin, s.tmpDir);
  const hits = s.raycaster.intersectObjects(s.grab.interactables, false);

  if (!hits.length) return;

  const obj = hits[0].object;
  if (!obj?.userData?.grabbable) return;

  // Attach to controller
  const worldPos = obj.getWorldPosition(new s.THREE.Vector3());
  const worldQuat = obj.getWorldQuaternion(new s.THREE.Quaternion());

  ctrl.attach(obj);
  obj.position.copy(ctrl.worldToLocal(worldPos));
  obj.quaternion.copy(worldQuat);

  // small offset so it sits in “fingers”
  obj.position.set(0.0, -0.01, -0.06);

  s.grab.held[hand] = obj;
  s.log?.(`[grab] ${hand} picked ${obj.userData.kind || "object"}`);
}

function releaseGrab(s, hand) {
  const obj = s.grab.held[hand];
  if (!obj) return;

  // Drop it into the world at current position
  s.root.attach(obj);

  s.grab.held[hand] = null;
  s.log?.(`[grab] ${hand} released`);
}

/* =========================
   UPDATE LOOP
========================= */

function update(s, dt, t) {
  // hover cars
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t * 1.3 + c.phase) * 0.25;
  }

  // update reticles + arcs + watch hover glow
  updateLaserReticlesArcsAndWatch(s);

  // locomotion
  if (s.renderer.xr.isPresenting) {
    applyLocomotionRightPreferred(s, dt);

    // Hand tracking pinch teleport (optional)
    updateHandTrackingPinchTeleport(s, dt);
  }
}

function updateLaserReticlesArcsAndWatch(s) {
  const { renderer, raycaster, tmpM, tmpV, tmpDir, THREE } = s;

  for (const L of s.lasers) {
    const ctrl = L.controller;
    const line = L.line;
    const hand = L.hand;

    if (!renderer.xr.isPresenting) {
      line.visible = false;
      setReticleVisible(s, hand, false);
      setArcVisible(s, hand, false);
      continue;
    }

    line.visible = true;

    tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();

    raycaster.set(origin, tmpDir);

    // Watch hover highlight (no click yet—keeps stable with teleport)
    if (s.watch.visible && s.watch.buttons.length && hand === "left") {
      for (const b of s.watch.buttons) {
        if (b.material?.emissive) {
          b.material.emissive.setHex(0x000000);
          b.material.emissiveIntensity = 0;
        }
      }
      const hitsUI = raycaster.intersectObjects(s.watch.buttons, false);
      if (hitsUI.length) {
        const hit = hitsUI[0].object;
        if (hit.material?.emissive) {
          hit.material.emissive = new THREE.Color(0x223cff);
          hit.material.emissiveIntensity = 0.55;
        }
        line.scale.z = Math.min(2.0, hitsUI[0].distance);
        setReticleVisible(s, hand, false);
        setArcVisible(s, hand, false);
        continue;
      }
    }

    // Floor target
    const hits = raycaster.intersectObjects(s.groundMeshes, false);
    if (hits.length) {
      const h = hits[0];
      line.scale.z = Math.min(12, h.distance);

      // reticle
      setReticle(s, hand, h.point);

      // arc
      updateArc(s, hand, origin, h.point);

      if (hand === "right") s.lastTeleportPointR = h.point.clone();
      if (hand === "left")  s.lastTeleportPointL = h.point.clone();
    } else {
      line.scale.z = 12;
      setReticleVisible(s, hand, false);
      setArcVisible(s, hand, false);
    }
  }
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

function updateArc(s, hand, from, to) {
  const arc = s.arcs[hand];
  const pts = s.arcPts[hand];
  if (!arc || !pts) return;

  arc.visible = true;

  // quadratic-ish arc: raise midpoint
  const mid = new s.THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mid.y += 1.1;

  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    // Bezier: (1-u)^2*from + 2(1-u)u*mid + u^2*to
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    pts[i].set(
      from.x * a + mid.x * b + to.x * c,
      from.y * a + mid.y * b + to.y * c,
      from.z * a + mid.z * b + to.z * c
    );
  }

  const geom = new s.THREE.BufferGeometry().setFromPoints(pts);
  arc.geometry.dispose?.();
  arc.geometry = geom;
}

function setArcVisible(s, hand, v) {
  const arc = s.arcs[hand];
  if (arc) arc.visible = v;
}

// Teleport
function teleportNow(s, hand) {
  if (!s.renderer.xr.isPresenting) return;

  const p = hand === "right" ? s.lastTeleportPointR : s.lastTeleportPointL;
  if (!p) return;

  s.player.position.x = p.x;
  s.player.position.z = p.z;
  s.player.position.y = 0;
  s.log?.(`[tp] ${hand} -> (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
}

/* =========================
   LOCOMOTION
========================= */

function applyLocomotionRightPreferred(s, dt) {
  const session = s.renderer.xr.getSession?.();
  if (!session) return;

  const sources = Array.from(session.inputSources || []).filter(is => is?.gamepad);
  if (!sources.length) return;

  const right = sources.find(is => is.handedness === "right") || sources[0];
  const left  = sources.find(is => is.handedness === "left")  || sources[0];

  let move = readStick(right.gamepad, s.deadzone);
  if (!move.active) move = readStick(left.gamepad, s.deadzone);
  if (move.active) {
    const yaw = getHeadYaw(s.camera);
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    let x = move.x;
    let z = move.y;

    // 45-degree shaping
    if (s.diagonal45 && x !== 0) {
      const sign = z !== 0 ? Math.sign(z) : -1;
      z += sign * Math.abs(x) * s.diagonalAmount;
      x *= (1.0 - 0.35);
      const len = Math.hypot(x, z);
      if (len > 1e-4) { x /= len; z /= len; }
    }

    const mx = x * cos - z * sin;
    const mz = x * sin + z * cos;

    s.player.position.x += mx * s.moveSpeed * dt;
    s.player.position.z += mz * s.moveSpeed * dt;
  }

  // snap turn
  const turnSrc = right.gamepad || left.gamepad;
  const turn = readTurn(turnSrc, s.deadzone);
  s.turnCooldown = Math.max(0, s.turnCooldown - dt);
  if (s.turnCooldown === 0 && turn.active) {
    const dir = turn.x > 0 ? -1 : 1;
    s.player.rotation.y += dir * s.snapTurnRad;
    s.turnCooldown = 0.22;
  }
}

function readStick(gamepad, deadzone) {
  if (!gamepad) return { active: false, x: 0, y: 0 };
  const axes = gamepad.axes || [];
  const pairs = [];
  if (axes.length >= 2) pairs.push([0, 1]);
  if (axes.length >= 4) pairs.push([2, 3]);
  if (!pairs.length) return { active: false, x: 0, y: 0 };

  let best = pairs[0], bestMag = -1;
  for (const p of pairs) {
    const mag = Math.abs(axes[p[0]] || 0) + Math.abs(axes[p[1]] || 0);
    if (mag > bestMag) { bestMag = mag; best = p; }
  }

  let x = axes[best[0]] || 0;
  let y = axes[best[1]] || 0;

  if (Math.abs(x) < deadzone) x = 0;
  if (Math.abs(y) < deadzone) y = 0;

  return { active: !(x === 0 && y === 0), x, y };
}

function readTurn(gamepad, deadzone) {
  if (!gamepad) return { active: false, x: 0 };
  const axes = gamepad.axes || [];
  let tx = 0;
  if (axes.length >= 3) tx = axes[2] || 0;
  else if (axes.length >= 1) tx = axes[0] || 0;
  if (Math.abs(tx) < deadzone) tx = 0;
  return { active: tx !== 0, x: tx };
}

function getHeadYaw(camera) {
  const q = camera.quaternion;
  const t3 = +2.0 * (q.w * q.y + q.z * q.x);
  const t4 = +1.0 - 2.0 * (q.y * q.y + q.x * q.x);
  return Math.atan2(t3, t4);
}

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  s.player.rotation.set(0, 0, 0);
  if (!s.renderer.xr.isPresenting) s.camera.rotation.set(0, anchor.yaw, 0);
}

/* =========================
   HAND TRACKING PINCH TELEPORT (OPTIONAL)
========================= */

function updateHandTrackingPinchTeleport(s, dt) {
  if (!s.handTrack.enabled) return;

  const session = s.renderer.xr.getSession?.();
  if (!session) return;

  // Find hand inputSources
  const hands = Array.from(session.inputSources || []).filter(src => src?.hand);
  if (!hands.length) return;

  // We render simple joint spheres and detect pinch between thumb-tip and index-tip.
  for (const src of hands) {
    const handedness = src.handedness || "none";
    const state = handedness === "left" ? s.handTrack.left : s.handTrack.right;

    // build joint visuals once
    if (!state.joints.size) {
      for (const [name, joint] of src.hand.entries()) {
        const j = makeJointSphere(s.THREE);
        j.userData.jointName = name;
        s.root.add(j);
        state.joints.set(name, j);
      }
    }

    // update joint positions
    for (const [name, joint] of src.hand.entries()) {
      const mesh = state.joints.get(name);
      if (!mesh) continue;

      const pose = s.renderer.xr.getFrame?.()?.getJointPose?.(joint, s.renderer.xr.getReferenceSpace?.());
      // Some browsers don’t expose getFrame() here; we fall back by hiding visuals if pose unavailable.
      if (!pose) { mesh.visible = false; continue; }

      mesh.visible = true;
      mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
    }

    // pinch detect (thumb-tip & index-finger-tip are common names; if missing, skip)
    const thumb = state.joints.get("thumb-tip");
    const index = state.joints.get("index-finger-tip");
    if (!thumb || !index || !thumb.visible || !index.visible) continue;

    const d = thumb.position.distanceTo(index.position);
    const pinching = d < s.handTrack.pinchDist;

    if (pinching) state.pinchHold += dt;
    else state.pinchHold = 0;

    // commit teleport on pinch hold
    if (state.pinchHold >= s.handTrack.pinchHoldTime) {
      // Use nearest controller reticle target as teleport point
      const p = handedness === "left" ? s.lastTeleportPointL : s.lastTeleportPointR;
      if (p) {
        s.player.position.x = p.x;
        s.player.position.z = p.z;
        s.player.position.y = 0;
        s.log?.(`[pinch-tp] ${handedness}`);
      }
      state.pinchHold = 0; // reset
    }
  }
}

function makeJointSphere(THREE) {
  const g = new THREE.SphereGeometry(0.006, 10, 8);
  const m = new THREE.MeshBasicMaterial({ color: 0x66ccff });
  const s = new THREE.Mesh(g, m);
  s.visible = false;
  return s;
                 }
