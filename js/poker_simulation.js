// js/poker_simulation.js — Texas Hold'em Visual Loop (8.0.6)
// Flow: New Hand -> Deal 2 each -> Betting -> Flop -> Betting -> Turn -> Betting -> River -> Betting -> Showdown
import * as THREE from "./three.js";

function makeCardTexture(label) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 384;
  const g = c.getContext("2d");

  // card background
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);

  // border
  g.strokeStyle = "#111111";
  g.lineWidth = 10;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);

  // label
  g.fillStyle = "#111111";
  g.font = "bold 64px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function randCard() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  const r = ranks[(Math.random() * ranks.length) | 0];
  const s = suits[(Math.random() * suits.length) | 0];
  return r + s;
}

function makeCardMesh(label) {
  const tex = makeCardTexture(label);
  const matFront = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.65,
    metalness: 0.0,
    side: THREE.FrontSide,
  });
  const matBack = new THREE.MeshStandardMaterial({
    color: 0x1b2a44,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.BackSide,
  });

  // two planes back-to-back
  const geo = new THREE.PlaneGeometry(0.14, 0.20);
  const front = new THREE.Mesh(geo, matFront);
  const back = new THREE.Mesh(geo, matBack);
  back.rotation.y = Math.PI;

  const g = new THREE.Group();
  g.add(front, back);
  g.userData.isCard = true;
  return g;
}

function logToHud(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += (el.textContent ? "\n" : "") + msg;
}

