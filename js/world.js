// /js/world.js — ScarlettVR FULL WORLD v10 (STABLE + Humanoids + Pit/Divot + Rooms + Store + Scorpion + Spectate)
// ✅ NO core edits. NO ControlsExt dependency.
// ✅ Fixes dashed-arc crash (computeLineDistances) by seeding geometry properly.
// ✅ XR: Teleport (both hands) + Laser + Reticle + Rainbow Arc
// ✅ XR: Smooth move (LEFT stick) + Snap turn (RIGHT stick) with inversion fixes
// ✅ Android/2D works via your new index.js (joystick + look)
// ✅ Adds Humanoid bots + player avatar if files exist (safe fallback)

let AvatarSystem = null;
let BotSystem = null;

// Safe optional imports (won't crash if files missing)
try { ({ AvatarSystem } = await import("./avatar_system.js")); } catch {}
try { ({ BotSystem } = await import("./bot_system.js")); } catch {}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,

      root: new THREE.Group(),
      groundMeshes: [],

      // XR visuals
      lasers: [],
      reticles: [],
      arcs: { left: null, right: null },
      arcPts: { left: [], right: [] },
      dashLines: [],
      lastTeleportPointL: null,
      lastTeleportPointR: null,
      showArcs: true,
      showLasers: true,

      // Locomotion (XR sticks)
      loco: {
        enabled: true,
        deadzone: 0.14,
        moveSpeed: 2.6,
        snapTurnDeg: 30,
        snapCooldown: 0,
        snapCooldownS: 0.18,
        diagonal45: true,

        // IMPORTANT: inversion fixes you reported
        invertLeftX: true,
        invertLeftY: true,
        invertRightX: false,
        invertRightY: true
      },

      // Watch UI
      watch: { root: null, visible: true, buttons: [] },

      // Rooms/anchors
      anchors: {},
      room: "lobby",

      // Ambient
      hoverCars: [],
      neonMats: [],

      // Systems
      systems: {}
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    // ===== ENV / LIGHTING =====
    addSkyAndFog(s);
    addLightsCinematic(s);

    // ===== WORLD GEOMETRY =====
    buildLobbyShell(s);
    buildLobbyFloorCarpet(s);

    // Pit + correct "down" ramp into pit (no protruding)
    buildPitAndDownstairs(s);

    // Four rooms + hallways
    buildRoomsAndHallways(s);

    // Store + Scorpion + Spectate platform
    buildStore(s);
    buildScorpion(s);
    buildSpectate(s);

    // Hover cars + jumbotrons
    buildHoverCars(s);
    buildHoloJumbotrons(s);

    // ===== XR VISUALS =====
    setupXRLasers(s);
    setupFloorReticles(s);
    setupTeleportArcs(s);

    // ===== WATCH (smaller, cleaner) =====
    setupPrettyWatch(s);

    // ===== HUMANOIDS (optional) =====
    // If you created the humanoid files I provided, these will load; otherwise no crash.
    try {
      if (AvatarSystem?.init) {
        s.systems.avatar = AvatarSystem.init({ THREE, player, controllers, renderer, log }, { hideHeadInXR: true });
      }
    } catch (e) { log?.("[avatar] init ❌", String(e?.stack || e)); }

    try {
      if (BotSystem?.init) {
        s.systems.bots = BotSystem.init(
          { THREE, root: s.root, log },
          { count: 10, zone: { center: { x: 0, y: 0, z: 0 }, radius: 15 } }
        );
      }
    } catch (e) { log?.("[bots] init ❌", String(e?.stack || e)); }

    // ===== ANCHORS =====
    s.anchors.lobby    = { pos: new THREE.Vector3(0, 0, 13.5),  yaw: Math.PI };
    s.anchors.poker    = { pos: new THREE.Vector3(0, 0, -9.5),  yaw: 0 };
    s.anchors.store    = { pos: new THREE.Vector3(-26, 0, 0),   yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0),    yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 };

    // Spawn lobby facing inward
    setRigToAnchor(s, s.anchors.lobby);

    // ===== INPUT EVENTS =====
    // Right trigger = teleport (always)
    controllers.c1?.addEventListener("selectstart", () => teleportNow(s, "right"));

    // Left trigger = watch click first, else teleport
    controllers.c0?.addEventListener("selectstart", () => {
      if (tryClickWatch(s)) return;
      teleportNow(s, "left");
    });

    // Left grip = toggle watch
    controllers.c0?.addEventListener("squeezestart", () => toggleWatch(s));

    log?.(`[world] FULL WORLD v10 STABLE ✅ build=${BUILD}`);
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
  scene.fog = new THREE.Fog(0x05070d, 12, 90);
}

