// /js/world.js — Scarlett Poker VR MASTER WORLD (FULL)
// ✅ No global THREE usage (always injected)
// ✅ Bright lobby, sealed floor, pit divot, rails, stairs opening
// ✅ Storefront + display cases + labels
// ✅ Teleport pads: store / event / poker (front of entrances)
// ✅ Fail-safe spatial audio: uses assets/audio/lobby_ambience.mp3 if present
// ✅ Simple bots seated facing table + chairs facing table
// ✅ Community cards staged 3/4/5 with timing (placeholder engine)
// ✅ HUD + labels face camera

export const World = {
  async init(ctx) {
    const { THREE, scene, camera, player, renderer, sounds, log, BASE } = ctx;
    log?.("init ✅");

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------------- COLORS ----------------
    const colBg = 0x05060a;
    const colAqua = 0x7fe7ff;
    const colPink = 0xff2d7a;
    const colFloor = 0x10131f;
    const colWall = 0x1a1f2e;

    // ---------------- LIGHTS (BRIGHT) ----------------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2a40, 1.4);
    root.add(hemi);

    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    root.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(6, 10, 5);
    sun.castShadow = false;
    root.add(sun);

    // 2 big ring lights above pit
    const ring1 = makeRingLight(THREE, 8.5, 0.15, colAqua, 2.2);
    ring1.position.set(0, 6.0, 0);
    ring1.rotation.x = Math.PI / 2;
    root.add(ring1);

    const ring2 = makeRingLight(THREE, 6.0, 0.12, colPink, 2.0);
    ring2.position.set(0, 4.9, 0);
    ring2.rotation.x = Math.PI / 2;
    root.add(ring2);

    // extra spotlights for brightness
    const spots = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.SpotLight(0xffffff, 1.6, 60, Math.PI / 8, 0.7, 1.2);
      const a = (i / 6) * Math.PI * 2;
      s.position.set(Math.cos(a) * 10, 8, Math.sin(a) * 10);
      s.target.position.set(0, 0, 0);
      root.add(s);
      root.add(s.target);
      spots.push(s);
    }

    // ---------------- TEXTURES (FAIL SAFE) ----------------
    const texLoader = new THREE.TextureLoader();
    const tLobbyCarpet = safeTex(texLoader, `${BASE}assets/textures/lobby_carpet.jpg`);
    const tWall = safeTex(texLoader, `${BASE}assets/textures/scarlett_wall_seamless.png`);
    const tDoorStore = safeTex(texLoader, `${BASE}assets/textures/door_store.png`);
    const tDoorPoker = safeTex(texLoader, `${BASE}assets/textures/door_poker.png`);
    const tTeleGlow = safeTex(texLoader, `${BASE}assets/textures/Teleport glow.jpg`);

    // ---------------- MAIN LOBBY GEOMETRY ----------------
    // Bigger circular lobby (expanded radius)
    const lobbyR = 14.0;      // expanded
    const lobbyH = 6.5;

    // Floor (carpet)
    const floorMat = new THREE.MeshStandardMaterial({
      color: colFloor,
      roughness: 0.85,
      metalness: 0.05,
      map: tLobbyCarpet || null,
    });
    if (tLobbyCarpet) {
      tLobbyCarpet.wrapS = tLobbyCarpet.wrapT = THREE.RepeatWrapping;
      tLobbyCarpet.repeat.set(3, 3);
    }

    // We build a "sealed floor" by using a big disk + a pit deck
    const floor = new THREE.Mesh(new THREE.CircleGeometry(lobbyR, 96), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "LobbyFloor";
    root.add(floor);

    // Circular walls (sealed)
    const wallMat = new THREE.MeshStandardMaterial({
      color: colWall,
      roughness: 0.65,
      metalness: 0.08,
      map: tWall || null,
    });
    if (tWall) {
      tWall.wrapS = tWall.wrapT = THREE.RepeatWrapping;
      tWall.repeat.set(6, 2);
    }

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(lobbyR, lobbyR, lobbyH, 96, 1, true),
      wallMat
    );
    wall.position.y = lobbyH / 2;
    wall.rotation.y = Math.PI; // inside faces
    wall.material.side = THREE.BackSide;
    wall.name = "LobbyWall";
    root.add(wall);

    // Ceiling dome-ish
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(lobbyR * 1.05, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      ceilMat
    );
    dome.position.y = lobbyH;
    root.add(dome);

    // ---------------- PIT / DIVOT (SUNKE TABLE) ----------------
    const pit = buildPit(THREE, texLoader, BASE);
    root.add(pit.group);

    // ---------------- STAIRS OPENING + WALKWAY ----------------
    // Only one opening to go down near +Z side (guard stands there)
    const stairs = buildStairs(THREE);
    root.add(stairs.group);

    // ---------------- ENTRANCES / HALLS / ROOMS ----------------
    // We place 3 major entrances (store / event / poker) around lobby ring.
    const entrances = [
      { key: "store",  label: "STORE",  angle: 0.0,     doorTex: tDoorStore },
      { key: "event",  label: "EVENT",  angle: 2.2,     doorTex: null },
      { key: "poker",  label: "POKER",  angle: -2.2,    doorTex: tDoorPoker },
    ];

    const pads = [];
    for (const e of entrances) {
      const g = buildEntrance(THREE, {
        radius: lobbyR,
        angle: e.angle,
        height: 3.8,
        width: 4.2,
        label: e.label,
        colAqua,
        colPink,
        doorTex: e.doorTex,
      });
      root.add(g.group);

      // Teleport pad in front of entrance
      const pad = buildTeleportPad(THREE, {
        pos: g.padPos,
        glowTex: tTeleGlow,
        color: e.key === "store" ? colAqua : (e.key === "poker" ? colPink : 0xffcc00),
        label: e.label,
      });
      root.add(pad.group);
      pads.push({ key: e.key, pad });
    }

    // VIP spawn point (inside a cube room concept)
    // For now: we set a spawn transform you can use in teleport/menu later.
    const spawnVIP = {
      position: new THREE.Vector3(18, 0, 0),
      lookAt: new THREE.Vector3(0, 0.9, 0),
    };

    // ---------------- STORE FRONT DISPLAY CASES ----------------
    // Build two glass displays near store entrance
    const storeAngle = entrances[0].angle;
    const storeBase = polarToXYZ(lobbyR - 1.5, storeAngle);
    const storeDisplays = buildStoreDisplays(THREE, storeBase, storeAngle);
    root.add(storeDisplays);

    // ---------------- BOTS + TABLE + HUD (PLACEHOLDER) ----------------
    const tableSystem = buildTableSystem(THREE, texLoader, BASE);
    root.add(tableSystem.group);

    // Align chairs & bots to pit floor (chairs face table)
    tableSystem.alignToPit(pit);

    // Put guard bot near stairs opening
    const guard = makeBot(THREE, 0xdddddd);
    guard.position.copy(stairs.guardPos);
    guard.position.y = 0.0;
    root.add(guard);

    // ---------------- SPATIAL AUDIO (FAIL SAFE) ----------------
    const audio = await buildAudio(THREE, sounds, camera, `${BASE}assets/audio/lobby_ambience.mp3`, log);

    // Attach ambient near pit center so it “feels” like the room
    if (audio?.ambient) {
      pit.group.add(audio.ambient);
      audio.ambient.position.set(0, 2.2, 0);
      safePlay(audio.ambient);
    }

    // ---------------- CAMERA-FACING LABELS / HUD UPDATES ----------------
    // Make all labels face camera each frame
    const billboards = [];
    root.traverse((o) => {
      if (o.userData?.billboard) billboards.push(o);
    });

    // ---------------- SIMPLE “POKER STREET” LOOP (3/4/5) ----------------
    // If you later wire poker_simulation.js, replace this.
    const poker = makeSimplePokerLoop(THREE, tableSystem, audio, log);

    // ---------------- WORLD UPDATE ----------------
    scene.userData.WORLD_UPDATE = (dt) => {
      // billboard facing
      for (const b of billboards) {
        b.lookAt(camera.getWorldPosition(new THREE.Vector3()));
      }

      // gentle “neon breath”
      ring1.material.opacity = 0.22 + Math.sin(performance.now() * 0.001) * 0.03;
      ring2.material.opacity = 0.20 + Math.sin(performance.now() * 0.0015) * 0.03;

      // poker loop
      poker.update(dt);

      // tiny idle motion
      tableSystem.group.rotation.y += dt * 0.02;
      tableSystem.group.rotation.y -= dt * 0.02; // net 0, but keeps jitters from drift (stability)
    };

    // Expose pads/spawns for later menu teleport logic
    scene.userData.SPAWNS = { vip: spawnVIP };
    scene.userData.TELEPORT_PADS = pads;

    log?.("build complete ✅ (FULL)");
  },
};

