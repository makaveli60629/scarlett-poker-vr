// /js/world.js — ScarlettVR FULL THROTTLE v6 (Beautified + Poker + Watch + Hands)
// Requires: /js/controls.js
import { Controls } from "./controls.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),

      // locomotion
      moveSpeed: 2.9,
      deadzone: 0.14,
      snapTurnRad: THREE.MathUtils.degToRad(30),
      turnCooldown: 0,
      diagonal45: true,
      diagonalAmount: 0.85,

      anchors: {},
      room: "lobby",

      // interaction / rays
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),
      tmpQ: new THREE.Quaternion(),
      tmpP: new THREE.Vector3(),

      groundMeshes: [],

      // controller visuals
      lasers: [],                // { controller, line, hand }
      reticles: [],              // { hand, mesh }
      arcs: { left: null, right: null },
      arcPts: { left: [], right: [] },
      lastTeleportPointL: null,
      lastTeleportPointR: null,

      // watch
      watch: {
        root: null,
        visible: true,
        buttons: [],             // meshes
        hover: null,
        labels: [],
      },

      // grab
      grab: {
        interactables: [],
        held: { left: null, right: null }
      },

      // ambience
      hoverCars: [],
      holoPanels: [],
      neonMats: [],
      dashLines: [],

      // settings
      showArcs: true,
      showLasers: true,
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    // =======================
    // BEAUTIFICATION PASS
    // =======================
    addSkyAndFog(s);
    addLightsCinematic(s);
    buildLobbyShell(s);
    buildLobbyFloorCarpet(s);
    buildPitAndDownstairs(s);
    buildRoomsAndHallways(s);
    buildPortals(s);
    buildStore(s);
    buildScorpion(s);
    buildSpectate(s);
    buildHoverCars(s);
    buildHoloJumbotrons(s);

    // =======================
    // XR VISUALS + UI
    // =======================
    setupXRLasers(s);
    setupFloorReticles(s);
    setupTeleportArcs(s);

    setupControllerHandMeshes(s);
    setupPrettyWatch(s);

    // =======================
    // POKER ROOM (playable foundation)
    // =======================
    buildPokerRoom(s);

    // =======================
    // Anchors
    // =======================
    s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI };
    s.anchors.poker = { pos: new THREE.Vector3(0, 0, -9.5), yaw: 0 };
    s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 };

    setRigToAnchor(s, s.anchors.lobby);

    // =======================
    // INPUT EVENTS
    // =======================

    // Teleport: right trigger/select always teleports
    controllers.c1.addEventListener("selectstart", () => teleportNow(s, "right"));

    // Left trigger/select: if pointing at watch button => click; else teleport
    controllers.c0.addEventListener("selectstart", () => {
      if (tryClickWatch(s)) return;
      teleportNow(s, "left");
    });

    // Watch toggle: left grip
    controllers.c0.addEventListener("squeezestart", () => toggleWatch(s));

    // Grab cards: squeeze hold on either hand
    controllers.c0.addEventListener("squeezestart", () => tryGrab(s, "left"));
    controllers.c0.addEventListener("squeezeend",   () => releaseGrab(s, "left"));
    controllers.c1.addEventListener("squeezestart", () => tryGrab(s, "right"));
    controllers.c1.addEventListener("squeezeend",   () => releaseGrab(s, "right"));

    log?.(`[world] FULL THROTTLE v6 ✅ build=${BUILD}`);
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
  scene.fog = new THREE.Fog(0x05070d, 12, 85);
}

function addLightsCinematic(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.05);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(35, 70, 35);
  scene.add(sun);

  const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.15, 95, 2);
  lobbyGlow.position.set(0, 9.0, 0);
  root.add(lobbyGlow);

  const magenta = new THREE.PointLight(0xff6bd6, 0.7, 80, 2);
  magenta.position.set(0, 2.6, 0);
  root.add(magenta);

  const pokerSpot = new THREE.SpotLight(0xffffff, 1.15, 40, Math.PI / 4, 0.35, 1);
  pokerSpot.position.set(0, 8.5, -9.5);
  pokerSpot.target.position.set(0, 1.0, -9.5);
  root.add(pokerSpot);
  root.add(pokerSpot.target);
}

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

// =======================
// LOBBY BEAUTY
// =======================

function buildLobbyShell(s) {
  const { THREE, root } = s;

  // translucent cylinder shell
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);

  // ceiling glow ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(16.5, 0.12, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      roughness: 0.3, metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.45
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 8.8, 0);
  root.add(ring);

  // pillars
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.8, metalness: 0.15 });
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 8.6, 16), pillarMat);
    p.position.set(Math.cos(ang) * 16.8, 4.2, Math.sin(ang) * 16.8);
    root.add(p);
  }
}