function addLightsCinematic(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.05);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(35, 70, 35);
  scene.add(sun);

  const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.15, 95, 2);
  lobbyGlow.position.set(0, 9.0, 0);
  root.add(lobbyGlow);

  const magenta = new THREE.PointLight(0xff6bd6, 0.65, 80, 2);
  magenta.position.set(0, 2.6, 0);
  root.add(magenta);

  const pokerSpot = new THREE.SpotLight(0xffffff, 1.05, 40, Math.PI / 4, 0.35, 1);
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
    emissiveIntensity: 0.45
  });
  s.neonMats.push(ringMat);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(16.5, 0.12, 12, 96), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 8.8, 0);
  root.add(ring);

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
      emissiveIntensity: 0.06
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.002;
  root.add(carpet);

  const decalMat = new THREE.MeshBasicMaterial({
    color: 0x66ccff, transparent: true, opacity: 0.22, side: THREE.DoubleSide
  });
  for (let i = 0; i < 4; i++) {
    const wedge = new THREE.Mesh(new THREE.RingGeometry(10.2, 14.4, 32, 1, i*Math.PI/2, Math.PI/4), decalMat);
    wedge.rotation.x = -Math.PI/2;
    wedge.position.y = 0.004;
    root.add(wedge);
  }
}

// =======================
// PIT / DIVOT + DOWNSTAIRS
// =======================

function buildPitAndDownstairs(s) {
  const { THREE, root } = s;

  const pitRadius = 7.2;
  const pitDepth = 2.8;
  const pitFloorY = -pitDepth;

  // Pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  // Pit wall (sunken)
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY/2, 0);
  root.add(pitWall);

  // Guard rail around pit with ONE opening (entry)
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.5, metalness: 0.22,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.04
  });

  // Build rail as segmented arcs leaving an opening on +Z side
  const railY = 0.95;
  const railR = pitRadius + 0.35;
  const openingAng = Math.PI / 9; // opening size
  const segments = 28;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i+1) / segments) * Math.PI * 2;
    const mid = (a0 + a1) * 0.5;

    // skip opening (centered near +Z)
    const zSide = Math.abs(wrapAngle(mid - Math.PI/2));
    if (zSide < openingAng) continue;

    const len = railR * (a1 - a0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.10), railMat);
    rail.position.set(Math.cos(mid) * railR, railY, Math.sin(mid) * railR);
    rail.rotation.y = -mid;
    root.add(rail);
  }

  // Downstairs ramp (goes FROM lobby floor DOWN into pit) aligned to opening at +Z
  const rampW = 2.2;
  const rampL = 8.6;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(rampW, 0.35, rampL),
    matFloor(THREE, 0x141b28)
  );

  // Place it so top is at y≈0, bottom reaches pit floor
  ramp.position.set(0, -pitDepth * 0.5, pitRadius + rampL * 0.20);
  ramp.rotation.x = -Math.atan2(pitDepth, rampL);
  root.add(ramp);
  s.groundMeshes.push(ramp);

  // Simple "guard" post at entry
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 10), railMat);
  guard.position.set(1.2, 0.8, pitRadius + 0.2);
  root.add(guard);
}

// =======================
// ROOMS + HALLWAYS
// =======================

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
        transparent: true, opacity: 0.42
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    // hallways from lobby ring outward
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

// =======================
// STORE / SCORPION / SPECTATE
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
  glow.position.set(0, 3.6, 0);
  store.add(glow);

  // Mannequins (NOT pills)
  const mm = new THREE.MeshStandardMaterial({ color: 0xe3e3e3, roughness: 0.65, metalness: 0.06 });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mm);
    m.scale.set(0.65, 1.65, 0.55);
    m.position.set(-6.8 + i*2.7, 1.15, -4.4);
    store.add(m);
  }

  const sign = makeLabelPlate(THREE, "STORE", 0x0a1020, 0x66ccff);
  sign.position.set(0, 3.4, -7.4);
  store.add(sign);
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

  const light = new THREE.PointLight(0xff6bd6, 1.05, 50, 2);
  light.position.set(0, 3.6, 0);
  sc.add(light);

  const sign = makeLabelPlate(THREE, "SCORPION ROOM", 0x0a1020, 0xff6bd6);
  sign.position.set(0, 3.2, -7.5);
  sc.add(sign);

  // Placeholder tables (you said you see tables here—keeping them)
  const tmat = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.55, metalness: 0.22 });
  for (let i = 0; i < 2; i++) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.25, 32), tmat);
    table.position.set(-4 + i*8, 1.0, 0.0);
    sc.add(table);
  }
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