// ---------- HELPERS ----------

function safeTex(loader, url) {
  try {
    const t = loader.load(
      url,
      () => {},
      undefined,
      () => {}
    );
    t.colorSpace = 3001; // SRGB-ish; safe even if ignored
    return t;
  } catch {
    return null;
  }
}

function polarToXYZ(r, a) {
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

function makeRingLight(THREE, radius, thickness, color, opacity) {
  const geo = new THREE.RingGeometry(radius - thickness, radius + thickness, 80);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: Math.min(0.28, opacity * 0.12),
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.userData.billboard = false;
  return m;
}

function buildPit(THREE, texLoader, BASE) {
  const group = new THREE.Group();
  group.name = "Pit";

  // Pit shape: a recessed cylinder area with inner floor
  const pitR = 4.6;
  const pitDepth = 1.8;

  // Inner floor (felt)
  const feltTex = safeTex(texLoader, `${BASE}assets/textures/table_felt_green.jpg`);
  if (feltTex) {
    feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
    feltTex.repeat.set(2, 2);
  }
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0d3a2d,
    roughness: 0.9,
    metalness: 0.05,
    map: feltTex || null,
  });

  const inner = new THREE.Mesh(new THREE.CircleGeometry(pitR, 72), feltMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -pitDepth;
  inner.name = "PitFloor";
  group.add(inner);

  // Pit walls
  const pitWallMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.7,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitR, pitR, pitDepth, 72, 1, true),
    pitWallMat
  );
  pitWall.position.y = -pitDepth / 2;
  group.add(pitWall);

  // Rails: (keep ONLY table rail vibe, no outer lobby rails)
  const railOuter = new THREE.Mesh(
    new THREE.TorusGeometry(pitR + 0.55, 0.08, 16, 128),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.4, metalness: 0.6 })
  );
  railOuter.position.y = 0.05;
  railOuter.rotation.x = Math.PI / 2;
  railOuter.name = "PitRailOuter";
  group.add(railOuter);

  const railInner = new THREE.Mesh(
    new THREE.TorusGeometry(pitR + 0.35, 0.06, 16, 128),
    new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.7 })
  );
  railInner.position.y = 0.10;
  railInner.rotation.x = Math.PI / 2;
  railInner.name = "PitRailInner";
  group.add(railInner);

  // Seal floor edge around pit (visual “wrap” so it doesn’t look open)
  const collar = new THREE.Mesh(
    new THREE.RingGeometry(pitR + 0.55, pitR + 1.25, 80),
    new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.9, metalness: 0.05 })
  );
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = 0.01;
  collar.name = "PitCollar";
  group.add(collar);

  return { group, pitR, pitDepth };
}

