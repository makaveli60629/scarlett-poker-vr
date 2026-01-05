// js/poker_simulation.js — VIP Poker Observer Simulation (8.0.8)
// ADD: chips on table, bigger hovering community cards, turn highlight, dealer chip, safe guards.

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

  g.strokeStyle = "rgba(0,255,170,0.45)";
  g.lineWidth = 10;
  g.strokeRect(14, 14, w-28, h-28);

  g.fillStyle = fg;
  g.font = "900 56px system-ui";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text||""), w/2, h/2);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeBillboard(text) {
  const tex = makeCanvasTex(text, 512, 256);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9 });
  const geo = new THREE.PlaneGeometry(0.60, 0.30);
  const m = new THREE.Mesh(geo, mat);

  m.userData.setText = (s) => {
    const newTex = makeCanvasTex(s, 512, 256);
    newTex.colorSpace = THREE.SRGBColorSpace;
    newTex.needsUpdate = true;
    m.material.map = newTex;
    m.material.needsUpdate = true;
  };
  return m;
}

function makeCardMesh(label) {
  const tex = makeCanvasTex(label, 256, 384, "#ffffff", "#111111");

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.26),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 })
  );

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x16243b, roughness: 0.85 })
  );
  back.rotation.y = Math.PI;

  const g = new THREE.Group();
  g.add(front, back);
  return g;
}

function makeChipStack(height=0.07) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.028, 0.028, 0.006, 18);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.6 });

  const count = Math.max(2, Math.min(18, Math.round(height / 0.006)));
  for (let i=0; i<count; i++) {
    const c = new THREE.Mesh(geo, mat);
    c.position.y = i * 0.006;
    g.add(c);
  }
  return g;
}

function makeTurnDisc() {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 28),
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
  disc.name = "TurnDisc";
  return disc;
}

function makeDealerChip() {
  const tex = makeCanvasTex("D", 256, 256, "#111111", "#ffffff");
  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.012, 26),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.55,
      emissive: 0x222222,
      emissiveIntensity: 0.35
    })
  );
  chip.rotation.x = Math.PI/2;
  chip.name = "DealerChip";
  return chip;
}