// =======================
// HOVER CARS + JUMBOTRONS
// =======================

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

    const glow = new THREE.PointLight(0x66ccff, 0.65, 18, 2);
    glow.position.set(0, 0, 0.7);
    panel.add(glow);

    panel.position.set(x, y, z);
    panel.rotation.y = ry;

    root.add(panel);
  };

  mkPanel(`SCARLETT VR POKER`, 0, 6.0, 13.0, Math.PI);
  mkPanel(`BUILD: ${String(BUILD).slice(-10)}`, 0, 4.2, 13.0, Math.PI);
}

// =======================
// XR: LASERS / RETICLE / ARC
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
    const g = new THREE.RingGeometry(0.16, 0.24, 32);
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
    // Seed geometry with 2 points so computeLineDistances NEVER throws
    const seedPts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-0.01)];
    const geom = new THREE.BufferGeometry().setFromPoints(seedPts);

    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.18,
      gapSize: 0.10
    });

    const line = new THREE.Line(geom, mat);
    line.visible = false;
    line.computeLineDistances(); // safe now
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
// WATCH (SMALLER)
// =======================

function setupPrettyWatch(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x182743, roughness: 0.35, metalness: 0.35,
    emissive: new THREE.Color(0x0b1220), emissiveIntensity: 0.1
  });

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x0d1324, roughness: 0.25, metalness: 0.25,
    emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.12
  });

  // Smaller watch body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.075, 0.014), plateMat);
  watchRoot.add(body);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.066, 0.006), faceMat);
  face.position.z = 0.010;
  watchRoot.add(face);

  const items = [
    { label: "POKER", room: "poker" },
    { label: "LOBBY", room: "lobby" },
    { label: "STORE", room: "store" },
    { label: "SPECT", room: "spectate" },
    { label: "SCORP", room: "scorpion" },
    { label: "ARC",   action: (st)=>{ st.showArcs = !st.showArcs; } },
    { label: "LASER", action: (st)=>{ st.showLasers = !st.showLasers; } },
    { label: "LOCO",  action: (st)=>{ st.loco.enabled = !st.loco.enabled; } },
  ];

  const btnGeo = new THREE.BoxGeometry(0.095, 0.016, 0.010);

  for (let i = 0; i < items.length; i++) {
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x2b3b5f, roughness: 0.55, metalness: 0.18,
      emissive: new THREE.Color(0x000000), emissiveIntensity: 0
    });

    const b = new THREE.Mesh(btnGeo, btnMat);
    b.position.set(0, 0.032 - i * 0.020, 0.014);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);

    const label = makeLabelPlate(THREE, items[i].label, 0x0a1020, 0x66ccff, 512, 128);
    label.scale.set(0.23, 0.06, 1);
    label.position.set(0.0, 0.032 - i * 0.020, 0.022);
    watchRoot.add(label);
  }

  // Attach to LEFT controller (wrist)
  watchRoot.position.set(0.048, 0.010, -0.070);
  watchRoot.rotation.set(-0.72, 0.0, 0.25);
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
  s.tmpM = s.tmpM || new s.THREE.Matrix4();
  s.tmpV = s.tmpV || new s.THREE.Vector3();
  s.tmpDir = s.tmpDir || new s.THREE.Vector3();
  s.raycaster = s.raycaster || new s.THREE.Raycaster();

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
  }

  return true;
}

// =======================
// UPDATE LOOP
// =======================

function update(s, dt, t) {
  // Systems
  s.systems?.avatar?.update?.(dt, t);
  s.systems?.bots?.update?.(dt, t);

  // Hover cars
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t*1.3 + c.phase) * 0.25;
    c.obj.rotation.y += dt * 0.10;
  }

  // Animate dashed arcs + rainbow tint
  for (const l of s.dashLines) {
    if (l.material) l.material.dashOffset = -(t * 0.9);
    if (l.material?.color) {
      const c = hsvToRgb((t*0.08) % 1, 0.50, 1.0);
      l.material.color.setRGB(c.r, c.g, c.b);
    }
  }

  // XR rays/reticles/arcs
  updateRays(s);

  // XR stick locomotion
  if (s.renderer.xr.isPresenting) {
    applyXRLocomotion(s, dt);
  }
}

