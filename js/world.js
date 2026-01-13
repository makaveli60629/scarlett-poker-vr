// /js/world.js — ScarlettVR MASTER WORLD v4.1 (Pit Table + Upgrades + PokerJS + Humanoids)
// ✅ Center lobby + SUNKEN PIT poker table (your centerpiece)
// ✅ Guard-rail fully enclosed with a single entrance
// ✅ Upstairs spectator balcony ring
// ✅ Watch UI (smaller) on left controller
// ✅ Teleport arcs fixed (no Line.computeLineDistances crash)
// ✅ PokerJS smooth dealing + chips (module)
// ✅ Humanoid bots (low-poly elegant placeholders)
// ✅ Uses core/controls.js for XR locomotion (does not interfere with Android controls)

import Controls from "../core/controls.js";
import { applyLighting } from "./lighting.js";
import { PokerJS } from "./poker.js";
import { Humanoids } from "./humanoids.js";
import { ScorpionSystem } from "./scorpion.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD, FLAGS }) {
    const s = {
      flags: { safeMode: false, poker: true, bots: true, fx: true, ...(FLAGS||{}) },
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),

      // movement tuning
      diagonal45: true,

      // ray + temp
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),

      // teleport surfaces
      groundMeshes: [],

      // visuals
      lasers: [],
      reticles: [],
      arcs: { left: null, right: null },
      arcPts: { left: [], right: [] },
      dashLines: [],

      lastTeleportPointL: null,
      lastTeleportPointR: null,

      // watch
      watch: { root: null, visible: true, buttons: [] },

      // anchors
      anchors: {},
      room: "lobby",

      // modules
      poker: null,
      bots: null,

      // ambience
      hoverCars: [],
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    // build environment
    addSkyAndFog(s);
    applyLighting({ THREE, scene, root: s.root });

    buildLobbyShell(s);
    buildLobbyFloor(s);

    buildPitAndTable(s);         // ✅ your pit + centered table
    buildDownStairs(s);          // ✅ ramp down into pit

    buildRoomsAndHallways(s);    // store/scorpion
    buildStore(s);
    buildScorpion(s);
    buildSpectateBalcony(s);     // ✅ upstairs spectator ring

    buildHoverCars(s);

    // XR visuals
    setupXRLasers(s);
    setupFloorReticles(s);
    setupTeleportArcs(s);

    // small watch (left)
    setupWatch(s);

    // PokerJS module bound to pit table (toggle-safe)
    s.poker = null;
    if (!s.flags.safeMode && s.flags.poker) {
      s.poker = PokerJS.init({
        THREE,
        scene,
        root: s.root,
        log,
        camera,
        deckPos: new THREE.Vector3(-1.10, s._tableY + 0.16, 0.10),
        potPos:  new THREE.Vector3(0.00,  s._tableY + 0.13, 0.00),
        textures: {
          cardBack: new THREE.TextureLoader().load("./assets/textures/card_back.png"),
          tableTop: new THREE.TextureLoader().load("./assets/textures/table_top.png"),
          chips: new THREE.TextureLoader().load("./assets/textures/chips.png"),
        }
      });
    }
