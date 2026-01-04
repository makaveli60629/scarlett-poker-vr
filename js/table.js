import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Table = {
  group: null,
  tableTop: null,
  seats: [],
  players: [],
  communityCards: [],
  deck: [],
  pot: 0,

  // game loop
  phase: "idle",
  phaseTimer: 0,
  handId: 0,
  lastWinnerText: "",
  lastWinnerAt: 0,

  // view helpers
  _tmpV3: new THREE.Vector3(),
  _tmpV3b: new THREE.Vector3(),
  _up: new THREE.Vector3(0, 1, 0),

  // settings
  seatCount: 6,
  tableCenter: new THREE.Vector3(0, 0, -6.0),
  tableYaw: 0,
  tableHeight: 0.78,

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // --- OVAL TABLE TOP (clean + solid)
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x145a38,
      roughness: 0.85,
      metalness: 0.05
    });

    // Oval via scaled cylinder (looks like oval poker table)
    const topGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.10, 48);
    this.tableTop = new THREE.Mesh(topGeo, topMat);
    this.tableTop.scale.set(1.9, 1.0, 1.22); // oval
    this.tableTop.position.copy(this.tableCenter);
    this.tableTop.position.y = this.tableHeight;
    this.tableTop.rotation.y = this.tableYaw;
    this.tableTop.castShadow = true;
    this.tableTop.receiveShadow = true;
    this.group.add(this.tableTop);

    // Trim ring
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xC9A24D,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x221100,
      emissiveIntensity: 0.25
    });
    const trimGeo = new THREE.TorusGeometry(1.35, 0.055, 16, 80);
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.scale.set(1.9, 1.0, 1.22);
    trim.position.copy(this.tableTop.position);
    trim.position.y += 0.06;
    trim.rotation.x = Math.PI / 2;
    trim.castShadow = true;
    this.group.add(trim);

    // Felt rail
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0e0f14,
      roughness: 0.95
    });
    const railGeo = new THREE.TorusGeometry(1.45, 0.085, 16, 90);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.scale.set(1.9, 1.0, 1.22);
    rail.position.copy(this.tableTop.position);
    rail.position.y += 0.03;
    rail.rotation.x = Math.PI / 2;
    rail.castShadow = true;
    this.group.add(rail);

    // --- Seats positions (6 only)
    this.seats = this._computeSeats();

    // --- Players: Seat 0 reserved for player (open), bots on 1..5
    this.players = [];
    const botNames = ["NovaBot_1", "NovaBot_2", "NovaBot_3", "NovaBot_4", "NovaBot_5"];
    for (let i = 0; i < this.seatCount; i++) {
      const isBot = i !== 0;
      const name = isBot ? botNames[i - 1] : "YOU";
      const p = this._makePlayer(i, name, isBot);
      this.players.push(p);

      // simple “avatar marker” above seat (no textures required)
      if (isBot) {
        const marker = this._makeBotMarker();
        marker.position.copy(this.seats[i].pos).add(new THREE.Vector3(0, 1.28, 0));
        this.group.add(marker);
        p.marker = marker;

        const tag = this._makeNameTag(name);
        tag.position.copy(this.seats[i].pos).add(new THREE.Vector3(0, 1.55, 0));
        this.group.add(tag);
        p.tag = tag;
      }
    }

    // --- Community cards (5)
    this.communityCards = [];
    for (let k = 0; k < 5; k++) {
      const card = this._makeCardMesh({ faceUp: false, label: "??" });
      card.position.copy(this.tableTop.position);
      card.position.y += 0.055;
      // spacing
      card.position.x += (k - 2) * 0.23;
      card.rotation.x = -Math.PI / 2;
      this.group.add(card);
      this.communityCards.push(card);
    }

    // start game loop
    this._newHand();
  },

  // Called from main.js each frame
  update(dt, camera) {
    // phase machine
    this.phaseTimer -= dt;

    if (this.phaseTimer <= 0) {
      if (this.phase === "preflop") this._toFlop();
      else if (this.phase === "flop") this._toTurn();
      else if (this.phase === "turn") this._toRiver();
      else if (this.phase === "river") this._toShowdown();
      else if (this.phase === "showdown") this._newHand();
    }

    // stable name tags: only yaw-billboard (never tilt/roll)
    if (camera) {
      const camPos = this._tmpV3;
      camera.getWorldPosition(camPos);

      for (const p of this.players) {
        if (p.tag) {
          const tp = this._tmpV3b;
          p.tag.getWorldPosition(tp);
          const dx = camPos.x - tp.x;
          const dz = camPos.z - tp.z;
          const yaw = Math.atan2(dx, dz);
          p.tag.rotation.set(0, yaw, 0);
        }
      }
    }
  },

  // Seat join hook
  sitPlayer() {
    // Seat 0 reserved for player; later we’ll lock player to seat.
    this.players[0].seated = true;
    this.players[0].inHand = true;
  },
  standPlayer() {
    this.players[0].seated = false;
    this.players[0].inHand = false;
  },

  // Leaderboard snapshot
  getLeaderboardData() {
    // sort: bots + player by chips desc
    const rows = this.players.map(p => ({
      name: p.name,
      chips: Math.floor(p.chips),
      status: p.seated ? "SEATED" : (p.inHand ? "IN HAND" : "SPECTATE"),
      isBot: p.isBot,
      seat: p.seatIndex
    }));

    rows.sort((a, b) => b.chips - a.chips);
    return {
      handId: this.handId,
      pot: Math.floor(this.pot),
      phase: this.phase.toUpperCase(),
      lastWinnerText: this.lastWinnerText,
      rows
    };
  },

  // ---------- internals ----------
  _makePlayer(seatIndex, name, isBot) {
    return {
      seatIndex,
      name,
      isBot,
      chips: isBot ? 25000 + Math.random() * 15000 : 50000,
      seated: isBot,     // bots are seated
      inHand: isBot,     // bots always play; player seat becomes active when you join
      hole: [],          // {rank,suit}
      holeMeshes: [],    // meshes
      marker: null,
      tag: null
    };
  },

  _computeSeats() {
    const seats = [];
    const cx = this.tableTop.position.x;
    const cz = this.tableTop.position.z;
    const y = 0;

    // elliptical ring around table
    const a = 2.45; // x radius
    const b = 1.70; // z radius

    for (let i = 0; i < this.seatCount; i++) {
      const t = (i / this.seatCount) * Math.PI * 2;
      const x = cx + Math.cos(t) * a;
      const z = cz + Math.sin(t) * b;
      const pos = new THREE.Vector3(x, y, z);
      seats.push({ pos, angle: t });
    }

    // rotate so Seat 0 is near front (toward camera/lobby direction)
    // bring seat 0 closer to z+ side:
    seats.sort((s1, s2) => s2.pos.z - s1.pos.z);

    // keep stable ordering
    return seats;
  },

  _makeBotMarker() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x11141d,
      roughness: 0.95,
      emissive: 0x001122,
      emissiveIntensity: 0.4
    });
    const geo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 22);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  },

  _makeNameTag(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = "rgba(10,10,16,0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // border
    ctx.lineWidth = 18;
    ctx.strokeStyle = "rgba(255,60,120,0.90)";
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.75)";
    ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 92px system-ui";
    ctx.fillText(name, canvas.width / 2, 160);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.9,
      emissive: 0x101018,
      emissiveIntensity: 0.35
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.28), mat);
    plane.renderOrder = 10;
    return plane;
  },

  _makeCardMesh({ faceUp, label }) {
    const geo = new THREE.PlaneGeometry(0.16, 0.23);

    const front = this._cardFaceTexture(label);
    const back = this._cardBackTexture();

    const mat = new THREE.MeshStandardMaterial({
      map: faceUp ? front : back,
      roughness: 0.8,
      metalness: 0.0
    });

    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.userData.isCard = true;
    m.userData.faceUp = faceUp;
    m.userData.label = label;
    m.userData.frontTex = front;
    m.userData.backTex = back;
    return m;
  },

  _cardFaceTexture(label) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");

    // high contrast
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 22;
    ctx.strokeStyle = "#111";
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ff2d7a";
    ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

    ctx.fillStyle = "#111";
    ctx.font = "bold 110px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, 72, 150);

    ctx.textAlign = "center";
    ctx.font = "bold 220px system-ui";
    ctx.fillText(label, canvas.width / 2, 460);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  _cardBackTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0b0c12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 20;
    ctx.strokeStyle = "#00ffaa";
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    ctx.lineWidth = 12;
    ctx.strokeStyle = "#c9a24d";
    ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 88px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SCARLETT", canvas.width / 2, 360);
    ctx.fillText("POKER VR", canvas.width / 2, 460);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  _newHand() {
    this.handId += 1;
    this.pot = 0;

    // reset community
    for (let i = 0; i < 5; i++) {
      this._setCard(this.communityCards[i], false, "??");
      this.communityCards[i].visible = false;
    }

    // reset hole
    for (const p of this.players) {
      p.hole = [];
      p.inHand = p.isBot || p.seated; // bots always; player if seated
      // remove old meshes
      for (const m of (p.holeMeshes || [])) {
        this.group.remove(m);
        m.geometry.dispose();
        // textures are canvas textures; ok to let GC handle
      }
      p.holeMeshes = [];
    }

    // build deck
    this.deck = this._makeDeck();
    this._shuffle(this.deck);

    // deal hole cards
    for (let r = 0; r < 2; r++) {
      for (const p of this.players) {
        if (!p.inHand) continue;
        p.hole.push(this.deck.pop());
      }
    }

    // place hole cards on table in front of each seat (face down for bots)
    for (const p of this.players) {
      if (!p.inHand) continue;

      const seat = this.seats[p.seatIndex];
      const base = seat.pos.clone();

      // move toward table center
      const toward = this.tableTop.position.clone().sub(base).normalize();
      const spot = base.clone().add(toward.multiplyScalar(0.45));
      spot.y = this.tableHeight + 0.056;

      for (let k = 0; k < 2; k++) {
        const card = this._makeCardMesh({ faceUp: false, label: "??" });
        card.position.copy(spot);
        card.position.x += (k === 0 ? -0.09 : 0.09);
        card.rotation.x = -Math.PI / 2;

        // For player: cards face down initially; later we’ll allow “peek”
        // For bots: always face down to you
        this.group.add(card);
        p.holeMeshes.push(card);
      }
    }

    // blinds/antes (simple)
    const ante = 200;
    for (const p of this.players) {
      if (!p.inHand) continue;
      const pay = Math.min(p.chips, ante);
      p.chips -= pay;
      this.pot += pay;
    }

    this.phase = "preflop";
    this.phaseTimer = 2.6; // time to see deal
    this.lastWinnerText = "";
  },

  _toFlop() {
    this.phase = "flop";
    this.phaseTimer = 3.0;

    for (let i = 0; i < 3; i++) {
      const c = this.deck.pop();
      const label = this._cardLabel(c);
      this._setCard(this.communityCards[i], true, label);
      this.communityCards[i].visible = true;
    }
  },

  _toTurn() {
    this.phase = "turn";
    this.phaseTimer = 3.0;

    const c = this.deck.pop();
    this._setCard(this.communityCards[3], true, this._cardLabel(c));
    this.communityCards[3].visible = true;
  },

  _toRiver() {
    this.phase = "river";
    this.phaseTimer = 3.0;

    const c = this.deck.pop();
    this._setCard(this.communityCards[4], true, this._cardLabel(c));
    this.communityCards[4].visible = true;
  },

  _toShowdown() {
    this.phase = "showdown";
    this.phaseTimer = 3.0;

    // Evaluate winner among in-hand players
    const board = [];
    for (let i = 0; i < 5; i++) {
      const lbl = this.communityCards[i].userData.label;
      if (lbl !== "??") board.push(this._parseLabel(lbl));
    }

    const contenders = this.players.filter(p => p.inHand);
    let best = null;
    let winners = [];

    for (const p of contenders) {
      const hole = p.hole;
      const score = this._bestHandScore([...hole, ...board]);
      if (!best || this._compareScore(score, best) > 0) {
        best = score;
        winners = [p];
      } else if (this._compareScore(score, best) === 0) {
        winners.push(p);
      }
    }

    const split = Math.floor(this.pot / Math.max(1, winners.length));
    for (const w of winners) w.chips += split;

    const winNames = winners.map(w => w.name).join(", ");
    this.lastWinnerText = `Winner: ${winNames} — ${best?.name || "HAND"}`;
    this.lastWinnerAt = performance.now();

    // Reveal winners’ hole cards (face up) for SHOWDOWN
    for (const w of winners) {
      // show their real labels
      for (let k = 0; k < 2; k++) {
        const label = this._cardLabel(w.hole[k]);
        this._setCard(w.holeMeshes[k], true, label);
      }
    }
  },

  _setCard(mesh, faceUp, label) {
    mesh.userData.faceUp = faceUp;
    mesh.userData.label = label;
    mesh.material.map = faceUp ? mesh.userData.frontTex : mesh.userData.backTex;

    if (faceUp) {
      // replace front texture with correct label
      const tex = this._cardFaceTexture(label);
      mesh.userData.frontTex = tex;
      mesh.material.map = tex;
    }
    mesh.material.needsUpdate = true;
  },

  _makeDeck() {
    const suits = ["S", "H", "D", "C"];
    const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
    const deck = [];
    for (const s of suits) for (const r of ranks) deck.push({ r, s });
    return deck;
  },

  _shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
  },

  _cardLabel(c) {
    return `${c.r}${c.s}`;
  },

  _parseLabel(lbl) {
    // lbl "AS" etc
    return { r: lbl[0], s: lbl[1] };
  },

  // -------- Hand evaluation (Texas Hold’em best of 7) --------
  // returns {rank: number, kickers: number[], name: string}
  _bestHandScore(cards7) {
    // map ranks to values
    const rv = r => ("23456789TJQKA".indexOf(r) + 2);
    const values = cards7.map(c => rv(c.r)).sort((a,b)=>b-a);
    const suits = cards7.map(c => c.s);

    // counts
    const count = new Map();
    for (const v of values) count.set(v, (count.get(v)||0)+1);

    const suitCount = new Map();
    for (const s of suits) suitCount.set(s, (suitCount.get(s)||0)+1);

    const isFlush = [...suitCount.values()].some(n => n >= 5);
    let flushSuit = null;
    if (isFlush) {
      for (const [s,n] of suitCount.entries()) if (n >= 5) flushSuit = s;
    }

    // unique values for straight checking (Ace low)
    const uniq = [...new Set(values)].sort((a,b)=>b-a);
    const uniqAceLow = uniq.includes(14) ? [...uniq, 1] : uniq;

    const straightHigh = this._straightHigh(uniqAceLow);
    const flushValues = flushSuit
      ? cards7.filter(c => c.s === flushSuit).map(c => rv(c.r)).sort((a,b)=>b-a)
      : [];

    const flushUniq = [...new Set(flushValues)];
    const flushUniqAceLow = flushUniq.includes(14) ? [...flushUniq, 1] : flushUniq;
    const straightFlushHigh = flushSuit ? this._straightHigh(flushUniqAceLow) : 0;

    // group ranks
    const groups = [...count.entries()]
      .map(([v,n]) => ({ v, n }))
      .sort((a,b)=> (b.n - a.n) || (b.v - a.v));

    // Straight flush
    if (straightFlushHigh) {
      const name = straightFlushHigh === 14 ? "ROYAL FLUSH" : "STRAIGHT FLUSH";
      return { rank: 9, kickers: [straightFlushHigh], name };
    }

    // Four
    if (groups[0].n === 4) {
      const quad = groups[0].v;
      const kicker = groups.find(g => g.v !== quad).v;
      return { rank: 8, kickers: [quad, kicker], name: "FOUR OF A KIND" };
    }

    // Full house
    if (groups[0].n === 3 && groups[1]?.n >= 2) {
      return { rank: 7, kickers: [groups[0].v, groups[1].v], name: "FULL HOUSE" };
    }

    // Flush
    if (isFlush) {
      const top5 = flushValues.slice(0,5);
      return { rank: 6, kickers: top5, name: "FLUSH" };
    }

    // Straight
    if (straightHigh) {
      return { rank: 5, kickers: [straightHigh], name: "STRAIGHT" };
    }

    // Three
    if (groups[0].n === 3) {
      const trips = groups[0].v;
      const kickers = groups.filter(g => g.v !== trips).map(g=>g.v).sort((a,b)=>b-a).slice(0,2);
      return { rank: 4, kickers: [trips, ...kickers], name: "THREE OF A KIND" };
    }

    // Two pair
    if (groups[0].n === 2 && groups[1]?.n === 2) {
      const p1 = Math.max(groups[0].v, groups[1].v);
      const p2 = Math.min(groups[0].v, groups[1].v);
      const kicker = groups.find(g => g.n === 1).v;
      return { rank: 3, kickers: [p1, p2, kicker], name: "TWO PAIR" };
    }

    // One pair
    if (groups[0].n === 2) {
      const pair = groups[0].v;
      const kickers = groups.filter(g => g.v !== pair).map(g=>g.v).sort((a,b)=>b-a).slice(0,3);
      return { rank: 2, kickers: [pair, ...kickers], name: "ONE PAIR" };
    }

    // High card
    return { rank: 1, kickers: values.slice(0,5), name: "HIGH CARD" };
  },

  _straightHigh(uniqDescAceLow) {
    // expects list like [A,K,Q,...,2,1] possibly
    let run = 1;
    for (let i = 1; i < uniqDescAceLow.length; i++) {
      if (uniqDescAceLow[i] === uniqDescAceLow[i-1] - 1) run++;
      else run = 1;

      if (run >= 5) {
        // high card is the first in the run
        return uniqDescAceLow[i-4];
      }
    }
    return 0;
  },

  _compareScore(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const n = Math.max(a.kickers.length, b.kickers.length);
    for (let i = 0; i < n; i++) {
      const av = a.kickers[i] || 0;
      const bv = b.kickers[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }
};
