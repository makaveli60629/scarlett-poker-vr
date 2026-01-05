// js/poker_simulation.js — VIP Poker Observer Simulation (8.0.9)
// ADD:
// - Spectator view: ALL hole cards float in the air facing viewer (camera)
// - Card face graphics: corners + big suit, red/black suit coloring
// - Action banner: shows raise/call/fold + amounts
// - Dealer chip flat on table; pot visible in a consistent viewer-friendly spot
// - Players can bust (stack hits 0) and sit out

import * as THREE from "./three.js";

function hud(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += (el.textContent ? "\n" : "") + msg;
}

function isVec3(v) {
  return v && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number";
}
function seatPos(seat, fallback) {
  if (seat && isVec3(seat.position)) return seat.position;
  if (seat && isVec3(seat.pos)) return seat.pos;
  if (seat && isVec3(seat.p)) return seat.p;
  return fallback;
}
function safeClone(v, fb) {
  const f = fb || new THREE.Vector3(0, 0, 0);
  return isVec3(v) ? v.clone() : f.clone();
}

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function randCard() {
  const suit = SUITS[(Math.random() * SUITS.length) | 0];
  const rank = RANKS[(Math.random() * RANKS.length) | 0];
  return { rank, suit };
}
function isRedSuit(s) {
  return s === "♥" || s === "♦";
}

// Draw a real-ish card face:
// - corner rank+suit top-left
// - mirrored bottom-right
// - big suit center
function makeCardTexture(card) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const g = c.getContext("2d");

  // card base
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);

  // border
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 18;
  g.strokeRect(18, 18, c.width - 36, c.height - 36);

  const fg = isRedSuit(card.suit) ? "#c2182b" : "#101317";

  // corners
  g.fillStyle = fg;
  g.textAlign = "left";
  g.textBaseline = "top";
  g.font = "900 72px system-ui";
  g.fillText(card.rank, 52, 48);
  g.font = "900 76px system-ui";
  g.fillText(card.suit, 52, 130);

  // bottom-right mirrored
  g.save();
  g.translate(c.width, c.height);
  g.rotate(Math.PI);
  g.textAlign = "left";
  g.textBaseline = "top";
  g.fillStyle = fg;
  g.font = "900 72px system-ui";
  g.fillText(card.rank, 52, 48);
  g.font = "900 76px system-ui";
  g.fillText(card.suit, 52, 130);
  g.restore();

  // big suit middle
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "900 280px system-ui";
  g.fillText(card.suit, c.width / 2, c.height / 2 + 8);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeBillboard(text, w=512, h=256) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = "rgba(10,12,18,0.92)";
  g.fillRect(0,0,w,h);

  g.strokeStyle = "rgba(0,255,170,0.45)";
  g.lineWidth = 10;
  g.strokeRect(14, 14, w-28, h-28);

  g.fillStyle = "rgba(255,255,255,0.95)";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "800 44px system-ui";
  const lines = String(text || "").split("\n");
  const mid = h / 2;
  if (lines.length === 1) {
    g.fillText(lines[0], w/2, mid);
  } else {
    g.fillText(lines[0], w/2, mid - 30);
    g.font = "800 40px system-ui";
    g.fillText(lines.slice(1).join(" "), w/2, mid + 30);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.39), mat);
  mesh.userData.setText = (t) => {
    const n = makeBillboard(t, w, h);
    // swap texture only
    mesh.material.map = n.material.map;
    mesh.material.needsUpdate = true;
  };
  return mesh;
}

function makeCardMesh(card) {
  const frontTex = makeCardTexture(card);

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.32),
    new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.7 })
  );
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x15243a, roughness: 0.9 })
  );
  back.rotation.y = Math.PI;

  const g = new THREE.Group();
  g.add(front, back);
  g.userData.card = card;
  return g;
}

function makeChipStack(scale=1.0) {
  const g = new THREE.Group();
  // multiple denoms = different colors
  const denoms = [
    { v: 5,    color: 0xffffff },
    { v: 25,   color: 0x22aaff },
    { v: 100,  color: 0x00ffaa },
    { v: 500,  color: 0xff3366 },
    { v: 1000, color: 0xffd24a },
  ];

  const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20);

  // create a small “mixed stack”
  const chips = 12;
  for (let i=0;i<chips;i++) {
    const d = denoms[i % denoms.length];
    const mat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.55 });
    const c = new THREE.Mesh(geo, mat);
    c.position.y = i * 0.006;
    g.add(c);
  }

  g.scale.setScalar(scale);
  return g;
}

