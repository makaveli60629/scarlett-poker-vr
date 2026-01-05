// js/poker_simulation.js — Boss Poker Simulation (8.2)
// - Single crown owner only (winner only)
// - Crown rises higher, shines, then disappears when next hand starts
// - Winner keeps crown ~60s and "walks around" then returns
// - Dealer is invisible (no visible dealer marker)
// - Pot + Action text bigger, higher, eye-catchy
// - Card ranks/suits bigger
// - Betting line ring on table; bets animate "past the line"
// - Chips animate into pot + to winner stack
//
// Exports: PokerSimulation.build(scene, opts), PokerSimulation.update(dt)

import * as THREE from "./three.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function makeCanvasTexture(w, h, drawFn) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return { canvas: c, ctx, tex };
}

function makeTextSprite({ text = "", w = 1024, h = 512, scale = 1.0 }) {
  const { canvas, ctx, tex } = makeCanvasTexture(w, h, () => {});
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.renderOrder = 999;
  spr.scale.set(1.6 * scale, 0.8 * scale, 1);
  spr.userData._text = { canvas, ctx, tex, w, h };
  spr.userData.setText = (payload) => {
    const { title, lines, accentA = "#00ffaa", accentB = "#ff3c78" } = payload || {};
    ctx.clearRect(0, 0, w, h);

    // Back plate
    ctx.fillStyle = "rgba(8,10,16,0.88)";
    ctx.fillRect(0, 0, w, h);

    // Neon borders
    ctx.lineWidth = 18;
    ctx.strokeStyle = "rgba(0,255,170,0.55)";
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(255,60,120,0.55)";
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = accentB;
    ctx.font = "900 90px system-ui";
    ctx.fillText(title || "POKER", w / 2, 140);

    // Lines
    const arr = Array.isArray(lines) ? lines : [];
    ctx.textAlign = "left";
    ctx.font = "900 72px system-ui";
    ctx.fillStyle = accentA;

    let y = 270;
    for (const line of arr.slice(0, 2)) {
      ctx.fillText(String(line), 90, y);
      y += 110;
    }

    tex.needsUpdate = true;
  };
  return spr;
}

function makeCardTexture(rank, suit) {
  // BIG rank/suit like you requested
  const w = 512, h = 768;
  const isRed = suit === "♥" || suit === "♦";
  const suitColor = isRed ? "#ff355a" : "#ffffff";
  const border = isRed ? "rgba(255,60,120,0.85)" : "rgba(0,255,170,0.85)";

  const { tex, ctx } = makeCanvasTexture(w, h, (ctx2) => {
    // Card base
    ctx2.fillStyle = "rgba(245,245,248,0.98)";
    ctx2.fillRect(0, 0, w, h);

    // Border
    ctx2.lineWidth = 18;
    ctx2.strokeStyle = border;
    ctx2.strokeRect(18, 18, w - 36, h - 36);

    // Rank + suit (top-left)
    ctx2.textAlign = "left";
    ctx2.fillStyle = suitColor;
    ctx2.font = "900 120px system-ui";
    ctx2.fillText(rank, 54, 145);
    ctx2.font = "900 110px system-ui";
    ctx2.fillText(suit, 62, 260);

    // Rank + suit (bottom-right flipped)
    ctx2.save();
    ctx2.translate(w, h);
    ctx2.rotate(Math.PI);
    ctx2.textAlign = "left";
    ctx2.fillStyle = suitColor;
    ctx2.font = "900 120px system-ui";
    ctx2.fillText(rank, 54, 145);
    ctx2.font = "900 110px system-ui";
    ctx2.fillText(suit, 62, 260);
    ctx2.restore();

    // Center suit huge
    ctx2.textAlign = "center";
    ctx2.fillStyle = suitColor;
    ctx2.font = "900 280px system-ui";
    ctx2.fillText(suit, w / 2, 470);
  });

  return tex;
}

function makeChipStack(color = 0xdddddd) {
  const g = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, emissive: 0x000000 });
  const stack = new THREE.Group();
  stack.name = "ChipStack";
  const count = 8 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const c = new THREE.Mesh(g, m);
    c.position.y = 0.011 + i * 0.022;
    stack.add(c);
  }
  return stack;
}