// chips on pit table for interaction demo
    s._chipStack = s.poker.createChipStack({ pos: new THREE.Vector3(1.15, s._tableY + 0.13, 0.15), count: 14, value: 25 });

    // Bots
    // Bots (toggle-safe)
    s.bots = null;
    if (!s.flags.safeMode && s.flags.bots) {
      s.bots = Humanoids.init({ THREE, root: s.root });
      // 6 bots around the pit table
      s.bots.spawnBots({
        count: 6,
        center: new THREE.Vector3(0, 0, 0),
        radius: 2.35,
        y: 0,
        lookAt: new THREE.Vector3(0, 1.1, 0)
      });
    }
    // anchors (lobby ring is at z=13.5 so you face inward)
    s.anchors.lobby    = { pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI };
    s.anchors.store    = { pos: new THREE.Vector3(-26, 0, 0),  yaw: Math.PI/2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0),   yaw: -Math.PI/2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 4.0, -6.0), yaw: 0 };

    s.scorpion = ScorpionSystem.init({ THREE, root: s.root, log, seatAnchor: s.anchors.scorpion });

    setRigToAnchor(s, s.anchors.lobby);

    // input events (teleport + watch)
    controllers.c1.addEventListener("selectstart", () => teleportNow(s, "right"));
    controllers.c0.addEventListener("selectstart", () => {
      if (tryClickWatch(s)) return;
      teleportNow(s, "left");
    });

    // Optional: right squeeze -> quick bet demo (moves 3 chips to pot)
    controllers.c1.addEventListener("squeezestart", () => {
      try { s.poker.betToPot({ stack: s._chipStack, amount: 3 }); } catch {}
    });

    log?.(`[world] MASTER WORLD v4.1 ✅ build=${BUILD}`);
    return {
      setRoom: (room) => {
        const prev = s.room;
        s.room = room;
        if (prev === "scorpion" && room !== "scorpion") s.scorpion?.onExit?.({ player, camera });
        setRigToAnchor(s, s.anchors[room] || s.anchors.lobby);
        if (room === "scorpion") s.scorpion?.onEnter?.({ player, camera });
        log?.(`[rm] room=${room}`);
      },
      setFlags: (flags) => {
        s.flags = { ...s.flags, ...(flags || {}) };
        log?.(`[flags] safeMode=${s.flags.safeMode} poker=${s.flags.poker} bots=${s.flags.bots} fx=${s.flags.fx}`);
      },
      update: (dt, t) => update(s, dt, t),
    };
  }
};

// ----------------------
// ENV
// ----------------------

function addSkyAndFog(s) {
  const { THREE, scene } = s;
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 16, 110);
}

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

// ----------------------
// LOBBY
// ----------------------

function buildLobbyShell(s) {
  const { THREE, root } = s;

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(24, 24, 10, 72, 1, true),
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
    emissiveIntensity: 0.45
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(17.4, 0.12, 12, 120), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 8.9, 0);
  root.add(ring);
}

function buildLobbyFloor(s) {
  const { THREE, root } = s;

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 19, 0.35, 72),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  const carpet = new THREE.Mesh(
    new THREE.CircleGeometry(15.3, 72),
    new THREE.MeshStandardMaterial({
      color: 0x0f1a2d, roughness: 1.0, metalness: 0.0,
      emissive: new THREE.Color(0x0b1220),
      emissiveIntensity: 0.07
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.002;
  root.add(carpet);
}

// ----------------------
// PIT + TABLE (CENTERPIECE)
// ----------------------

function buildPitAndTable(s) {
  const { THREE, root } = s;

  const pitRadius = 7.0;
  const pitDepth = 3.1;
  const pitFloorY = -pitDepth;

  s._pit = { pitRadius, pitDepth, pitFloorY };

  // pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 72),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  // pit wall
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  // centered poker table in pit (sunken)
  const tableY = pitFloorY + 1.10;
  s._tableY = tableY;

  const tableGroup = new THREE.Group();
  tableGroup.name = "PIT_TABLE";
  tableGroup.position.set(0, 0, 0);
  root.add(tableGroup);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.1, 0.35, 72),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, tableY, 0);
  tableGroup.add(felt);

  // top texture panel (table_top.png)
  const texPlane = new THREE.Mesh(
    new THREE.CircleGeometry(3.0, 96),
    new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load("./assets/textures/table_top.png"),
      roughness: 0.9,
      metalness: 0.05
    })
  );
  texPlane.rotation.x = -Math.PI / 2;
  texPlane.position.set(0, tableY + 0.18, 0);
  tableGroup.add(texPlane);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.14, 16, 96),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, tableY + 0.20, 0);
  tableGroup.add(rail);

  // pit guard-rail ring (at main floor height)
  const railY = 0.95;
  const railR = pitRadius + 0.65;
  const railMat = new THREE.MeshStandardMaterial({ color: 0x0f1724, roughness: 0.5, metalness: 0.2 });

  // build segmented rail with an opening at +Z (south)
  const segs = 20;
  const openAng = Math.PI / 8; // opening width
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) / 2;

    // skip opening region around +Z
    const inOpen = Math.abs(normalizeAngle(am - 0)) < openAng; // +Z is angle 0 in our layout (since sin/cos usage)
    if (inOpen) continue;

    const len = 2 * railR * Math.sin((a1 - a0) / 2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, len), railMat);
    bar.position.set(Math.sin(am) * railR, railY, Math.cos(am) * railR);
    bar.rotation.y = am;
    root.add(bar);
  }

  // guard post at entrance
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x112244, emissiveIntensity: 0.35, roughness: 0.35 }));
  guard.position.set(0.75, 0.60, railR - 0.2);
  root.add(guard);

  // walk ring around pit edge
  const ringWalk = new THREE.Mesh(
    new THREE.RingGeometry(pitRadius + 0.15, pitRadius + 3.0, 96),
    matFloor(THREE, 0x101a2c)
  );
  ringWalk.rotation.x = -Math.PI/2;
  ringWalk.position.y = 0.001;
  root.add(ringWalk);
  s.groundMeshes.push(ringWalk);
}

