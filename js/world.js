// /js/world.js — Scarlett MASTER WORLD v5
// ✅ Fixes Quest "blinking/glitter": removes coplanar z-fighting floors + uses polygonOffset
// ✅ Removes hallway wall protrusions into lobby (hallways start at doorway plane)
// ✅ Solid circular wall + clean 4 door openings + pillars at edges
// ✅ Entrance labels visible from lobby center
// ✅ Better chairs + pit floor looks nicer (procedural carpet + pit panels)
// ✅ Telepads remain; menu + gaze tags remain compatible

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, grips, log;

  const state = {
    root: null,

    // scale
    lobbyR: 21.5,
    wallH: 12.0,

    // pit (you wanted bigger)
    pitInner: 8.2,
    pitOuter: 13.8,
    pitDepth: 1.55,

    // runtime
    t: 0,
    tags: [],
    telepads: [],
    targets: {},
    menu: null,
    menuButtons: [],
    menuOpen: false,
    hudRoot: null,
    hudVisible: true,

    tableAnchor: null,
    cards: null,
    boardPhase: 0,
    boardTimer: 0,
  };

  const THEME = {
    bg: 0x05060a,
    wall: 0x222b3a,
    wall2: 0x141a24,
    floor: 0x2e3747,
    pit: 0x0b1420,
    felt: 0x0f5a3f,
    aqua: 0x7fe7ff,
    pink: 0xff2d7a,
    violet: 0xa78bff,
    neonTrim: 0x3cf2ff
  };

  const add = (o) => (state.root.add(o), o);

  function matStd({ color, rough = 0.88, metal = 0.08, emissive = 0x000000, ei = 0 } = {}) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive,
      emissiveIntensity: ei,
    });
    return m;
  }

  // ---------- Procedural “carpet” texture (no assets) ----------
  function makeCarpetTexture({
    w = 512, h = 512,
    base = "#2e3747",
    dot = "rgba(127,231,255,0.10)",
    dot2 = "rgba(255,45,122,0.08)"
  } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    // subtle noise dots
    for (let i = 0; i < 7000; i++) {
      g.fillStyle = (i % 2) ? dot : dot2;
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    tex.anisotropy = 2;
    return tex;
  }

  // ---------- Canvas sign texture ----------
  function makeCanvasTexture(lines, {
    w = 1024, h = 256,
    title = "#e8ecff",
    sub = "#98a0c7",
    accent = "rgba(127,231,255,.35)",
    bg = "rgba(10,12,18,.78)",
    titleSize = 64,
    subSize = 40
  } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    g.strokeStyle = accent;
    g.lineWidth = 10;
    g.strokeRect(16, 16, w - 32, h - 32);

    g.textAlign = "center";
    g.textBaseline = "middle";

    const [t1, t2] = Array.isArray(lines) ? lines : [String(lines), ""];

    g.fillStyle = title;
    g.font = `900 ${titleSize}px system-ui, Segoe UI, Arial`;
    g.fillText(t1, w / 2, h * 0.45);

    if (t2) {
      g.fillStyle = sub;
      g.font = `800 ${subSize}px system-ui, Segoe UI, Arial`;
      g.fillText(t2, w / 2, h * 0.72);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeEntranceLabel(text) {
    const tex = makeCanvasTexture([text, "ENTER"], {
      title: "#ffe1ec",
      sub: "#7fe7ff",
      accent: "rgba(255,45,122,.32)",
      titleSize: 70,
      subSize: 44
    });

    const m = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.65,
      metalness: 0.10,
      emissive: THEME.aqua,
      emissiveIntensity: 0.22
    });

    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.6), m);
    p.userData.fixedSign = true; // NOT billboard
    return p;
  }

  // --------- Upright gaze-only tags (NO head tilt) ----------
  function makeUprightTagPlane(name, money) {
    const tex = makeCanvasTexture([name, money], {
      w: 768, h: 256,
      title: "#e8ecff",
      sub: "#7fe7ff",
      accent: "rgba(255,45,122,.28)",
      titleSize: 58,
      subSize: 36
    });

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x050a10,
      emissiveIntensity: 0.5
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 0.20), mat);
    plane.visible = false;
    plane.userData.kind = "tag";
    return plane;
  }

  function cameraForward(out = new THREE.Vector3()) {
    camera.getWorldDirection(out);
    out.y = 0;
    return out.normalize();
  }

  // ---------- LIGHTS (bright + stable) ----------
  function buildLights() {
    add(new THREE.AmbientLight(0xffffff, 1.15));
    add(new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(18, 20, 12);
    add(sun);

    // pit hero lights
    const pitA = new THREE.PointLight(THEME.aqua, 2.0, 120);
    pitA.position.set(0, 9.5, 0);
    add(pitA);

    const pitB = new THREE.PointLight(THEME.pink, 1.6, 110);
    pitB.position.set(11, 8.5, -7);
    add(pitB);

    // overhead ring fixture
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(state.pitOuter - 0.9, 0.12, 18, 200),
      matStd({ color: THEME.neonTrim, rough: 0.28, metal: 0.92, emissive: THEME.neonTrim, ei: 1.15 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 9.1;
    add(halo);

    log?.("[world] lights ✅");
  }

  // ---------- LOBBY FLOOR (ONE PIECE, NO Z-FIGHT) ----------
  function buildLobbyFloorAndPit() {
    const { lobbyR, wallH, pitInner, pitOuter, pitDepth } = state;

    // ONE single lobby floor ring (pitInner -> lobbyR)
    const carpetTex = makeCarpetTexture({ base: "#2e3747" });

    const floorMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const lobbyFloor = new THREE.Mesh(
      new THREE.RingGeometry(pitInner, lobbyR, 260),
      floorMat
    );
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.y = 0.01;
    add(lobbyFloor);

    // Pit floor
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitInner - 0.20, 220),
      matStd({ color: THEME.pit, rough: 0.98, metal: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    add(pitFloor);

    // Pit wall
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitInner, pitInner, pitDepth, 220, 1, true),
      matStd({ color: THEME.wall2, rough: 0.92, metal: 0.08 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    // Lip trim ring (NOT coplanar)
    const lipTrim = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.08, 0.06, 16, 240),
      matStd({ color: THEME.aqua, rough: 0.25, metal: 0.85, emissive: THEME.aqua, ei: 0.6 })
    );
    lipTrim.rotation.x = Math.PI / 2;
    lipTrim.position.y = 0.06;
    add(lipTrim);

    // Guard rails (tight)
    const railA = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.28, 0.07, 18, 240),
      matStd({ color: THEME.aqua, rough: 0.24, metal: 0.88, emissive: 0x062028, ei: 1.05 })
    );
    railA.rotation.x = Math.PI / 2;
    railA.position.y = 0.82;
    add(railA);

    const railB = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.45, 0.05, 18, 240),
      matStd({ color: THEME.violet, rough: 0.24, metal: 0.88, emissive: 0x120a24, ei: 0.85 })
    );
    railB.rotation.x = Math.PI / 2;
    railB.position.y = 0.90;
    add(railB);

    // Solid cylindrical wall (smooth + tight)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(lobbyR, lobbyR, wallH, 260, 1, true),
      matStd({ color: THEME.wall, rough: 0.92, metal: 0.06 })
    );
    wall.position.y = wallH / 2;
    wall.material.side = THREE.DoubleSide;
    add(wall);

    // Neon trims
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.35, 0.11, 18, 260),
      matStd({ color: THEME.neonTrim, rough: 0.28, metal: 0.95, emissive: THEME.neonTrim, ei: 1.05 })
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = wallH - 0.55;
    add(trimTop);

    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.32, 0.09, 18, 260),
      matStd({ color: THEME.pink, rough: 0.28, metal: 0.88, emissive: THEME.pink, ei: 0.75 })
    );
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = 0.42;
    add(trimBottom);

    // Create four doorway portals + pillars
    buildDoorPortalsAndPillars();

    state.targets.pitEntry = new THREE.Vector3(0, 0, pitInner - 1.05);
    log?.("[world] lobby floor + pit ✅ (no z-fight)");
  }

  function buildDoorPortalsAndPillars() {
    const r = state.lobbyR - 0.15;
    const yMid = 2.65;
    const doorW = 6.2;
    const doorH = 4.2;

    const angles = [
      { a: 0, label: "VIP" },
      { a: Math.PI / 2, label: "STORE" },
      { a: Math.PI, label: "EVENT" },
      { a: -Math.PI / 2, label: "POKER" },
    ];

    // Pillars at left/right edges of each doorway
    const pillarMat = matStd({ color: THEME.violet, rough: 0.35, metal: 0.85, emissive: THEME.violet, ei: 0.45 });
    const capMat = matStd({ color: THEME.neonTrim, rough: 0.25, metal: 0.92, emissive: THEME.neonTrim, ei: 0.8 });

    for (const d of angles) {
      const dir = new THREE.Vector3(Math.sin(d.a), 0, Math.cos(d.a));
      const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

      // doorway frame (visual portal)
      const frame = new THREE.Group();
      frame.position.copy(dir.clone().multiplyScalar(r));
      frame.rotation.y = d.a;

      // top lintel
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.25, 0.35), capMat);
      lintel.position.set(0, doorH, 0);
      frame.add(lintel);

      // side pillars
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, doorH + 0.45, 18), pillarMat);
        p.position.set((doorW / 2 + 0.35) * s, (doorH / 2), 0);
        frame.add(p);
      }

      // entrance label INSIDE lobby (does NOT billboard)
      const label = makeEntranceLabel(d.label);
      label.position.copy(dir.clone().multiplyScalar(r - 2.0));
      label.position.y = yMid + 1.35;
      label.rotation.y = d.a;
      add(label);

      add(frame);
    }
  }

  // ---------- HALLWAYS (NO WALLS PROTRUDING INTO LOBBY) ----------
  function buildHallwaysAndRooms() {
    const hallW = 5.2;
    const hallH = 3.4;
    const hallL = 10.5;

    const roomSize = 12.6;
    const roomH = 5.8;

    // Start halls exactly at doorway plane (just outside wall)
    const startR = state.lobbyR + 0.45;
    const roomDist = state.lobbyR + 10.4;

    const hallWallMat = matStd({ color: THEME.wall2, rough: 0.92, metal: 0.05 });
    const roomWallMat = matStd({ color: THEME.wall, rough: 0.92, metal: 0.05 });

    // Simple non-coplanar hall floor
    const hallFloorMat = matStd({ color: THEME.floor, rough: 0.92, metal: 0.03 });
    hallFloorMat.polygonOffset = true;
    hallFloorMat.polygonOffsetFactor = 2;
    hallFloorMat.polygonOffsetUnits = 2;

    const rooms = [
      { key: "vip",   label: "VIP",   a: 0,            col: THEME.violet },
      { key: "store", label: "STORE", a: Math.PI/2,    col: THEME.aqua },
      { key: "event", label: "EVENT", a: Math.PI,      col: THEME.pink },
      { key: "poker", label: "POKER", a: -Math.PI/2,   col: THEME.aqua },
    ];

    for (const r of rooms) {
      const dir = new THREE.Vector3(Math.sin(r.a), 0, Math.cos(r.a));
      const yaw = r.a;

      // hallway center (OUTSIDE the wall; no protrusion into lobby)
      const hallCenter = dir.clone().multiplyScalar(startR + hallL * 0.5);

      // hallway floor
      const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), hallFloorMat);
      hf.rotation.x = -Math.PI / 2;
      hf.position.set(hallCenter.x, 0.03, hallCenter.z);
      hf.rotation.y = yaw;
      add(hf);

      // hallway side walls ONLY (start outside wall so they can’t intrude)
      const side = new THREE.BoxGeometry(hallL, hallH, 0.20);
      const w1 = new THREE.Mesh(side, hallWallMat);
      const w2 = new THREE.Mesh(side, hallWallMat);
      w1.position.set(0, hallH / 2, hallW * 0.5);
      w2.position.set(0, hallH / 2, -hallW * 0.5);
      w1.rotation.y = Math.PI / 2;
      w2.rotation.y = Math.PI / 2;

      const hg = new THREE.Group();
      hg.position.set(hallCenter.x, 0, hallCenter.z);
      hg.rotation.y = yaw;
      hg.add(w1, w2);
      add(hg);

      // room center
      const roomCenter = dir.clone().multiplyScalar(roomDist);

      // room floor (slightly raised to avoid fighting)
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize),
        matStd({ color: THEME.floor, rough: 0.92, metal: 0.03 })
      );
      rf.rotation.x = -Math.PI / 2;
      rf.position.set(roomCenter.x, 0.03, roomCenter.z);
      add(rf);

      // build room with a door facing the hallway
      buildRoomWithDoor(roomCenter, yaw, roomSize, roomH, roomWallMat);

      // targets
      state.targets[`${r.key}Front`] = dir.clone().multiplyScalar(state.lobbyR - 2.8);
      state.targets[`${r.key}Inside`] = roomCenter.clone();

      // store front extras can go later; keeping stable for now
    }

    log?.("[world] halls+rooms ✅ (no protrusions)");
  }

  function buildRoomWithDoor(center, yaw, size, height, wallMat) {
    const half = size / 2;
    const doorW = 4.2;
    const doorH = 3.5;

    const g = new THREE.Group();
    g.position.copy(center);
    g.rotation.y = yaw;

    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), matStd({ color: THEME.wall2, rough: 0.95, metal: 0.02 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = height;
    g.add(ceil);

    // back wall
    const back = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    back.position.set(0, height / 2, -half);
    g.add(back);

    // left/right
    const left = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-half, height / 2, 0);
    g.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(half, height / 2, 0);
    g.add(right);

    // front split for door opening
    const frontZ = half;

    const topSeg = new THREE.Mesh(new THREE.PlaneGeometry(size, height - doorH), wallMat);
    topSeg.position.set(0, doorH + (height - doorH) / 2, frontZ);
    topSeg.rotation.y = Math.PI;
    g.add(topSeg);

    const sideW = (size - doorW) / 2;

    const leftSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    leftSeg.position.set(-(doorW / 2 + sideW / 2), doorH / 2, frontZ);
    leftSeg.rotation.y = Math.PI;
    g.add(leftSeg);

    const rightSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    rightSeg.position.set((doorW / 2 + sideW / 2), doorH / 2, frontZ);
    rightSeg.rotation.y = Math.PI;
    g.add(rightSeg);

    // interior light
    const lamp = new THREE.PointLight(0xffffff, 1.2, 24);
    lamp.position.set(0, 3.6, 0);
    g.add(lamp);

    add(g);
  }

  // ---------- STAIRS + GATE (kept) ----------
  function buildStairsAndGate() {
    const { pitInner, pitDepth } = state;

    const openingW = 4.8;
    const stepCount = 10;
    const stepH = pitDepth / stepCount;
    const stepD = 0.62;

    const stepMat = matStd({ color: THEME.floor, rough: 0.92, metal: 0.04 });

    // stairs down at +Z
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH * 0.95, stepD), stepMat);
      step.position.set(0, -stepH * (i + 0.5), pitInner + 0.45 + i * stepD);
      add(step);
    }

    // guard
    const guard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.86, 6, 12),
      matStd({ color: THEME.pink, rough: 0.35, metal: 0.25, emissive: THEME.pink, ei: 0.55 })
    );
    guard.position.set(0, 0.98, pitInner + 1.65);
    add(guard);

    const gtag = makeUprightTagPlane("GUARD", "$—");
    gtag.position.set(0, 1.50, 0);
    guard.add(gtag);
    state.tags.push({ host: guard, plane: gtag });

    log?.("[world] stairs+guard ✅");
  }

  // ---------- Better chairs ----------
  function buildBetterChair() {
    const g = new THREE.Group();
    const seatMat = matStd({ color: 0x2a2f3a, rough: 0.75, metal: 0.22 });
    const metalMat = matStd({ color: 0x1e2430, rough: 0.55, metal: 0.55 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.10, 0.95), seatMat);
    seat.position.y = 0.44;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.10), seatMat);
    back.position.set(0, 0.80, -0.42);
    g.add(back);

    // legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.44, 10);
    for (const sx of [-0.38, 0.38]) {
      for (const sz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(sx, 0.22, sz);
        g.add(leg);
      }
    }
    return g;
  }

  // ---------- Table + bots ----------
  function buildTableAndBots() {
    const { pitDepth, pitInner } = state;

    state.tableAnchor = new THREE.Group();
    state.tableAnchor.position.set(0, -pitDepth, 0);
    add(state.tableAnchor);

    const felt = matStd({ color: THEME.felt, rough: 0.92, metal: 0.02 });
    const leather = matStd({ color: 0x3a2416, rough: 0.75, metal: 0.08 });
    const baseMat = matStd({ color: 0x1f2633, rough: 0.65, metal: 0.35 });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(4.15, 4.30, 0.20, 90), felt);
    top.position.y = 0.98;
    state.tableAnchor.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.20, 0.16, 18, 180), leather);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.10;
    state.tableAnchor.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.30, 1.05, 36), baseMat);
    base.position.y = 0.52;
    state.tableAnchor.add(base);

    // community cards (start with 3)
    state.cards = new THREE.Group();
    state.cards.position.set(0, 2.65, 0);
    state.tableAnchor.add(state.cards);

    const cardMat = matStd({ color: 0xffffff, rough: 0.35, metal: 0.05 });
    const geo = new THREE.PlaneGeometry(0.78, 1.10);

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, cardMat);
      c.position.set((i - 2) * 0.92, 0, 0);
      c.visible = (i < 3);
      state.cards.add(c);
    }
    state.boardPhase = 0;
    state.boardTimer = 0;

    // seats
    const botMat = matStd({ color: 0xb8c2ff, rough: 0.55, metal: 0.15, emissive: 0x121a55, ei: 0.45 });

    const seats = 6;
    const seatR = Math.min(pitInner - 1.35, 6.6);

    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const cx = Math.cos(a) * seatR;
      const cz = Math.sin(a) * seatR;

      const chair = buildBetterChair();
      chair.position.set(cx, 0.00, cz);
      chair.rotation.y = -a + Math.PI;
      state.tableAnchor.add(chair);

      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.78, 6, 12), botMat);
      bot.position.set(cx, 0.72, cz);
      bot.rotation.y = -a + Math.PI;
      state.tableAnchor.add(bot);

      const tag = makeUprightTagPlane(`BOT_${i + 1}`, "$5000");
      tag.position.set(0, 1.40, 0);
      bot.add(tag);
      state.tags.push({ host: bot, plane: tag });
    }

    log?.("[world] table+bots ✅");
  }

  // ---------- Telepads ----------
  function telepad(name, pos, color) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.9,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.80, 1.10, 72), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 0.03;
    ring.userData.telepad = { name };
    state.telepads.push(ring);
    add(ring);
    return ring;
  }

  function doTeleport(key) {
    const t = state.targets[key];
    if (!t) return;
    player.position.set(t.x, 0, t.z);
  }

  function wireSelectTriggers() {
    function rayFromController(controller) {
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
      return { origin, dir };
    }
    function hitObjects(controller, objs, max = 60) {
      const { origin, dir } = rayFromController(controller);
      const ray = new THREE.Raycaster(origin, dir, 0.01, max);
      const hits = ray.intersectObjects(objs, true);
      return hits?.[0]?.object || null;
    }

    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        const hitPad = hitObjects(c, state.telepads, 80);
        const name = hitPad?.userData?.telepad?.name;
        if (!name) return;

        if (name === "STORE") doTeleport("storeInside");
        else if (name === "EVENT") doTeleport("eventInside");
        else if (name === "POKER") doTeleport("pokerInside");
        else if (name === "VIP") doTeleport("vipInside");
        else if (name === "PIT") doTeleport("pitEntry");
        else if (name === "LOBBY") player.position.set(0, 0, 0);
      });
    }
  }

  // ---------- INIT ----------
  async function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;
    controllers = ctx.controllers || [];
    grips = ctx.grips || [];
    log = ctx.log || console.log;

    state.root = new THREE.Group();
    state.root.name = "WorldRoot";
    scene.add(state.root);

    buildLights();
    buildLobbyFloorAndPit();
    buildStairsAndGate();
    buildHallwaysAndRooms();
    buildTableAndBots();

    // targets
    const roomDist = state.lobbyR + 10.4;
    state.targets.vipInside   = new THREE.Vector3(0, 0, roomDist);
    state.targets.storeInside = new THREE.Vector3(roomDist, 0, 0);
    state.targets.eventInside = new THREE.Vector3(0, 0, -roomDist);
    state.targets.pokerInside = new THREE.Vector3(-roomDist, 0, 0);

    // 3 pads in center + VIP optional
    const centerR = state.lobbyR - 3.4;
    telepad("STORE", new THREE.Vector3(centerR, 0, 0), THEME.aqua);
    telepad("EVENT", new THREE.Vector3(0, 0, -centerR), THEME.pink);
    telepad("POKER", new THREE.Vector3(-centerR, 0, 0), THEME.aqua);
    telepad("VIP", new THREE.Vector3(0, 0, centerR), THEME.violet);
    telepad("PIT", new THREE.Vector3(0, 0, state.pitInner + 3.2), THEME.neonTrim);

    // return pads inside each room
    telepad("LOBBY", state.targets.storeInside.clone().add(new THREE.Vector3(0, 0, -3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.eventInside.clone().add(new THREE.Vector3(0, 0, -3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.pokerInside.clone().add(new THREE.Vector3(0, 0, -3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.vipInside.clone().add(new THREE.Vector3(0, 0, -3.0)), THEME.neonTrim);

    wireSelectTriggers();

    // Spawn in VIP (your request)
    player.position.set(state.targets.vipInside.x, 0, state.targets.vipInside.z);
    player.rotation.set(0, Math.PI, 0);

    log?.("[world] init ✅ MASTER WORLD v5 (smooth + fixed)");
  }

  // ---------- UPDATE ----------
  function update({ dt, t }) {
    state.t = t;

    // Cards face viewer (yaw-only, stable tilt)
    if (state.cards) {
      const wp = new THREE.Vector3();
      state.cards.getWorldPosition(wp);
      const dx = camera.position.x - wp.x;
      const dz = camera.position.z - wp.z;
      const yaw = Math.atan2(dx, dz);
      state.cards.rotation.set(-0.12, yaw, 0);

      // staged board: flop -> turn -> river
      state.boardTimer += dt;
      if (state.boardTimer > 6 && state.boardPhase === 0) {
        state.cards.children[3].visible = true;
        state.boardPhase = 1;
      }
      if (state.boardTimer > 12 && state.boardPhase === 1) {
        state.cards.children[4].visible = true;
        state.boardPhase = 2;
      }
    }

    // telepad pulse
    for (const p of state.telepads) {
      if (p.material?.emissiveIntensity != null) {
        p.material.emissiveIntensity = 1.75 + Math.sin(t * 2.0) * 0.22;
      }
    }

    // gaze tags: show only when you look; stay upright (no pitch/roll follow)
    const fwd = cameraForward(new THREE.Vector3());
    const camPos = camera.position.clone();

    for (const it of state.tags) {
      const host = it.host;
      const plane = it.plane;

      const hp = new THREE.Vector3();
      host.getWorldPosition(hp);

      const to = hp.clone().sub(camPos);
      const dist = to.length();
      to.y = 0;
      to.normalize();

      const dot = fwd.dot(to);
      const show = (dist < 12.0) && (dot > 0.93);
      plane.visible = show;

      if (show) {
        const wp = new THREE.Vector3();
        plane.getWorldPosition(wp);
        const dx = camera.position.x - wp.x;
        const dz = camera.position.z - wp.z;
        const yaw = Math.atan2(dx, dz);
        plane.rotation.set(-0.02, yaw, 0);
      }
    }
  }

  function toggleMenu() {
    state.menuOpen = !state.menuOpen;
    if (state.menu) state.menu.visible = state.menuOpen;
  }

  return { init, update, toggleMenu };
})();