function makeTurnDisc() {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 30),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    })
  );
  disc.rotation.x = -Math.PI/2;
  disc.visible = false;
  return disc;
}

function makeDealerChip() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#111111";
  g.fillRect(0,0,256,256);
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 14;
  g.strokeRect(14,14,228,228);
  g.fillStyle = "#ffffff";
  g.font = "900 140px system-ui";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("D", 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.012, 28),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0x111111, emissiveIntensity: 0.2 })
  );

  // ✅ flat on table
  chip.rotation.x = Math.PI / 2;
  return chip;
}

function crownMarker() {
  const geo = new THREE.TorusGeometry(0.085, 0.02, 10, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xffd24a,
    emissiveIntensity: 0.75,
    roughness: 0.35
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI/2;
  return m;
}

export const PokerSim = {
  disabled: false,
  scene: null,
  seats: [],
  bots: [],
  center: new THREE.Vector3(),

  TABLE_Y: 1.03,
  FLOAT_Y: 1.62,          // where we float hole cards for spectator
  COMM_Y: 1.40,           // community cards hover
  VIEW_OFFSET: new THREE.Vector3(0, 0, 2.2), // pot/action moved toward spectator slightly

  players: [],
  community: [],
  hole: new Map(),

  pot: 0,
  potStack: null,
  potBoard: null,
  actionBoard: null,

  phase: "idle",
  timer: 0,
  actor: 0,
  toCall: 0,

  winnerFX: null,
  handId: 0,
  dealerIndex: 0,

  turnDisc: null,
  dealerChip: null,

  build(scene, seats, center, bots=[]) {
    try {
      this.disabled = false;
      this.scene = scene;
      this.center = isVec3(center) ? center.clone() : new THREE.Vector3(0,0,0);
      this.bots = Array.isArray(bots) ? bots : [];

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

      if (!this.scene) { this.disabled = true; hud("❌ PokerSim disabled: no scene"); return; }
      if (this.seats.length < 2) { this.disabled = true; hud("❌ PokerSim disabled: need 2+ seats"); return; }

      if (!this.turnDisc) {
        this.turnDisc = makeTurnDisc();
        this.scene.add(this.turnDisc);
      }
      if (!this.dealerChip) {
        this.dealerChip = makeDealerChip();
        this.scene.add(this.dealerChip);
      }

      this._cleanupHandOnly();
      this._startHand();
      hud("🃏 PokerSim 8.0.9 live");
    } catch (e) {
      console.error("PokerSim build crash:", e);
      this.disabled = true;
      hud("❌ PokerSim disabled (build error): " + String(e?.message || e));
    }
  },

  _cleanupHandOnly() {
    try {
      if (!this.scene) return;

      for (const c of this.community) this.scene.remove(c);
      this.community = [];

      for (const [, pair] of this.hole.entries()) {
        for (const c of pair) this.scene.remove(c);
      }
      this.hole.clear();

      for (const p of this.players) {
        if (p.board) this.scene.remove(p.board);
        if (p.chips) this.scene.remove(p.chips);
      }

      if (this.potStack) this.scene.remove(this.potStack);
      this.potStack = null;

      if (this.potBoard) this.scene.remove(this.potBoard);
      this.potBoard = null;

      if (this.actionBoard) this.scene.remove(this.actionBoard);
      this.actionBoard = null;

      if (this.winnerFX) this.scene.remove(this.winnerFX);
      this.winnerFX = null;

      this.players = [];
      this.pot = 0;
      this.toCall = 0;
      this.actor = 0;

      if (this.turnDisc) this.turnDisc.visible = false;
    } catch (e) {
      console.warn("PokerSim cleanup warning:", e);
    }
  },

  _startHand() {
    if (this.disabled) return;

    this.handId++;
    this._cleanupHandOnly();

    this.dealerIndex = (this.dealerIndex + 1) % this.seats.length;

    // Start with 10,000 chips each (as requested)
    this.players = this.seats.map((s, i) => ({
      seat: s,
      name: s.bot?.name || `Boss_${(typeof s.index === "number" ? s.index : i)}`,
      stack: 10000,
      bet: 0,
      inHand: true,
      busted: false,
      board: null,
      chips: null,
      betSpot: null,
      floatSpots: [],
    }));

    // Viewer-friendly placement reference (toward spectator)
    const viewCenter = this.center.clone().add(this.VIEW_OFFSET);

    // Per player: label + chip stack + bet spot + floating card spots
    for (let i=0;i<this.players.length;i++) {
      const p = this.players[i];
      const pos = safeClone(seatPos(p.seat, this.center), this.center);

      // board near head
      const board = makeBillboard(`${p.name}\n$${p.stack}`);
      board.position.copy(pos);
      board.position.y = 1.60;
      this.scene.add(board);
      p.board = board;

      // toward table center direction
      const dir = new THREE.Vector3().subVectors(this.center, pos);
      if (dir.lengthSq() > 0.0001) dir.normalize();

      // chips on table near player
      const chipSpot = pos.clone().add(dir.multiplyScalar(0.95));
      chipSpot.y = this.TABLE_Y;
      const cs = makeChipStack(0.95);
      cs.position.copy(chipSpot);
      this.scene.add(cs);
      p.chips = cs;

      // bet spot closer to center
      const betSpot = pos.clone().add(dir.multiplyScalar(1.45));
      betSpot.y = this.TABLE_Y;
      p.betSpot = betSpot;

      // Floating spectator card spots (in the air facing viewer)
      // Put them in a neat arc line closer to viewCenter so you can read them.
      const spread = 0.35;
      const base = viewCenter.clone();
      base.x += (i - (this.players.length - 1) / 2) * spread;
      base.y = this.FLOAT_Y;
      base.z += 0.65; // slightly toward you
      p.floatSpots = [
        base.clone().add(new THREE.Vector3(-0.14, 0, 0)),
        base.clone().add(new THREE.Vector3(+0.14, 0, 0)),
      ];
    }

    // Pot + action boards (toward spectator so always visible)
    this.potBoard = makeBillboard(`POT\n$0`);
    this.potBoard.position.copy(viewCenter);
    this.potBoard.position.y = 1.70;
    this.scene.add(this.potBoard);

    this.actionBoard = makeBillboard(`HAND #${this.handId}\nDealing…`);
    this.actionBoard.position.copy(viewCenter);
    this.actionBoard.position.y = 2.08;
    this.scene.add(this.actionBoard);

    // Pot chips visible
    this.potStack = makeChipStack(1.10);
    this.potStack.position.copy(viewCenter);
    this.potStack.position.y = this.TABLE_Y;
    this.scene.add(this.potStack);

    // Dealer chip flat on table near dealer seat
    const dSeatPos = safeClone(seatPos(this.seats[this.dealerIndex], this.center), this.center);
    const ddir = new THREE.Vector3().subVectors(this.center, dSeatPos);
    if (ddir.lengthSq() > 0.0001) ddir.normalize();
    const dealerSpot = dSeatPos.clone().add(ddir.multiplyScalar(1.15));
    dealerSpot.y = this.TABLE_Y + 0.01;

    this.dealerChip.position.copy(dealerSpot);
    this.dealerChip.visible = true;

    // Phase init
    this.phase = "deal_hole";
    this.timer = 0;
    this.actor = (this.dealerIndex + 1) % this.players.length;
    this.toCall = 0;

    this._dealtCount = 0;
    this._betSteps = 0;

    hud("—");
    hud(`🎲 New hand #${this.handId} (Dealer: ${this.players[this.dealerIndex]?.name || "?"})`);
  },

  _setAction(text) {
    if (this.actionBoard?.userData?.setText) this.actionBoard.userData.setText(text);
  },

  _updateBoards() {
    for (const p of this.players) {
      if (p.board?.userData?.setText) {
        const status = p.busted ? " (BUST)" : (p.inHand ? "" : " (FOLD)");
        p.board.userData.setText(`${p.name}\n$${p.stack}${status}`);
      }
      if (p.chips) {
        // scale chips by stack size
        const s = Math.max(0.60, Math.min(1.65, 0.60 + p.stack / 12000));
        p.chips.scale.setScalar(s);
      }
    }

    if (this.potBoard?.userData?.setText) this.potBoard.userData.setText(`POT\n$${this.pot}`);
    if (this.potStack) {
      const t = Math.max(0.70, Math.min(1.90, 0.70 + this.pot / 7000));
      this.potStack.scale.setScalar(t);
    }
  },

  _alive() {
    return this.players.filter(p => p.inHand && !p.busted);
  },

  _dealHoleOnce(playerIndex, which) {
    const p = this.players[playerIndex];
    if (!p || p.busted) return;

    const card = randCard();
    const mesh = makeCardMesh(card);

    // Place hole cards at spectator floating spots
    const spot = p.floatSpots?.[which] || this.center.clone();
    mesh.position.copy(spot);

    // Face camera later in update()
    mesh.userData.faceCamera = true;

    this.scene.add(mesh);

    const idx = (typeof p.seat.index === "number") ? p.seat.index : playerIndex;
    if (!this.hole.has(idx)) this.hole.set(idx, []);
    this.hole.get(idx).push(mesh);
  },

  _dealCommunity(n) {
    const viewCenter = this.center.clone().add(this.VIEW_OFFSET);
    const startX = -0.48;
    const gap = 0.24;

    for (let i=this.community.length; i<n; i++) {
      const card = randCard();
      const mesh = makeCardMesh(card);

      mesh.position.set(viewCenter.x + startX + i * gap, this.COMM_Y, viewCenter.z - 0.55);
      mesh.scale.setScalar(1.10);
      mesh.userData.faceCamera = true;

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

  _setTurnHighlight(camera) {
    const p = this.players[this.actor];
    if (!p || !p.betSpot || !p.inHand || p.busted) {
      this.turnDisc.visible = false;
      return;
    }

    this.turnDisc.visible = true;
    this.turnDisc.position.set(p.betSpot.x, this.TABLE_Y + 0.003, p.betSpot.z);

    const t = performance.now() * 0.001;
    const s = 0.88 + Math.sin(t * 6.0) * 0.08;
    this.turnDisc.scale.set(s, s, s);

    // Make it subtly face viewer
    if (camera) this.turnDisc.lookAt(camera.position.x, this.turnDisc.position.y, camera.position.z);
    this.turnDisc.rotation.x = -Math.PI/2;
  },

  _botAct(p) {
    if (!p.inHand || p.busted) return { type: "noop" };

    const facing = this.toCall - p.bet;
    const r = Math.random();

    // fold
    if (facing > 0 && r < 0.18) {
      p.inHand = false;
      return { type: "fold" };
    }

    // raise
    if (r > 0.84) {
      const raise = 200 + ((Math.random() * 800) | 0);
      const newToCall = this.toCall + raise;

      const pay = Math.max(0, newToCall - p.bet);
      p.bet = newToCall;
      p.stack -= pay;
      this.pot += pay;
      this.toCall = newToCall;

      if (p.stack <= 0) { p.stack = 0; p.busted = true; p.inHand = false; }

      return { type: "raise", to: this.toCall, pay };
    }

    // call/check
    const pay = Math.max(0, this.toCall - p.bet);
    p.bet += pay;
    p.stack -= pay;
    this.pot += pay;

    if (p.stack <= 0) { p.stack = 0; p.busted = true; p.inHand = false; }

    return pay > 0 ? { type: "call", pay } : { type: "check" };
  },

  _pickWinner() {
    const alive = this._alive();
    if (alive.length) return alive[(Math.random() * alive.length) | 0];
    // if everyone busted/folded weirdly, pick any non-busted
    const any = this.players.filter(p => !p.busted);
    if (any.length) return any[(Math.random() * any.length) | 0];
    return this.players[(Math.random() * this.players.length) | 0];
  },

  _showWinner(w) {
    const fx = new THREE.Group();
    fx.add(crownMarker());

    const pos = safeClone(seatPos(w.seat, this.center), this.center);
    fx.position.copy(pos);
    fx.position.y = 1.86;

    this.scene.add(fx);
    this.winnerFX = fx;
    fx.userData.life = 2.2;

    const won = this.pot;
    w.stack += this.pot;
    this.pot = 0;

    this._setAction(`WINNER\n${w.name} wins $${won}`);
    this._updateBoards();
  },

  update(dt, camera) {
    try {
      if (this.disabled) return;
      if (!this.scene || this.seats.length < 2) return;

      this.timer += dt;

      // face camera for floating cards + boards
      if (camera) {
        for (const [, pair] of this.hole.entries()) for (const c of pair) if (c?.userData?.faceCamera) c.lookAt(camera.position);
        for (const c of this.community) if (c?.userData?.faceCamera) c.lookAt(camera.position);

        for (const p of this.players) if (p.board) p.board.lookAt(camera.position);
        if (this.potBoard) this.potBoard.lookAt(camera.position);
        if (this.actionBoard) this.actionBoard.lookAt(camera.position);
      }

      // dealer chip slow spin (still flat)
      if (this.dealerChip) this.dealerChip.rotation.z += dt * 0.9;

      // turn highlight
      this._setTurnHighlight(camera);

      // winner FX
      if (this.winnerFX) {
        this.winnerFX.userData.life -= dt;
        this.winnerFX.rotation.y += dt * 2.2;
        if (this.winnerFX.userData.life <= 0) {
          this.scene.remove(this.winnerFX);
          this.winnerFX = null;
        }
      }

      // PHASES
      if (this.phase === "deal_hole") {
        if (this.timer > 0.18) {
          this.timer = 0;
          const dealt = this._dealtCount || 0;
          const playerIndex = Math.floor(dealt / 2);
          const which = dealt % 2;

          if (playerIndex < this.players.length) {
            this._dealHoleOnce(playerIndex, which);
            this._dealtCount = dealt + 1;
            this._setAction(`HAND #${this.handId}\nDealing…`);
          } else {
            this._dealtCount = 0;
            this.phase = "bet_preflop";
            this._setAction(`PREFLOP\nBetting…`);
          }
        }
        return;
      }

      if (this.phase.startsWith("bet_")) {
        if (this.timer > 0.55) {
          this.timer = 0;

          const alive = this._alive();
          if (alive.length <= 1) {
            const w = alive.length ? alive[0] : this._pickWinner();
            this._showWinner(w);
            this.phase = "reset_wait";
            this.timer = 0;
            return;
          }

          const p = this.players[this.actor];
          const result = this._botAct(p);

          // action banner
          if (result.type === "fold") this._setAction(`ACTION\n${p.name} FOLDS`);
          else if (result.type === "raise") this._setAction(`ACTION\n${p.name} RAISES to $${result.to}`);
          else if (result.type === "call") this._setAction(`ACTION\n${p.name} CALLS $${result.pay}`);
          else if (result.type === "check") this._setAction(`ACTION\n${p.name} CHECKS`);

          this._updateBoards();
          this._nextActor();

          // progress streets (simple pacing)
          this._betSteps = (this._betSteps || 0) + 1;
          if (this._betSteps > Math.max(10, this.players.length + 3)) {
            this._betSteps = 0;
            if (this.phase === "bet_preflop") { this.phase = "flop"; this._setAction("FLOP\n…"); }
            else if (this.phase === "bet_flop") { this.phase = "turn"; this._setAction("TURN\n…"); }
            else if (this.phase === "bet_turn") { this.phase = "river"; this._setAction("RIVER\n…"); }
            else if (this.phase === "bet_river") { this.phase = "showdown"; this._setAction("SHOWDOWN\n…"); }
          }
        }
        return;
      }

      if (this.phase === "flop") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(3);
          this.phase = "bet_flop";
          this._setAction("FLOP\nBetting…");
        }
        return;
      }

      if (this.phase === "turn") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(4);
          this.phase = "bet_turn";
          this._setAction("TURN\nBetting…");
        }
        return;
      }

      if (this.phase === "river") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(5);
          this.phase = "bet_river";
          this._setAction("RIVER\nBetting…");
        }
        return;
      }

      if (this.phase === "showdown") {
        if (this.timer > 1.0) {
          this.timer = 0;
          const w = this._pickWinner();
          this._showWinner(w);
          this.phase = "reset_wait";
        }
        return;
      }

      if (this.phase === "reset_wait") {
        if (this.timer > 2.8) {
          this.timer = 0;
          this._startHand();
        }
        return;
      }
    } catch (e) {
      console.error("PokerSim update crash:", e);
      this.disabled = true;
      hud("❌ PokerSim disabled (update error): " + String(e?.message || e));
    }
  },
};