function buildDownStairs(s) {
  const { THREE, root } = s;
  const { pitRadius, pitDepth } = s._pit;

  // Ramp from main floor down into pit at entrance (+Z)
  const rampW = 2.2;
  const rampL = 9.2;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(rampW, pitDepth, rampL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, -pitDepth / 2, pitRadius + (rampL * 0.34));
  ramp.rotation.x = -Math.atan2(pitDepth, rampL);
  root.add(ramp);
  s.groundMeshes.push(ramp);
}

// ----------------------
// ROOMS (FOUR-WAY)
// ----------------------

function buildRoomsAndHallways(s) {
  const { THREE, root } = s;

  const roomDist = 28, roomSize = 10, wallH = 4.8;
  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.3, 0.35, roomSize * 2.3),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);
    s.groundMeshes.push(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.3, wallH, roomSize * 2.3),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220, roughness: 0.92, metalness: 0.08,
        transparent: true, opacity: 0.40
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    // hallway to lobby
    const hallLen = 12.5;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.35, hallLen), matFloor(THREE, 0x121c2c));
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
  store.name = "STORE_ROOM";
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);
  s.groundMeshes.push(floor);

  const glow = new THREE.PointLight(0x66ccff, 1.05, 55, 2);
  glow.position.set(0, 3.6, 0);
  store.add(glow);

  const sign = makeLabelPlate(THREE, "STORE", 0x0a1020, 0x66ccff, 768, 192);
  sign.position.set(0, 3.2, -7.5);
  store.add(sign);

  // mannequins (elegant low-poly)
  const mm = new THREE.MeshStandardMaterial({ color: 0xe7e7e7, roughness: 0.6, metalness: 0.1 });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.65, 6, 10), mm);
    torso.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), mm);
    head.position.y = 1.75;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.10, 18), mm);
    base.position.y = 0.05;
    m.add(torso, head, base);
    m.position.set(-6.0 + i*2.4, 0, -3.8);
    store.add(m);
  }
}

function buildScorpion(s) {
  const { THREE, root } = s;
  const sc = new THREE.Group();
  sc.name = "SCORPION_ROOM";
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);
  s.groundMeshes.push(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.15, 60, 2);
  light.position.set(0, 3.6, 0);
  sc.add(light);

  const sign = makeLabelPlate(THREE, "SCORPION ROOM", 0x0a1020, 0xff6bd6, 1024, 256);
  sign.position.set(0, 3.2, -7.5);
  sc.add(sign);

  // quick table placeholders (two)
  const tMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3f, roughness: 0.7, metalness: 0.15 });
  for (let i = 0; i < 2; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.35, 48), tMat);
    t.position.set(-3.0 + i*6.0, 0.9, 0.8);
    sc.add(t);
  }
}

