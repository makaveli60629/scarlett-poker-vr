// js/poker_simulation.js — VIP Poker Observer Simulation (8.1.0)
// CHANGE/ADD:
// - Hole cards hover above each player's head (spectator sees who has what)
// - Big POT + ACTION in the center above the table (readable from distance)
// - Betting line ring: bets "cross" it visually (chips move across line)
// - Start stacks: 20,000 each
// - Strategy variance: raise/call/fold more intelligently (still sim)
// - Chip rush animation from pot to winner
// - Tournament: players bust out until 1 winner remains, winner holds crown for 60s, then reset

import * as THREE from "./three.js";

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function randCard() {
  const suit = SUITS[(Math.random() * SUITS.length) | 0];
  const rank = RANKS[(Math.random() * RANKS.length) | 0];
  return { rank, suit };
}
function isRedSuit(s) { return s === "♥" || s === "♦"; }

function isVec3(v) { return v && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number"; }
function seatPos(seat, fallback) {
  if (seat && isVec3(seat.position)) return seat.position;
  if (seat && isVec3(seat.pos)) return seat.pos;
  if (seat && isVec3(seat.p)) return seat.p;
  return fallback;
}
function safeClone(v, fb) { return (isVec3(v) ? v.clone() : (fb || new THREE.Vector3()).clone()); }

// --- Card face drawing: larger corner rank/suit for readability ---
function makeCardTexture(card) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 768;
  const g = c.getContext("2d");

  g.fillStyle = "#ffffff";
  g.fillRect(0,0,c.width,c.height);

  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.lineWidth = 18;
  g.strokeRect(18,18,c.width-36,c.height-36);

  const fg = isRedSuit(card.suit) ? "#c2182b" : "#101317";

  // bigger corners
  g.fillStyle = fg;
  g.textAlign = "left";
  g.textBaseline = "top";
  g.font = "900 92px system-ui";
  g.fillText(card.rank, 56, 44);
  g.font = "900 96px system-ui";
  g.fillText(card.suit, 56, 146);

  g.save();
  g.translate(c.width, c.height);
  g.rotate(Math.PI);
  g.fillStyle = fg;
  g.textAlign = "left";
  g.textBaseline = "top";
  g.font = "900 92px system-ui";
  g.fillText(card.rank, 56, 44);
  g.font = "900 96px system-ui";
  g.fillText(card.suit, 56, 146);
  g.restore();

  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "900 300px system-ui";
  g.fillText(card.suit, c.width/2, c.height/2 + 12);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeCardMesh(card) {
  const frontTex = makeCardTexture(card);

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.32),
    new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.65 })
  );

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x15243a, roughness: 0.9 })
  );
  back.rotation.y = Math.PI;

  const g = new THREE.Group();
  g.add(front, back);
  g.userData.faceCamera = true;
  g.userData.card = card;
  return g;
}

function makeBillboard(text, w=768, h=320, style="action") {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  // background
  g.fillStyle = "rgba(10,12,18,0.92)";
  g.fillRect(0,0,w,h);

  // borders neon
  g.strokeStyle = "rgba(0,255,170,0.55)";
  g.lineWidth = 12;
  g.strokeRect(18,18,w-36,h-36);

  g.strokeStyle = "rgba(255,60,120,0.55)";
  g.lineWidth = 8;
  g.strokeRect(30,30,w-60,h-60);

  // text
  g.fillStyle = "rgba(255,255,255,0.96)";
  g.textAlign = "center";
  g.textBaseline = "middle";

  const lines = String(text || "").split("\n");

  if (style === "pot") {
    g.font = "900 96px system-ui";
    g.fillText(lines[0] || "POT", w/2, h*0.38);
    g.font = "900 108px system-ui";
    g.fillText(lines[1] || "", w/2, h*0.72);
  } else {
    g.font = "900 64px system-ui";
    g.fillText(lines[0] || "", w/2, h*0.42);
    g.font = "800 56px system-ui";
    g.fillText(lines[1] || "", w/2, h*0.72);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.48), mat);
  mesh.userData.setText = (t, st=style) => {
    const n = makeBillboard(t, w, h, st);
    mesh.material.map = n.material.map;
    mesh.material.needsUpdate = true;
  };
  mesh.userData.faceCamera = true;
  return mesh;
}