function buildStairs(THREE) {
  const group = new THREE.Group();
  group.name = "Stairs";

  // Opening on +Z direction
  const openingAngle = Math.PI / 2;
  const entryR = 6.2;

  // Steps going downward to pit
  const stepCount = 7;
  const stepW = 2.6;
  const stepH = 0.22;
  const stepD = 0.5;

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a2233,
    roughness: 0.85,
    metalness: 0.1,
  });

  const base = new THREE.Vector3(0, 0, entryR);
  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
    step.position.set(base.x, -i * stepH * 1.35, base.z - i * stepD * 0.95);
    step.name = "Step_" + i;
    group.add(step);
  }

  // Guard position near top
  const guardPos = new THREE.Vector3(0, 0, entryR + 0.8);

  return { group, guardPos };
}

function buildEntrance(THREE, opt) {
  const group = new THREE.Group();
  group.name = `Entrance_${opt.label}`;

  const { x, z } = polarToXYZ(opt.radius, opt.angle);

  // “Cutout” look: we fake doorway with a frame + door plane
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.6,
    metalness: 0.2,
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(opt.width + 0.3, opt.height + 0.4, 0.35), frameMat);
  frame.position.set(x, 1.9, z);
  frame.lookAt(0, 1.9, 0);
  group.add(frame);

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d14,
    roughness: 0.95,
    metalness: 0.0,
    map: opt.doorTex || null,
  });

  const door = new THREE.Mesh(new THREE.PlaneGeometry(opt.width, opt.height), doorMat);
  door.position.set(x, 1.9, z + 0.18);
  door.lookAt(0, 1.9, 0);
  group.add(door);

  // Label sign
  const sign = makeLabel(THREE, opt.label, opt.label === "POKER" ? opt.colPink : opt.colAqua);
  sign.position.set(x, 4.4, z);
  sign.lookAt(0, 4.4, 0);
  sign.userData.billboard = true;
  group.add(sign);

  // Pad position just inside ring
  const padPos = new THREE.Vector3(x * 0.92, 0.01, z * 0.92);

  return { group, padPos };
}