function buildSpectateBalcony(s) {
  const { THREE, root } = s;

  // Balcony ring above lobby, angled toward pit
  const y = 4.0;
  const inner = 10.8;
  const outer = 13.8;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 96),
    matFloor(THREE, 0x0f1a2d)
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.y = y;
  root.add(ring);
  s.groundMeshes.push(ring);

  // simple barrier
  const barMat = new THREE.MeshStandardMaterial({ color: 0x101a2c, roughness: 0.55, metalness: 0.22 });
  const barrier = new THREE.Mesh(new THREE.TorusGeometry((inner+outer)/2, 0.12, 12, 96), barMat);
  barrier.rotation.x = Math.PI/2;
  barrier.position.y = y + 1.0;
  root.add(barrier);

  const sign = makeLabelPlate(THREE, "SPECTATOR LOUNGE", 0x0a1020, 0xc8d3ff, 1024, 256);
  sign.position.set(0, y + 1.8, -10.5);
  root.add(sign);
}

// ----------------------
// AMBIENCE
// ----------------------

function buildHoverCars(s) {
  const { THREE, root } = s;

  const carGroup = new THREE.Group();
  carGroup.position.set(0, 0, 38);
  root.add(carGroup);

  const carMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.55, metalness: 0.25 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x66ccff, roughness: 0.3, metalness: 0.4,
    emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.35
  });

  for (let i = 0; i < 6; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.4), carMat);
    body.position.y = 0.4;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), glowMat);
    canopy.position.set(0, 0.85, -0.3);
    car.add(body, canopy);

    car.position.set(-12 + i * 4.8, 2.2, 0);
    car.rotation.y = (i - 2.5) * 0.16;
    carGroup.add(car);

    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.8 });
  }
}

// ----------------------
// XR VISUALS
// ----------------------

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

function setupFloorReticles(s) {
  const { THREE, root } = s;

  function makeReticle() {
    const g = new THREE.RingGeometry(0.18, 0.26, 40);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    root.add(r);
    return r;
  }

  s.reticles.push({ hand: "left", mesh: makeReticle() });
  s.reticles.push({ hand: "right", mesh: makeReticle() });
}

function setupTeleportArcs(s) {
  const { THREE, root } = s;

  const makeArc = () => {
    // init with 2 points so computeLineDistances never crashes
    const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-0.01)];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.10 });
    const line = new THREE.Line(geom, mat);
    line.visible = false;
    line.computeLineDistances();
    root.add(line);
    s.dashLines.push(line);
    return line;
  };

  s.arcs.left = makeArc();
  s.arcs.right = makeArc();

  s.arcPts.left = new Array(28).fill(0).map(() => new THREE.Vector3());
  s.arcPts.right = new Array(28).fill(0).map(() => new THREE.Vector3());
}

// ----------------------
// WATCH UI (SMALLER)
// ----------------------

function setupWatch(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x182743, roughness: 0.35, metalness: 0.35,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.12
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.070, 0.013), plateMat);
  watchRoot.add(body);

  const items = [
    { label: "LOBBY",    room: "lobby" },
    { label: "STORE",    room: "store" },
    { label: "SCORP",    room: "scorpion" },
    { label: "SPECT",    room: "spectate" },
    { label: "DEAL",     action: (st)=>demoDeal(st) },
    { label: "BET",      action: (st)=>{ try { st.poker.betToPot({ stack: st._chipStack, amount: 2 }); } catch {} } },
  ];

  const btnGeo = new THREE.BoxGeometry(0.092, 0.010, 0.010);
  for (let i = 0; i < items.length; i++) {
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x2b3b5f, roughness: 0.55, metalness: 0.18,
      emissive: new THREE.Color(0x000000), emissiveIntensity: 0
    });
    const b = new THREE.Mesh(btnGeo, btnMat);
    b.position.set(0, 0.025 - i * 0.012, 0.014);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);

    const label = makeLabelPlate(THREE, items[i].label, 0x0a1020, 0x66ccff, 512, 128);
    label.scale.set(0.18, 0.045, 1);
    label.position.set(0.0, 0.025 - i * 0.012, 0.021);
    watchRoot.add(label);
  }

  // attach to LEFT controller, subtle
  watchRoot.position.set(0.048, 0.013, -0.062);
  watchRoot.rotation.set(-0.75, 0.0, 0.28);
  controllers.c0.add(watchRoot);

  s.watch.root = watchRoot;
  s.watch.visible = true;
  watchRoot.visible = true;
}

