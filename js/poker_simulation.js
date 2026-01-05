// js/poker_simulation.js — VIP Poker Observer Simulation (8.0.7)
// Visible: community cards hover, pot chips, per-bot stacks, winner crown marker

import * as THREE from "./three.js";

function hud(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += (el.textContent ? "\n" : "") + msg;
}

function cardLabel() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  return ranks[(Math.random()*ranks.length)|0] + suits[(Math.random()*suits.length)|0];
}

function makeCanvasTex(text, w=256, h=256, bg="#0b0f18", fg="#ffffff") {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = bg;
  g.fillRect(0,0,w,h);

  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 8;
  g.strokeRect(10,10,w-20,h-20);

  g.fillStyle = fg;
  g.font = "bold 54px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w/2, h/2);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeBillboard(text) {
  const tex = makeCanvasTex(text, 512, 256);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(0.55, 0.275);
  const m = new THREE.Mesh(geo, mat);
  m.userData._tex = tex;
  m.userData.setText = (s) => {
    m.material.map = makeCanvasTex(s, 512, 256);
    m.material.map.colorSpace = THREE.SRGBColorSpace;
    m.material.needsUpdate = true;
  };
  return m;
}

function makeCardMesh(label) {
  const tex = makeCanvasTex(label, 256, 384, "#ffffff", "#111111");
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.20),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0 })
  );
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.20),
    new THREE.MeshStandardMaterial({ color: 0x16243b, roughness: 0.85, metalness: 0 })
  );
  back.rotation.y = Math.PI;

  const g = new THREE.Group();
  g.add(front, back);
  g.userData.isCard = true;
  return g;
}

function makeChipStack(height=0.08) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.006, 18);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.6 });
  const count = Math.max(1, Math.min(20, Math.round(height / 0.006)));
  for (let i=0; i<count; i++) {
    const c = new THREE.Mesh(geo, mat);
    c.position.y = i * 0.006;
    g.add(c);
  }
  return g;
}

function crownMarker() {
  const geo = new THREE.TorusGeometry(0.08, 0.02, 10, 18);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffd24a, emissiveIntensity: 0.65, roughness: 0.35 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI/2;
  return m;
}