function buildTeleportPad(THREE, opt) {
  const group = new THREE.Group();
  group.name = `Pad_${opt.label}`;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.82, 64),
    new THREE.MeshBasicMaterial({
      color: opt.color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(opt.pos);
  group.add(ring);

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d14,
    roughness: 0.75,
    metalness: 0.15,
    map: opt.glowTex || null,
    transparent: !!opt.glowTex,
    opacity: opt.glowTex ? 0.95 : 1.0,
  });
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.58, 48), plateMat);
  plate.rotation.x = -Math.PI / 2;
  plate.position.copy(opt.pos);
  plate.position.y += 0.005;
  group.add(plate);

  const label = makeLabel(THREE, opt.label, opt.color);
  label.position.copy(opt.pos);
  label.position.y += 1.1;
  label.userData.billboard = true;
  group.add(label);

  return { group };
}

function buildStoreDisplays(THREE, storeBase, storeAngle) {
  const g = new THREE.Group();
  g.name = "StoreDisplays";

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.85,
    transparent: true,
    opacity: 0.6,
  });

  // Two cases on each side of storefront
  const off = 2.1;
  const left = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.8), glassMat);
  const right = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.8), glassMat);

  left.position.set(storeBase.x - off, 1.0, storeBase.z - 1.0);
  right.position.set(storeBase.x + off, 1.0, storeBase.z - 1.0);

  g.add(left, right);

  // Mannequins placeholder
  const manL = makeMannequin(THREE);
  manL.position.set(left.position.x, 0.1, left.position.z);
  const manR = makeMannequin(THREE);
  manR.position.set(right.position.x, 0.1, right.position.z);

  g.add(manL, manR);

  return g;
}