function demoDeal(s) {
  // deal 5 community cards in an arc line
  const y = s._tableY + 0.14;
  const zs = [-0.50, -0.25, 0.0, 0.25, 0.50];
  for (let i = 0; i < zs.length; i++) {
    s.poker.dealCardTo({
      toPos: new s.THREE.Vector3(-0.55 + i*0.28, y, -0.15),
      faceUp: true,
      duration: 0.55 + i*0.05,
      arcHeight: 0.32
    });
  }
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
    btn.material.emissiveIntensity = 0.7;
    setTimeout(() => {
      try { btn.material.emissive.setHex(0x000000); btn.material.emissiveIntensity = 0; } catch {}
    }, 120);
  }

  return true;
}

// ----------------------
// UPDATE
// ----------------------

function update(s, dt, t) {
  // hover cars
  if (!s.flags.safeMode && s.flags.fx) {
    for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t*1.3 + c.phase) * 0.25;
      c.obj.rotation.y += dt * 0.10;
    }
  }

  // dashed arcs animation
  if (!s.flags.safeMode && s.flags.fx) {
    for (const l of s.dashLines) {
      if (l.material) l.material.dashOffset = -(t * 0.9);
    }
  }

  updateRays(s);

  // poker animations
  if (!s.flags.safeMode && s.flags.poker) s.poker?.update?.(dt, t);

  // scorpion room behaviors
  s.scorpion?.update?.({ player: s.player, camera: s.camera }, dt, t);

  // bots idle
  if (!s.flags.safeMode && s.flags.bots) s.bots?.update?.(dt, t);

  // XR locomotion
  Controls.applyLocomotion(s, dt);
}

function updateRays(s) {
  const { renderer, raycaster, tmpM, tmpV, tmpDir } = s;

  for (const L of s.lasers) {
    const ctrl = L.controller;
    const line = L.line;
    const hand = L.hand;

    const showLaser = renderer.xr.isPresenting;
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

    // Watch hover highlight (left)
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

    // Ground hit
    const hits = raycaster.intersectObjects(s.groundMeshes, false);
    if (hits.length) {
      const h = hits[0];
      if (showLaser) line.scale.z = Math.min(12, h.distance);

      setReticle(s, hand, h.point);
      updateArc(s, hand, origin, h.point);

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
  s.player.position.set(p.x, 0, p.z);
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

  const mid = new s.THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mid.y += 1.20;

  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    pts[i].set(
      from.x*a + mid.x*b + to.x*c,
      from.y*a + mid.y*b + to.y*c,
      from.z*a + mid.z*b + to.z*c
    );
  }

  const geom = new s.THREE.BufferGeometry().setFromPoints(pts);
  arc.geometry?.dispose?.();
  arc.geometry = geom;

  // computeLineDistances safely
  try { arc.computeLineDistances(); } catch {}
}

function setArcVisible(s, hand, v) {
  const arc = s.arcs[hand];
  if (arc) arc.visible = v;
}

// ----------------------
// UTIL
// ----------------------

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
  ctx.font = `900 ${Math.floor(h*0.52)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w/2, h/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), mat);
  return mesh;
}

function hex(n) {
  const c = Number(n >>> 0).toString(16).padStart(6, "0");
  return `#${c}`;
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI*2;
  while (a < -Math.PI) a += Math.PI*2;
  return a;
}