export const PokerSim = {
  scene: null,
  seats: [],
  center: new THREE.Vector3(),

  players: [],
  community: [],
  hole: new Map(),

  pot: 0,
  potChips: null,
  potBoard: null,

  phase: "idle",
  timer: 0,
  actor: 0,
  toCall: 0,
  lastRaiseBy: -1,

  winnerFX: null,
  handId: 0,

  build(scene, seats, center) {
    this.scene = scene;
    this.seats = seats || [];
    this.center = (center || new THREE.Vector3()).clone();

    this._cleanup();
    this._startHand();
    hud("🃏 PokerSim 8.0.7 live");
  },

  _cleanup() {
    if (!this.scene) return;

    for (const c of this.community) this.scene.remove(c);
    this.community = [];

    for (const [k, pair] of this.hole.entries()) {
      for (const c of pair) this.scene.remove(c);
    }
    this.hole.clear();

    if (this.potChips) this.scene.remove(this.potChips);
    this.potChips = null;

    if (this.potBoard) this.scene.remove(this.potBoard);
    this.potBoard = null;

    if (this.winnerFX) this.scene.remove(this.winnerFX);
    this.winnerFX = null;

    this.players = [];
    this.pot = 0;
    this.toCall = 0;
    this.actor = 0;
    this.lastRaiseBy = -1;
  },

  _startHand() {
    this.handId++;
    this._cleanup();

    // Initialize players (5,000 chips)
    this.players = this.seats.map((s) => ({
      seat: s,
      name: s.bot?.name || `Bot_${s.index}`,
      stack: 5000,
      bet: 0,
      inHand: true,
      board: null,
      chips: null,
    }));

    // Per-player stack boards + chip stacks
    for (const p of this.players) {
      const board = makeBillboard(`${p.name}\n$${p.stack}`);
      board.position.copy(p.seat.position.clone());
      board.position.y = 1.55;
      board.lookAt(this.center.x, 1.55, this.center.z);
      this.scene.add(board);
      p.board = board;

      const cs = makeChipStack(0.06);
      cs.position.copy(p.seat.position.clone());
      cs.position.y = 1.02;
      // place chips slightly in front of player
      const dir = new THREE.Vector3().subVectors(this.center, p.seat.position).normalize();
      cs.position.add(dir.multiplyScalar(0.45));
      this.scene.add(cs);
      p.chips = cs;
    }

    // Pot board + pot chips in center
    this.potBoard = makeBillboard(`POT\n$0`);
    this.potBoard.position.set(this.center.x, 1.55, this.center.z - 0.05);
    this.potBoard.lookAt(this.center.x, 1.55, this.center.z + 2);
    this.scene.add(this.potBoard);

    this.potChips = makeChipStack(0.08);
    this.potChips.position.set(this.center.x, 1.02, this.center.z - 0.05);
    this.scene.add(this.potChips);

    this.phase = "deal_hole";
    this.timer = 0;
    this.actor = 0;
    this.toCall = 0;
    this.lastRaiseBy = -1;

    hud("—");
    hud(`🎲 New hand #${this.handId}`);
  },

  _updateBoards() {
    for (const p of this.players) {
      if (p.board?.userData?.setText) {
        p.board.userData.setText(`${p.name}\n$${p.stack}${p.inHand ? "" : " (FOLD)"}`);
      }
      // adjust chip stack size roughly by stack
      if (p.chips) {
        const t = Math.max(0.04, Math.min(0.12, p.stack / 5000 * 0.08));
        p.chips.scale.setScalar(t / 0.08);
      }
    }
    if (this.potBoard?.userData?.setText) {
      this.potBoard.userData.setText(`POT\n$${this.pot}`);
    }
    if (this.potChips) {
      const t = Math.max(0.06, Math.min(0.18, this.pot / 800 * 0.08));
      this.potChips.scale.setScalar(t / 0.08);
    }
  },

  _dealHoleOnce(playerIndex, which) {
    const p = this.players[playerIndex];
    const seat = p.seat;

    const label = cardLabel();
    const card = makeCardMesh(label);

    // Place two hole cards in front of player (hover slightly so you can see)
    const dir = new THREE.Vector3().subVectors(this.center, seat.position).normalize();
    const base = seat.position.clone().add(dir.multiplyScalar(0.72));
    base.y = 1.18;

    const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    base.add(right.multiplyScalar(which === 0 ? -0.07 : 0.07));

    card.position.copy(base);
    card.rotation.x = -Math.PI / 2;
    card.rotation.y = Math.atan2(this.center.x - seat.position.x, this.center.z - seat.position.z);

    this.scene.add(card);

    if (!this.hole.has(seat.index)) this.hole.set(seat.index, []);
    this.hole.get(seat.index).push(card);
  },

  _dealCommunity(n) {
    // Hover ABOVE table so it's readable from rail
    // positions 0..4 in a line
    const startX = -0.35;
    const gap = 0.18;

    for (let i = this.community.length; i < n; i++) {
      const label = cardLabel();
      const c = makeCardMesh(label);
      c.position.set(this.center.x + startX + i * gap, 1.38, this.center.z - 0.05);
      c.rotation.x = -Math.PI / 2;
      this.scene.add(c);
      this.community.push(c);
    }
  },

  _alive() {
    return this.players.filter(p => p.inHand);
  },

  _nextActor() {
    const n = this.players.length;
    for (let i=0; i<n; i++) {
      this.actor = (this.actor + 1) % n;
      if (this.players[this.actor].inHand) return;
    }
  },

  _botAct(p) {
    if (!p.inHand) return;

    const facing = this.toCall - p.bet;
    const r = Math.random();

    // fold logic
    if (facing > 0 && r < 0.18) {
      p.inHand = false;
      hud(`❌ ${p.name} folds`);
      return;
    }

    // raise logic
    if (r > 0.84) {
      const raise = 50 + ((Math.random() * 100) | 0);
      const newToCall = this.toCall + raise;

      const pay = Math.max(0, newToCall - p.bet);
      p.bet = newToCall;
      p.stack -= pay;
      this.pot += pay;
      this.toCall = newToCall;
      this.lastRaiseBy = p.seat.index;

      hud(`⬆️ ${p.name} raises to $${this.toCall} (pot $${this.pot})`);
      return;
    }

    // call/check
    const pay = Math.max(0, this.toCall - p.bet);
    p.bet += pay;
    p.stack -= pay;
    this.pot += pay;

    if (pay > 0) hud(`✅ ${p.name} calls $${pay} (pot $${this.pot})`);
    else hud(`✅ ${p.name} checks`);
  },

  _resetBetsForRound() {
    for (const p of this.players) p.bet = 0;
    this.toCall = 0;
    this.actor = 0;
    this.lastRaiseBy = -1;
  },

  _pickWinner() {
    const alive = this._alive();
    if (alive.length === 0) return this.players[(Math.random() * this.players.length) | 0];
    return alive[(Math.random() * alive.length) | 0];
  },

  _showWinner(w) {
    // Winner marker above seat (crown ring)
    const fx = new THREE.Group();
    const c = crownMarker();
    fx.add(c);

    fx.position.copy(w.seat.position);
    fx.position.y = 1.78;
    this.scene.add(fx);
    this.winnerFX = fx;

    hud(`🏁 WINNER: ${w.name} wins pot $${this.pot}`);

    // Award pot
    w.stack += this.pot;
    this.pot = 0;
    this._updateBoards();

    // fade/remove after 2 seconds
    fx.userData.life = 2.0;
  },

  update(dt, camera) {
    if (!this.scene || this.seats.length === 0) return;

    this.timer += dt;

    // face boards to camera
    for (const p of this.players) {
      if (p.board) p.board.lookAt(camera.position);
    }
    if (this.potBoard) this.potBoard.lookAt(camera.position);

    // winner fx decay
    if (this.winnerFX) {
      this.winnerFX.userData.life -= dt;
      this.winnerFX.rotation.y += dt * 2.0;
      if (this.winnerFX.userData.life <= 0) {
        this.scene.remove(this.winnerFX);
        this.winnerFX = null;
      }
    }

    // ==== PHASE MACHINE ====
    if (this.phase === "deal_hole") {
      // deal 2 each
      if (this.timer > 0.18) {
        this.timer = 0;

        const dealt = this._dealtCount || 0;
        const playerIndex = Math.floor(dealt / 2);
        const which = dealt % 2;

        if (playerIndex < this.players.length) {
          this._dealHoleOnce(playerIndex, which);
          this._dealtCount = dealt + 1;
        } else {
          this._dealtCount = 0;
          this.phase = "bet_preflop";
          this._resetBetsForRound();
          hud("💰 Preflop betting");
        }
      }
      return;
    }

    if (this.phase.startsWith("bet_")) {
      if (this.timer > 0.55) {
        this.timer = 0;

        const alive = this._alive();
        if (alive.length <= 1) {
          // everyone folded except one
          const w = alive.length ? alive[0] : this._pickWinner();
          this.phase = "showdown";
          this._showWinner(w);
          this.phase = "reset_wait";
          return;
        }

        const p = this.players[this.actor];
        const beforeToCall = this.toCall;

        this._botAct(p);
        this._updateBoards();

        // end betting round after a full pass with no raises
        this._nextActor();

        // simple stop condition: after N actions and no raise changes
        this._betSteps = (this._betSteps || 0) + 1;
        if (this._betSteps > Math.max(10, this.players.length + 3)) {
          // advance
          this._betSteps = 0;

          if (this.phase === "bet_preflop") { this.phase = "flop"; hud("🟩 FLOP"); }
          else if (this.phase === "bet_flop") { this.phase = "turn"; hud("🟨 TURN"); }
          else if (this.phase === "bet_turn") { this.phase = "river"; hud("🟥 RIVER"); }
          else if (this.phase === "bet_river") { this.phase = "showdown"; hud("🏁 SHOWDOWN"); }
        }

        // if someone raised, keep going longer
        if (this.toCall !== beforeToCall) this._betSteps = 0;
      }
      return;
    }

    if (this.phase === "flop") {
      if (this.timer > 0.6) {
        this.timer = 0;
        this._dealCommunity(3);
        this.phase = "bet_flop";
        this._resetBetsForRound();
        hud("💰 Flop betting");
      }
      return;
    }

    if (this.phase === "turn") {
      if (this.timer > 0.6) {
        this.timer = 0;
        this._dealCommunity(4);
        this.phase = "bet_turn";
        this._resetBetsForRound();
        hud("💰 Turn betting");
      }
      return;
    }

    if (this.phase === "river") {
      if (this.timer > 0.6) {
        this.timer = 0;
        this._dealCommunity(5);
        this.phase = "bet_river";
        this._resetBetsForRound();
        hud("💰 River betting");
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
      if (this.timer > 2.6) {
        this.timer = 0;
        this._startHand();
      }
      return;
    }
  },
};