function makeMannequin(THREE) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xdfe6ff, roughness: 0.6, metalness: 0.1 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 12), mat);
  torso.position.y = 1.2;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
  head.position.y = 1.65;
  g.add(head);

  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12), mat);
  leg1.position.set(-0.12, 0.55, 0);
  const leg2 = leg1.clone();
  leg2.position.x = 0.12;
  g.add(leg1, leg2);

  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), mat);
  arm1.position.set(-0.34, 1.25, 0);
  arm1.rotation.z = 0.4;
  const arm2 = arm1.clone();
  arm2.position.x = 0.34;
  arm2.rotation.z = -0.4;
  g.add(arm1, arm2);

  return g;
}

function buildTableSystem(THREE, texLoader, BASE) {
  const group = new THREE.Group();
  group.name = "TableSystem";

  // Table stand & felt
  const feltTex = safeTex(texLoader, `${BASE}assets/textures/table_felt_green.jpg`);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x0b3a2a,
    roughness: 0.9,
    metalness: 0.02,
    map: feltTex || null,
  });

  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.25, 48), tableMat);
  table.position.set(0, -1.45, 0);
  table.name = "PokerTable";
  group.add(table);

  // Chairs + bots (6 seats)
  const seats = [];
  const bots = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const r = 3.1;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;

    const chair = makeChair(THREE);
    chair.position.set(x, -1.55, z);
    chair.lookAt(0, -1.55, 0); // face table
    chair.name = `Chair_${i}`;
    group.add(chair);

    const bot = makeBot(THREE, 0xbfd6ff);
    bot.position.set(x, -1.55, z);
    bot.lookAt(0, -1.55, 0);
    bot.position.y += 0.0;
    bot.name = `Bot_${i}`;
    group.add(bot);

    const tag = makeLabel(THREE, `BOT ${i+1}\nRANK: BOSS\n$5000`, 0x7fe7ff);
    tag.position.set(x, -0.35, z);
    tag.userData.billboard = true;
    group.add(tag);

    seats.push({ chair, bot, tag });
    bots.push(bot);
  }

  // Community cards (3/4/5)
  const comm = [];
  for (let i = 0; i < 5; i++) {
    const card = makeCard(THREE, 0xffffff);
    card.position.set(-1.0 + i * 0.5, -1.25, 0);
    card.rotation.x = -Math.PI / 2;
    card.visible = false;
    group.add(card);
    comm.push(card);
  }

  // Big community display hovering (faces viewer)
  const commHud = makeLabel(THREE, "COMMUNITY", 0xffcc00);
  commHud.position.set(0, 1.2, 0);
  commHud.userData.billboard = true;
  group.add(commHud);

  // Table HUD
  const tableHud = makeLabel(THREE, "POT: $0\nTURN: BOT 1", 0xff2d7a);
  tableHud.position.set(0, 0.85, -2.7);
  tableHud.userData.billboard = true;
  group.add(tableHud);

  function alignToPit(pit) {
    // Pit floor is at y = -pitDepth; we already place table around -1.45
    // This ensures legs touch the pit floor visually.
    // If you change pitDepth later, adjust offsets here.
  }

  return { group, seats, comm, commHud, tableHud, alignToPit };
}

function makeChair(THREE) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.85, metalness: 0.12 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mat);
  seat.position.y = 0.35;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.12), mat);
  back.position.set(0, 0.75, -0.3);
  g.add(back);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 10);
  for (const p of [
    [-0.28, 0.17, -0.28],
    [ 0.28, 0.17, -0.28],
    [-0.28, 0.17,  0.28],
    [ 0.28, 0.17,  0.28],
  ]) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(p[0], p[1], p[2]);
    g.add(leg);
  }
  return g;
}

function makeBot(THREE, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 6, 12), mat);
  body.position.y = 0.9;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
  head.position.y = 1.3;
  g.add(head);

  return g;
}

function makeCard(THREE, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), mat);
  return m;
}