function makeCrown() {
  // Simple crown mesh (shiny)
  const crown = new THREE.Group();
  crown.name = "WinnerCrown";

  const base = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.045, 14, 36),
    new THREE.MeshStandardMaterial({
      color: 0xffd24a,
      roughness: 0.18,
      metalness: 0.85,
      emissive: 0x332200,
      emissiveIntensity: 0.35
    })
  );
  base.rotation.x = Math.PI / 2;

  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x442200,
    emissiveIntensity: 0.55
  });

  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.16, 12),
      spikeMat
    );
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.16, 0.10, Math.sin(a) * 0.16);
    crown.add(spike);
  }

  // glow halo
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 44),
    new THREE.MeshStandardMaterial({
      color: 0xffd24a,
      emissive: 0xffd24a,
      emissiveIntensity: 1.4,
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  halo.name = "CrownHalo";

  crown.add(base, halo);
  crown.userData.halo = halo;
  return crown;
}

function randomCard() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  return { rank: ranks[Math.floor(Math.random()*ranks.length)], suit: suits[Math.floor(Math.random()*suits.length)] };
}

export const PokerSimulation = {
  group: null,
  tableCenter: new THREE.Vector3(0, 1.02, -6.5),

  players: [],
  community: [],
  potAmount: 0,

  // state
  phase: "idle",
  handId: 0,
  phaseT: 0,

  // visuals
  potSprite: null,
  actionSprite: null,
  bettingLine: null,
  potStacks: null,
  dealerMarker: null, // will be invisible
  crown: null,
  crownOwner: -1,
  crownHoldTimer: 0,
  winnerWalkTimer: 0,

  build(scene, opts = {}) {
    const playerCount = opts.playerCount ?? 5;
    const buyIn = opts.buyIn ?? 20000;

    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    scene.add(this.group);

    // Betting line ring (on table felt, outside chips)
    // This is the "push chips past the line to bet/call"
    this.bettingLine = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.02, 10, 96),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.9,
        roughness: 0.35,
        transparent: true,
        opacity: 0.7
      })
    );
    this.bettingLine.rotation.x = Math.PI / 2;
    this.bettingLine.position.copy(this.tableCenter);
    this.bettingLine.position.y = 1.035;
    this.group.add(this.bettingLine);

    // Pot stacks anchor (center)
    this.potStacks = new THREE.Group();
    this.potStacks.name = "PotStacks";
    this.potStacks.position.set(this.tableCenter.x, 1.04, this.tableCenter.z);
    this.group.add(this.potStacks);

    // Dealer marker (INVISIBLE as requested)
    this.dealerMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.01, 28),
      new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.2 })
    );
    this.dealerMarker.position.set(this.tableCenter.x, 1.045, this.tableCenter.z);
    this.dealerMarker.visible = false; // ✅ invisible
    this.group.add(this.dealerMarker);

    // Pot + Action signs (higher + bigger + colorful)
    this.potSprite = makeTextSprite({ scale: 1.25 });
    this.potSprite.position.set(this.tableCenter.x, 2.55, this.tableCenter.z - 0.2);
    this.group.add(this.potSprite);

    this.actionSprite = makeTextSprite({ scale: 1.05 });
    this.actionSprite.position.set(this.tableCenter.x, 2.20, this.tableCenter.z + 0.9);
    this.group.add(this.actionSprite);

    // Crown (single instance only)
    this.crown = makeCrown();
    this.crown.visible = false;
    this.group.add(this.crown);

    // Players around table
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      const angle = (i / playerCount) * Math.PI * 2 + Math.PI; // face the room
      const r = 2.35;
      const px = this.tableCenter.x + Math.cos(angle) * r;
      const pz = this.tableCenter.z + Math.sin(angle) * r;

      const p = {
        id: i,
        name: `Boss ${i + 1}`,
        chips: buyIn,
        inHand: true,
        seatPos: new THREE.Vector3(px, 0, pz),
        betPos: new THREE.Vector3(
          this.tableCenter.x + Math.cos(angle) * 1.55,
          0,
          this.tableCenter.z + Math.sin(angle) * 1.55
        ),
        // stacks
        stack: new THREE.Group(),
        betStack: new THREE.Group(),
        // cards
        cardMeshes: [],
        // simple walk
        walking: false,
        walkT: 0,
        walkFrom: new THREE.Vector3(),
        walkTo: new THREE.Vector3()
      };

      // Player chip stack (behind betting line)
      const stack = makeChipStack(i % 2 ? 0xff3c78 : 0x00ffaa);
      stack.position.set(px, 0.06, pz);
      p.stack.add(stack);

      // Bet stack (past the betting line) — starts empty
      p.betStack.position.set(p.betPos.x, 0.06, p.betPos.z);

      this.group.add(p.stack);
      this.group.add(p.betStack);

      this.players.push(p);
    }

    // Community cards (hover, face viewer)
    this.community = [];
    for (let k = 0; k < 5; k++) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.50),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85, metalness: 0.0 })
      );
      plane.position.set(
        this.tableCenter.x + (k - 2) * 0.38,
        1.60,                      // ✅ hover higher
        this.tableCenter.z
      );
      plane.rotation.y = Math.PI;   // face spawn side by default
      plane.visible = false;
      plane.renderOrder = 10;
      this.group.add(plane);
      this.community.push(plane);
    }

    // Start the loop
    this._startNewHand();
    return this.group;
  },

  _setPotUI() {
    this.potSprite.userData.setText({
      title: "POT",
      lines: [`${this.potAmount.toLocaleString()} chips`],
      accentA: "#00ffaa",
      accentB: "#ff3c78"
    });
  },

  _setActionUI(line1, line2 = "") {
    this.actionSprite.userData.setText({
      title: "ACTION",
      lines: [line1, line2].filter(Boolean),
      accentA: "#ffffff",
      accentB: "#00ffaa"
    });
  },

  _clearPotStacks() {
    while (this.potStacks.children.length) this.potStacks.remove(this.potStacks.children[0]);
  },

  _rebuildPotStacks(amountVisual = 0) {
    this._clearPotStacks();
    const stacks = clamp(Math.floor(amountVisual / 2500), 1, 10);
    for (let i = 0; i < stacks; i++) {
      const s = makeChipStack(0xffffff);
      s.position.set((Math.random() - 0.5) * 0.18, 0, (Math.random() - 0.5) * 0.18);
      this.potStacks.add(s);
    }
  },

  _hideAllHands() {
    for (const p of this.players) {
      for (const m of p.cardMeshes) this.group.remove(m);
      p.cardMeshes.length = 0;
    }
  },

  _dealHandsVisibleOverHeads() {
    // Your request: hands hover over their heads so you can see who has what (observer mode)
    this._hideAllHands();

    for (const p of this.players) {
      if (!p.inHand) continue;

      const cards = [randomCard(), randomCard()];
      const y = 1.55; // head-ish
      const x = p.seatPos.x;
      const z = p.seatPos.z;

      for (let i = 0; i < 2; i++) {
        const tex = makeCardTexture(cards[i].rank, cards[i].suit);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.38), mat);

        // hover slightly above head and angled towards table
        mesh.position.set(x + (i ? 0.16 : -0.16), y + 0.25, z);
        mesh.rotation.y = Math.atan2(this.tableCenter.x - x, this.tableCenter.z - z) + Math.PI;
        mesh.renderOrder = 12;

        this.group.add(mesh);
        p.cardMeshes.push(mesh);
      }
    }
  },

  _setCommunityVisible(count) {
    for (let i = 0; i < this.community.length; i++) {
      this.community[i].visible = i < count;
      if (i < count) {
        const c = randomCard();
        this.community[i].material.map = makeCardTexture(c.rank, c.suit);
        this.community[i].material.needsUpdate = true;
      }
    }
  },

  _startNewHand() {
    // ✅ New hand: remove crown immediately
    this._clearCrown();

    this.handId += 1;
    this.phase = "preflop";
    this.phaseT = 0;

    // reset inHand to players with chips
    for (const p of this.players) {
      p.inHand = p.chips > 0;
      // clear bet stacks
      while (p.betStack.children.length) p.betStack.remove(p.betStack.children[0]);
    }

    this.potAmount = 0;
    this._setPotUI();
    this._setActionUI(`New Hand #${this.handId}`, "Boss Tournament Live");

    // Show hands above heads (observer-friendly)
    this._dealHandsVisibleOverHeads();

    // Hide community
    this._setCommunityVisible(0);

    // small pot visual reset
    this._rebuildPotStacks(0);
  },

  _clearCrown() {
    this.crown.visible = false;
    this.crownOwner = -1;
    this.crownHoldTimer = 0;
    this.winnerWalkTimer = 0;
  },

  _awardCrownTo(winnerId) {
    // ✅ Only one crown owner
    this.crownOwner = winnerId;
    this.crownHoldTimer = 60.0; // hold for ~1 minute
    this.winnerWalkTimer = 60.0;

    this.crown.visible = true;

    // Start higher + shimmer
    const p = this.players[winnerId];
    if (p) {
      this.crown.position.set(p.seatPos.x, 2.35, p.seatPos.z); // ✅ higher
    }
  },

  _chooseWinnerId() {
    const alive = this.players.filter(p => p.inHand && p.chips > 0);
    if (!alive.length) return -1;
    return alive[Math.floor(Math.random() * alive.length)].id;
  },

  _countAlive() {
    return this.players.filter(p => p.chips > 0).length;
  },

  _animateBetFromPlayer(p, bet) {
    // show "chips past line" by moving stacks to betPos
    const chipVis = makeChipStack(0xffffff);
    chipVis.position.set(0, 0, 0);
    p.betStack.add(chipVis);
  },

  _sweepBetsIntoPot() {
    // move all bet stacks into the pot (visual + count)
    for (const p of this.players) {
      if (!p.betStack.children.length) continue;
      // just clear visually (we rebuild pot stacks)
      while (p.betStack.children.length) p.betStack.remove(p.betStack.children[0]);
    }
    this._rebuildPotStacks(this.potAmount);
  },

  _sweepPotToWinner(winnerId) {
    // big chip rush effect: quick pulse of pot emissive + rebuild winner stack
    this._setActionUI(`WINNER: Boss ${winnerId + 1}`, `+${this.potAmount.toLocaleString()} chips`);

    // visually pulse crown halo stronger for a moment
    if (this.crown?.userData?.halo) {
      this.crown.userData.halo.material.opacity = 0.85;
      this.crown.userData.halo.material.emissiveIntensity = 2.1;
    }

    // Clear pot visual
    this._clearPotStacks();
  },

  update(dt, camera) {
    if (!this.group) return;

    // Keep UI facing camera (optional but makes it readable)
    if (camera) {
      this.potSprite.quaternion.copy(camera.quaternion);
      this.actionSprite.quaternion.copy(camera.quaternion);
    }

    // Crown shimmer + follow winner while active
    if (this.crown.visible && this.crownOwner >= 0) {
      const p = this.players[this.crownOwner];
      if (p) {
        // If winner is "walking", crown follows them
        const x = p.seatPos.x;
        const z = p.seatPos.z;

        const bob = Math.sin((this.handId * 0.7) + performance.now() * 0.004) * 0.06;
        this.crown.position.set(x, 2.35 + bob, z);

        // shimmer
        const halo = this.crown.userData.halo;
        if (halo) {
          halo.material.opacity = 0.55 + 0.25 * Math.sin(performance.now() * 0.006);
          halo.material.emissiveIntensity = 1.3 + 0.9 * (0.5 + 0.5 * Math.sin(performance.now() * 0.007));
        }
      }

      this.crownHoldTimer -= dt;
      if (this.crownHoldTimer <= 0) {
        // Crown disappears after hold OR new hand start, whichever first
        this._clearCrown();
      }
    }

    // Winner walk timer (simple orbit walk)
    if (this.winnerWalkTimer > 0 && this.crownOwner >= 0) {
      const p = this.players[this.crownOwner];
      if (p) {
        // Walk around outside the table for the minute
        const t = (60 - this.winnerWalkTimer) * 0.55;
        const R = 3.6;
        p.seatPos.x = this.tableCenter.x + Math.cos(t) * R;
        p.seatPos.z = this.tableCenter.z + Math.sin(t) * R;
      }
      this.winnerWalkTimer -= dt;
      if (this.winnerWalkTimer <= 0) {
        // return winner to their seat spot (reset circle placement)
        // (approx: put them back to original ring)
        const idx = this.crownOwner;
        const n = this.players.length;
        const angle = (idx / n) * Math.PI * 2 + Math.PI;
        const r = 2.35;
        const px = this.tableCenter.x + Math.cos(angle) * r;
        const pz = this.tableCenter.z + Math.sin(angle) * r;
        this.players[idx].seatPos.set(px, 0, pz);
      }
    }

    // ---- Phases (simple but looks like real hold'em) ----
    this.phaseT += dt;

    // Auto-end tournament: one winner left
    const aliveCount = this._countAlive();
    if (aliveCount <= 1) {
      const final = this.players.find(p => p.chips > 0);
      if (final && this.crownOwner !== final.id) {
        this._setActionUI("TOURNAMENT WINNER!", `Boss ${final.id + 1}`);
        this._awardCrownTo(final.id);
      }
      return;
    }

    if (this.phase === "preflop") {
      if (this.phaseT > 1.6) {
        this._setActionUI("Preflop", "Bets past the line…");
        // preflop betting
        for (const p of this.players) {
          if (!p.inHand) continue;
          const r = Math.random();
          if (r < 0.15) { p.inHand = false; continue; } // fold
          const bet = Math.floor(500 + Math.random() * 1200);
          const amt = Math.min(bet, p.chips);
          p.chips -= amt;
          this.potAmount += amt;
          this._animateBetFromPlayer(p, amt);
        }
        this._setPotUI();
        this._sweepBetsIntoPot();
        this.phase = "flop";
        this.phaseT = 0;
      }
    } else if (this.phase === "flop") {
      if (this.phaseT > 1.2) {
        this._setCommunityVisible(3);
        this._setActionUI("FLOP", "Aggressive boss play…");
        this.phase = "turn";
        this.phaseT = 0;
      }
    } else if (this.phase === "turn") {
      if (this.phaseT > 1.8) {
        this._setCommunityVisible(4);
        this._setActionUI("TURN", "Raise / Call / Fold…");
        // round betting
        for (const p of this.players) {
          if (!p.inHand) continue;
          const r = Math.random();
          if (r < 0.12) { p.inHand = false; continue; }
          const bet = Math.floor(700 + Math.random() * 1600);
          const amt = Math.min(bet, p.chips);
          p.chips -= amt;
          this.potAmount += amt;
          this._animateBetFromPlayer(p, amt);
        }
        this._setPotUI();
        this._sweepBetsIntoPot();
        this.phase = "river";
        this.phaseT = 0;
      }
    } else if (this.phase === "river") {
      if (this.phaseT > 1.6) {
        this._setCommunityVisible(5);
        this._setActionUI("RIVER", "Final bets…");
        // final betting
        for (const p of this.players) {
          if (!p.inHand) continue;
          const r = Math.random();
          if (r < 0.08) { p.inHand = false; continue; }
          const bet = Math.floor(900 + Math.random() * 2200);
          const amt = Math.min(bet, p.chips);
          p.chips -= amt;
          this.potAmount += amt;
          this._animateBetFromPlayer(p, amt);
        }
        this._setPotUI();
        this._sweepBetsIntoPot();
        this.phase = "showdown";
        this.phaseT = 0;
      }
    } else if (this.phase === "showdown") {
      if (this.phaseT > 2.0) {
        // pick winner among inHand
        const winnerId = this._chooseWinnerId();
        if (winnerId >= 0) {
          const winner = this.players[winnerId];
          winner.chips += this.potAmount;

          this._sweepPotToWinner(winnerId);
          this._awardCrownTo(winnerId);
        }

        // new hand starts after a beat — crown will remain up to 60s (unless new hand starts)
        this.phase = "cooldown";
        this.phaseT = 0;
      }
    } else if (this.phase === "cooldown") {
      // IMPORTANT: crown should NOT duplicate; we only have one crown mesh
      // We allow winner walk while crown is active; next hand starts after some delay
      if (this.phaseT > 3.5) {
        // new hand starts -> crown disappears immediately per your instruction
        this._startNewHand();
      }
    }
  }
};
