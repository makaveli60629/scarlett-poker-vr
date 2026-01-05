// js/poker_simulation.js — VIP Poker Observer Simulation (8.0.7-HOTFIX2)
// GOAL: Never crash import/build/update even if seats are malformed.
// If anything is wrong, sim disables itself and VR still works.

import * as THREE from "./three.js";

function hud(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += (el.textContent ? "\n" : "") + msg;
}

function isVec3(v) {
  return v && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number";
}

function safeCloneVec3(v, fallback = new THREE.Vector3(0, 0, 0)) {
  return isVec3(v) ? v.clone() : fallback.clone();
}

function seatPos(seat, fallback) {
  // Most common: seat.position
  if (seat && isVec3(seat.position)) return seat.position;
  // Alternate: seat.pos
  if (seat && isVec3(seat.pos)) return seat.pos;
  // Sometimes: seat.p
  if (seat && isVec3(seat.p)) return seat.p;
  return fallback;
}

function cardLabel() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  return ranks[(Math.random() * ranks.length) | 0] + suits[(Math.random() * suits.length) | 0];
}

function makeCanvasTex(text, w=256, h=256, bg="#0b0f18", fg="#ffffff") {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 8;
  g.strokeRect(10, 10, w - 20, h - 20);

  g.fillStyle = fg;
  g.font = "bold 54px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text || ""), w / 2, h / 2);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeBillboard(text) {
  const tex = makeCanvasTex(text, 512, 256);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(0.55, 0.275);
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
  return g;
}

function makeChipStack(height=0.08) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.006, 18);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.6 });

  const count = Math.max(1, Math.min(20, Math.round(height / 0.006)));
  for (let i = 0; i < count; i++) {
    const c = new THREE.Mesh(geo, mat);
    c.position.y = i * 0.006;
    g.add(c);
  }
  return g;
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
  m.rotation.x = Math.PI / 2;
  return m;
}

export const PokerSim = {
  disabled: false,
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

  winnerFX: null,
  handId: 0,

  build(scene, seats, center) {
    // HARD GUARD: never throw
    try {
      this.disabled = false;
      this.scene = scene;
      this.center = isVec3(center) ? center.clone() : new THREE.Vector3(0, 0, 0);

      const list = Array.isArray(seats) ? seats : [];
      const safeSeats = [];

      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const p = seatPos(s, null);
        if (!p) {
          console.warn("PokerSim: skipping seat missing position:", s);
          continue;
        }
        if (typeof s.index !== "number") s.index = i;
        safeSeats.push(s);
      }

      this.seats = safeSeats;

      if (!this.scene) {
        this.disabled = true;
        hud("❌ PokerSim disabled: no scene");
        return;
      }
      if (this.seats.length < 2) {
        this.disabled = true;
        hud("❌ PokerSim disabled: not enough valid seats (need 2+)");
        return;
      }

      this._cleanup();
      this._startHand();
      hud("🃏 PokerSim 8.0.7 live (HOTFIX2)");
    } catch (e) {
      console.error("PokerSim build crash:", e);
      this.disabled = true;
      hud("❌ PokerSim disabled (build error): " + String(e?.message || e));
    }
  },

  _cleanup() {
    try {
      if (!this.scene) return;

      for (const c of this.community) this.scene.remove(c);
      this.community = [];

      for (const [, pair] of this.hole.entries()) {
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
    } catch (e) {
      console.warn("PokerSim cleanup warning:", e);
    }
  },

  _startHand() {
    if (this.disabled) return;
    if (!this.scene || this.seats.length < 2) { this.disabled = true; return; }

    this.handId++;
    this._cleanup();

    this.players = this.seats.map((s, i) => ({
      seat: s,
      name: s.bot?.name || `Bot_${(typeof s.index === "number" ? s.index : i)}`,
      stack: 5000,
      bet: 0,
      inHand: true,
      board: null,
      chips: null,
    }));

    for (const p of this.players) {
      const pos = safeCloneVec3(seatPos(p.seat, this.center), this.center);

      const board = makeBillboard(`${p.name}\n$${p.stack}`);
      board.position.copy(pos);
      board.position.y = 1.55;
      this.scene.add(board);
      p.board = board;

      const cs = makeChipStack(0.06);
      cs.position.copy(pos);
      cs.position.y = 1.02;

      const dir = new THREE.Vector3().subVectors(this.center, pos);
      if (dir.lengthSq() > 0.0001) dir.normalize();
      cs.position.add(dir.multiplyScalar(0.45));

      this.scene.add(cs);
      p.chips = cs;
    }

    this.potBoard = makeBillboard(`POT\n$0`);
    this.potBoard.position.set(this.center.x, 1.55, this.center.z - 0.05);
    this.scene.add(this.potBoard);

    this.potChips = makeChipStack(0.08);
    this.potChips.position.set(this.center.x, 1.02, this.center.z - 0.05);
    this.scene.add(this.potChips);

    this.phase = "deal_hole";
    this.timer = 0;
    this.actor = 0;
    this.toCall = 0;

    this._dealtCount = 0;
    this._betSteps = 0;

    hud("—");
    hud(`🎲 New hand #${this.handId}`);
  },

  _updateBoards() {
    if (this.disabled) return;

    for (const p of this.players) {
      if (p.board?.userData?.setText) {
        p.board.userData.setText(`${p.name}\n$${p.stack}${p.inHand ? "" : " (FOLD)"}`);
      }
    }
    if (this.potBoard?.userData?.setText) this.potBoard.userData.setText(`POT\n$${this.pot}`);
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
    const base = pos.clone().add(dir.multiplyScalar(0.72));
    base.y = 1.18;

    const right = new THREE.Vector3(dir.z, 0, -dir.x);
    if (right.lengthSq() > 0.0001) right.normalize();
    base.add(right.multiplyScalar(which === 0 ? -0.07 : 0.07));

    card.position.copy(base);
    card.rotation.x = -Math.PI / 2;

    this.scene.add(card);

    const idx = (typeof p.seat.index === "number") ? p.seat.index : playerIndex;
    if (!this.hole.has(idx)) this.hole.set(idx, []);
    this.hole.get(idx).push(card);
  },

  _dealCommunity(n) {
    if (!this.scene) return;

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
    for (let i = 0; i < n; i++) {
      this.actor = (this.actor + 1) % n;
      if (this.players[this.actor].inHand) return;
    }
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

    const pos = safeCloneVec3(seatPos(w.seat, this.center), this.center);
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
    // HARD GUARD: never throw
    try {
      if (this.disabled) return;
      if (!this.scene || this.seats.length < 2) return;

      this.timer += dt;

      if (camera) {
        for (const p of this.players) if (p.board) p.board.lookAt(camera.position);
        if (this.potBoard) this.potBoard.lookAt(camera.position);
      }

      if (this.winnerFX) {
        this.winnerFX.userData.life -= dt;
        this.winnerFX.rotation.y += dt * 2.0;
        if (this.winnerFX.userData.life <= 0) {
          this.scene.remove(this.winnerFX);
          this.winnerFX = null;
        }
      }

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