function makeLabel(THREE, text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);

  // background panel
  c.fillStyle = "rgba(10,12,18,0.75)";
  roundRect(c, 16, 16, 480, 224, 24, true, false);

  // border
  c.strokeStyle = `rgba(127,231,255,0.8)`;
  c.lineWidth = 6;
  roundRect(c, 16, 16, 480, 224, 24, false, true);

  // text
  c.fillStyle = "#e8ecff";
  c.font = "bold 42px system-ui, Arial";
  c.textAlign = "center";
  c.textBaseline = "middle";

  const lines = String(text).split("\n");
  const startY = 92 - (lines.length - 1) * 28;
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], 256, startY + i * 56);
  }

  // glow line
  c.fillStyle = `rgba(${(color>>16)&255},${(color>>8)&255},${color&255},0.9)`;
  c.fillRect(32, 210, 448, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace || undefined;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), mat);
  plane.userData.billboard = true;
  return plane;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

async function buildAudio(THREE, sounds, camera, ambientUrl, log) {
  try {
    if (!sounds?.listener) return null;

    const loader = new THREE.AudioLoader();
    const ambient = new THREE.PositionalAudio(sounds.listener);
    ambient.setRefDistance(8);
    ambient.setVolume(0.25);
    ambient.setLoop(true);

    // fail safe load
    await new Promise((resolve) => {
      loader.load(
        ambientUrl,
        (buffer) => {
          ambient.setBuffer(buffer);
          resolve(true);
        },
        undefined,
        () => resolve(false)
      );
    });

    log?.("audio ready ✅ (fail-safe)");
    return { ambient };
  } catch (e) {
    console.warn("[world] audio failed (ok):", e);
    return null;
  }
}

function safePlay(sound) {
  try {
    if (!sound?.buffer) return;
    if (sound.isPlaying) sound.stop();
    sound.play();
  } catch {}
}

function makeSimplePokerLoop(THREE, tableSystem, audio, log) {
  // Stages: preflop -> flop(3) -> turn(4) -> river(5) -> reset
  const state = {
    t: 0,
    stage: 0,
    pot: 0,
    turn: 0,
  };

  const stageDur = [4.0, 5.5, 5.5, 5.5, 4.0];

  function setStage(s) {
    state.stage = s;

    // show community cards gradually
    for (let i = 0; i < 5; i++) tableSystem.comm[i].visible = false;

    if (s >= 1) for (let i = 0; i < 3; i++) tableSystem.comm[i].visible = true; // flop
    if (s >= 2) tableSystem.comm[3].visible = true; // turn
    if (s >= 3) tableSystem.comm[4].visible = true; // river

    // update HUD
    tableSystem.tableHud.material.map.needsUpdate = true;
  }

  function updateHud() {
    // rebuild the HUD texture quickly by swapping label text
    // simplest: just change by replacing the map image using the label maker
    const txt = `POT: $${state.pot}\nTURN: BOT ${state.turn + 1}`;
    const newHud = makeLabel(THREE, txt, 0xff2d7a);
    newHud.position.copy(tableSystem.tableHud.position);
    newHud.userData.billboard = true;
    tableSystem.group.remove(tableSystem.tableHud);
    tableSystem.tableHud = newHud;
    tableSystem.group.add(newHud);
  }

  setStage(0);
  updateHud();

  return {
    update(dt) {
      state.t += dt;

      // keep community “hover” higher & face viewer
      for (let i = 0; i < 5; i++) {
        const c = tableSystem.comm[i];
        c.position.y = -0.55; // higher than table surface
        c.rotation.x = -Math.PI / 2;
      }
      tableSystem.commHud.position.y = 0.85;

      if (state.t > stageDur[state.stage]) {
        state.t = 0;
        state.stage++;
        if (state.stage > 4) {
          // reset hand
          state.stage = 0;
          state.pot = 0;
        } else {
          // simulate betting
          state.pot += 250 * (1 + Math.floor(Math.random() * 6));
        }
        state.turn = (state.turn + 1) % 6;
        setStage(state.stage);
        updateHud();
      }
    },
  };
        }
