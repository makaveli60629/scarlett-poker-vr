// /js/world.js — Scarlett MASTER WORLD v10 (FULL POLISH + TURN CHIPS + WINNER CROWN)
// ✅ Lobby pit is primary: divot + rails + trim + stairs + table in pit
// ✅ Seated pit players (6) + walkers around outer ring (upright)
// ✅ Poker visuals on PIT table (raised cards, brighter emissive faces)
// ✅ Pot HUD 2-line (POT/TURN/BET) + (ACTION/WINNER)
// ✅ Turn-based chip throws + pot stacking
// ✅ Showdown: winner cards reveal + crown rise + chips vacuum to winner
// ✅ Slow cadence (watchable)
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

    pit: { radiusOuter: 12.0, radiusInner: 7.2, depth: 1.55 },

    bots: {
      lobbyWalkers: [],
      pitPlayers: [], // includes YOU at seat 0
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
      cardsRoot: null,
      community: [],
      hole: [],
      holeHome: [], // [seat][2] home transforms
      hoverOnlyCommunity: true,
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

  // yaw-only facing (prevents “laying down” from lookAt pitch)
  function faceYawOnly(obj, target) {
    const dx = target.x - obj.position.x;
    const dz = target.z - obj.position.z;
    const yaw = Math.atan2(dx, dz);
    obj.rotation.set(0, yaw, 0);
  }

  // ---------- procedural marble-like texture ----------
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

    g.strokeStyle = "rgba(255,255,255,0.03)";
    g.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * c.width;
      g.beginPath(); g.moveTo(t, 0); g.lineTo(t, c.height); g.stroke();
      g.beginPath(); g.moveTo(0, t); g.lineTo(c.width, t); g.stroke();
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
    const hemi = new S.THREE.HemisphereLight(0xffffff, 0x30343a, 1.25);
    S.scene.add(hemi);

    const dir = new S.THREE.DirectionalLight(0xffffff, 1.55);
    dir.position.set(8, 18, 10);
    S.scene.add(dir);

    const p1 = new S.THREE.PointLight(0x7fe7ff, 22, 90);
    p1.position.set(0, 9, 14);
    S.scene.add(p1);

    const p2 = new S.THREE.PointLight(0xff2d7a, 18, 90);
    p2.position.set(-14, 9, 0);
    S.scene.add(p2);

    const p3 = new S.THREE.PointLight(0xb56bff, 16, 90);
    p3.position.set(14, 9, -6);
    S.scene.add(p3);

    const p4 = new S.THREE.PointLight(0xffffff, 12, 70);
    p4.position.set(0, 7, -14);
    S.scene.add(p4);

    // table highlight so cards never read black
    const tableGlow = new S.THREE.PointLight(0xffffff, 9.5, 18);
    tableGlow.position.set(0, 3.0, 0);
    S.scene.add(tableGlow);

    S.log("[world] lights ✅ (bright + table glow)");
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
      color: new S.THREE.Color(0x6b7078), // gray
      roughness: 1,
      metalness: 0.05,
      side: S.THREE.DoubleSide,
    });

    const wall = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(26, 26, 20, 160, 1, true),
      wallMat
    );
    wall.position.y = 10;
    G.add(wall);

    const ring = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(25.5, 0.10, 16, 180),
      stdMat(0x2a2f52, 0.8, 0.2, 0x7fe7ff, 0.55)
    );
    ring.position.y = 19.2;
    ring.rotation.x = Math.PI / 2;
    G.add(ring);

    S.log("[world] lobby shell ✅ (gray + tall)");
  }

  // ---------- pit + rails + trim + stairs + table ----------
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

    // pit floor (down)
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

    // trim ring so divot reads
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
    rail1.position.y = 1.05;
    rail1.rotation.x = Math.PI / 2;
    pitG.add(rail1);

    const rail2 = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(railRadius, 0.04, 18, 180),
      stdMat(0x2b2f52, 0.75, 0.25, 0xb56bff, 0.14)
    );
    rail2.position.y = 0.68;
    rail2.rotation.x = Math.PI / 2;
    pitG.add(rail2);

    const postGeo = new S.THREE.CylinderGeometry(0.045, 0.055, 1.15, 10);
    const postMat = stdMat(0x2f3650, 0.8, 0.18);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const p = new S.THREE.Mesh(postGeo, postMat);
      p.position.set(Math.cos(a) * railRadius, 0.58, Math.sin(a) * railRadius);
      pitG.add(p);
    }

    // gate visual
    const gate = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(0.9, 0.95, 0.08),
      stdMat(0x12162a, 0.9, 0.1, 0x7fe7ff, 0.18)
    );
    gate.position.set(railRadius, 0.58, 0);
    gate.rotation.y = -Math.PI / 2;
    pitG.add(gate);

    // stairs down
    const steps = 9;
    const stepW = 1.35;
    const stepH = depth / steps;
    const stepD = 0.56;
    const stairMat = stdMat(0x202636, 1, 0.06);
    for (let i = 0; i < steps; i++) {
      const s = new S.THREE.Mesh(new S.THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
      s.position.set(radiusInner + 0.78 + i * 0.05, -i * stepH - stepH / 2, -0.25 - i * stepD);
      s.rotation.y = -Math.PI / 2;
      pitG.add(s);
      addCollider(s);
    }

    // PIT TABLE
    const tableG = new S.THREE.Group();
    tableG.name = "PitPokerTable";
    tableG.position.set(0, -depth + 0.12, 0);
    pitG.add(tableG);
    S.pitTableG = tableG;

    const base = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(1.2, 1.8, 0.95, 26),
      stdMat(0x141a2f, 0.95, 0.08)
    );
    base.position.y = 0.45;
    tableG.add(base);

    const top = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(3.35, 3.35, 0.22, 80),
      stdMat(0x0f5b3f, 0.92, 0.04)
    );
    top.position.y = 1.05;
    tableG.add(top);

    const rim = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.38, 0.20, 14, 90),
      stdMat(0x2b1b12, 0.55, 0.08)
    );
    rim.position.y = 1.12;
    rim.rotation.x = Math.PI / 2;
    tableG.add(rim);

    // chairs & seat positions
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

    // pot center for chip stacking
    S.chips.potCenter = v3(0, 1.10, -0.18);

    S.log("[world] pit system ✅ (trim + double rail + aligned)");
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
    G.name = "Jumbotrons";
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

    S.log("[world] jumbotrons ✅");
  }

  // ---------- bots ----------
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
    g.font = "bold 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
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

      const thigh = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.08, 0.09, 0.43, 10), body);
      thigh.position.y = -0.25;
      thigh.userData._leg = side;
      l.add(thigh);

      const calf = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.07, 0.08, 0.43, 10), body);
      calf.position.y = -0.68;
      calf.userData._calf = side;
      l.add(calf);

      const foot = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.22, 0.08, 0.34), trim);
      foot.position.set(0, -0.90, 0.07);
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
    walkers.name = "LobbyWalkers";
    S.lobby.add(walkers);

    for (let i = 0; i < 6; i++) {
      const b = makeBot(`BOT ${i + 1}`);
      b.userData.pathA = (i / 6) * Math.PI * 2;
      walkers.add(b);
      S.bots.lobbyWalkers.push(b);
    }

    // seated pit players
    const seated = new S.THREE.Group();
    seated.name = "PitPlayers";
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

    S.log("[world] bots ✅ (walkers + seated players)");
  }

  // ---------- cards ----------
  function makeCard() {
    const geo = new S.THREE.PlaneGeometry(0.62, 0.86);
    const mat = new S.THREE.MeshStandardMaterial({
      color: new S.THREE.Color(0xf2f5ff),
      roughness: 0.85,
      metalness: 0.05,
      emissive: new S.THREE.Color(0x2b2f52),
      emissiveIntensity: 0.22,
      side: S.THREE.DoubleSide,
    });

    const m = new S.THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.userData.isCommunity = false;
    m.userData.seat = -1;
    return m;
  }

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

    P.cardsRoot = new S.THREE.Group();
    P.cardsRoot.name = "PokerCards";
    S.pitTableG.add(P.cardsRoot);

    // community (raised)
    P.community = [];
    for (let i = 0; i < 5; i++) {
      const c = makeCard();
      c.userData.isCommunity = true;
      c.position.set(-1.7 + i * 0.85, 1.62, 0);
      c.visible = false;
      P.cardsRoot.add(c);
      P.community.push(c);
    }

    // hole cards
    P.hole = [];
    P.holeHome = [];
    for (let s = 0; s < P.seats; s++) {
      const pair = [];
      const homePair = [];
      for (let k = 0; k < 2; k++) {
        const c = makeCard();
        c.userData.isCommunity = false;
        c.userData.seat = s;
        c.visible = false;
        P.cardsRoot.add(c);
        pair.push(c);
        homePair.push({ pos: v3(), rotY: 0, y: 0 });
      }
      P.hole.push(pair);
      P.holeHome.push(homePair);
    }

    layoutHole();
    newHand();
    S.log("[poker] init ✅ seats=6");
  }

  function layoutHole() {
    const P = S.poker;
    for (let s = 0; s < P.seats; s++) {
      const seat = P.seatPos[s];
      const base = v3(seat[0], 1.56, seat[2]);
      const inward = base.clone().setY(0).normalize().multiplyScalar(-0.72);

      const c0 = P.hole[s][0], c1 = P.hole[s][1];

      c0.position.copy(base.clone().add(inward).add(v3(-0.20, 0, 0)));
      c1.position.copy(base.clone().add(inward).add(v3(0.20, 0, 0)));

      c0.lookAt(0, 1.56, 0);
      c1.lookAt(0, 1.56, 0);
      c0.rotation.x = -Math.PI / 2;
      c1.rotation.x = -Math.PI / 2;

      // save “home” for reset after showdown reveal
      S.poker.holeHome[s][0].pos.copy(c0.position);
      S.poker.holeHome[s][1].pos.copy(c1.position);
    }
  }

  function resetHoleToHome() {
    const P = S.poker;
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) {
        const c = P.hole[s][k];
        const home = P.holeHome[s][k];
        c.position.copy(home.pos);
        c.scale.set(1, 1, 1);
        c.material.color.setHex(0xf2f5ff);
        c.material.emissiveIntensity = 0.22;
      }
    }
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

    // reset stacked chips back to pool
    for (const c of S.chips.stacked) c.visible = false;
    S.chips.stacked.length = 0;

    // clear flying chips
    for (const f of S.chips.fly) f.chip.visible = false;
    S.chips.fly.length = 0;

    // cards
    resetHoleToHome();
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) P.hole[s][k].visible = true;
    }
    for (let i = 0; i < 5; i++) {
      P.community[i].visible = false;
      P.community[i].position.y = 1.62;
      P.community[i].material.emissiveIntensity = 0.22;
    }

    S.crown.active = false;
    S.crown.seat = -1;

    S.log("[poker] new hand ✅");
  }

  // slow cadence so you can watch
  const CADENCE = {
    flop: 2.0,
    turn: 2.0,
    river: 2.0,
    complete: 2.0,
    showdown: 2.5,
  };

  function stepPoker(dt) {
    const P = S.poker;
    P.stageT += dt;

    // simple per-turn action (for chips + HUD)
    if (P.stage !== "idle") {
      // rotate active seat every ~1.2s during betting
      if (P.stageT > 0.2 && (Math.floor(P.stageT / 1.2) !== Math.floor((P.stageT - dt) / 1.2))) {
        P.activeSeat = (P.activeSeat + 1) % P.seats;
        P.action = "BET";
        P.bet = 25 + ((Math.random() * 220) | 0);
      }
    }

    if (P.stage === "preflop" && P.stageT > CADENCE.flop) {
      for (let i = 0; i < 3; i++) P.community[i].visible = true;
      P.stage = "flop"; P.stageT = 0;
      S.log("[poker] community +3 ✅");
    }

    if (P.stage === "flop" && P.stageT > CADENCE.turn) {
      P.community[3].visible = true;
      P.stage = "turn"; P.stageT = 0;
      S.log("[poker] community +1 ✅");
    }

    if (P.stage === "turn" && P.stageT > CADENCE.river) {
      P.community[4].visible = true;
      P.stage = "river"; P.stageT = 0;
      S.log("[poker] community +1 ✅");
    }

    if (P.stage === "river" && P.stageT > CADENCE.complete) {
      P.stage = "showdown";
      P.stageT = 0;
      S.log("[poker] hand complete ✅ (idle)");
    }

    if (P.stage === "showdown" && P.stageT > CADENCE.showdown) {
      doShowdown();
      P.stage = "idle";
      P.stageT = 0;
      S.log("[poker] showdown ✅");

      // next hand after a moment
      setTimeout(() => newHand(), 1600);
    }
  }

  function doShowdown() {
    const P = S.poker;
    const w = Math.floor(Math.random() * P.seats); // could be YOU too
    P.winnerSeat = w;
    P.winnerName = w === 0 ? "YOU" : `BOT ${w}`;
    P.action = "WIN";
    P.pot = 1200 + ((Math.random() * 3800) | 0);

    // reveal winner hole cards
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) {
        const c = P.hole[s][k];
        if (s === w) {
          c.material.emissiveIntensity = 0.75;
          c.scale.set(1.08, 1.08, 1.08);
          c.position.y += 0.20;
          c.position.z += 0.28;
        } else {
          c.material.color.setHex(0x8a92a3);
          c.material.emissiveIntensity = 0.08;
          c.scale.set(0.98, 0.98, 0.98);
        }
      }
    }

    // crown rise
    startCrown(w);

    // vacuum chips to winner (if any stacked)
    vacuumPotToWinner(w);
  }

  function updateCommunityHover(dt) {
    const P = S.poker;
    if (!P.hoverOnlyCommunity || !S.camera) return;

    const camPos = S.camera.getWorldPosition(v3());
    const camDir = v3(0, 0, -1)
      .applyQuaternion(S.camera.getWorldQuaternion(new S.THREE.Quaternion()))
      .normalize();

    for (const c of P.community) {
      if (!c.visible) continue;

      const w = c.getWorldPosition(v3());
      const to = w.clone().sub(camPos);
      const dist = to.length();
      const dot = to.normalize().dot(camDir);

      const focused = dist < 9.0 && dot > 0.985;
      const ty = focused ? 1.90 : 1.62;
      c.position.y = lerp(c.position.y, ty, clamp(dt * 6, 0, 1));
      c.material.emissiveIntensity = focused ? 0.70 : 0.22;
    }
  }

  // ---------- HUD (2-line) ----------
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

      g.font = "bold 76px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      g.fillText(l1, 46, 150);

      g.font = "bold 70px system-ui, -apple-system, Segoe UI, Roboto, Arial";
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
    hud.name = "PotHUD";
    S.pitTableG.add(hud);
    S.potHUD.root = hud;

    hud.position.set(0, 2.85, -1.10); // higher
    const tag = makeBigHUD(["POT: 0   TURN: 1   BET: 0", "ACTION: CHECK"]);
    hud.add(tag);
    S.potHUD.tag = tag;

    S.log("[world] pot HUD ✅ (2-line + raised)");
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

  // ---------- chips (turn-based + stack + vacuum) ----------
  function buildChips() {
    const chips = new S.THREE.Group();
    chips.name = "Chips";
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

    for (let i = 0; i < 180; i++) {
      const c = new S.THREE.Mesh(chipGeo, chipMat.clone());
      c.visible = false;
      c.rotation.set(0, 0, 0); // flat
      chips.add(c);
      S.chips.pool.push(c);
    }

    S.chips.seatTargets = [];
    for (let s = 0; s < S.poker.seats; s++) {
      const p = S.poker.seatPos[s];
      S.chips.seatTargets.push(v3(p[0] * 0.52, 1.10, p[2] * 0.52));
    }

    S.log("[world] chips ✅ (pool ready)");
  }

  function getFreeChip() {
    return S.chips.pool.find(c => !c.visible) || null;
  }

  function potStackPos() {
    const base = S.chips.potCenter.clone();
    const n = S.chips.stacked.length;
    const ring = Math.min(8, Math.floor(n / 10));
    const jitter = 0.18 - ring * 0.01;

    const ox = (Math.random() - 0.5) * jitter;
    const oz = (Math.random() - 0.5) * jitter;
    const oy = 0.03 * (n % 12);

    return base.add(v3(ox, oy, oz));
  }

  function throwChip(from, to) {
    const chip = getFreeChip();
    if (!chip) return;

    chip.visible = true;
    chip.position.copy(from);
    chip.rotation.set(0, 0, 0);

    S.chips.fly.push({
      chip,
      t: 0,
      dur: 0.40 + Math.random() * 0.22,
      from: from.clone(),
      to: to.clone(),
      arc: 0.34 + Math.random() * 0.26,
      landToStack: true,
    });
  }

  function vacuumPotToWinner(seat) {
    // send stacked chips toward winner seat target
    const to = S.chips.seatTargets[seat]?.clone() || v3(0, 1.1, 3.0);
    to.y = 1.10;

    for (const chip of S.chips.stacked) {
      // convert each stacked chip into a fly
      S.chips.fly.push({
        chip,
        t: 0,
        dur: 0.55 + Math.random() * 0.35,
        from: chip.position.clone(),
        to: to.clone().add(v3((Math.random()-0.5)*0.22, (Math.random()*0.12), (Math.random()-0.5)*0.22)),
        arc: 0.55 + Math.random() * 0.45,
        landToStack: false,
        landHide: true,
      });
    }
    S.chips.stacked.length = 0;
  }

  function updateChips(dt) {
    const P = S.poker;

    // Turn-based chip throws only during active betting stages
    const isBetting = (P.stage !== "idle" && P.stage !== "showdown");
    const now = S.t;

    if (isBetting && (now - S.chips.lastTurnThrowAt) > 0.65) {
      S.chips.lastTurnThrowAt = now;

      const seat = P.activeSeat;
      const from = S.chips.seatTargets[seat]?.clone();
      if (from) {
        const to = potStackPos(); // stack in pot
        throwChip(from, to);
        P.pot += (P.bet || 50);
      }
    }

    // animate flights
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

        // land behavior
        if (f.landToStack) {
          S.chips.stacked.push(f.chip);
        }
        if (f.landHide) {
          f.chip.visible = false;
        }
        S.chips.fly.splice(i, 1);
      }
    }
  }

  // ---------- crown ----------
  function buildCrown() {
    const crown = new S.THREE.Group();
    crown.name = "WinnerCrown";
    crown.visible = false;

    const base = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(0.18, 0.22, 0.10, 16),
      stdMat(0x2b1b12, 0.45, 0.15, 0xffcc00, 0.55)
    );
    base.position.y = 0.05;
    crown.add(base);

    const ring = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(0.19, 0.03, 12, 24),
      stdMat(0x8a6b2a, 0.35, 0.25, 0xffcc00, 0.75)
    );
    ring.position.y = 0.10;
    ring.rotation.x = Math.PI / 2;
    crown.add(ring);

    // spikes
    const spikeGeo = new S.THREE.ConeGeometry(0.05, 0.14, 10);
    const spikeMat = stdMat(0xffcc00, 0.35, 0.25, 0xffcc00, 0.55);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = new S.THREE.Mesh(spikeGeo, spikeMat);
      s.position.set(Math.cos(a) * 0.16, 0.18, Math.sin(a) * 0.16);
      s.rotation.y = a;
      crown.add(s);
    }

    const glow = new S.THREE.PointLight(0xffcc00, 8, 6);
    glow.position.set(0, 0.25, 0);
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
    const rise = clamp(S.crown.t / 0.65, 0, 1);

    const headPos = bot.getWorldPosition(v3());
    headPos.y += 2.15 + rise * 0.40;

    S.crown.mesh.position.copy(headPos);
    S.crown.mesh.rotation.y += dt * 1.6;

    if (S.crown.t > 2.8) {
      // fade out gently
      S.crown.mesh.visible = false;
      S.crown.active = false;
      S.crown.seat = -1;
    }
  }

  // ---------- bots update ----------
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

      const phase = S.t * (2.8 + sp * 4.0);
      b.traverse((o) => {
        if (o.userData?._leg) o.rotation.x = Math.sin(phase) * 0.55 * o.userData._leg;
        if (o.userData?._calf) o.rotation.x = Math.sin(phase + 0.8) * 0.35 * o.userData._calf;
        if (o.userData?._arm) o.rotation.x = Math.sin(phase + Math.PI) * 0.45 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.sin(phase + Math.PI + 0.8) * 0.25 * o.userData._fore;
      });
    }

    // seated: idle arms only
    for (const b of S.bots.pitPlayers) {
      const ph = S.t * 1.2 + (b.userData.seat || 0) * 0.35;
      b.traverse((o) => {
        if (o.userData?._arm) o.rotation.x = Math.sin(ph) * 0.10 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.sin(ph + 0.7) * 0.07 * o.userData._fore;
        if (o.userData?._leg) o.rotation.x = 0;
        if (o.userData?._calf) o.rotation.x = 0;
      });
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
    S.root.name = "WorldRoot";
    scene.add(S.root);

    S.colliders = [];
    S.t = 0;

    S.log("[world] init v10 …");

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

    // spawn in lobby standing
    window.__SEATED_MODE = false;
    S.player.position.set(0, 0, 10);
    S.player.rotation.y = Math.PI;

    S.log("[world] build complete ✅ (MASTER v10 polished)");
  }

  function update(dt) {
    S.t += dt;

    stepPoker(dt);
    updateCommunityHover(dt);

    updateChips(dt);
    updateHUD(dt);
    updateBots(dt);
    updateCrown(dt);
  }

  function colliders() { return S.colliders; }

  return { init, update, colliders };
})();