function crownMarker() {
  const geo = new THREE.TorusGeometry(0.08, 0.02, 10, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xffd24a,
    emissiveIntensity: 0.65,
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

  // table geometry assumptions for your boss table
  TABLE_SURFACE_Y: 1.02,      // boss_table top surface ~ 1.02
  COMMUNITY_HOVER_Y: 1.20,     // hover for middle cards
  TABLE_ITEM_Y: 1.03,         // chips/pot sit on table

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

  winnerFX: null,
  handId: 0,
  dealerIndex: 0,

  turnDisc: null,
  dealerChip: null,

  build(scene, seats, center, bots=[]) {
    try {
      this.disabled = false;
      this.scene = scene;
      this.bots = Array.isArray(bots) ? bots : [];
      this.center = isVec3(center) ? center.clone() : new THREE.Vector3(0,0,0);

      const list = Array.isArray(seats) ? seats : [];
      const safeSeats = [];
      for (let i=0;i<list.length;i++) {
        const s = list[i];
        const p = seatPos(s, null);
        if (!p) continue;
        if (typeof s.index !== "number") s.index = i;
        safeSeats.push(s);
      }
      this.seats = safeSeats;

      if (!this.scene) { this.disabled = true; hud("❌ PokerSim disabled: no scene"); return; }
      if (this.seats.length < 2) { this.disabled = true; hud("❌ PokerSim disabled: need 2+ seats"); return; }

      // shared table UI objects
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
      hud("🃏 PokerSim 8.0.8 live");
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

    this.players = this.seats.map((s, i) => ({
      seat: s,
      name: s.bot?.name || `Boss_${(typeof s.index === "number" ? s.index : i)}`,
      stack: 5000,
      bet: 0,
      inHand: true,
      board: null,
      chips: null,
      betSpot: null,
    }));

    // Player UI: stack label above head, chips on table near seat, bet spot on table
    for (let i=0;i<this.players.length;i++) {
      const p = this.players[i];
      const pos = safeClone(seatPos(p.seat, this.center), this.center);

      // Stack board near bot head (viewer friendly)
      const board = makeBillboard(`${p.name}\n$${p.stack}`);
      board.position.copy(pos);
      board.position.y = 1.55;
      this.scene.add(board);
      p.board = board;

      // Compute direction to center
      const dir = new THREE.Vector3().subVectors(this.center, pos);
      if (dir.lengthSq() > 0.0001) dir.normalize();

      // Chips ON TABLE: move toward center and set to table height
      const chipSpot = pos.clone().add(dir.multiplyScalar(0.95));
      chipSpot.y = this.TABLE_ITEM_Y;

      const cs = makeChipStack(0.07);
      cs.position.copy(chipSpot);
      this.scene.add(cs);
      p.chips = cs;

      // Bet spot slightly closer to center (where chips "go")
      const betSpot = pos.clone().add(dir.multiplyScalar(1.40));
      betSpot.y = this.TABLE_ITEM_Y;
      p.betSpot = betSpot;
    }

    // Pot board + pot chips ON TABLE at center
    this.potBoard = makeBillboard(`POT\n$0`);
    this.potBoard.position.set(this.center.x, 1.62, this.center.z - 0.05);
    this.scene.add(this.potBoard);

    this.potChips = makeChipStack(0.09);
    this.potChips.position.set(this.center.x, this.TABLE_ITEM_Y, this.center.z - 0.05);
    this.scene.add(this.potChips);

    // Dealer chip on table near dealer seat
    const dealerSeatPos = safeClone(seatPos(this.seats[this.dealerIndex], this.center), this.center);
    const ddir = new THREE.Vector3().subVectors(this.center, dealerSeatPos);
    if (ddir.lengthSq() > 0.0001) ddir.normalize();
    const dealerSpot = dealerSeatPos.clone().add(ddir.multiplyScalar(1.15));
    dealerSpot.y = this.TABLE_ITEM_Y + 0.01;

    this.dealerChip.position.copy(dealerSpot);
    this.dealerChip.visible = true;

    // Phase machine init
    this.phase = "deal_hole";
    this.timer = 0;
    this.actor = (this.dealerIndex + 1) % this.players.length; // act after dealer
    this.toCall = 0;

    this._dealtCount = 0;
    this._betSteps = 0;

    hud("—");
    hud(`🎲 New hand #${this.handId} (Dealer: ${this.players[this.dealerIndex]?.name || "?"})`);
  },

  _updateBoards() {
    if (this.disabled) return;

    for (const p of this.players) {
      if (p.board?.userData?.setText) {
        p.board.userData.setText(`${p.name}\n$${p.stack}${p.inHand ? "" : " (FOLD)"}`);
      }
      // keep chips placed on table spot
      if (p.chips && p.betSpot) {
        // no move yet (we’ll animate throws next patch)
      }
    }
    if (this.potBoard?.userData?.setText) this.potBoard.userData.setText(`POT\n$${this.pot}`);
    if (this.potChips) {
      const t = Math.max(0.85, Math.min(2.0, 0.85 + (this.pot / 900)));
      this.potChips.scale.setScalar(t * 0.55);
    }
  },

  _dealHoleOnce(playerIndex, which) {
    const p = this.players[playerIndex];
    if (!p?.seat || !this.scene) return;

    const pos = seatPos(p.seat, null);
    if (!pos) return;

    const label = cardLabel();
    const card = makeCardMesh(label);

    const dir = new THREE.Vector3().subVectors(this.center, pos);
    if (dir.lengthSq() > 0.0001) dir.normalize();

    // Place hole cards near chip spot ON TABLE
    const base = safeClone(p.betSpot, this.center);
    base.y = this.TABLE_SURFACE_Y + 0.03;

    const right = new THREE.Vector3(dir.z, 0, -dir.x);
    if (right.lengthSq() > 0.0001) right.normalize();
    base.add(right.multiplyScalar(which === 0 ? -0.10 : 0.10));

    card.position.copy(base);
    card.rotation.x = -Math.PI / 2;

    this.scene.add(card);

    const idx = (typeof p.seat.index === "number") ? p.seat.index : playerIndex;
    if (!this.hole.has(idx)) this.hole.set(idx, []);
    this.hole.get(idx).push(card);
  },

  _dealCommunity(n) {
    if (!this.scene) return;

    const startX = -0.42;
    const gap = 0.22;

    for (let i = this.community.length; i < n; i++) {
      const label = cardLabel();
      const c = makeCardMesh(label);

      // BIGGER + HOVER
      c.scale.setScalar(1.15);
      c.position.set(this.center.x + startX + i * gap, this.COMMUNITY_HOVER_Y, this.center.z - 0.05);
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

  _setTurnHighlight() {
    if (!this.turnDisc) return;
    const p = this.players[this.actor];
    if (!p || !p.inHand || !p.betSpot) {
      this.turnDisc.visible = false;
      return;
    }
    this.turnDisc.visible = true;
    this.turnDisc.position.set(p.betSpot.x, this.TABLE_ITEM_Y + 0.002, p.betSpot.z);

    // subtle pulse
    const t = performance.now() * 0.001;
    const s = 0.85 + Math.sin(t * 6.0) * 0.08;
    this.turnDisc.scale.set(s, s, s);
  },

  _botAct(p) {
    if (!p.inHand) return;

    const facing = this.toCall - p.bet;
    const r = Math.random();

    if (facing > 0 && r < 0.18) {
      p.inHand = false;
      hud(`❌ ${p.name} folds`);
      return;
    }

    if (r > 0.84) {
      const raise = 50 + ((Math.random() * 100) | 0);
      const newToCall = this.toCall + raise;

      const pay = Math.max(0, newToCall - p.bet);
      p.bet = newToCall;
      p.stack -= pay;
      this.pot += pay;
      this.toCall = newToCall;

      hud(`⬆️ ${p.name} raises to $${this.toCall} (pot $${this.pot})`);
      return;
    }

    const pay = Math.max(0, this.toCall - p.bet);
    p.bet += pay;
    p.stack -= pay;
    this.pot += pay;

    if (pay > 0) hud(`✅ ${p.name} calls $${pay} (pot $${this.pot})`);
    else hud(`✅ ${p.name} checks`);
  },

  _pickWinner() {
    const alive = this._alive();
    if (alive.length) return alive[(Math.random() * alive.length) | 0];
    return this.players[(Math.random() * this.players.length) | 0];
  },

  _showWinner(w) {
    if (!this.scene) return;

    const fx = new THREE.Group();
    fx.add(crownMarker());

    const pos = safeClone(seatPos(w.seat, this.center), this.center);
    fx.position.copy(pos);
    fx.position.y = 1.78;

    this.scene.add(fx);
    this.winnerFX = fx;
    fx.userData.life = 2.0;

    hud(`🏁 WINNER: ${w.name} wins pot $${this.pot}`);

    w.stack += this.pot;
    this.pot = 0;
    this._updateBoards();
  },

  update(dt, camera) {
    try {
      if (this.disabled) return;
      if (!this.scene || this.seats.length < 2) return;

      this.timer += dt;

      // Keep boards readable
      if (camera) {
        for (const p of this.players) if (p.board) p.board.lookAt(camera.position);
        if (this.potBoard) this.potBoard.lookAt(camera.position);
      }

      // Winner FX decay
      if (this.winnerFX) {
        this.winnerFX.userData.life -= dt;
        this.winnerFX.rotation.y += dt * 2.0;
        if (this.winnerFX.userData.life <= 0) {
          this.scene.remove(this.winnerFX);
          this.winnerFX = null;
        }
      }

      // Animate community hover slightly
      if (this.community.length) {
        const t = performance.now() * 0.001;
        for (let i=0;i<this.community.length;i++) {
          const c = this.community[i];
          c.position.y = this.COMMUNITY_HOVER_Y + Math.sin(t * 2.0 + i) * 0.01;
        }
      }

      // Dealer chip slow spin
      if (this.dealerChip) this.dealerChip.rotation.z += dt * 0.8;

      // Update turn highlight every frame
      this._setTurnHighlight();

      // Phase machine
      if (this.phase === "deal_hole") {
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
            const w = alive.length ? alive[0] : this._pickWinner();
            this._showWinner(w);
            this.phase = "reset_wait";
            this.timer = 0;
            return;
          }

          const p = this.players[this.actor];
          const before = this.toCall;

          this._botAct(p);
          this._updateBoards();
          this._nextActor();

          this._betSteps = (this._betSteps || 0) + 1;

          if (this._betSteps > Math.max(10, this.players.length + 3)) {
            this._betSteps = 0;

            if (this.phase === "bet_preflop") { this.phase = "flop"; hud("🟩 FLOP"); }
            else if (this.phase === "bet_flop") { this.phase = "turn"; hud("🟨 TURN"); }
            else if (this.phase === "bet_turn") { this.phase = "river"; hud("🟥 RIVER"); }
            else if (this.phase === "bet_river") { this.phase = "showdown"; hud("🏁 SHOWDOWN"); }
          }

          if (this.toCall !== before) this._betSteps = 0;
        }
        return;
      }

      if (this.phase === "flop") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(3);
          this.phase = "bet_flop";
          hud("💰 Flop betting");
        }
        return;
      }

      if (this.phase === "turn") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(4);
          this.phase = "bet_turn";
          hud("💰 Turn betting");
        }
        return;
      }

      if (this.phase === "river") {
        if (this.timer > 0.6) {
          this.timer = 0;
          this._dealCommunity(5);
          this.phase = "bet_river";
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
    } catch (e) {
      console.error("PokerSim update crash:", e);
      this.disabled = true;
      hud("❌ PokerSim disabled (update error): " + String(e?.message || e));
    }
  },
};