function buildLobbyFloorCarpet(s) {
  const { THREE, root } = s;

  // base lobby floor
  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  // carpet disc (visual only)
  const carpet = new THREE.Mesh(
    new THREE.CircleGeometry(14.8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0f1a2d, roughness: 1.0, metalness: 0.0,
      emissive: new THREE.Color(0x0b1220),
      emissiveIntensity: 0.06
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.002;
  root.add(carpet);

  // floor decals / compass wedges
  const decalMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const wedge = new THREE.Mesh(new THREE.RingGeometry(10.2, 14.4, 32, 1, i*Math.PI/2, Math.PI/4), decalMat);
    wedge.rotation.x = -Math.PI/2;
    wedge.position.y = 0.004;
    root.add(wedge);
  }
}

function buildPitAndDownstairs(s) {
  const { THREE, root } = s;

  const pitRadius = 6.6;
  const pitDepth = 2.6;
  const pitFloorY = -pitDepth;

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
  pitWall.position.set(0, pitFloorY/2, 0);
  root.add(pitWall);

  // rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0xc8d3ff, roughness: 0.3, metalness: 0.55,
      emissive: new THREE.Color(0x223cff),
      emissiveIntensity: 0.14
    })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.85;
  root.add(rail);

  // downstairs ramp (visual)
  const stairW = 2.1;
  const stairL = 7.6;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, pitDepth, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, pitFloorY/2, pitRadius + stairL * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, stairL);
  root.add(ramp);
}

// =======================
// ROOMS + PORTALS + HOLOS
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
    emissiveIntensity: 0.55
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

    const plate = makeLabelPlate(s.THREE, "PORTAL", 0x0a1020, 0x66ccff);
    plate.position.set(p.x, 2.75, p.z);
    plate.rotation.y = p.ry;
    root.add(plate);
  }
}

function buildHoloJumbotrons(s) {
  const { THREE, root, BUILD } = s;

  const mkPanel = (text, x, y, z, ry) => {
    const panel = new THREE.Group();

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.55, metalness: 0.25 })
    );
    panel.add(frame);

    const face = makeLabelPlate(THREE, text, 0x0b1220, 0x66ccff, 1024, 256);
    face.position.z = 0.07;
    panel.add(face);

    const glow = new THREE.PointLight(0x66ccff, 0.7, 18, 2);
    glow.position.set(0, 0, 0.7);
    panel.add(glow);

    panel.position.set(x, y, z);
    panel.rotation.y = ry;

    root.add(panel);
    s.holoPanels.push(panel);
  };

  mkPanel(`SCARLETT VR POKER`, 0, 6.0, 13.0, Math.PI);
  mkPanel(`BUILD: ${String(BUILD).slice(-10)}`, 0, 4.2, 13.0, Math.PI);
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

  const glow = new THREE.PointLight(0x66ccff, 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);

  // mannequins
  const mm = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.65, metalness: 0.08 });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), mm);
    m.position.set(-6 + i*3.0, 1.1, -4.2);
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

  const light = new THREE.PointLight(0xff6bd6, 1.1, 50, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);

  const sign = makeLabelPlate(THREE, "SCORPION ROOM", 0x0a1020, 0xff6bd6);
  sign.position.set(0, 3.2, -7.5);
  sc.add(sign);
}

function buildSpectate(s) {
  const { THREE, root } = s;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
  s.groundMeshes.push(plat);

  const sign = makeLabelPlate(THREE, "SPECTATOR", 0x0a1020, 0xc8d3ff);
  sign.position.set(0, 4.4, -14);
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

// =======================
// XR VISUALS: lasers, reticle, rainbow arc
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
    const g = new THREE.RingGeometry(0.12, 0.18, 32);
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
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.10 });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    line.visible = false;
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

    const skin = new THREE.MeshStandardMaterial({ color: 0xd8c7b2, roughness: 0.75, metalness: 0.05 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.9, metalness: 0.05 });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.06), glove);
    palm.position.set(0, 0, -0.02);
    g.add(palm);

    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.025), skin);
    knuckle.position.set(0, 0.012, -0.035);
    g.add(knuckle);

    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.03), skin);
      f.position.set(-0.015 + i * 0.015, 0.012, -0.065);
      g.add(f);
    }

    const th = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.028), skin);
    th.position.set(isLeft ? -0.03 : 0.03, 0.006, -0.03);
    th.rotation.y = isLeft ? 0.5 : -0.5;
    g.add(th);

    g.position.set(isLeft ? -0.012 : 0.012, -0.01, -0.02);
    g.rotation.set(-0.2, 0, 0);
    return g;
  }

  controllers.c0.add(makeHand(true));
  controllers.c1.add(makeHand(false));
}

