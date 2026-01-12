// /js/world.js — Scarlett MASTER WORLD v6 (A+B+C)
// A: World polish + stability (no z-fight flicker, clean doors, pillars, stairs)
// B: Poker demo sim (stages, pot HUD, dealer button, winner crown, chips visuals)
// C: Store + meta demo (wallet via localStorage, buy pads, mannequins, leaderboard board)

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,
    t: 0,

    lobbyR: 21.5,
    wallH: 12.0,

    pitInner: 8.2,
    pitDepth: 1.55,

    options: {
      hudVisible: true,
      A_worldPolish: true,
      B_pokerSim: true,
      C_storeMeta: true
    },

    // targets
    targets: {},

    // tags
    tags: [],

    // telepads
    telepads: [],

    // poker
    tableAnchor: null,
    board: null,
    boardPhase: 0,
    phaseTimer: 0,
    pot: 0,
    potHud: null,
    turnHud: null,
    dealerButton: null,
    crown: null,
    chipPiles: [],

    // store/meta
    wallet: { chips: 100000 },
    walletHud: null,
    leaderboard: null
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
    return new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal,
      emissive, emissiveIntensity: ei
    });
  }

  // ---------- persistence ----------
  function loadWallet() {
    try {
      const raw = localStorage.getItem("scarlett_wallet");
      if (raw) state.wallet = JSON.parse(raw);
    } catch {}
  }
  function saveWallet() {
    try { localStorage.setItem("scarlett_wallet", JSON.stringify(state.wallet)); } catch {}
  }

  // ---------- canvas textures ----------
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

    const [t1, t2] = Array.isArray(lines) ? lines : [String(lines), ""];

    g.textAlign = "center";
    g.textBaseline = "middle";

    g.fillStyle = title;
    g.font = `900 ${titleSize}px system-ui,Segoe UI,Arial`;
    g.fillText(t1, w/2, h*0.45);

    if (t2) {
      g.fillStyle = sub;
      g.font = `800 ${subSize}px system-ui,Segoe UI,Arial`;
      g.fillText(t2, w/2, h*0.72);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makePlaneLabel(lines, opts = {}, w=5.8, h=1.6, emissive=THEME.aqua) {
    const tex = makeCanvasTexture(lines, opts);
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.65,
      metalness: 0.10,
      emissive,
      emissiveIntensity: 0.25
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  }

  function makeUprightTag(name, cash) {
    const plane = makePlaneLabel([name, cash], {
      w: 768, h: 256,
      title: "#e8ecff",
      sub: "#7fe7ff",
      accent: "rgba(255,45,122,.28)",
      titleSize: 54,
      subSize: 34
    }, 0.60, 0.20, 0x050a10);
    plane.visible = false;
    plane.userData.kind = "tag";
    return plane;
  }

  function cameraForward(out = new THREE.Vector3()) {
    camera.getWorldDirection(out);
    out.y = 0;
    return out.normalize();
  }

  // ---------- carpet (procedural) ----------
  function makeCarpetTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#2e3747";
    g.fillRect(0,0,512,512);

    for (let i=0;i<7000;i++){
      g.fillStyle = (i%2) ? "rgba(127,231,255,0.10)" : "rgba(255,45,122,0.08)";
      const x=Math.random()*512, y=Math.random()*512, r=Math.random()*1.2;
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10,10);
    tex.anisotropy = 2;
    return tex;
  }

  // ---------- lights ----------
  function buildLights() {
    add(new THREE.AmbientLight(0xffffff, 1.15));
    add(new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.10));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(18, 20, 12);
    add(sun);

    const pitA = new THREE.PointLight(THEME.aqua, 2.0, 120);
    pitA.position.set(0, 9.5, 0);
    add(pitA);

    const pitB = new THREE.PointLight(THEME.pink, 1.6, 110);
    pitB.position.set(11, 8.5, -7);
    add(pitB);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry((state.pitInner + 4.8), 0.12, 18, 200),
      matStd({ color: THEME.neonTrim, rough: 0.28, metal: 0.92, emissive: THEME.neonTrim, ei: 1.15 })
    );
    halo.rotation.x = Math.PI/2;
    halo.position.y = 9.1;
    add(halo);

    log?.("[world] lights ✅");
  }

  // ---------- A: lobby/pit/walls/doors ----------
  function buildLobbyAndPit() {
    const carpetTex = makeCarpetTexture();
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
      new THREE.RingGeometry(state.pitInner, state.lobbyR, 260),
      floorMat
    );
    lobbyFloor.rotation.x = -Math.PI/2;
    lobbyFloor.position.y = 0.01;
    add(lobbyFloor);

    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(state.pitInner - 0.20, 220),
      matStd({ color: THEME.pit, rough: 0.98, metal: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = -state.pitDepth;
    add(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(state.pitInner, state.pitInner, state.pitDepth, 220, 1, true),
      matStd({ color: THEME.wall2, rough: 0.92, metal: 0.08 })
    );
    pitWall.position.y = -state.pitDepth/2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    const lipTrim = new THREE.Mesh(
      new THREE.TorusGeometry(state.pitInner + 0.08, 0.06, 16, 240),
      matStd({ color: THEME.aqua, rough: 0.25, metal: 0.85, emissive: THEME.aqua, ei: 0.6 })
    );
    lipTrim.rotation.x = Math.PI/2;
    lipTrim.position.y = 0.06;
    add(lipTrim);

    const railA = new THREE.Mesh(
      new THREE.TorusGeometry(state.pitInner + 0.28, 0.07, 18, 240),
      matStd({ color: THEME.aqua, rough: 0.24, metal: 0.88, emissive: 0x062028, ei: 1.05 })
    );
    railA.rotation.x = Math.PI/2;
    railA.position.y = 0.82;
    add(railA);

    const railB = new THREE.Mesh(
      new THREE.TorusGeometry(state.pitInner + 0.45, 0.05, 18, 240),
      matStd({ color: THEME.violet, rough: 0.24, metal: 0.88, emissive: 0x120a24, ei: 0.85 })
    );
    railB.rotation.x = Math.PI/2;
    railB.position.y = 0.90;
    add(railB);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(state.lobbyR, state.lobbyR, state.wallH, 260, 1, true),
      matStd({ color: THEME.wall, rough: 0.92, metal: 0.06 })
    );
    wall.position.y = state.wallH/2;
    wall.material.side = THREE.DoubleSide;
    add(wall);

    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(state.lobbyR - 0.35, 0.11, 18, 260),
      matStd({ color: THEME.neonTrim, rough: 0.28, metal: 0.95, emissive: THEME.neonTrim, ei: 1.05 })
    );
    trimTop.rotation.x = Math.PI/2;
    trimTop.position.y = state.wallH - 0.55;
    add(trimTop);

    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(state.lobbyR - 0.32, 0.09, 18, 260),
      matStd({ color: THEME.pink, rough: 0.28, metal: 0.88, emissive: THEME.pink, ei: 0.75 })
    );
    trimBottom.rotation.x = Math.PI/2;
    trimBottom.position.y = 0.42;
    add(trimBottom);

    buildDoorPortalsAndLabels();
    buildStairs();

    state.targets.pitEntry = new THREE.Vector3(0, 0, state.pitInner - 1.05);
    log?.("[world] A: lobby+pits ✅");
  }

  function buildDoorPortalsAndLabels() {
    const r = state.lobbyR - 0.15;
    const doorW = 6.2;
    const doorH = 4.2;

    const angles = [
      { a: 0, label: "VIP" },
      { a: Math.PI/2, label: "STORE" },
      { a: Math.PI, label: "EVENT" },
      { a: -Math.PI/2, label: "POKER" },
    ];

    const pillarMat = matStd({ color: THEME.violet, rough: 0.35, metal: 0.85, emissive: THEME.violet, ei: 0.45 });
    const capMat = matStd({ color: THEME.neonTrim, rough: 0.25, metal: 0.92, emissive: THEME.neonTrim, ei: 0.8 });

    for (const d of angles) {
      const dir = new THREE.Vector3(Math.sin(d.a), 0, Math.cos(d.a));

      // portal frame group
      const frame = new THREE.Group();
      frame.position.copy(dir.clone().multiplyScalar(r));
      frame.rotation.y = d.a;

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.25, 0.35), capMat);
      lintel.position.set(0, doorH, 0);
      frame.add(lintel);

      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, doorH + 0.45, 18), pillarMat);
        p.position.set((doorW/2 + 0.35) * s, doorH/2, 0);
        frame.add(p);
      }
      add(frame);

      // label plane INSIDE lobby (fixed, not billboard)
      const label = makePlaneLabel([d.label, "ENTER"], {
        title:"#ffe1ec", sub:"#7fe7ff", accent:"rgba(255,45,122,.32)", titleSize:70, subSize:44
      }, 5.8, 1.6, THEME.aqua);

      label.position.copy(dir.clone().multiplyScalar(r - 2.0));
      label.position.y = 4.0;
      label.rotation.y = d.a;
      label.userData.fixedSign = true;
      add(label);
    }
  }

  function buildStairs() {
    const openingW = 4.8;
    const stepCount = 10;
    const stepH = state.pitDepth / stepCount;
    const stepD = 0.62;
    const stepMat = matStd({ color: THEME.floor, rough: 0.92, metal: 0.04 });

    for (let i=0;i<stepCount;i++){
      const step = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH*0.95, stepD), stepMat);
      step.position.set(0, -stepH*(i+0.5), state.pitInner + 0.45 + i*stepD);
      add(step);
    }

    // guard
    const guard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.86, 6, 12),
      matStd({ color: THEME.pink, rough:0.35, metal:0.25, emissive: THEME.pink, ei:0.55 })
    );
    guard.position.set(0, 0.98, state.pitInner + 1.65);
    add(guard);

    const gtag = makeUprightTag("GUARD", "$—");
    gtag.position.set(0, 1.50, 0);
    guard.add(gtag);
    state.tags.push({ host: guard, plane: gtag });
  }

  // ---------- halls + rooms ----------
  function buildHallwaysAndRooms() {
    const hallW = 5.2, hallH = 3.4, hallL = 10.5;
    const roomSize = 12.6, roomH = 5.8;

    const startR = state.lobbyR + 0.45;      // start OUTSIDE wall (no protrusion)
    const roomDist = state.lobbyR + 10.4;

    const hallWallMat = matStd({ color: THEME.wall2, rough: 0.92, metal: 0.05 });
    const roomWallMat = matStd({ color: THEME.wall, rough: 0.92, metal: 0.05 });

    const hallFloorMat = matStd({ color: THEME.floor, rough: 0.92, metal: 0.03 });
    hallFloorMat.polygonOffset = true;
    hallFloorMat.polygonOffsetFactor = 2;
    hallFloorMat.polygonOffsetUnits = 2;

    const rooms = [
      { key:"vip",   a:0 },
      { key:"store", a:Math.PI/2 },
      { key:"event", a:Math.PI },
      { key:"poker", a:-Math.PI/2 },
    ];

    for (const r of rooms) {
      const dir = new THREE.Vector3(Math.sin(r.a), 0, Math.cos(r.a));
      const yaw = r.a;

      const hallCenter = dir.clone().multiplyScalar(startR + hallL*0.5);

      const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), hallFloorMat);
      hf.rotation.x = -Math.PI/2;
      hf.position.set(hallCenter.x, 0.03, hallCenter.z);
      hf.rotation.y = yaw;
      add(hf);

      const sideGeo = new THREE.BoxGeometry(hallL, hallH, 0.20);
      const w1 = new THREE.Mesh(sideGeo, hallWallMat);
      const w2 = new THREE.Mesh(sideGeo, hallWallMat);
      w1.position.set(0, hallH/2, hallW*0.5);
      w2.position.set(0, hallH/2, -hallW*0.5);
      w1.rotation.y = Math.PI/2;
      w2.rotation.y = Math.PI/2;

      const hg = new THREE.Group();
      hg.position.set(hallCenter.x, 0, hallCenter.z);
      hg.rotation.y = yaw;
      hg.add(w1, w2);
      add(hg);

      const roomCenter = dir.clone().multiplyScalar(roomDist);

      const rf = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), matStd({ color: THEME.floor, rough: 0.92, metal: 0.03 }));
      rf.rotation.x = -Math.PI/2;
      rf.position.set(roomCenter.x, 0.03, roomCenter.z);
      add(rf);

      buildRoomWithDoor(roomCenter, yaw, roomSize, roomH, roomWallMat);

      state.targets[`${r.key}Inside`] = roomCenter.clone();
    }

    // store dressing & boards (C)
    buildStoreFrontAndBoards();
  }

  function buildRoomWithDoor(center, yaw, size, height, wallMat) {
    const half = size/2;
    const doorW = 4.2, doorH = 3.5;

    const g = new THREE.Group();
    g.position.copy(center);
    g.rotation.y = yaw;

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), matStd({ color: THEME.wall2, rough: 0.95, metal: 0.02 }));
    ceil.rotation.x = Math.PI/2;
    ceil.position.y = height;
    g.add(ceil);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    back.position.set(0, height/2, -half);
    g.add(back);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    left.rotation.y = Math.PI/2;
    left.position.set(-half, height/2, 0);
    g.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    right.rotation.y = -Math.PI/2;
    right.position.set(half, height/2, 0);
    g.add(right);

    const frontZ = half;

    const topSeg = new THREE.Mesh(new THREE.PlaneGeometry(size, height - doorH), wallMat);
    topSeg.position.set(0, doorH + (height-doorH)/2, frontZ);
    topSeg.rotation.y = Math.PI;
    g.add(topSeg);

    const sideW = (size - doorW) / 2;

    const leftSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    leftSeg.position.set(-(doorW/2 + sideW/2), doorH/2, frontZ);
    leftSeg.rotation.y = Math.PI;
    g.add(leftSeg);

    const rightSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    rightSeg.position.set((doorW/2 + sideW/2), doorH/2, frontZ);
    rightSeg.rotation.y = Math.PI;
    g.add(rightSeg);

    const lamp = new THREE.PointLight(0xffffff, 1.2, 24);
    lamp.position.set(0, 3.6, 0);
    g.add(lamp);

    add(g);
  }

  // ---------- C: store + leaderboard ----------
  function buildStoreFrontAndBoards() {
    // Store room is at +X
    const store = state.targets.storeInside;
    if (!store) return;

    // Mannequin display platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.20, 2.8),
      matStd({ color: 0x1b2230, rough: 0.55, metal: 0.35 })
    );
    platform.position.set(store.x, 0.14, store.z + 2.2);
    add(platform);

    // “roof” canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.16, 2.95),
      matStd({ color: THEME.wall2, rough: 0.75, metal: 0.15, emissive: 0x04141c, ei: 0.6 })
    );
    canopy.position.set(store.x, 2.55, store.z + 2.2);
    add(canopy);

    const canopyLight = new THREE.PointLight(THEME.aqua, 1.8, 18);
    canopyLight.position.set(store.x, 2.35, store.z + 2.2);
    add(canopyLight);

    // mannequin
    const man = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.15, 6, 14),
      matStd({ color: 0xdfe9ff, rough: 0.55, metal: 0.15 })
    );
    man.position.set(store.x, 1.05, store.z + 2.2);
    add(man);

    // store label inside store room
    const storeLabel = makePlaneLabel(["SCARLETT STORE", "COSMETICS"], { titleSize: 64, subSize: 36 }, 6.0, 1.4, THEME.pink);
    storeLabel.position.set(store.x, 3.9, store.z - 4.2);
    storeLabel.rotation.y = Math.PI/2;
    storeLabel.userData.fixedSign = true;
    add(storeLabel);

    // buy pads (demo)
    telepad("BUY:NEON_TRIM (500)", new THREE.Vector3(store.x - 2.2, 0, store.z - 1.4), THEME.pink);
    telepad("BUY:CROWN (1200)", new THREE.Vector3(store.x + 2.2, 0, store.z - 1.4), THEME.aqua);

    // leaderboard board near lobby (right of store entrance)
    const board = makePlaneLabel(["LEADERBOARD", "Top Winnings"], { title:"#e8ecff", sub:"#7fe7ff", accent:"rgba(127,231,255,.25)" }, 6.5, 1.9, THEME.aqua);
    board.position.set(state.lobbyR - 2.2, 4.2, 6.0);
    board.rotation.y = -Math.PI/2;
    board.userData.fixedSign = true;
    add(board);
    state.leaderboard = board;
  }

  // ---------- B: table + poker sim ----------
  function buildTableAndBots() {
    state.tableAnchor = new THREE.Group();
    state.tableAnchor.position.set(0, -state.pitDepth, 0);
    add(state.tableAnchor);

    const felt = matStd({ color: THEME.felt, rough: 0.92, metal: 0.02 });
    const leather = matStd({ color: 0x3a2416, rough: 0.75, metal: 0.08 });
    const baseMat = matStd({ color: 0x1f2633, rough: 0.65, metal: 0.35 });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(4.15, 4.30, 0.20, 90), felt);
    top.position.y = 0.98;
    state.tableAnchor.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.20, 0.16, 18, 180), leather);
    rim.rotation.x = Math.PI/2;
    rim.position.y = 1.10;
    state.tableAnchor.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.30, 1.05, 36), baseMat);
    base.position.y = 0.52;
    state.tableAnchor.add(base);

    // dealer button
    state.dealerButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24),
      matStd({ color: THEME.neonTrim, rough: 0.35, metal: 0.85, emissive: THEME.neonTrim, ei: 0.8 })
    );
    state.dealerButton.position.set(1.6, 1.12, 0);
    state.tableAnchor.add(state.dealerButton);

    // pot HUD
    state.potHud = makePlaneLabel(["POT", "$0"], { title:"#ffe1ec", sub:"#7fe7ff", accent:"rgba(255,45,122,.26)" }, 1.8, 0.7, THEME.pink);
    state.potHud.position.set(0, 3.35, 0.2);
    state.tableAnchor.add(state.potHud);

    // turn HUD
    state.turnHud = makePlaneLabel(["TURN", "BOT_1"], { title:"#e8ecff", sub:"#98a0c7" }, 2.2, 0.75, THEME.aqua);
    state.turnHud.position.set(0, 4.15, 0.2);
    state.tableAnchor.add(state.turnHud);

    // community board (5 cards, show staged)
    state.board = new THREE.Group();
    state.board.position.set(0, 2.65, 0);
    state.tableAnchor.add(state.board);

    const cardMat = matStd({ color: 0xffffff, rough: 0.35, metal: 0.05 });
    const geo = new THREE.PlaneGeometry(0.78, 1.10);

    for (let i=0;i<5;i++){
      const c = new THREE.Mesh(geo, cardMat);
      c.position.set((i-2)*0.92, 0, 0);
      c.visible = (i < 3);
      state.board.add(c);
    }

    // bots + chairs (simple)
    const seats = 6;
    const seatR = 6.5;
    const botMat = matStd({ color: 0xb8c2ff, rough: 0.55, metal: 0.15, emissive: 0x121a55, ei: 0.35 });

    for (let i=0;i<seats;i++){
      const a = (i/seats) * Math.PI*2;
      const cx = Math.cos(a)*seatR;
      const cz = Math.sin(a)*seatR;

      // chair
      const chair = buildChair();
      chair.position.set(cx, 0.00, cz);
      chair.rotation.y = -a + Math.PI;
      state.tableAnchor.add(chair);

      // bot
      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.78, 6, 12), botMat);
      bot.position.set(cx, 0.72, cz);
      bot.rotation.y = -a + Math.PI;
      state.tableAnchor.add(bot);

      const tag = makeUprightTag(`BOT_${i+1}`, "$5000");
      tag.position.set(0, 1.40, 0);
      bot.add(tag);
      state.tags.push({ host: bot, plane: tag });
    }

    // chip piles (visual)
    for (let i=0;i<10;i++){
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.04, 20),
        matStd({ color: (i%2?THEME.pink:THEME.aqua), rough:0.35, metal:0.35, emissive:(i%2?THEME.pink:THEME.aqua), ei:0.25 })
      );
      chip.position.set((Math.random()*1.8-0.9), 1.12 + i*0.01, (Math.random()*1.2-0.6));
      chip.rotation.x = Math.PI/2;
      chip.visible = false;
      state.tableAnchor.add(chip);
      state.chipPiles.push(chip);
    }

    // crown (winner effect)
    state.crown = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.22, 0.06, 80, 12),
      matStd({ color: 0xffd36a, rough:0.25, metal:0.95, emissive:0xffd36a, ei:1.15 })
    );
    state.crown.visible = false;
    state.crown.position.set(0, 2.1, 0);
    state.tableAnchor.add(state.crown);
  }

  function buildChair() {
    const g = new THREE.Group();
    const seatMat = matStd({ color: 0x2a2f3a, rough: 0.75, metal: 0.22 });
    const metalMat = matStd({ color: 0x1e2430, rough: 0.55, metal: 0.55 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.10, 0.95), seatMat);
    seat.position.y = 0.44;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.10), seatMat);
    back.position.set(0, 0.80, -0.42);
    g.add(back);

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

  // ---------- telepads + interactions ----------
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
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(pos);
    ring.position.y += 0.03;
    ring.userData.telepad = { name };
    state.telepads.push(ring);
    add(ring);
    return ring;
  }

  function doTeleport(key) {
    const t = state.targets[key];
    if (!t) return false;
    player.position.set(t.x, 0, t.z);
    return true;
  }

  function wireSelectTriggers() {
    const tmpO = new THREE.Vector3();
    const tmpD = new THREE.Vector3();
    function rayFromController(controller) {
      tmpO.setFromMatrixPosition(controller.matrixWorld);
      tmpD.set(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
      return { origin: tmpO, dir: tmpD };
    }
    function hitObject(controller, objs, max=80) {
      const { origin, dir } = rayFromController(controller);
      const ray = new THREE.Raycaster(origin, dir, 0.01, max);
      const hits = ray.intersectObjects(objs, true);
      return hits?.[0]?.object || null;
    }

    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        const hit = hitObject(c, state.telepads);
        const name = hit?.userData?.telepad?.name;
        if (!name) return;

        // travel pads
        if (name === "STORE") doTeleport("storeInside");
        else if (name === "EVENT") doTeleport("eventInside");
        else if (name === "POKER") doTeleport("pokerInside");
        else if (name === "VIP") doTeleport("vipInside");
        else if (name === "PIT") doTeleport("pitEntry");
        else if (name === "LOBBY") player.position.set(0, 0, 0);

        // store purchases (C)
        if (state.options.C_storeMeta && name.startsWith("BUY:")) {
          const m = name.match(/\((\d+)\)/);
          const cost = m ? parseInt(m[1], 10) : 0;
          if (state.wallet.chips >= cost) {
            state.wallet.chips -= cost;
            saveWallet();
            updateWalletHud();
            flashNotice(`PURCHASED`, `-${cost} chips`);
          } else {
            flashNotice(`NOT ENOUGH`, `${cost} chips`);
          }
        }
      });
    }
  }

  // ---------- HUD helpers ----------
  function updatePotHud() {
    if (!state.potHud) return;
    const tex = makeCanvasTexture(["POT", `$${state.pot}`], { title:"#ffe1ec", sub:"#7fe7ff", accent:"rgba(255,45,122,.26)" });
    state.potHud.material.map?.dispose?.();
    state.potHud.material.map = tex;
    state.potHud.material.needsUpdate = true;
  }

  function updateTurnHud(name) {
    if (!state.turnHud) return;
    const tex = makeCanvasTexture(["TURN", name], { title:"#e8ecff", sub:"#98a0c7", accent:"rgba(127,231,255,.25)" });
    state.turnHud.material.map?.dispose?.();
    state.turnHud.material.map = tex;
    state.turnHud.material.needsUpdate = true;
  }

  function updateWalletHud() {
    if (!state.walletHud) return;
    const tex = makeCanvasTexture(["WALLET", `${state.wallet.chips} chips`], { title:"#e8ecff", sub:"#7fe7ff", accent:"rgba(127,231,255,.25)" });
    state.walletHud.material.map?.dispose?.();
    state.walletHud.material.map = tex;
    state.walletHud.material.needsUpdate = true;
  }

  let notice = null, noticeT = 0;
  function flashNotice(a, b) {
    if (!notice) return;
    const tex = makeCanvasTexture([a, b], { title:"#ffe1ec", sub:"#7fe7ff", accent:"rgba(255,45,122,.26)" });
    notice.material.map?.dispose?.();
    notice.material.map = tex;
    notice.material.needsUpdate = true;
    notice.visible = true;
    noticeT = 2.2;
  }

  // ---------- B: poker sim (demo but real stages) ----------
  function resetHand() {
    state.boardPhase = 0;
    state.phaseTimer = 0;
    state.pot = 0;

    // flop only visible
    if (state.board?.children) {
      state.board.children.forEach((c, i) => c.visible = (i < 3));
    }
    // hide chips
    state.chipPiles.forEach(c => c.visible = false);
    // hide crown
    if (state.crown) state.crown.visible = false;

    // rotate dealer button
    if (state.dealerButton) {
      const a = Math.random() * Math.PI * 2;
      state.dealerButton.position.set(Math.cos(a)*1.6, 1.12, Math.sin(a)*1.1);
    }

    updatePotHud();
    updateTurnHud("BOT_1");
  }

  function stepPoker(dt) {
    // stages: FLOP (start) -> TURN -> RIVER -> SHOWDOWN -> new hand
    state.phaseTimer += dt;

    // simulate betting: pot grows every 2 sec
    if (state.phaseTimer > 1.0 && (Math.floor(state.phaseTimer) % 2 === 0)) {
      state.pot += 50 + Math.floor(Math.random() * 120);
      updatePotHud();

      // show some chips
      for (let i=0;i<state.chipPiles.length;i++){
        if (i < Math.min(8, Math.floor(state.pot / 200))) state.chipPiles[i].visible = true;
      }
    }

    if (state.boardPhase === 0 && state.phaseTimer > 6) {
      // TURN
      state.board.children[3].visible = true;
      state.boardPhase = 1;
      updateTurnHud("BOT_3");
    } else if (state.boardPhase === 1 && state.phaseTimer > 12) {
      // RIVER
      state.board.children[4].visible = true;
      state.boardPhase = 2;
      updateTurnHud("BOT_5");
    } else if (state.boardPhase === 2 && state.phaseTimer > 18) {
      // SHOWDOWN
      state.boardPhase = 3;
      updateTurnHud("SHOWDOWN");
      if (state.crown) {
        state.crown.visible = true;
        state.crown.position.set(0, 2.05, 0);
      }
      flashNotice("WINNER", "BOT_2");
    } else if (state.boardPhase === 3 && state.phaseTimer > 22) {
      resetHand();
    }
  }

  // ---------- options API ----------
  function setOption(key, val) { state.options[key] = val; }
  function teleport(key) { return doTeleport(key); }

  // ---------- init ----------
  async function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;
    controllers = ctx.controllers || [];
    log = ctx.log || console.log;

    state.options = { ...state.options, ...(ctx.options || {}) };

    state.root = new THREE.Group();
    state.root.name = "WorldRoot";
    scene.add(state.root);

    loadWallet();

    buildLights();
    buildLobbyAndPit();
    buildHallwaysAndRooms();
    buildTableAndBots();

    // targets
    const roomDist = state.lobbyR + 10.4;
    state.targets.vipInside = new THREE.Vector3(0, 0, roomDist);
    state.targets.storeInside = new THREE.Vector3(roomDist, 0, 0);
    state.targets.eventInside = new THREE.Vector3(0, 0, -roomDist);
    state.targets.pokerInside = new THREE.Vector3(-roomDist, 0, 0);

    // pads in lobby
    const centerR = state.lobbyR - 3.4;
    telepad("STORE", new THREE.Vector3(centerR, 0, 0), THEME.aqua);
    telepad("EVENT", new THREE.Vector3(0, 0, -centerR), THEME.pink);
    telepad("POKER", new THREE.Vector3(-centerR, 0, 0), THEME.aqua);
    telepad("VIP", new THREE.Vector3(0, 0, centerR), THEME.violet);
    telepad("PIT", new THREE.Vector3(0, 0, state.pitInner + 3.2), THEME.neonTrim);

    // return pads inside rooms
    telepad("LOBBY", state.targets.storeInside.clone().add(new THREE.Vector3(0,0,-3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.eventInside.clone().add(new THREE.Vector3(0,0,-3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.pokerInside.clone().add(new THREE.Vector3(0,0,-3.0)), THEME.neonTrim);
    telepad("LOBBY", state.targets.vipInside.clone().add(new THREE.Vector3(0,0,-3.0)), THEME.neonTrim);

    wireSelectTriggers();

    // wallet HUD above VIP hallway area (fixed)
    state.walletHud = makePlaneLabel(["WALLET", `${state.wallet.chips} chips`], { title:"#e8ecff", sub:"#7fe7ff" }, 2.6, 0.85, THEME.aqua);
    state.walletHud.position.set(0, 4.7, state.lobbyR - 5.2);
    state.walletHud.rotation.y = 0;
    state.walletHud.userData.fixedSign = true;
    add(state.walletHud);

    // notice HUD
    notice = makePlaneLabel(["", ""], { title:"#ffe1ec", sub:"#7fe7ff" }, 2.6, 0.85, THEME.pink);
    notice.position.set(0, 5.6, state.lobbyR - 5.2);
    notice.visible = false;
    notice.userData.fixedSign = true;
    add(notice);

    updateWalletHud();
    resetHand();

    // Spawn in VIP
    player.position.set(state.targets.vipInside.x, 0, state.targets.vipInside.z);
    player.rotation.set(0, Math.PI, 0);

    log?.("[world] init ✅ MASTER WORLD v6 (A+B+C)");
  }

  // ---------- update ----------
  function update({ dt, t }) {
    state.t = t;

    // Respect HUD visibility option (only affects these fixed signs)
    if (state.walletHud) state.walletHud.visible = !!state.options.hudVisible;
    if (notice && noticeT > 0) { noticeT -= dt; if (noticeT <= 0) notice.visible = false; }

    // Cards face viewer (yaw-only, stable tilt)
    if (state.board) {
      const wp = new THREE.Vector3();
      state.board.getWorldPosition(wp);
      const dx = camera.position.x - wp.x;
      const dz = camera.position.z - wp.z;
      const yaw = Math.atan2(dx, dz);
      state.board.rotation.set(-0.12, yaw, 0);

      // keep pot/turn HUD stable toward viewer yaw (no pitch/roll)
      if (state.potHud) state.potHud.rotation.set(-0.04, yaw, 0);
      if (state.turnHud) state.turnHud.rotation.set(-0.04, yaw, 0);
    }

    // Telepad pulse
    for (const p of state.telepads) {
      if (p.material?.emissiveIntensity != null) {
        p.material.emissiveIntensity = 1.75 + Math.sin(t * 2.0) * 0.22;
      }
      // global toggle via option
      p.visible = true;
    }

    // Gaze tags: show only when looking; stay upright
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

    // B poker sim
    if (state.options.B_pokerSim) stepPoker(dt);

    // C store meta is already live via pads + wallet
  }

  return {
    init,
    update,
    setOption,
    teleport,
    resetHand
  };
})();