function updateRays(s) {
  const { renderer, raycaster, controllers } = s;

  s.tmpM = s.tmpM || new s.THREE.Matrix4();
  s.tmpV = s.tmpV || new s.THREE.Vector3();
  s.tmpDir = s.tmpDir || new s.THREE.Vector3();
  s.raycaster = s.raycaster || new s.THREE.Raycaster();

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

    s.tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    s.tmpDir.set(0, 0, -1).applyMatrix4(s.tmpM).normalize();
    s.raycaster.set(origin, s.tmpDir);

    // Watch hover highlight (left hand)
    if (hand === "left" && s.watch.visible && s.watch.buttons.length) {
      for (const b of s.watch.buttons) {
        if (b.material?.emissive) { b.material.emissive.setHex(0x000000); b.material.emissiveIntensity = 0; }
      }
      const uiHits = s.raycaster.intersectObjects(s.watch.buttons, false);
      if (uiHits.length) {
        const b = uiHits[0].object;
        if (b.material?.emissive) { b.material.emissive.setHex(0x223cff); b.material.emissiveIntensity = 0.55; }
        if (showLaser) line.scale.z = Math.min(1.8, uiHits[0].distance);
        setReticleVisible(s, hand, false);
        setArcVisible(s, hand, false);
        continue;
      }
    }

    // Floor hit
    const hits = s.raycaster.intersectObjects(s.groundMeshes, false);
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
  arc.computeLineDistances?.(); // safe now (has positions)
}

function setArcVisible(s, hand, v) {
  const arc = s.arcs[hand];
  if (arc) arc.visible = v;
}

// =======================
// XR STICK LOCOMOTION (no core dependency)
// =======================

function applyXRLocomotion(s, dt) {
  if (!s.loco.enabled) return;

  // Prefer left controller for movement, right for turning
  const left = readAxes(s.controllers.c0);
  const right = readAxes(s.controllers.c1);

  // If axes missing on c0 (some devices swap), fallback to c1
  const moveAxes = left ? left : right;
  const turnAxes = right ? right : left;

  if (moveAxes) {
    let x = moveAxes.x;
    let y = moveAxes.y;

    if (s.loco.invertLeftX) x *= -1;
    if (s.loco.invertLeftY) y *= -1;

    // deadzone
    const dz = s.loco.deadzone;
    if (Math.abs(x) < dz) x = 0;
    if (Math.abs(y) < dz) y = 0;

    if (x !== 0 || y !== 0) {
      // optional 45-degree “grid” movement
      let vx = x;
      let vz = y; // y = forward/back

      if (s.loco.diagonal45) {
        const ang = Math.atan2(vx, vz); // x first (left/right), z forward/back
        const step = Math.PI / 4;
        const snapped = Math.round(ang / step) * step;
        const mag = Math.min(1, Math.hypot(vx, vz));
        vx = Math.sin(snapped) * mag;
        vz = Math.cos(snapped) * mag;
      }

      // apply relative to rig yaw
      const yaw = s.player.rotation.y;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const speed = s.loco.moveSpeed;

      s.player.position.x += (vx * cos + vz * sin) * speed * dt;
      s.player.position.z += (vz * cos - vx * sin) * speed * dt;
    }
  }

  // Snap turn on right stick X
  if (turnAxes) {
    let tx = turnAxes.x;
    if (s.loco.invertRightX) tx *= -1;

    const dz = s.loco.deadzone;
    if (Math.abs(tx) < dz) tx = 0;

    s.loco.snapCooldown = Math.max(0, s.loco.snapCooldown - dt);
    if (tx !== 0 && s.loco.snapCooldown === 0) {
      const dir = tx > 0 ? -1 : 1; // right stick right => turn right
      s.player.rotation.y += dir * s.THREE.MathUtils.degToRad(s.loco.snapTurnDeg);
      s.loco.snapCooldown = s.loco.snapCooldownS;
    }
  }
}

function readAxes(controller) {
  const src = controller?.inputSource;
  const gp = src?.gamepad;
  const axes = gp?.axes;
  if (!axes || axes.length < 2) return null;
  // Standard: axes[0]=x, axes[1]=y
  return { x: axes[0] ?? 0, y: axes[1] ?? 0 };
}

// =======================
// UTIL
// =======================

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  s.player.rotation.set(0, 0, 0);
  if (!s.renderer.xr.isPresenting) s.camera.rotation.set(0, anchor.yaw, 0);
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI*2;
  while (a < -Math.PI) a += Math.PI*2;
  return a;
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