function makeChipStack(scale=1.0) {
  const g = new THREE.Group();
  const denoms = [
    { color: 0xffffff },
    { color: 0x22aaff },
    { color: 0x00ffaa },
    { color: 0xff3366 },
    { color: 0xffd24a },
  ];
  const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20);

  for (let i=0;i<14;i++) {
    const d = denoms[i % denoms.length];
    const mat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.55, emissive: d.color, emissiveIntensity: 0.08 });
    const c = new THREE.Mesh(geo, mat);
    c.position.y = i * 0.006;
    g.add(c);
  }
  g.scale.setScalar(scale);
  return g;
}

function makeBettingLine(radius=1.28) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.035, 12, 80),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
    })
  );
  ring.rotation.x = Math.PI/2;
  ring.position.y = 1.03 + 0.01; // just above felt
  ring.name = "BettingLine";
  return ring;
}

function makeDealerChip() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#111111"; g.fillRect(0,0,256,256);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 14; g.strokeRect(14,14,228,228);
  g.fillStyle = "#ffffff";
  g.font = "900 140px system-ui";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("D", 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.012, 28),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0x111111, emissiveIntensity: 0.2 })
  );
  chip.rotation.x = Math.PI / 2;
  chip.visible = true;
  return chip;
}

function crownMarker() {
  const geo = new THREE.TorusGeometry(0.09, 0.022, 10, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xffd24a,
    emissiveIntensity: 1.0,
    roughness: 0.35
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI/2;
  return m;
}

function turnDisc() {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 30),
    new THREE.MeshStandardMaterial({
      color: 0xff3366,
      emissive: 0xff3366,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide
    })
  );
  disc.rotation.x = -Math.PI/2;
  disc.visible = false;
  return disc;
}

