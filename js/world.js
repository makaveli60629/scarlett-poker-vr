// /js/world.js — Scarlett MASTER WORLD v11 (HEAD CARDS + BILLBOARD + PIT VISIBILITY + KNEES + WINNER BANNER)
// ✅ Hole cards hover over each player's head (2 each), ALWAYS face you, show rank+suit
// ✅ Community cards higher
// ✅ Pit depth reduced + table raised (divot no longer hides table)
// ✅ Stairs recalculated for new depth
// ✅ Walkers have knees + ankles
// ✅ Winner banner + bigger crown + longer showdown hold
// ✅ No imports; THREE injected by index.js

export const World = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    root: null,
    colliders: [],
    t: 0,

    lobby: null,
    pitG: null,
    pitTableG: null,

    // ✅ less deep so you can SEE the table in the divot
    pit: { radiusOuter: 12.0, radiusInner: 7.2, depth: 1.15 },

    bots: {
      lobbyWalkers: [],
      pitPlayers: [],
      pitPlayersGroup: null,
    },

    poker: {
      seats: 6,
      seatPos: [],
      stage: "idle",
      stageT: 0,
      activeSeat: 0,
      pot: 0,
      bet: 0,
      action: "CHECK",
      winnerSeat: -1,
      winnerName: "",

      // cards
      tableCardsRoot: null,
      community: [],

      // ✅ new: head cards per seat (2)
      headCardsRoot: null,
      headCards: [], // [seat][2]
      deck: [],
    },

    potHUD: { root: null, tag: null, lastText: "" },

    chips: {
      root: null,
      pool: [],
      fly: [],
      stacked: [],
      seatTargets: [],
      potCenter: null,
      lastTurnThrowAt: 0,
    },

    crown: {
      mesh: null,
      seat: -1,
      t: 0,
      active: false,
    },

    winnerBanner: {
      root: null,
      tag: null,
      active: false,
      t: 0,
    },

    marbleTex: null,
  };

  // ---------- utils ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const v3 = (x = 0, y = 0, z = 0) => new S.THREE.Vector3(x, y, z);

  function addCollider(o) { if (o) S.colliders.push(o); }

  function stdMat(hex, rough = 1, metal = 0.05, emiss = 0x000000, ei = 0) {
    return new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(hex),
      roughness: rough,
      metalness: metal,
      emissive: new S.THREE.Color(emiss),
      emissiveIntensity: ei,
    });
  }

  function faceYawOnly(obj, target) {
    const dx = target.x - obj.position.x;
    const dz = target.z - obj.position.z;
    const yaw = Math.atan2(dx, dz);
    obj.rotation.set(0, yaw, 0);
  }

  // billboard (always faces camera)
  function billboardToCamera(mesh) {
    if (!S.camera) return;
    const camPos = S.camera.getWorldPosition(v3());
    mesh.lookAt(camPos.x, camPos.y, camPos.z);
  }

  // ---------- procedural marble texture ----------
  function makeMarbleTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const g = c.getContext("2d");

    g.fillStyle = "#1a1f2a";
    g.fillRect(0, 0, c.width, c.height);

    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const r = Math.random() * 2.2;
      const a = 0.04 + Math.random() * 0.07;
      g.fillStyle = `rgba(220,230,255,${a})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }

    for (let k = 0; k < 36; k++) {
      const y0 = Math.random() * c.height;
      g.strokeStyle = `rgba(160,180,255,${0.08 + Math.random() * 0.12})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      let x = -50, y = y0;
      g.moveTo(x, y);
      for (let i = 0; i < 24; i++) {
        x += 50 + Math.random() * 60;
        y += (Math.random() - 0.5) * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    const tex = new S.THREE.CanvasTexture(c);
    tex.colorSpace = S.THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = S.THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.anisotropy = 4;
    return tex;
  }

  // ---------- lighting ----------
  function buildLights() {
    S.scene.add(new S.THREE.HemisphereLight(0xffffff, 0x30343a, 1.25));

    const dir = new S.THREE.DirectionalLight(0xffffff, 1.55);
    dir.position.set(8, 18, 10);
    S.scene.add(dir);

    const p1 = new S.THREE.PointLight(0x7fe7ff, 22, 90); p1.position.set(0, 9, 14); S.scene.add(p1);
    const p2 = new S.THREE.PointLight(0xff2d7a, 18, 90); p2.position.set(-14, 9, 0); S.scene.add(p2);
    const p3 = new S.THREE.PointLight(0xb56bff, 16, 90); p3.position.set(14, 9, -6); S.scene.add(p3);
    const p4 = new S.THREE.PointLight(0xffffff, 12, 70); p4.position.set(0, 7, -14); S.scene.add(p4);

    // table highlight
    const tableGlow = new S.THREE.PointLight(0xffffff, 10.5, 22);
    tableGlow.position.set(0, 3.2, 0);
    S.scene.add(tableGlow);

    S.log("[world] lights ✅");
  }

  // ---------- lobby shell ----------
  function buildLobbyShell() {
    const G = new S.THREE.Group();
    G.name = "Lobby";
    S.root.add(G);
    S.lobby = G;

    const floorMat = new S.THREE.MeshStandardMaterial({
      map: S.marbleTex,
      roughness: 0.9,
      metalness: 0.05,
      color: new S.THREE.Color(0xffffff),
    });

    const floor = new S.THREE.Mesh(new S.THREE.CircleGeometry(26, 140), floorMat);
    floor.rotation.x = -Math.PI / 2;
    G.add(floor);
    addCollider(floor);

    const wallMat = new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(0x6b7078),
      roughness: 1,
      metalness: 0.05,
      side: S.THREE.DoubleSide,
    });

    const wall = new S.THREE.Mesh(new S.THREE.CylinderGeometry(26, 26, 20, 160, 1, true), wallMat);
    wall.position.y = 10;
    G.add(wall);

    const ring = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(25.5, 0.10, 16, 180),
      stdMat(0x2a2f52, 0.8, 0.2, 0x7fe7ff, 0.55)
    );
    ring.position.y = 19.2;
    ring.rotation.x = Math.PI / 2;
    G.add(ring);
  }

  // ---------- pit system ----------
  function buildPitSystem() {
    const { radiusOuter, radiusInner, depth } = S.pit;

    const pitG = new S.THREE.Group();
    pitG.name = "PitSystem";
    S.lobby.add(pitG);
    S.pitG = pitG;

    // ring platform
    const ring = new S.THREE.Mesh(
      new S.THREE.RingGeometry(radiusInner + 0.08, radiusOuter, 160),
      stdMat(0x1a2030, 1, 0.06)
    );
    ring.rotation.x = -Math.PI / 2;
    pitG.add(ring);
    addCollider(ring);

    // pit floor (less deep)
    const pitFloor = new S.THREE.Mesh(
      new S.THREE.CircleGeometry(radiusInner, 160),
      stdMat(0x0a0c16, 1, 0.06)
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -depth;
    pitG.add(pitFloor);
    addCollider(pitFloor);

    // inner wall
    const pitWall = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(radiusInner, radiusInner, depth, 160, 1, true),
      new S.THREE.MeshStandardMaterial({
        color: new S.THREE.Color(0x3a3f48),
        roughness: 1,
        metalness: 0.04,
        side: S.THREE.DoubleSide,
      })
    );
    pitWall.position.y = -depth / 2;
    pitG.add(pitWall);

    // trim ring
    const trim = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(radiusInner + 0.06, 0.10, 18, 180),
      stdMat(0x1b2242, 0.65, 0.2, 0x7fe7ff, 0.35)
    );
    trim.position.y = 0.06;
    trim.rotation.x = Math.PI / 2;
    pitG.add(trim);

    // rails (double)
    const railRadius = radiusInner + 0.24;
    const rail1 = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(railRadius, 0.06, 18, 180),
      stdMat(0x2b2f52, 0.7, 0.25, 0x7fe7ff, 0.18)
    );
    rail1.position.y = 1.10;
    rail1.rotation.x = Math.PI / 2;
    pitG.add(rail1);

    const rail2 = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(railRadius, 0.04, 18, 180),
      stdMat(0x2b2f52, 0.75, 0.25, 0xb56bff, 0.14)
    );
    rail2.position.y = 0.72;
    rail2.rotation.x = Math.PI / 2;
    pitG.add(rail2);

    // posts
    const postGeo = new S.THREE.CylinderGeometry(0.045, 0.055, 1.20, 10);
    const postMat = stdMat(0x2f3650, 0.8, 0.18);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const p = new S.THREE.Mesh(postGeo, postMat);
      p.position.set(Math.cos(a) * railRadius, 0.62, Math.sin(a) * railRadius);
      pitG.add(p);
    }

    // stairs (auto for new depth) + slightly more open
    const steps = 8;
    const stepW = 1.35;
    const stepH = depth / steps;
    const stepD = 0.58;
    const stairMat = stdMat(0x202636, 1, 0.06);
    for (let i = 0; i < steps; i++) {
      const s = new S.THREE.Mesh(new S.THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
      s.position.set(radiusInner + 0.78 + i * 0.05, -i * stepH - stepH / 2, -0.10 - i * stepD);
      s.rotation.y = -Math.PI / 2;
      pitG.add(s);
      addCollider(s);
    }

    // TABLE (raised relative to pit)
    const tableG = new S.THREE.Group();
    tableG.name = "PitPokerTable";
    tableG.position.set(0, -depth + 0.42, 0); // ✅ higher so you can SEE it
    pitG.add(tableG);
    S.pitTableG = tableG;

    const base = new S.THREE.Mesh(new S.THREE.CylinderGeometry(1.2, 1.8, 0.95, 26), stdMat(0x141a2f, 0.95, 0.08));
    base.position.y = 0.45;
    tableG.add(base);

    const top = new S.THREE.Mesh(new S.THREE.CylinderGeometry(3.35, 3.35, 0.22, 80), stdMat(0x0f5b3f, 0.92, 0.04));
    top.position.y = 1.05;
    tableG.add(top);

    const rim = new S.THREE.Mesh(new S.THREE.TorusGeometry(3.38, 0.20, 14, 90), stdMat(0x2b1b12, 0.55, 0.08));
    rim.position.y = 1.12;
    rim.rotation.x = Math.PI / 2;
    tableG.add(rim);

    // chairs & seats
    const chairG = new S.THREE.Group();
    chairG.name = "PitChairs";
    tableG.add(chairG);

    const seatR = 4.45;
    S.poker.seatPos = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      S.poker.seatPos.push([Math.cos(a) * seatR, 0, Math.sin(a) * seatR]);
      const c = makeChair();
      c.position.set(Math.cos(a) * seatR, 0, Math.sin(a) * seatR);
      c.rotation.y = -a + Math.PI;
      chairG.add(c);
    }

    S.chips.potCenter = v3(0, 1.18, -0.10);
  }

  function makeChair() {
    const G = new S.THREE.Group();
    const mat = stdMat(0x2b2f52, 0.9, 0.08);
    const seat = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.75, 0.12, 0.75), mat);
    seat.position.y = 0.36;
    G.add(seat);

    const back = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.75, 0.8, 0.12), mat);
    back.position.set(0, 0.85, -0.30);
    G.add(back);

    const legGeo = new S.THREE.CylinderGeometry(0.04, 0.05, 0.55, 10);
    for (let k = 0; k < 4; k++) {
      const lx = k < 2 ? -0.30 : 0.30;
      const lz = (k % 2 === 0) ? -0.30 : 0.30;
      const leg = new S.THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.11, lz);
      G.add(leg);
    }
    return G;
  }

  // ---------- jumbotrons ----------
  function buildJumbotrons() {
    const G = new S.THREE.Group();
    S.lobby.add(G);

    const panelGeo = new S.THREE.PlaneGeometry(7.2, 4.1);
    const frameGeo = new S.THREE.BoxGeometry(7.55, 4.45, 0.18);

    const frameMat = stdMat(0x141a2f, 0.9, 0.15);
    const screenMat = new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(0x071023),
      roughness: 0.25,
      metalness: 0.05,
      emissive: new S.THREE.Color(0x1133ff),
      emissiveIntensity: 0.75,
    });

    const r = 25.85;
    const y = 11.2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const frame = new S.THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, y, z);
      frame.lookAt(0, y, 0);

      const screen = new S.THREE.Mesh(panelGeo, screenMat.clone());
      screen.position.set(0, 0, 0.10);
      frame.add(screen);

      G.add(frame);
    }
  }

  // ---------- card face textures (rank+suit) ----------
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

  function makeCardFaceTexture(rank, suit) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const g = c.getContext("2d");

    // background
    g.fillStyle = "rgba(245,248,255,1)";
    g.fillRect(0,0,c.width,c.height);

    // border
    g.strokeStyle = "rgba(20,30,60,0.25)";
    g.lineWidth = 10;
    g.strokeRect(8,8,c.width-16,c.height-16);

    const isRed = (suit === "♥" || suit === "♦");
    g.fillStyle = isRed ? "#d8193b" : "#1a1f2a";

    // corner rank/suit
    g.font = "bold 54px system-ui, Segoe UI, Arial";
    g.fillText(rank, 22, 70);
    g.font = "bold 52px system-ui, Segoe UI, Arial";
    g.fillText(suit, 22, 124);

    // center
    g.globalAlpha = 0.95;
    g.font = "bold 128px system-ui, Segoe UI, Arial";
    g.fillText(suit, 96, 222);

    const tex = new S.THREE.CanvasTexture(c);
    tex.colorSpace = S.THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function buildDeck() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
    // shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    S.poker.deck = deck;
  }

  function drawCardFromDeck() {
    if (!S.poker.deck.length) buildDeck();
    return S.poker.deck.pop();
  }

  // ---------- community cards (table) ----------
  function makeTableCard() {
    const geo = new S.THREE.PlaneGeometry(0.72, 1.00);
    const mat = new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(0xffffff),
      roughness: 0.8,
      metalness: 0.05,
      emissive: new S.THREE.Color(0x2b2f52),
      emissiveIntensity: 0.18,
      side: S.THREE.DoubleSide,
    });
    const m = new S.THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  // ---------- head cards (billboard, always face you) ----------
  function makeHeadCard() {
    const geo = new S.THREE.PlaneGeometry(0.58, 0.82);
    const mat = new S.THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: S.THREE.DoubleSide,
    });
    const m = new S.THREE.Mesh(geo, mat);
    m.userData.rank = "?";
    m.userData.suit = "?";
    return m;
  }

  // ---------- HUD ----------
  function makeBigHUD(lines) {
    const c = document.createElement("canvas");
    c.width = 1400; c.height = 420;
    const g = c.getContext("2d");

    const draw = (l1, l2) => {
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "rgba(10,12,18,0.42)";
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = "rgba(255,255,255,0.22)";
      g.lineWidth = 8;
      g.strokeRect(10, 10, c.width - 20, c.height - 20);

      g.fillStyle = "#e8ecff";
      g.textBaseline = "middle";

      g.font = "bold 76px system-ui, Segoe UI, Arial";
      g.fillText(l1, 46, 150);

      g.font = "bold 70px system-ui, Segoe UI, Arial";
      g.fillStyle = "#cdd4ff";
      g.fillText(l2, 46, 285);
    };

    draw(lines[0], lines[1]);

    const tex = new S.THREE.CanvasTexture(c);
    tex.colorSpace = S.THREE.SRGBColorSpace;

    const mat = new S.THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new S.THREE.PlaneGeometry(3.6, 1.05);
    const m = new S.THREE.Mesh(geo, mat);

    m.userData.setLines = (l1, l2) => { draw(l1, l2); tex.needsUpdate = true; };
    return m;
  }

  function buildPotHUD() {
    const hud = new S.THREE.Group();
    S.pitTableG.add(hud);
    S.potHUD.root = hud;

    hud.position.set(0, 3.05, -1.10);
    const tag = makeBigHUD(["POT: 0   TURN: 1   BET: 0", "ACTION: CHECK"]);
    hud.add(tag);
    S.potHUD.tag = tag;
  }

  function updateHUD(dt) {
    if (S.potHUD.root && S.camera) {
      const cam = S.camera.getWorldPosition(v3());
      S.potHUD.root.lookAt(cam.x, cam.y, cam.z);
      S.potHUD.root.rotation.x -= 0.16;
    }

    const P = S.poker;
    const turn = (P.activeSeat % P.seats) + 1;
    const bet = P.bet | 0;
    const pot = P.pot | 0;

    const line1 = `POT: ${pot}   TURN: ${turn}   BET: ${bet}`;
    const winner = P.winnerName ? `  WINNER: ${P.winnerName}` : "";
    const line2 = `ACTION: ${P.action}${winner}`;

    const key = line1 + "\n" + line2;
    if (key !== S.potHUD.lastText) {
      S.potHUD.lastText = key;
      S.potHUD.tag?.userData?.setLines?.(line1, line2);
    }
  }

  // ---------- winner banner (bigger + obvious) ----------
  function buildWinnerBanner() {
    const root = new S.THREE.Group();
    root.visible = false;
    S.pitTableG.add(root);
    S.winnerBanner.root = root;

    root.position.set(0, 4.05, 0);

    const tag = makeBigHUD(["WINNER!", "—"]);
    tag.scale.set(1.1, 1.1, 1.1);
    root.add(tag);
    S.winnerBanner.tag = tag;
  }

  function startWinnerBanner(name) {
    S.winnerBanner.active = true;
    S.winnerBanner.t = 0;
    S.winnerBanner.root.visible = true;
    S.winnerBanner.tag.userData.setLines("WINNER!", name);
  }

  function updateWinnerBanner(dt) {
    if (!S.winnerBanner.active) return;
    S.winnerBanner.t += dt;

    // face player always
    billboardToCamera(S.winnerBanner.root);

    // float pulse
    S.winnerBanner.root.position.y = 4.05 + Math.sin(S.winnerBanner.t * 2.2) * 0.06;

    if (S.winnerBanner.t > 3.2) {
      S.winnerBanner.root.visible = false;
      S.winnerBanner.active = false;
    }
  }

  // ---------- chips ----------
  function buildChips() {
    const chips = new S.THREE.Group();
    S.pitTableG.add(chips);
    S.chips.root = chips;

    const chipGeo = new S.THREE.CylinderGeometry(0.095, 0.095, 0.03, 18);
    const chipMat = new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(0xff2d7a),
      roughness: 0.55,
      metalness: 0.12,
      emissive: new S.THREE.Color(0xff2d7a),
      emissiveIntensity: 0.12,
    });

    for (let i = 0; i < 200; i++) {
      const c = new S.THREE.Mesh(chipGeo, chipMat.clone());
      c.visible = false;
      c.rotation.set(0, 0, 0);
      chips.add(c);
      S.chips.pool.push(c);
    }

    S.chips.seatTargets = [];
    for (let s = 0; s < S.poker.seats; s++) {
      const p = S.poker.seatPos[s];
      S.chips.seatTargets.push(v3(p[0] * 0.52, 1.22, p[2] * 0.52));
    }
  }

  function getFreeChip() {
    return S.chips.pool.find(c => !c.visible) || null;
  }

  function potStackPos() {
    const base = S.chips.potCenter.clone();
    const n = S.chips.stacked.length;
    const jitter = 0.16;
    const ox = (Math.random() - 0.5) * jitter;
    const oz = (Math.random() - 0.5) * jitter;
    const oy = 0.03 * (n % 12);
    return base.add(v3(ox, oy, oz));
  }

  function throwChip(from, to, landToStack = true, landHide = false) {
    const chip = getFreeChip();
    if (!chip) return;

    chip.visible = true;
    chip.position.copy(from);
    chip.rotation.set(0, 0, 0);

    S.chips.fly.push({
      chip,
      t: 0,
      dur: 0.42 + Math.random() * 0.20,
      from: from.clone(),
      to: to.clone(),
      arc: 0.34 + Math.random() * 0.26,
      landToStack,
      landHide,
    });
  }

  function vacuumPotToWinner(seat) {
    const to = S.chips.seatTargets[seat]?.clone() || v3(0, 1.2, 3.0);
    for (const chip of S.chips.stacked) {
      throwChip(
        chip.position.clone(),
        to.clone().add(v3((Math.random()-0.5)*0.22, (Math.random()*0.12), (Math.random()-0.5)*0.22)),
        false,
        true
      );
    }
    S.chips.stacked.length = 0;
  }

  function updateChips(dt) {
    const P = S.poker;
    const isBetting = (P.stage !== "idle" && P.stage !== "showdown");
    const now = S.t;

    // ✅ only active seat throws
    if (isBetting && (now - S.chips.lastTurnThrowAt) > 0.75) {
      S.chips.lastTurnThrowAt = now;

      const seat = P.activeSeat;
      const from = S.chips.seatTargets[seat]?.clone();
      if (from) {
        const to = potStackPos();
        throwChip(from, to, true, false);
        P.pot += (P.bet || 50);
      }
    }

    for (let i = S.chips.fly.length - 1; i >= 0; i--) {
      const f = S.chips.fly[i];
      f.t += dt;
      const u = clamp(f.t / f.dur, 0, 1);
      const yArc = Math.sin(u * Math.PI) * f.arc;

      f.chip.position.set(
        lerp(f.from.x, f.to.x, u),
        lerp(f.from.y, f.to.y, u) + yArc,
        lerp(f.from.z, f.to.z, u)
      );
      f.chip.rotation.y += dt * 6.0;

      if (u >= 1) {
        f.chip.position.copy(f.to);
        f.chip.rotation.set(0, f.chip.rotation.y, 0);

        if (f.landToStack) S.chips.stacked.push(f.chip);
        if (f.landHide) f.chip.visible = false;

        S.chips.fly.splice(i, 1);
      }
    }
  }

  // ---------- crown (bigger + brighter) ----------
  function buildCrown() {
    const crown = new S.THREE.Group();
    crown.visible = false;

    const base = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(0.22, 0.27, 0.12, 18),
      stdMat(0x2b1b12, 0.35, 0.22, 0xffcc00, 0.85)
    );
    base.position.y = 0.06;
    crown.add(base);

    const ring = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(0.24, 0.035, 12, 28),
      stdMat(0x8a6b2a, 0.28, 0.30, 0xffcc00, 1.05)
    );
    ring.position.y = 0.12;
    ring.rotation.x = Math.PI / 2;
    crown.add(ring);

    const spikeGeo = new S.THREE.ConeGeometry(0.06, 0.18, 10);
    const spikeMat = stdMat(0xffcc00, 0.25, 0.30, 0xffcc00, 0.85);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = new S.THREE.Mesh(spikeGeo, spikeMat);
      s.position.set(Math.cos(a) * 0.20, 0.22, Math.sin(a) * 0.20);
      s.rotation.y = a;
      crown.add(s);
    }

    const glow = new S.THREE.PointLight(0xffcc00, 12, 8);
    glow.position.set(0, 0.32, 0);
    crown.add(glow);

    S.pitTableG.add(crown);
    S.crown.mesh = crown;
  }

  function startCrown(seat) {
    S.crown.seat = seat;
    S.crown.t = 0;
    S.crown.active = true;
    S.crown.mesh.visible = true;
  }

  function updateCrown(dt) {
    if (!S.crown.active || !S.crown.mesh) return;

    const seat = S.crown.seat;
    const bot = S.bots.pitPlayers.find(b => b.userData.seat === seat);
    if (!bot) return;

    S.crown.t += dt;
    const rise = clamp(S.crown.t / 0.60, 0, 1);

    const headPos = bot.getWorldPosition(v3());
    headPos.y += 2.25 + rise * 0.55;

    S.crown.mesh.position.copy(headPos);
    S.crown.mesh.rotation.y += dt * 1.8;

    // crown faces player a bit
    billboardToCamera(S.crown.mesh);

    if (S.crown.t > 3.2) {
      S.crown.mesh.visible = false;
      S.crown.active = false;
      S.crown.seat = -1;
    }
  }

  // ---------- bots (with knees + ankles) ----------
  function makeTextTag(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(10,12,18,0.35)";
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "rgba(255,255,255,0.22)";
    g.lineWidth = 4;
    g.strokeRect(6, 6, c.width - 12, c.height - 12);
    g.fillStyle = "#e8ecff";
    g.font = "bold 44px system-ui, Segoe UI, Arial";
    g.textBaseline = "middle";
    g.fillText(text, 20, c.height / 2);

    const tex = new S.THREE.CanvasTexture(c);
    tex.colorSpace = S.THREE.SRGBColorSpace;

    const mat = new S.THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new S.THREE.PlaneGeometry(1.9, 0.48);
    return new S.THREE.Mesh(geo, mat);
  }

  function makeBot(name = "BOT", color = 0x2a2f52, accent = 0x7fe7ff) {
    const G = new S.THREE.Group();
    G.name = name;

    const body = stdMat(color, 0.9, 0.08);
    const trim = stdMat(0x151a33, 0.9, 0.08, accent, 0.10);

    const torso = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.52, 0.78, 0.34), body);
    torso.position.y = 1.25;
    G.add(torso);

    const shoulder = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.68, 0.18, 0.36), trim);
    shoulder.position.y = 1.62;
    G.add(shoulder);

    const head = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.22, 18, 18), trim);
    head.position.y = 1.86;
    head.userData._head = true;
    G.add(head);

    const pelvis = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.52, 0.22, 0.30), body);
    pelvis.position.y = 0.92;
    G.add(pelvis);

    function arm(side) {
      const a = new S.THREE.Group();
      a.position.set(0.38 * side, 1.55, 0);

      const upper = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.06, 0.07, 0.36, 10), body);
      upper.position.y = -0.18;
      upper.userData._arm = side;
      a.add(upper);

      const elbow = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.07, 12, 12), trim);
      elbow.position.y = -0.36;
      a.add(elbow);

      const fore = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.055, 0.06, 0.33, 10), body);
      fore.position.y = -0.52;
      fore.userData._fore = side;
      a.add(fore);

      const hand = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.12, 0.08, 0.14), trim);
      hand.position.y = -0.72;
      a.add(hand);

      return a;
    }

    function leg(side) {
      const l = new S.THREE.Group();
      l.position.set(0.16 * side, 0.85, 0);

      const thigh = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.08, 0.09, 0.40, 10), body);
      thigh.position.y = -0.22;
      thigh.userData._leg = side;
      l.add(thigh);

      const knee = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.085, 12, 12), trim);
      knee.position.y = -0.44;
      l.add(knee);

      const calf = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.07, 0.08, 0.40, 10), body);
      calf.position.y = -0.64;
      calf.userData._calf = side;
      l.add(calf);

      const ankle = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.075, 12, 12), trim);
      ankle.position.y = -0.84;
      l.add(ankle);

      const foot = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.22, 0.08, 0.34), trim);
      foot.position.set(0, -0.92, 0.07);
      l.add(foot);

      return l;
    }

    G.add(arm(-1)); G.add(arm(1));
    G.add(leg(-1)); G.add(leg(1));

    const tag = makeTextTag(name);
    tag.position.set(0, 2.38, 0);
    tag.scale.setScalar(0.42);
    G.add(tag);

    G.userData.walk = { speed: 0.22 + Math.random() * 0.12 };
    G.userData.seated = false;

    return G;
  }

  function buildBots() {
    // walkers
    const walkers = new S.THREE.Group();
    S.lobby.add(walkers);

    for (let i = 0; i < 6; i++) {
      const b = makeBot(`BOT ${i + 1}`);
      b.userData.pathA = (i / 6) * Math.PI * 2;
      walkers.add(b);
      S.bots.lobbyWalkers.push(b);
    }

    // seated pit players
    const seated = new S.THREE.Group();
    S.pitTableG.add(seated);
    S.bots.pitPlayersGroup = seated;

    for (let i = 0; i < 6; i++) {
      const b = makeBot(i === 0 ? "YOU" : `BOT ${i}`, 0x2a2f52, i === 0 ? 0xffcc00 : 0x7fe7ff);
      const p = S.poker.seatPos[i];
      b.position.set(p[0], 0, p[2]);
      faceYawOnly(b, v3(0, 0, 0));
      b.userData.seated = true;
      b.userData.seat = i;
      seated.add(b);
      S.bots.pitPlayers.push(b);
    }
  }

  function updateBots(dt) {
    // walkers
    const R = 17.0;
    for (const b of S.bots.lobbyWalkers) {
      const sp = b.userData.walk?.speed || 0.25;
      b.userData.pathA += dt * sp * 0.45;
      const a = b.userData.pathA;

      b.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);

      const nx = Math.cos(a + 0.02) * R;
      const nz = Math.sin(a + 0.02) * R;
      faceYawOnly(b, v3(nx, 0, nz));

      // nicer stride (knee/ankle reads now)
      const phase = S.t * (2.6 + sp * 3.6);
      b.traverse((o) => {
        if (o.userData?._leg) o.rotation.x = Math.sin(phase) * 0.60 * o.userData._leg;
        if (o.userData?._calf) o.rotation.x = Math.max(0, Math.sin(phase + 0.9)) * 0.42 * o.userData._calf;
        if (o.userData?._arm) o.rotation.x = Math.sin(phase + Math.PI) * 0.42 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.max(0, Math.sin(phase + Math.PI + 0.9)) * 0.24 * o.userData._fore;
      });
    }

    // seated idle
    for (const b of S.bots.pitPlayers) {
      const ph = S.t * 1.1 + (b.userData.seat || 0) * 0.35;
      b.traverse((o) => {
        if (o.userData?._arm) o.rotation.x = Math.sin(ph) * 0.10 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.sin(ph + 0.7) * 0.07 * o.userData._fore;
        if (o.userData?._leg) o.rotation.x = 0;
        if (o.userData?._calf) o.rotation.x = 0;
      });
    }
  }

  // ---------- poker init & visuals ----------
  function initPoker() {
    const P = S.poker;
    P.stage = "preflop";
    P.stageT = 0;
    P.activeSeat = 0;
    P.pot = 0;
    P.bet = 0;
    P.action = "CHECK";
    P.winnerSeat = -1;
    P.winnerName = "";

    buildDeck();

    // table cards root
    P.tableCardsRoot = new S.THREE.Group();
    S.pitTableG.add(P.tableCardsRoot);

    // community cards (higher)
    P.community = [];
    for (let i = 0; i < 5; i++) {
      const c = makeTableCard();
      c.position.set(-1.7 + i * 0.90, 2.05, 0); // ✅ higher like you asked
      c.visible = false;
      P.tableCardsRoot.add(c);
      P.community.push(c);
    }

    // head cards root
    P.headCardsRoot = new S.THREE.Group();
    S.pitTableG.add(P.headCardsRoot);

    P.headCards = [];
    for (let s = 0; s < P.seats; s++) {
      const pair = [];
      for (let k = 0; k < 2; k++) {
        const hc = makeHeadCard();
        hc.visible = true;
        P.headCardsRoot.add(hc);
        pair.push(hc);
      }
      P.headCards.push(pair);
    }

    newHand();
  }

  function applyCardTexture(mesh, rank, suit) {
    const tex = makeCardFaceTexture(rank, suit);
    if (mesh.material.map) mesh.material.map.dispose?.();
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
    mesh.userData.rank = rank;
    mesh.userData.suit = suit;
  }

  function newHand() {
    const P = S.poker;
    P.stage = "preflop";
    P.stageT = 0;
    P.activeSeat = 0;
    P.pot = 0;
    P.bet = 0;
    P.action = "CHECK";
    P.winnerSeat = -1;
    P.winnerName = "";

    // clear chips
    for (const c of S.chips.stacked) c.visible = false;
    S.chips.stacked.length = 0;
    for (const f of S.chips.fly) f.chip.visible = false;
    S.chips.fly.length = 0;

    // hide community
    for (let i = 0; i < 5; i++) P.community[i].visible = false;

    // deal head cards per player (so you can SEE ALL of them)
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) {
        const card = drawCardFromDeck();
        applyCardTexture(P.headCards[s][k], card.r, card.s);
      }
    }

    // community cards textures too (so you can see what they are)
    for (let i = 0; i < 5; i++) {
      const card = drawCardFromDeck();
      applyCardTexture(P.community[i], card.r, card.s);
    }

    S.crown.active = false;
    S.crown.seat = -1;
    S.crown.mesh.visible = false;

    S.winnerBanner.active = false;
    S.winnerBanner.root.visible = false;

    S.log?.("[poker] new hand ✅");
  }

  // slower cadence so you can watch
  const CADENCE = { flop: 2.2, turn: 2.2, river: 2.2, complete: 2.2, showdown: 3.6 };

  function stepPoker(dt) {
    const P = S.poker;
    P.stageT += dt;

    // active seat rotates for chip throws + HUD turn feel
    if (P.stage !== "idle") {
      if (P.stageT > 0.2 && (Math.floor(P.stageT / 1.25) !== Math.floor((P.stageT - dt) / 1.25))) {
        P.activeSeat = (P.activeSeat + 1) % P.seats;
        P.action = "BET";
        P.bet = 25 + ((Math.random() * 220) | 0);
      }
    }

    if (P.stage === "preflop" && P.stageT > CADENCE.flop) {
      for (let i = 0; i < 3; i++) P.community[i].visible = true;
      P.stage = "flop"; P.stageT = 0;
      S.log?.("[poker] community +3 ✅");
    }

    if (P.stage === "flop" && P.stageT > CADENCE.turn) {
      P.community[3].visible = true;
      P.stage = "turn"; P.stageT = 0;
      S.log?.("[poker] community +1 ✅");
    }

    if (P.stage === "turn" && P.stageT > CADENCE.river) {
      P.community[4].visible = true;
      P.stage = "river"; P.stageT = 0;
      S.log?.("[poker] community +1 ✅");
    }

    if (P.stage === "river" && P.stageT > CADENCE.complete) {
      P.stage = "showdown";
      P.stageT = 0;
      S.log?.("[poker] hand complete ✅");
    }

    if (P.stage === "showdown" && P.stageT > CADENCE.showdown) {
      doShowdown();
      P.stage = "idle";
      P.stageT = 0;
      S.log?.("[poker] showdown ✅");
      setTimeout(() => newHand(), 2600); // longer so you notice winner
    }
  }

  function doShowdown() {
    const P = S.poker;
    const w = Math.floor(Math.random() * P.seats);
    P.winnerSeat = w;
    P.winnerName = w === 0 ? "YOU" : `BOT ${w}`;
    P.action = "WIN";
    P.pot = Math.max(P.pot, 1200 + ((Math.random() * 3800) | 0));

    startCrown(w);
    startWinnerBanner(P.winnerName);
    vacuumPotToWinner(w);
  }

  // ---------- head card placement + always face player ----------
  function updateHeadCards(dt) {
    const P = S.poker;
    if (!S.camera) return;

    for (let s = 0; s < P.seats; s++) {
      const bot = S.bots.pitPlayers.find(b => b.userData.seat === s);
      if (!bot) continue;

      // find head world position
      let head = null;
      bot.traverse(o => { if (o.userData?._head && !head) head = o; });

      const headPos = (head ? head.getWorldPosition(v3()) : bot.getWorldPosition(v3()));
      headPos.y += 0.55; // above head

      // spread the 2 cards slightly
      const left = P.headCards[s][0];
      const right = P.headCards[s][1];

      // keep them visible even from the rail
      left.position.copy(headPos).add(v3(-0.22, 0.05, 0));
      right.position.copy(headPos).add(v3(0.22, 0.05, 0));

      // ALWAYS face player
      billboardToCamera(left);
      billboardToCamera(right);

      // slight tilt so they look like floating HUD cards
      left.rotation.x += 0.10;
      right.rotation.x += 0.10;
    }
  }

  // ---------- init / update / colliders ----------
  async function init({ THREE, scene, renderer, camera, player, controllers, log }) {
    S.THREE = THREE;
    S.scene = scene;
    S.renderer = renderer;
    S.camera = camera;
    S.player = player;
    S.controllers = controllers;
    S.log = log || console.log;

    S.root = new THREE.Group();
    scene.add(S.root);

    S.colliders = [];
    S.t = 0;

    S.log("[world] init v11 …");

    S.marbleTex = makeMarbleTexture();

    buildLights();
    buildLobbyShell();
    buildPitSystem();
    buildJumbotrons();

    initPoker();
    buildPotHUD();
    buildChips();
    buildBots();
    buildCrown();
    buildWinnerBanner();

    // spawn lobby standing
    window.__SEATED_MODE = false;
    S.player.position.set(0, 0, 10);
    S.player.rotation.y = Math.PI;

    S.log("[world] build complete ✅ (MASTER v11)");
  }

  function update(dt) {
    S.t += dt;

    stepPoker(dt);

    // chips + HUD + bots + crown/banner + headcards
    updateChips(dt);
    updateHUD(dt);
    updateBots(dt);
    updateCrown(dt);
    updateWinnerBanner(dt);
    updateHeadCards(dt);

    // community cards face-ish: keep them flat (they're table cards)
    // but you can still see rank/suit now because textures are on them.
  }

  function colliders() { return S.colliders; }

  return { init, update, colliders };
})();