function setupPrettyWatch(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x182743, roughness: 0.3, metalness: 0.35,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.1
  });

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x0d1324, roughness: 0.2, metalness: 0.25,
    emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.14
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.102, 0.016), plateMat);
  watchRoot.add(body);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.088, 0.006), faceMat);
  face.position.z = 0.012;
  watchRoot.add(face);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.058, 32),
    new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(-0.05, 0.0, 0.02);
  watchRoot.add(rim);

  const items = [
    { label: "POKER", room: "poker" },
    { label: "LOBBY", room: "lobby" },
    { label: "STORE", room: "store" },
    { label: "SPECT", room: "spectate" },
    { label: "SCORP", room: "scorpion" },
    { label: "ARC",   room: null, action: (st)=>{ st.showArcs = !st.showArcs; } },
    { label: "LASER", room: null, action: (st)=>{ st.showLasers = !st.showLasers; } },
  ];

  const btnGeo = new THREE.BoxGeometry(0.14, 0.02, 0.012);

  for (let i = 0; i < items.length; i++) {
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x2b3b5f, roughness: 0.55, metalness: 0.18,
      emissive: new THREE.Color(0x000000), emissiveIntensity: 0
    });

    const b = new THREE.Mesh(btnGeo, btnMat);
    b.position.set(0, 0.042 - i * 0.024, 0.018);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);

    const label = makeLabelPlate(THREE, items[i].label, 0x0a1020, 0x66ccff, 512, 128);
    label.scale.set(0.30, 0.08, 1);
    label.position.set(0.0, 0.042 - i * 0.024, 0.028);
    watchRoot.add(label);
    s.watch.labels.push(label);
  }

  // attach to LEFT controller
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

  // haptics if available
  pulseHaptics(s, "left", 0.35, 30);

  // action
  if (item?.action) item.action(s);
  if (item?.room) setRigToAnchor(s, s.anchors[item.room] || s.anchors.lobby);

  // visual feedback
  if (btn.material?.emissive) {
    btn.material.emissive.setHex(0x223cff);
    btn.material.emissiveIntensity = 0.7;
  }

  s.log?.(`[watch] click ${item?.label || "?"}`);
  return true;
}

function pulseHaptics(s, hand, intensity = 0.3, ms = 25) {
  const session = s.renderer.xr.getSession?.();
  if (!session) return;

  const src = Array.from(session.inputSources || []).find(is => is?.handedness === hand && is?.gamepad);
  const h = src?.gamepad?.hapticActuators?.[0];
  if (h?.pulse) {
    try { h.pulse(intensity, ms); } catch {}
  }
}

// =======================
// POKER ROOM (upgraded foundation)
// =======================

function buildPokerRoom(s) {
  const { THREE, root } = s;

  const room = new THREE.Group();
  room.name = "POKER_ROOM";
  room.position.set(0, 0, -9.5);
  root.add(room);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(10, 64), matFloor(THREE, 0x0f1724));
  pad.rotation.x = -Math.PI/2;
  pad.position.y = 0.001;
  room.add(pad);
  s.groundMeshes.push(pad);

  // Table
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.75, 2.95, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.y = 0.9;
  room.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.12, 14, 72),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = 1.03;
  room.add(rail);

  // Community card slots
  const slotMat = new THREE.MeshStandardMaterial({
    color: 0x0a1020, roughness: 0.85, metalness: 0.05,
    emissive: new THREE.Color(0x66ccff),
    emissiveIntensity: 0.08
  });
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.003, 0.10), slotMat);
    slot.position.set(-0.18 + i*0.09, 1.08, 0.0);
    room.add(slot);
  }

  // Betting spots
  const betMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.20, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const ang = (i/6)*Math.PI*2;
    const spot = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.28, 32), betMat);
    spot.rotation.x = -Math.PI/2;
    spot.position.set(Math.cos(ang)*2.6, 1.07, Math.sin(ang)*2.6);
    room.add(spot);
  }

  // Dealer button
  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.1 })
  );
  dealer.rotation.x = Math.PI/2;
  dealer.position.set(0.9, 1.08, 0.0);
  dealer.userData.spin = true;
  room.add(dealer);

  // Chip stacks
  const chipColors = [0xff3b3b, 0x2fd4ff, 0x7cff2f, 0xf2f2f2, 0xff6bd6, 0xc8d3ff];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: chipColors[i], roughness: 0.35, metalness: 0.25 });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 24), mat);
    const ang = (i / 6) * Math.PI * 2;
    stack.position.set(Math.cos(ang)*3.6, 0.07, Math.sin(ang)*3.6);
    room.add(stack);
  }

  // Seats
  for (let i = 0; i < 6; i++) {
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.9, metalness: 0.08 })
    );
    const ang = (i / 6) * Math.PI * 2;
    chair.position.set(Math.cos(ang)*4.2, 0.3, Math.sin(ang)*4.2);
    chair.lookAt(0, 0.3, 0);
    room.add(chair);
  }

  // Deck + grabbable cards
  const deckPos = new THREE.Vector3(-1.1, 1.05, 0.0);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 })
  );
  deck.position.copy(deckPos);
  room.add(deck);

  // 12 loose cards
  for (let i = 0; i < 12; i++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.004, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 })
    );
    card.position.set(deckPos.x + (i % 6)*0.07, deckPos.y + 0.02 + Math.floor(i/6)*0.01, deckPos.z + 0.14);
    card.rotation.y = -0.2;
    card.userData.grabbable = true;
    card.userData.kind = "card";
    room.add(card);
    s.grab.interactables.push(card);
  }

  // sign
  const sign = makeLabelPlate(THREE, "POKER ROOM", 0x0a1020, 0x66ccff);
  sign.position.set(0, 3.4, 6.5);
  sign.rotation.y = Math.PI;
  room.add(sign);
}