export const PokerSim = {
  disabled: false,
  scene: null,
  seats: [],
  center: new THREE.Vector3(),

  TABLE_Y: 1.03,
  HEAD_CARD_Y: 2.05,     // above heads
  COMM_Y: 1.55,          // hover
  HUD_Y: 2.30,           // big HUD height
  HUD_Z_OFF: -0.15,      // keep over table center

  players: [],
  hole: new Map(),
  community: [],

  pot: 0,
  toCall: 0,
  actor: 0,

  potStack: null,
  actionBoard: null,
  potBoard: null,

  bettingLine: null,
  dealerChip: null,
  turnDisc: null,

  winnerFX: null,
  winnerHold: 0,

  // animations
  chipAnims: [], // {mesh, from, to, t, dur}

  handId: 0,
  dealerIndex: 0,

  phase: "idle",
  timer: 0,
  street: 0,

  // tournament
  tournamentActive: true,

  build(scene, seats, center) {
    try {
      this.disabled = false;
      this.scene = scene;
      this.center = isVec3(center) ? center.clone() : new THREE.Vector3(0,0,0);

      const list = Array.isArray(seats) ? seats : [];
      const safe = [];
      for (let i=0;i<list.length;i++) {
        const s = list[i];
        const p = seatPos(s, null);
        if (!p) continue;
        if (typeof s.index !== "number") s.index = i;
        safe.push(s);
      }
      this.seats = safe;

      if (!this.scene) { this.disabled = true; return; }
      if (this.seats.length < 2) { this.disabled = true; return; }

      if (!this.bettingLine) {
        this.bettingLine = makeBettingLine(1.28);
        this.bettingLine.position.set(this.center.x, this.TABLE_Y + 0.01, this.center.z);
        this.scene.add(this.bettingLine);
      }

      if (!this.dealerChip) {
        this.dealerChip = makeDealerChip();
        this.scene.add(this.dealerChip);
      }

      if (!this.turnDisc) {
        this.turnDisc = turnDisc();
        this.scene.add(this.turnDisc);
      }

      this._resetTournament();
      this._startHand();
    } catch (e) {
      console.error("PokerSim build error:", e);
      this.disabled = true;
    }
  },

  _resetTournament() {
    // Start stacks at 20,000 each
    this.players = this.seats.map((s, i) => ({
      seat: s,
      name: s.bot?.name || `Boss_${(typeof s.index === "number" ? s.index : i)}`,
      stack: 20000,
      bet: 0,
      inHand: true,
      busted: false,

      board: null,
      chips: null,
      betSpot: null,
      headSpots: [],
    }));

    // set up player labels + stacks + bet spots
    for (let i=0;i<this.players.length;i++) {
      const p = this.players[i];
      const pos = safeClone(seatPos(p.seat, this.center), this.center);

      // label
      const b = makeBillboard(`${p.name}\n$${p.stack}`, 620, 280, "action");
      b.position.copy(pos);
      b.position.y = 1.58;
      this.scene.add(b);
      p.board = b;

      // direction to center
      const dir = new THREE.Vector3().subVectors(this.center, pos);
      if (dir.lengthSq() > 0.0001) dir.normalize();

      // stack chips near player
      const chipSpot = pos.clone().add(dir.multiplyScalar(0.98));
      chipSpot.y = this.TABLE_Y;
      const cs = makeChipStack(1.05);
      cs.position.copy(chipSpot);
      this.scene.add(cs);
      p.chips = cs;

      // bet spot just past betting line (so the animation "crosses" line)
      const betSpot = pos.clone().add(dir.multiplyScalar(1.32));
      betSpot.y = this.TABLE_Y;
      p.betSpot = betSpot;

      // head card spots (two cards above head)
      const head = pos.clone();
      head.y = this.HEAD_CARD_Y;
      head.z += 0.00;
      p.headSpots = [
        head.clone().add(new THREE.Vector3(-0.14, 0.0, 0)),
        head.clone().add(new THREE.Vector3(+0.14, 0.0, 0)),
      ];
    }

    // center HUD boards
    const hudPos = this.center.clone();
    hudPos.y = this.HUD_Y;
    hudPos.z += this.HUD_Z_OFF;

    if (this.actionBoard) this.scene.remove(this.actionBoard);
    if (this.potBoard) this.scene.remove(this.potBoard);

    this.actionBoard = makeBillboard("TOURNAMENT\nStarting…", 900, 360, "action");
    this.actionBoard.position.copy(hudPos);
    this.scene.add(this.actionBoard);

    this.potBoard = makeBillboard("POT\n$0", 900, 360, "pot");
    this.potBoard.position.copy(hudPos.clone().add(new THREE.Vector3(0, -0.58, 0)));
    this.scene.add(this.potBoard);

    // pot stack
    if (this.potStack) this.scene.remove(this.potStack);
    this.potStack = makeChipStack(1.35);
    this.potStack.position.set(this.center.x, this.TABLE_Y, this.center.z);
    this.scene.add(this.potStack);

    this.tournamentActive = true;
  },

  _cleanupHandOnly() {
    // remove cards
    for (const c of this.community) this.scene.remove(c);
    this.community = [];

    for (const [, pair] of this.hole.entries()) for (const c of pair) this.scene.remove(c);
    this.hole.clear();

    // clear per-hand chips anims
    for (const a of this.chipAnims) {
      if (a.mesh) this.scene.remove(a.mesh);
    }
    this.chipAnims = [];

    this.pot = 0;
    this.toCall = 0;
    this.actor = 0;
    this.street = 0;

    for (const p of this.players) {
      p.bet = 0;
      p.inHand = !p.busted;
    }

    if (this.turnDisc) this.turnDisc.visible = false;
  },

  _alivePlayers() {
    return this.players.filter(p => !p.busted);
  },

  _aliveInHand() {
    return this.players.filter(p => p.inHand && !p.busted);
  },

  _updatePlayerBoards() {
    for (const p of this.players) {
      if (!p.board?.userData?.setText) continue;
      const status = p.busted ? " (OUT)" : (p.inHand ? "" : " (FOLD)");
      p.board.userData.setText(`${p.name}\n$${p.stack}${status}`, "action");
      if (p.chips) {
        const s = Math.max(0.55, Math.min(1.9, 0.70 + p.stack / 20000));
        p.chips.scale.setScalar(s);
      }
    }
    if (this.potBoard?.userData?.setText) this.potBoard.userData.setText(`POT\n$${this.pot}`, "pot");
    if (this.potStack) {
      const s = Math.max(0.70, Math.min(2.2, 0.90 + this.pot / 9000));
      this.potStack.scale.setScalar(s);
    }
  },

  _setAction(line1, line2="") {
    if (this.actionBoard?.userData?.setText) this.actionBoard.userData.setText(`${line1}\n${line2}`, "action");
  },

  _positionDealerChip() {
    const dSeat = this.seats[this.dealerIndex];
    const dpos = safeClone(seatPos(dSeat, this.center), this.center);
    const ddir = new THREE.Vector3().subVectors(this.center, dpos);
    if (ddir.lengthSq() > 0.0001) ddir.normalize();
    const spot = dpos.clone().add(ddir.multiplyScalar(1.12));
    spot.y = this.TABLE_Y + 0.01;
    this.dealerChip.position.copy(spot);
    this.dealerChip.visible = true;
  },

  _startHand() {
    if (this.disabled) return;

    // tournament ends when 1 left
    const alive = this._alivePlayers();
    if (this.tournamentActive && alive.length <= 1) {
      const champ = alive[0] || this.players[0];
      this._tournamentWinner(champ);
      return;
    }

    this.handId++;
    this._cleanupHandOnly();

    // dealer rotates among non-busted seats
    let tries = 0;
    do {
      this.dealerIndex = (this.dealerIndex + 1) % this.seats.length;
      tries++;
      const p = this.players[this.dealerIndex];
      if (p && !p.busted) break;
    } while (tries < this.seats.length + 2);

    this._positionDealerChip();

    // actor starts left of dealer
    this.actor = (this.dealerIndex + 1) % this.players.length;
    this.toCall = 0;

    this.phase = "deal_hole";
    this.timer = 0;

    this._dealCounter = 0;
    this._betTicks = 0;

    this._setAction("NEW HAND", `#${this.handId}`);
    this._updatePlayerBoards();
  },

  _dealHoleOnce(playerIndex, which) {
    const p = this.players[playerIndex];
    if (!p || p.busted) return;

    const card = randCard();
    const mesh = makeCardMesh(card);

    const spot = p.headSpots?.[which] || this.center.clone();
    mesh.position.copy(spot);

    // slight tilt for style, still billboards to camera
    mesh.rotation.x = -0.15;

    this.scene.add(mesh);

    const key = (typeof p.seat.index === "number") ? p.seat.index : playerIndex;
    if (!this.hole.has(key)) this.hole.set(key, []);
    this.hole.get(key).push(mesh);
  },

  _dealCommunity(targetCount) {
    const startX = -0.52;
    const gap = 0.26;

    for (let i=this.community.length; i<targetCount; i++) {
      const card = randCard();
      const mesh = makeCardMesh(card);

      mesh.position.set(this.center.x + startX + i * gap, this.COMM_Y, this.center.z - 0.05);
      mesh.scale.setScalar(1.25);
      this.scene.add(mesh);
      this.community.push(mesh);
    }
  },

  _nextActor() {
    const n = this.players.length;
    for (let i=0;i<n;i++) {
      this.actor = (this.actor + 1) % n;
      if (this.players[this.actor].inHand && !this.players[this.actor].busted) return;
    }
  },

  _setTurnDisc(camera) {
    const p = this.players[this.actor];
    if (!p || !p.betSpot || !p.inHand || p.busted) {
      this.turnDisc.visible = false;
      return;
    }
    this.turnDisc.visible = true;
    this.turnDisc.position.set(p.betSpot.x, this.TABLE_Y + 0.004, p.betSpot.z);

    const t = performance.now() * 0.001;
    const s = 0.88 + Math.sin(t * 6.5) * 0.09;
    this.turnDisc.scale.set(s, s, s);

    if (camera) this.turnDisc.lookAt(camera.position.x, this.turnDisc.position.y, camera.position.z);
    this.turnDisc.rotation.x = -Math.PI/2;
  },

  // chip animation: bet stack travels from player betSpot -> pot center (crosses betting line)
  _animateBetChips(fromPos, toPos) {
    const stack = makeChipStack(0.85);
    stack.position.copy(fromPos);
    this.scene.add(stack);
    this.chipAnims.push({
      mesh: stack,
      from: fromPos.clone(),
      to: toPos.clone(),
      t: 0,
      dur: 0.40 + Math.random() * 0.18
    });
  },

  // chip rush to winner
  _animateWinRush(winner) {
    // spawn several stacks at pot and blast to winner chip pile
    const potPos = new THREE.Vector3(this.center.x, this.TABLE_Y, this.center.z);
    const wPos = winner.chips ? winner.chips.position.clone() : safeClone(seatPos(winner.seat, this.center), this.center);
    wPos.y = this.TABLE_Y;

    const bursts = 8;
    for (let i=0;i<bursts;i++) {
      const s = makeChipStack(0.65 + Math.random() * 0.45);
      s.position.copy(potPos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.18, 0.0, (Math.random()-0.5)*0.18)));
      this.scene.add(s);
      this.chipAnims.push({
        mesh: s,
        from: s.position.clone(),
        to: wPos.clone(),
        t: 0,
        dur: 0.35 + Math.random() * 0.25
      });
    }
  },

  // smarter-ish bot logic (still lightweight)
  _botAct(p) {
    if (!p.inHand || p.busted) return { type: "noop" };

    const facing = this.toCall - p.bet;

    // "strength" proxy based on stack & randomness
    const aggression = 0.25 + Math.min(0.35, p.stack / 60000) + (Math.random() * 0.25);

    // Fold more when facing big bet and low stack
    const danger = facing / Math.max(1, p.stack);
    const foldChance = facing > 0 ? (0.10 + danger * 0.65) : 0.03;

    if (facing > 0 && Math.random() < foldChance) {
      p.inHand = false;
      return { type: "fold" };
    }

    // Raise sometimes, more if aggression high
    if (Math.random() < aggression) {
      const raise = 300 + ((Math.random() * 1200) | 0);
      const newToCall = this.toCall + raise;

      const pay = Math.max(0, newToCall - p.bet);
      const payClamped = Math.min(pay, p.stack);

      p.bet += payClamped;
      p.stack -= payClamped;
      this.pot += payClamped;
      this.toCall = Math.max(this.toCall, p.bet);

      if (p.stack <= 0) { p.stack = 0; p.busted = true; p.inHand = false; }
      return { type: "raise", to: this.toCall, pay: payClamped };
    }

    // Call / Check
    const pay = Math.max(0, this.toCall - p.bet);
    const payClamped = Math.min(pay, p.stack);

    p.bet += payClamped;
    p.stack -= payClamped;
    this.pot += payClamped;

    if (p.stack <= 0) { p.stack = 0; p.busted = true; p.inHand = false; }
    return payClamped > 0 ? { type: "call", pay: payClamped } : { type: "check" };
  },

  _pickWinner() {
    const alive = this._aliveInHand();
    if (alive.length) return alive[(Math.random() * alive.length) | 0];
    const any = this._alivePlayers();
    if (any.length) return any[(Math.random() * any.length) | 0];
    return this.players[0];
  },

  _showWinner(w) {
    const fx = new THREE.Group();
    fx.add(crownMarker());

    const pos = safeClone(seatPos(w.seat, this.center), this.center);
    fx.position.copy(pos);
    fx.position.y = 1.90;

    this.scene.add(fx);
    this.winnerFX = fx;

    // crown holds 60 seconds
    this.winnerHold = 60.0;

    const won = this.pot;
    w.stack += this.pot;
    this.pot = 0;

    this._animateWinRush(w);
    this._setAction("WINNER", `${w.name} wins $${won}`);
    this._updatePlayerBoards();

    // mark busted players as OUT permanently
    for (const p of this.players) {
      if (p.stack <= 0) { p.busted = true; p.inHand = false; }
    }
  },

  _tournamentWinner(champ) {
    // Champion crown + hold 60 sec, then reset tournament
    this._setAction("TOURNAMENT WINNER", champ ? champ.name : "UNKNOWN");
    if (!this.winnerFX && champ) {
      const fx = new THREE.Group();
      fx.add(crownMarker());
      const pos = safeClone(seatPos(champ.seat, this.center), this.center);
      fx.position.copy(pos);
      fx.position.y = 1.95;
      this.scene.add(fx);
      this.winnerFX = fx;
      this.winnerHold = 60.0;
    }
    this.phase = "tournament_hold";
    this.timer = 0;
  },

  update(dt, camera) {
    try {
      if (this.disabled || !this.scene) return;

      this.timer += dt;

      // face camera
      if (camera) {
        for (const [, pair] of this.hole.entries()) for (const c of pair) if (c?.userData?.faceCamera) c.lookAt(camera.position);
        for (const c of this.community) if (c?.userData?.faceCamera) c.lookAt(camera.position);

        for (const p of this.players) if (p.board?.userData?.faceCamera) p.board.lookAt(camera.position);
        if (this.potBoard?.userData?.faceCamera) this.potBoard.lookAt(camera.position);
        if (this.actionBoard?.userData?.faceCamera) this.actionBoard.lookAt(camera.position);
      }

      // animate chip movements
      if (this.chipAnims.length) {
        for (let i=this.chipAnims.length-1; i>=0; i--) {
          const a = this.chipAnims[i];
          a.t += dt;
          const k = Math.min(1, a.t / a.dur);
          // smooth
          const s = k*k*(3-2*k);
          a.mesh.position.lerpVectors(a.from, a.to, s);
          // little hop
          a.mesh.position.y = this.TABLE_Y + Math.sin(Math.PI * s) * 0.12;

          if (k >= 1) {
            this.scene.remove(a.mesh);
            this.chipAnims.splice(i,1);
          }
        }
      }

      // winner crown hold / glow spin
      if (this.winnerFX) {
        this.winnerFX.rotation.y += dt * 2.2;
        this.winnerHold -= dt;
        if (this.winnerHold <= 0) {
          this.scene.remove(this.winnerFX);
          this.winnerFX = null;
        }
      }

      // dealer chip spin (flat)
      if (this.dealerChip) this.dealerChip.rotation.z += dt * 0.9;

      // turn disc
      this._setTurnDisc(camera);

      // tournament hold
      if (this.phase === "tournament_hold") {
        if (this.timer > 60.0) {
          this.timer = 0;
          // reset tournament
          this._cleanupHandOnly();
          // reset busted flags and stacks
          for (const p of this.players) { p.busted = false; p.stack = 20000; p.inHand = true; }
          this._updatePlayerBoards();
          this._setAction("TOURNAMENT", "Restarting…");
          this.phase = "idle";
          this.timer = 0;
          this._startHand();
        }
        return;
      }

      // PHASES
      if (this.phase === "deal_hole") {
        if (this.timer > 0.18) {
          this.timer = 0;
          const dealt = this._dealCounter || 0;
          const playerIndex = Math.floor(dealt / 2);
          const which = dealt % 2;

          if (playerIndex < this.players.length) {
            if (!this.players[playerIndex].busted) this._dealHoleOnce(playerIndex, which);
            this._dealCounter = dealt + 1;
            this._setAction("DEALING", `Hand #${this.handId}`);
          } else {
            this.phase = "bet_preflop";
            this._setAction("PREFLOP", "Betting…");
            this._dealCounter = 0;
          }
        }
        return;
      }

      const betPhases = ["bet_preflop","bet_flop","bet_turn","bet_river"];
      if (betPhases.includes(this.phase)) {
        if (this.timer > 0.55) {
          this.timer = 0;

          const alive = this._aliveInHand();
          if (alive.length <= 1) {
            const w = alive[0] || this._pickWinner();
            this._showWinner(w);
            this.phase = "reset_wait";
            this.timer = 0;
            return;
          }

          const p = this.players[this.actor];
          if (!p.inHand || p.busted) { this._nextActor(); return; }

          const res = this._botAct(p);

          // animate bet chips across betting line into pot
          if (res.type === "raise" || res.type === "call") {
            if (p.betSpot) {
              const from = p.betSpot.clone();
              const to = new THREE.Vector3(this.center.x, this.TABLE_Y, this.center.z);
              this._animateBetChips(from, to);
            }
          }

          if (res.type === "fold") this._setAction("ACTION", `${p.name} FOLDS`);
          else if (res.type === "raise") this._setAction("ACTION", `${p.name} RAISES to $${res.to}`);
          else if (res.type === "call") this._setAction("ACTION", `${p.name} CALLS $${res.pay}`);
          else if (res.type === "check") this._setAction("ACTION", `${p.name} CHECKS`);

          this._updatePlayerBoards();
          this._nextActor();

          // pace street advancement
          this._betTicks = (this._betTicks || 0) + 1;
          const targetTicks = Math.max(10, this.players.length + 4);

          if (this._betTicks >= targetTicks) {
            this._betTicks = 0;
            if (this.phase === "bet_preflop") { this.phase = "flop"; this._setAction("FLOP", "…"); }
            else if (this.phase === "bet_flop") { this.phase = "turn"; this._setAction("TURN", "…"); }
            else if (this.phase === "bet_turn") { this.phase = "river"; this._setAction("RIVER", "…"); }
            else if (this.phase === "bet_river") { this.phase = "showdown"; this._setAction("SHOWDOWN", "…"); }
          }
        }
        return;
      }

      if (this.phase === "flop") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(3);
          this.phase = "bet_flop";
          this._setAction("FLOP", "Betting…");
        }
        return;
      }

      if (this.phase === "turn") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(4);
          this.phase = "bet_turn";
          this._setAction("TURN", "Betting…");
        }
        return;
      }

      if (this.phase === "river") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(5);
          this.phase = "bet_river";
          this._setAction("RIVER", "Betting…");
        }
        return;
      }

      if (this.phase === "showdown") {
        if (this.timer > 1.0) {
          this.timer = 0;
          const w = this._pickWinner();
          this._showWinner(w);

          // bust check updates tournament
          for (const p of this.players) {
            if (p.stack <= 0) { p.busted = true; p.inHand = false; }
          }

          this.phase = "reset_wait";
          this.timer = 0;
        }
        return;
      }

      if (this.phase === "reset_wait") {
        // wait a short beat then next hand
        if (this.timer > 3.2) {
          this.timer = 0;
          this._startHand();
        }
        return;
      }

    } catch (e) {
      console.error("PokerSim update crash:", e);
      this.disabled = true;
    }
  },
};
