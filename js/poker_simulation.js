// js/poker_simulation.js — Poker Sim (8.2)
// - Bots play hands with call/raise/fold behavior
// - Community cards hover in center (bigger) facing camera
// - Hole cards hover above each bot's head (2 cards)
// - Pot chips stack in center + animate rushing to winner
// - Turn highlight ring
// - Winner crown: single crown only, rises higher, shines, fades out

import * as THREE from "./three.js";

const HAND_NAMES = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush"
];

// tiny weighted randomness so we see variety but not all straight flushes
function rollHandName() {
  const r = Math.random();
  if (r < 0.44) return "High Card";
  if (r < 0.70) return "Pair";
  if (r < 0.82) return "Two Pair";
  if (r < 0.89) return "Three of a Kind";
  if (r < 0.93) return "Straight";
  if (r < 0.965) return "Flush";
  if (r < 0.985) return "Full House";
  if (r < 0.995) return "Four of a Kind";
  return "Straight Flush";
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function fmt(n) {
  try { return n.toLocaleString(); } catch { return String(n); }
}

function makeChip(color = 0xdd0000) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
    emissive: color,
    emissiveIntensity: 0.06
  });
  const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18), mat);
  chip.rotation.x = Math.PI / 2;
  return chip;
}

function makeChipStack(amount, maxChips = 24) {
  const g = new THREE.Group();
  const chips = clamp(Math.floor(amount / 250), 3, maxChips);
  for (let i = 0; i < chips; i++) {
    const c = makeChip(i % 2 === 0 ? 0x00ffaa : 0xff2a6a);
    c.position.y = i * 0.022;
    g.add(c);
  }
  return g;
}

// ---------- Card visuals ----------
function createCardTexture(rank, suit) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 356;
  const ctx = canvas.getContext("2d");

  // card bg
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 356);

  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 340);

  const isRed = (suit === "♥" || suit === "♦");
  ctx.fillStyle = isRed ? "#d11b2d" : "#111111";

  // big corner rank
  ctx.font = "bold 64px Arial";
  ctx.fillText(rank, 20, 75);

  // corner suit
  ctx.font = "bold 70px Arial";
  ctx.fillText(suit, 20, 140);

  // mirrored bottom corner
  ctx.save();
  ctx.translate(256, 356);
  ctx.rotate(Math.PI);
  ctx.font = "bold 64px Arial";
  ctx.fillText(rank, 20, 75);
  ctx.font = "bold 70px Arial";
  ctx.fillText(suit, 20, 140);
  ctx.restore();

  // center suit (big)
  ctx.font = "bold 170px Arial";
  ctx.globalAlpha = 0.18;
  ctx.fillText(suit, 80, 235);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCardMesh(rank, suit) {
  const tex = createCardTexture(rank, suit);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.62), mat);
  card.name = `Card_${rank}${suit}`;
  return card;
}

function randomCard() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  return { rank: ranks[Math.floor(Math.random()*ranks.length)], suit: suits[Math.floor(Math.random()*suits.length)] };
}

// ---------- Crown ----------
function makeCrown() {
  const g = new THREE.Group();
  g.name = "WinnerCrown";

  const gold = new THREE.MeshStandardMaterial({
    color: 0x2b1b00,
    roughness: 0.25,
    metalness: 0.25,
    emissive: 0xffd34d,
    emissiveIntensity: 0.55
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 12, 32), gold);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), gold);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.18, 0.11, Math.sin(a) * 0.18);
    spike.rotation.x = Math.PI;
    g.add(spike);
  }

  const glow = new THREE.PointLight(0xffd34d, 0.6, 6);
  glow.position.set(0, 0.25, 0);
  g.add(glow);

  g.visible = false;
  g.userData.fade = 0;
  g.userData.hold = 0;

  return g;
}