// =======================
// GRAB SYSTEM
// =======================

function tryGrab(s, hand) {
  if (!s.renderer.xr.isPresenting) return;
  if (s.grab.held[hand]) return;

  const ctrl = hand === "right" ? s.controllers.c1 : s.controllers.c0;

  s.tmpM.identity().extractRotation(ctrl.matrixWorld);
  const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
  s.tmpDir.set(0, 0, -1).applyMatrix4(s.tmpM).normalize();

  s.raycaster.set(origin, s.tmpDir);
  const hits = s.raycaster.intersectObjects(s.grab.interactables, false);
  if (!hits.length) return;

  const obj = hits[0].object;
  if (!obj?.userData?.grabbable) return;

  // attach
  ctrl.attach(obj);
  obj.position.set(0.0, -0.01, -0.06);

  s.grab.held[hand] = obj;
  pulseHaptics(s, hand, 0.25, 18);
  s.log?.(`[grab] ${hand} picked ${obj.userData.kind || "object"}`);
}

function releaseGrab(s, hand) {
  const obj = s.grab.held[hand];
  if (!obj) return;

  s.root.attach(obj);
  s.grab.held[hand] = null;
  pulseHaptics(s, hand, 0.18, 12);
  s.log?.(`[grab] ${hand} released`);
}

// =======================
// UPDATE LOOP
// =======================

function update(s, dt, t) {
  // Cars hover + spin
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t*1.3 + c.phase) * 0.25;
    c.obj.rotation.y += dt * 0.10;
  }

  // animate neon / arcs
  animateNeon(s, t);

  // update rays/reticles/arcs/watch hover
  updateRays(s, t);

  // locomotion
  if (s.renderer.xr.isPresenting) {
    Controls.applyLocomotion(s, dt);
  }
}

function animateNeon(s, t) {
  // pulse emissive intensity on neon mats
  const pulse = 0.45 + Math.sin(t*1.7)*0.12;
  for (const m of s.neonMats) {
    if (m.emissive) m.emissiveIntensity = pulse;
  }
  // animate dashed arcs
  for (const l of s.dashLines) {
    if (l.material) l.material.dashOffset = -(t * 0.9);
    // gently shift color
    if (l.material?.color) {
      const c = hsvToRgb((t*0.08) % 1, 0.45, 1.0);
      l.material.color.setRGB(c.r, c.g, c.b);
    }
  }
}

function updateRays(s, t) {
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

    // watch hover
    if (hand === "left" && s.watch.visible && s.watch.buttons.length) {
      // reset hover glow
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
  s.player.position.set(p.x, 0, p.z);
  pulseHaptics(s, hand, 0.35, 22);
  s.log?.(`[tp] ${hand} -> (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
}

function setReticle(s, hand, point) {
  const r = s.reticles.find(x => x.hand === hand)?.mesh;
  if (!r) return;
  r.visible = true;
  r.position.copy(point);
  r.position.y += 0.01;

  // subtle pulsing opacity
  if (r.material) r.material.opacity = 0.75 + Math.sin(perfNow()*0.004)*0.2;
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
  mid.y += 1.15;

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
  arc.computeLineDistances?.();
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

  // glow border
  ctx.strokeStyle = "rgba(102,204,255,0.55)";
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.01));
  ctx.strokeRect(10, 10, w-20, h-20);

  // text
  ctx.fillStyle = hex(fg);
  ctx.font = `900 ${Math.floor(h*0.48)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
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

function perfNow() {
  return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
                                                                     }