export const PokerSim = {
  _scene: null,
  seats: [],
  bots: [],
  center: new THREE.Vector3(),

  deckPos: new THREE.Vector3(),
  pot: 0,

  phase: "idle",
  timer: 0,

  active: [],
  actions: [],
  currentIndex: 0,
  toCall: 0,

  community: [],          // 5 card meshes on table
  hole: new Map(),        // seatIndex -> [cardA, cardB]

  build(scene, seats, center, bots = []) {
    this._scene = scene;
    this.seats = seats || [];
    this.bots = bots || [];
    this.center = center ? center.clone() : new THREE.Vector3(0,0,0);

    this.deckPos = new THREE.Vector3(this.center.x, 1.12, this.center.z);

    this._cleanup();
    this._newHand();

    logToHud("🃏 PokerSim ready (8.0.6)");
  },

  _cleanup() {
    // remove old cards
    for (const [k, pair] of this.hole.entries()) {
      for (const c of pair) this._scene.remove(c);
    }
    this.hole.clear();

    for (const c of this.community) this._scene.remove(c);
    this.community = [];

    this.active = [];
    this.actions = [];
    this.pot = 0;
    this.toCall = 0;
    this.currentIndex = 0;
  },

  _newHand() {
    this._cleanup();

    // everyone in (for now)
    this.active = this.seats.map(s => ({
      seat: s,
      inHand: true,
      stack: 1000,
      bet: 0,
      name: s.bot?.name || `Bot_${s.index}`,
    }));

    this.phase = "deal_hole";
    this.timer = 0;

    logToHud("—");
    logToHud("🎲 New hand started");
  },

  _seatCardTarget(seat, offsetX) {
    // two hole cards in front of bot, closer to table
    const dirToCenter = new THREE.Vector3().subVectors(this.center, seat.position).normalize();
    const base = seat.position.clone().add(dirToCenter.multiplyScalar(0.72));
    base.y = 1.07;

    // sideways offset for two cards
    const right = new THREE.Vector3(dirToCenter.z, 0, -dirToCenter.x).normalize(); // perpendicular
    base.add(right.multiplyScalar(offsetX));
    return base;
  },

  _communityTarget(i) {
    // 5 community cards centered line
    const startX = -0.35;
    const gap = 0.18;
    const p = new THREE.Vector3(
      this.center.x + startX + i * gap,
      1.09,
      this.center.z - 0.05
    );
    return p;
  },

  _spawnAnimatedCard(label, endPos, endYaw = 0) {
    const card = makeCardMesh(label);
    card.position.copy(this.deckPos);
    card.rotation.set(-Math.PI/2, 0, 0); // lie flat initially

    card.userData.anim = {
      t: 0,
      start: this.deckPos.clone(),
      end: endPos.clone(),
      endYaw,
    };

    this._scene.add(card);
    return card;
  },

  _animateCards(dt) {
    // animate any cards with userData.anim
    const allCards = [];

    for (const [k, pair] of this.hole.entries()) allCards.push(...pair);
    allCards.push(...this.community);

    for (const c of allCards) {
      const a = c.userData.anim;
      if (!a) continue;

      a.t += dt * 2.0;
      const t = Math.min(a.t, 1);

      c.position.lerpVectors(a.start, a.end, t);

      // lift arc a bit
      const arc = Math.sin(t * Math.PI) * 0.12;
      c.position.y += arc;

      // rotate to final placement
      c.rotation.x = -Math.PI / 2;
      c.rotation.y = a.endYaw * t;

      if (t >= 1) delete c.userData.anim;
    }
  },

  _nextActor() {
    const n = this.active.length;
    for (let step = 0; step < n; step++) {
      this.currentIndex = (this.currentIndex + 1) % n;
      if (this.active[this.currentIndex].inHand) return;
    }
  },

  _bettingRoundStart() {
    // reset bets for round
    for (const p of this.active) p.bet = 0;
    this.toCall = 0;
    this.currentIndex = 0;

    logToHud(`💰 Betting round (${this.phase})`);
  },

  _botAction(p) {
    if (!p.inHand) return;

    // simple AI:
    // - 20% fold if facing a bet
    // - else call/check
    // - 18% raise sometimes
    const facingBet = this.toCall > p.bet;
    const r = Math.random();

    if (facingBet && r < 0.20) {
      p.inHand = false;
      logToHud(`❌ ${p.name} folds`);
      return;
    }

    if (r > 0.82) {
      // raise
      const raise = 10 + ((Math.random() * 20) | 0);
      const newToCall = this.toCall + raise;

      const pay = newToCall - p.bet;
      p.bet = newToCall;
      p.stack -= pay;
      this.pot += pay;
      this.toCall = newToCall;

      logToHud(`⬆️ ${p.name} raises to ${this.toCall} (pot ${this.pot})`);
      return;
    }

    // call/check
    const pay = Math.max(0, this.toCall - p.bet);
    p.bet += pay;
    p.stack -= pay;
    this.pot += pay;

    if (pay > 0) logToHud(`✅ ${p.name} calls ${pay} (pot ${this.pot})`);
    else logToHud(`✅ ${p.name} checks`);
  },

  update(dt) {
    if (!this._scene || !this.seats.length) return;

    this._animateCards(dt);
    this.timer += dt;

    // === PHASE MACHINE ===
    if (this.phase === "deal_hole") {
      // deal 2 cards to each seat (animated)
      if (this.timer > 0.35) {
        const seatIndex = (this.actions.length / 2) | 0;
        const which = this.actions.length % 2; // 0 or 1

        if (seatIndex < this.seats.length) {
          const seat = this.seats[seatIndex];
          const label = randCard();

          const offsetX = which === 0 ? -0.06 : 0.06;
          const end = this._seatCardTarget(seat, offsetX);

          const yaw = Math.atan2(this.center.x - seat.position.x, this.center.z - seat.position.z);
          const c = this._spawnAnimatedCard(label, end, yaw);

          if (!this.hole.has(seat.index)) this.hole.set(seat.index, []);
          this.hole.get(seat.index).push(c);

          this.actions.push({ type: "hole", seat: seat.index, label });
          this.timer = 0;
        } else {
          this.phase = "bet_preflop";
          this.timer = 0;
          this._bettingRoundStart();
        }
      }
      return;
    }

    // Betting phases: each ~0.55 sec do an action, stop after 1 full loop with no new raises
    if (this.phase.startsWith("bet_")) {
      if (!this._betState) {
        this._betState = { loops: 0, lastToCall: this.toCall };
      }

      if (this.timer > 0.55) {
        this.timer = 0;

        const p = this.active[this.currentIndex];
        const before = this.toCall;

        this._botAction(p);

        // move to next
        this._nextActor();

        // detect loop completion
        this._betState.loops++;

        // after enough actions, end betting
        // (simple: 8 actions OR 1 full pass with no change in toCall)
        if (this._betState.loops >= Math.max(8, this.active.length + 2)) {
          const unchanged = (this._betState.lastToCall === this.toCall);

          if (unchanged) {
            delete this._betState;

            if (this.phase === "bet_preflop") this.phase = "flop";
            else if (this.phase === "bet_flop") this.phase = "turn";
            else if (this.phase === "bet_turn") this.phase = "river";
            else if (this.phase === "bet_river") this.phase = "showdown";

            this.timer = 0;
          } else {
            this._betState.lastToCall = this.toCall;
            this._betState.loops = 0;
          }
        }
      }
      return;
    }

    if (this.phase === "flop") {
      if (this.timer > 0.5) {
        this.timer = 0;
        logToHud("🟩 FLOP");

        for (let i = 0; i < 3; i++) {
          const label = randCard();
          const end = this._communityTarget(i);
          const c = this._spawnAnimatedCard(label, end, 0);
          c.rotation.x = -Math.PI/2;
          this.community.push(c);
        }

        this.phase = "bet_flop";
        this._bettingRoundStart();
      }
      return;
    }

    if (this.phase === "turn") {
      if (this.timer > 0.6) {
        this.timer = 0;
        logToHud("🟨 TURN");

        const label = randCard();
        const end = this._communityTarget(3);
        const c = this._spawnAnimatedCard(label, end, 0);
        this.community.push(c);

        this.phase = "bet_turn";
        this._bettingRoundStart();
      }
      return;
    }

    if (this.phase === "river") {
      if (this.timer > 0.6) {
        this.timer = 0;
        logToHud("🟥 RIVER");

        const label = randCard();
        const end = this._communityTarget(4);
        const c = this._spawnAnimatedCard(label, end, 0);
        this.community.push(c);

        this.phase = "bet_river";
        this._bettingRoundStart();
      }
      return;
    }

    if (this.phase === "showdown") {
      if (this.timer > 1.0) {
        this.timer = 0;

        const contenders = this.active.filter(p => p.inHand);
        const winner = contenders.length
          ? contenders[(Math.random() * contenders.length) | 0]
          : this.active[(Math.random() * this.active.length) | 0];

        logToHud(`🏁 SHOWDOWN — Winner: ${winner.name} wins pot ${this.pot}`);

        // pause then new hand
        this.phase = "reset_wait";
        this.timer = 0;
      }
      return;
    }

    if (this.phase === "reset_wait") {
      if (this.timer > 2.0) {
        this._newHand();
      }
    }
  },
};