// ---------- PokerSim ----------
export const PokerSim = {
  _scene: null,
  _tableCenter: new THREE.Vector3(0, 0, -6.5),
  _tableRadius: 3.0,

  // hooks to world boards
  hooks: {
    setActionText: null,
    setLeaderboard: null,
    getCamera: null,
  },

  // game state
  bots: [],
  dealerIndex: 0,
  activeIndex: 0,
  pot: 0,
  potStack: null,
  potPos: new THREE.Vector3(0, 1.1, -6.5),

  community: [],
  hole: [],
  turnRing: null,
  crown: null,

  // phases
  phase: "idle", // "deal_hole" -> "preflop" -> "flop" -> "turn" -> "river" -> "showdown" -> "crown_hold" -> "reset"
  phaseT: 0,

  // tournament
  round: 0,
  maxRounds: 10,

  setHooks(hooks) {
    this.hooks = { ...this.hooks, ...(hooks || {}) };
  },

  build(scene, opts = {}) {
    this._scene = scene;
    if (opts.tableCenter) this._tableCenter.copy(opts.tableCenter);
    if (opts.tableRadius) this._tableRadius = opts.tableRadius;

    // build table (simple, solid, pretty)
    this._buildTable();

    // bots + seats
    this._buildBots(6);

    // pot stack
    this.potPos.set(this._tableCenter.x, 1.12, this._tableCenter.z);
    this.potStack = makeChipStack(5000);
    this.potStack.position.copy(this.potPos);
    scene.add(this.potStack);

    // turn ring highlight
    this.turnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 44),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    this.turnRing.rotation.x = -Math.PI / 2;
    this.turnRing.position.y = 0.02;
    scene.add(this.turnRing);

    // crown (single)
    this.crown = makeCrown();
    scene.add(this.crown);

    // community slots
    this._buildCommunitySlots();

    // start chips
    for (const b of this.bots) {
      b.chips = 20000; // ✅ your request
      b.wins = 0;
      b.folded = false;
      b.inHand = true;
    }

    this.round = 0;
    this._startNewHand();

    this._updateBoards("Poker Sim LIVE — booted");
    this._updateLeaderboard();
  },

  update(dt, camera) {
    // face cards toward camera
    const cam = camera || (this.hooks.getCamera ? this.hooks.getCamera() : null);
    if (cam) {
      for (const b of this.bots) {
        for (const c of (b.holeCards || [])) {
          c.lookAt(cam.position);
        }
      }
      for (const c of this.community) c.lookAt(cam.position);
    }

    // keep ring on active bot
    const active = this.bots[this.activeIndex];
    if (active?.seatPos) {
      this.turnRing.position.x = active.seatPos.x;
      this.turnRing.position.z = active.seatPos.z;
    }

    // phase timing
    this.phaseT += dt;

    // crown fade/hold logic
    if (this.crown) {
      if (this.crown.visible) {
        // gentle hover
        this.crown.position.y += Math.sin(performance.now() * 0.004) * 0.0006;

        // fade out if scheduled
        if (this.crown.userData.fade > 0) {
          this.crown.userData.fade = Math.max(0, this.crown.userData.fade - dt);
          const k = this.crown.userData.fade;
          // reduce light intensity as it fades
          const light = this.crown.children.find(x => x.isLight);
          if (light) light.intensity = 0.6 * k;
          if (k <= 0) this.crown.visible = false;
        }
      }
    }

    // run phases
    switch (this.phase) {
      case "deal_hole":
        if (this.phaseT > 1.2) { this.phase = "preflop"; this.phaseT = 0; }
        break;

      case "preflop":
        this._bettingTick("PREFLOP");
        break;

      case "flop":
        if (this.phaseT < 0.1) this._revealCommunity(3);
        this._bettingTick("FLOP");
        break;

      case "turn":
        if (this.phaseT < 0.1) this._revealCommunity(4);
        this._bettingTick("TURN");
        break;

      case "river":
        if (this.phaseT < 0.1) this._revealCommunity(5);
        this._bettingTick("RIVER");
        break;

      case "showdown":
        if (this.phaseT > 0.9) {
          this._resolveHand();
        }
        break;

      case "crown_hold":
        // hold crown ~ 6 seconds, then fade and reset
        if (this.phaseT > 6.0) {
          this._beginCrownFade();
          this.phase = "reset";
          this.phaseT = 0;
        }
        break;

      case "reset":
        if (this.phaseT > 2.0) {
          this._startNewHand();
        }
        break;
    }

    // update pot stack mesh to match pot (not every frame heavy)
    if (this.potStack) {
      this.potStack.position.copy(this.potPos);
    }
  },

  // ---------- Table / Bots ----------
  _buildTable() {
    const g = new THREE.Group();
    g.name = "BossTable_Sim";
    g.position.copy(this._tableCenter);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.15, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
    );
    base.position.y = 0.35;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.85, 3.05, 0.22, 48),
      new THREE.MeshStandardMaterial({
        color: 0x5a0b0b,
        roughness: 0.65,
        emissive: 0x120000,
        emissiveIntensity: 0.35
      })
    );
    top.position.y = 1.05;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.95, 0.12, 14, 56),
      new THREE.MeshStandardMaterial({
        color: 0x2b1b10,
        roughness: 0.7,
        emissive: 0x1a1208,
        emissiveIntensity: 0.12
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.12;

    // betting line ring (your request)
    const betLine = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.03, 10, 90),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.55,
        roughness: 0.35
      })
    );
    betLine.rotation.x = Math.PI / 2;
    betLine.position.y = 1.08;

    g.add(base, top, rim, betLine);
    this._scene.add(g);
  },

  _buildBots(n = 6) {
    const radius = this._tableRadius + 1.25;
    const bots = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        this._tableCenter.x + Math.cos(a) * radius,
        0,
        this._tableCenter.z + Math.sin(a) * radius
      );

      // chair placeholder
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 })
      );
      chair.position.set(seatPos.x, 0.28, seatPos.z);
      chair.rotation.y = -a + Math.PI / 2;
      this._scene.add(chair);

      // bot body (slightly bigger so they don't look tiny)
      const bot = new THREE.Group();
      bot.name = `Bot_${i + 1}`;
      bot.position.set(seatPos.x, 0, seatPos.z);
      bot.rotation.y = -a + Math.PI / 2;

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.55, 6, 12),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0x66aaff : 0xff2a6a,
          roughness: 0.55,
          emissive: i % 2 ? 0x0a1622 : 0x220a12,
          emissiveIntensity: 0.25
        })
      );
      body.position.y = 0.95;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 18, 18),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.65,
          emissive: 0x111111,
          emissiveIntensity: 0.15
        })
      );
      head.position.y = 1.5;

      bot.add(body, head);

      // name tag
      const tag = this._makeNameTag(`BOT ${i + 1}`);
      tag.position.set(0, 1.85, 0.1);
      bot.add(tag);

      this._scene.add(bot);

      bots.push({
        i,
        group: bot,
        seatPos,
        chips: 20000,
        wins: 0,
        folded: false,
        inHand: true,
        holeCards: [],
        tag,
      });
    }
    this.bots = bots;
  },

  _makeNameTag(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "rgba(0,255,170,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 484, 228);

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 76px Arial";
    ctx.fillText(text, 40, 150);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.48), mat);
    plane.rotation.y = Math.PI;
    return plane;
  },

  _buildCommunitySlots() {
    // clear existing
    for (const c of this.community) this._scene.remove(c);
    this.community = [];

    // 5 positions in a line, hovering, facing camera in update()
    const startX = this._tableCenter.x - 1.0;
    const z = this._tableCenter.z - 0.2;
    for (let i = 0; i < 5; i++) {
      const placeholder = makeCardMesh("?", "♣");
      placeholder.position.set(startX + i * 0.5, 1.62, z);
      placeholder.visible = false;
      this._scene.add(placeholder);
      this.community.push(placeholder);
    }
  },

  // ---------- Hand flow ----------
  _startNewHand() {
    // if tournament done -> reset tournament
    if (this.round >= this.maxRounds) {
      // show final “winner” in leaderboard and restart tournament after short delay
      this.round = 0;
      for (const b of this.bots) {
        b.wins = 0;
        b.chips = 20000;
      }
    }

    // reset state
    this.pot = 0;
    this.dealerIndex = (this.dealerIndex + 1) % this.bots.length;
    this.activeIndex = (this.dealerIndex + 1) % this.bots.length;

    for (const b of this.bots) {
      b.folded = false;
      b.inHand = b.chips > 0;
      // clear hole cards
      for (const c of (b.holeCards || [])) this._scene.remove(c);
      b.holeCards = [];
    }

    // hide community
    for (const c of this.community) c.visible = false;

    // clear crown immediately at new hand start
    if (this.crown) {
      this.crown.visible = false;
      this.crown.userData.fade = 0;
      this.crown.userData.hold = 0;
    }

    // deal hole cards (hover above head)
    for (const b of this.bots) {
      if (!b.inHand) continue;

      const c1 = randomCard();
      const c2 = randomCard();

      const m1 = makeCardMesh(c1.rank, c1.suit);
      const m2 = makeCardMesh(c2.rank, c2.suit);

      // bigger + above head
      m1.scale.set(1.2, 1.2, 1.2);
      m2.scale.set(1.2, 1.2, 1.2);

      // position above bot head
      m1.position.copy(b.seatPos).add(new THREE.Vector3(-0.18, 2.25, 0));
      m2.position.copy(b.seatPos).add(new THREE.Vector3( 0.18, 2.25, 0));

      this._scene.add(m1, m2);
      b.holeCards = [m1, m2];
    }

    // small blinds / big blinds (simple)
    this._postBlind((this.dealerIndex + 1) % this.bots.length, 250);
    this._postBlind((this.dealerIndex + 2) % this.bots.length, 500);

    this.round += 1;

    this.phase = "deal_hole";
    this.phaseT = 0;

    this._updateBoards(`NEW HAND #${this.round}\nDealer: BOT ${this.dealerIndex + 1}\nPOT: ${fmt(this.pot)}`);
    this._updateLeaderboard();
    this._refreshPotStack();
  },

  _postBlind(i, amt) {
    const b = this.bots[i];
    if (!b?.inHand) return;
    const pay = clamp(amt, 0, b.chips);
    b.chips -= pay;
    this.pot += pay;
  },

  _bettingTick(streetName) {
    // run one action about every ~0.9s
    if (this.phaseT < 0.9) return;
    this.phaseT = 0;

    // if only one player left, skip to showdown
    const alive = this.bots.filter(b => b.inHand && !b.folded);
    if (alive.length <= 1) {
      this.phase = "showdown";
      this.phaseT = 0;
      this._updateBoards(`AUTO WIN — everyone folded\nPOT: ${fmt(this.pot)}`);
      return;
    }

    const b = this.bots[this.activeIndex];

    // advance if bot can't act
    if (!b || !b.inHand || b.folded) {
      this.activeIndex = (this.activeIndex + 1) % this.bots.length;
      return;
    }

    // simple strategy:
    // - random mix of call / raise / fold
    // - avoids folding too often
    const roll = Math.random();
    let action = "CALL";
    let amount = 500;

    if (roll < 0.12) {
      action = "FOLD";
      b.folded = true;
      amount = 0;
    } else if (roll < 0.42) {
      action = "RAISE";
      amount = 500 + Math.floor(Math.random() * 6) * 250; // 500..2000
    } else {
      action = "CALL";
      amount = 500;
    }

    if (action !== "FOLD") {
      const pay = clamp(amount, 0, b.chips);
      b.chips -= pay;
      this.pot += pay;

      // chips to pot animation
      this._spawnChipRush(b.seatPos, this.potPos, Math.max(6, Math.floor(pay / 250)));
    }

    // update boards with hand street, action, pot
    this._updateBoards(
      `${streetName}\nBOT ${b.i + 1}: ${action}${action === "RAISE" || action === "CALL" ? ` ${fmt(amount)}` : ""}\nPOT: ${fmt(this.pot)}`
    );
    this._refreshPotStack();
    this._updateLeaderboard();

    // next player
    this.activeIndex = (this.activeIndex + 1) % this.bots.length;

    // street advance (after enough actions)
    this._streetProgress(streetName);
  },

  _streetProgress(streetName) {
    // small deterministic progression based on “actions count”
    // This keeps the game moving without requiring full betting logic.
    // After a few ticks, we advance streets.
    this._streetTicks = (this._streetTicks || 0) + 1;

    if (streetName === "PREFLOP" && this._streetTicks >= 6) {
      this._streetTicks = 0;
      this.phase = "flop";
      this.phaseT = 0;
      return;
    }
    if (streetName === "FLOP" && this._streetTicks >= 5) {
      this._streetTicks = 0;
      this.phase = "turn";
      this.phaseT = 0;
      return;
    }
    if (streetName === "TURN" && this._streetTicks >= 5) {
      this._streetTicks = 0;
      this.phase = "river";
      this.phaseT = 0;
      return;
    }
    if (streetName === "RIVER" && this._streetTicks >= 6) {
      this._streetTicks = 0;
      this.phase = "showdown";
      this.phaseT = 0;
      this._updateBoards(`SHOWDOWN\nPOT: ${fmt(this.pot)}`);
      return;
    }
  },

  _revealCommunity(n) {
    // reveal up to n community cards
    for (let i = 0; i < Math.min(n, 5); i++) {
      if (this.community[i].userData.revealed) continue;

      const c = randomCard();
      const newMesh = makeCardMesh(c.rank, c.suit);
      newMesh.position.copy(this.community[i].position);
      newMesh.scale.set(1.35, 1.35, 1.35); // bigger in middle
      newMesh.visible = true;

      this._scene.remove(this.community[i]);
      this.community[i] = newMesh;
      this.community[i].userData.revealed = true;
      this._scene.add(newMesh);
    }
  },

  _resolveHand() {
    // choose winner among alive
    const alive = this.bots.filter(b => b.inHand && !b.folded);
    const winner = alive[Math.floor(Math.random() * alive.length)];

    const handName = rollHandName();

    // payout pot
    winner.chips += this.pot;

    // chip rush from pot to winner
    this._spawnChipRush(this.potPos, winner.seatPos.clone().add(new THREE.Vector3(0, 1.1, 0)), 22);

    // crown on winner
    this._showCrownOn(winner);

    winner.wins += 1;

    // update board text with the HAND RESULT (your request)
    this._updateBoards(`WINNER: BOT ${winner.i + 1}\nHAND: ${handName}\nPOT WON: ${fmt(this.pot)}`);

    // reset pot
    this.pot = 0;
    this._refreshPotStack();
    this._updateLeaderboard();

    this.phase = "crown_hold";
    this.phaseT = 0;
  },

  _showCrownOn(winner) {
    if (!this.crown) return;

    // ensure single crown only
    this.crown.visible = true;
    this.crown.userData.fade = 0;
    this.crown.userData.hold = 1;

    // higher crown + shine (your request)
    this.crown.position.copy(winner.seatPos).add(new THREE.Vector3(0, 2.75, 0));

    // short "shine" pulse
    const light = this.crown.children.find(x => x.isLight);
    if (light) light.intensity = 1.1;
  },

  _beginCrownFade() {
    if (!this.crown) return;
    this.crown.userData.fade = 1.0; // fades down in update()
    // also force crown to stop “sticking”
    this.crown.userData.hold = 0;
  },

  _refreshPotStack() {
    if (!this.potStack) return;

    // remove old
    this._scene.remove(this.potStack);
    this.potStack = makeChipStack(this.pot);
    this.potStack.position.copy(this.potPos);
    this._scene.add(this.potStack);
  },

  _spawnChipRush(from, to, count = 12) {
    // quick visual: chips fly from A -> B in an arc
    const chips = [];
    const g = new THREE.Group();
    g.name = "ChipRush";
    this._scene.add(g);

    for (let i = 0; i < count; i++) {
      const c = makeChip(i % 2 ? 0x00ffaa : 0xff2a6a);
      c.position.copy(from);
      c.position.x += (Math.random() - 0.5) * 0.25;
      c.position.z += (Math.random() - 0.5) * 0.25;
      c.position.y += 0.05 + Math.random() * 0.12;
      g.add(c);

      chips.push({
        mesh: c,
        t: 0,
        dur: 0.55 + Math.random() * 0.35,
        from: c.position.clone(),
        to: to.clone().add(new THREE.Vector3((Math.random()-0.5)*0.25, 0.18 + Math.random()*0.22, (Math.random()-0.5)*0.25)),
      });
    }

    // attach to sim for ticking
    this._chipRush = this._chipRush || [];
    this._chipRush.push({ group: g, chips });
  },

  _tickChipRush(dt) {
    if (!this._chipRush || !this._chipRush.length) return;

    for (let k = this._chipRush.length - 1; k >= 0; k--) {
      const pack = this._chipRush[k];
      let done = true;

      for (const c of pack.chips) {
        c.t += dt;
        const u = clamp(c.t / c.dur, 0, 1);

        // arc
        const p = c.from.clone().lerp(c.to, u);
        p.y += Math.sin(u * Math.PI) * 0.35;

        c.mesh.position.copy(p);
        c.mesh.rotation.y += dt * 10;

        if (u < 1) done = false;
      }

      if (done) {
        this._scene.remove(pack.group);
        this._chipRush.splice(k, 1);
      }
    }
  },

  _updateBoards(text) {
    if (typeof this.hooks.setActionText === "function") {
      this.hooks.setActionText(text);
    }
  },

  _updateLeaderboard() {
    // sort by wins then chips
    const rows = [...this.bots].map(b => ({
      name: `BOT ${b.i + 1}`,
      wins: b.wins,
      chips: b.chips
    }));

    rows.sort((a, b) => (b.wins - a.wins) || (b.chips - a.chips));

    if (typeof this.hooks.setLeaderboard === "function") {
      this.hooks.setLeaderboard(rows, "BOSS TOURNAMENT — TOP 10");
    }
  },
};

// Patch: tick chip rush without changing external update signature
const _origUpdate = PokerSim.update.bind(PokerSim);
PokerSim.update = function(dt, camera) {
  this._tickChipRush(dt);
  _origUpdate(dt, camera);
};
