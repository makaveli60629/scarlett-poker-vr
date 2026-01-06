// /js/poker_simulation.js — Watchable Poker Sim (9.0)
// Fixes:
// - Proper dealing rhythm + betting rhythm
// - Crown appears at showdown and winner walks with it for 60s before next hand
// - Table felt + leather trim textures
// - Pot + phase UI moved above community (small, centered)
// - Chairs + humanoid bots (no cubes/pills)
// - Shows per-player BET + pot stack in center
// - Dealer button rotates each hand
// - Safer update loop (self-heal)

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -8.0);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // speed / pacing
    this.stepDelay = 1.35;     // time between main steps
    this.dealDelay = 0.55;     // time between each dealt card
    this.betDelay = 0.85;      // time per betting action
    this._timer = 0;

    // tournament
    this.handsPerMatch = 10;
    this.handIndex = 0;
    this.dealerIndex = 0;

    // chips
    this.startingStack = 20000;
    this.smallBlind = 100;
    this.bigBlind = 200;

    this.players = [];
    this.community = [];
    this.pot = 0;

    // groups
    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    // rng
    this._rng = Math.random;

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.communityHoverY = 1.38;
    this.nameHoverY = 1.82;
    this.cardsOverHeadY = 2.30;

    this._crown = null;
    this._winnerHold = 0;
    this._winnerWalker = null;

    // UI refs
    this._potTag = null;
    this._phaseTag = null;

    // dealer origin for dealing animation
    this._dealerOrigin = new THREE.Vector3(0, 1.12, 0);

    // animation lists
    this._flyingCards = [];

    // textures (safe)
    this._tex = new THREE.TextureLoader();
  }

  async build(scene) {
    this.scene = scene;

    // anchor groups to table center so UI never “drifts”
    this.tableGroup.position.copy(this.tableCenter);
    this.uiGroup.position.copy(this.tableCenter);

    this.buildTable();
    this.buildPlayers(8); // You asked for 8 bots
    this.buildUI();
    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startMatch(true);
  }

  // =========================
  // BUILD: TABLE / ROOM ITEMS
  // =========================
  _safeTex(name, repeat = [1, 1]) {
    const path = `assets/textures/${name}`;
    const t = this._tex.load(
      path,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat[0], repeat[1]);
        tex.anisotropy = 4;
        tex.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    return t;
  }

  _matWithTex(name, fallback = 0x222222, repeat = [1, 1], extra = {}) {
    let map = null;
    try { map = this._safeTex(name, repeat); } catch { map = null; }
    return new THREE.MeshStandardMaterial({
      color: fallback,
      roughness: extra.roughness ?? 0.85,
      metalness: extra.metalness ?? 0.08,
      emissive: extra.emissive ?? 0x000000,
      emissiveIntensity: extra.emissiveIntensity ?? 0.0,
      map: map || null,
    });
  }

  buildTable() {
    const g = this.tableGroup;

    // base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.35, 0.75, 36),
      new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.92 })
    );
    base.position.y = 0.38;

    // felt
    const feltMat = this._matWithTex("table_felt_green.jpg", 0x145c3a, [2, 2], {
      roughness: 0.95,
      metalness: 0.02,
    });

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.05, 3.20, 0.22, 56),
      feltMat
    );
    top.position.y = 1.06;

    // leather trim (your file: "Table leather trim.jpg")
    const trimMat = this._matWithTex("Table leather trim.jpg", 0x2b1a10, [2, 1], {
      roughness: 0.65,
      metalness: 0.12,
      emissive: 0x080402,
      emissiveIntensity: 0.25,
    });

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.08, 0.10, 16, 80),
      trimMat
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 1.10;

    // betting line (pass line ring)
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.045, 12, 100),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.75,
        roughness: 0.35,
        metalness: 0.25,
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = 1.095;

    // pot stack area marker (subtle)
    const potPad = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0c0c10,
        roughness: 0.95,
        emissive: 0x001410,
        emissiveIntensity: 0.25,
      })
    );
    potPad.rotation.x = -Math.PI / 2;
    potPad.position.set(0, 1.062, 0);

    // remove dealer object entirely (your request)
    g.add(base, top, trim, line, potPad);

    // gentle table lights
    const a = new THREE.PointLight(0x00ffaa, 0.45, 10);
    a.position.set(0, 3.2, 0);
    g.add(a);

    const b = new THREE.PointLight(0xffd27a, 0.35, 10);
    b.position.set(2.0, 2.2, -1.0);
    g.add(b);

    // center pot pile group
    this._potPile = new THREE.Group();
    this._potPile.position.set(0, 1.075, 0);
    g.add(this._potPile);

    // community card group
    this._communityGroup = new THREE.Group();
    this._communityGroup.position.set(0, this.communityHoverY, 0);
    g.add(this._communityGroup);

    // dealer button (rotates)
    this._dealerButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.02, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      })
    );
    this._dealerButton.position.set(0, 1.095, 2.0);
    g.add(this._dealerButton);
  }

  // =========================
  // BUILD: PLAYERS
  // =========================
  buildPlayers(count = 8) {
    const radius = 3.95;
    const names = this._royalBotNames(count);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // chair (simple but readable)
      const chair = this._makeChair();
      chair.position.copy(seatPos);
      chair.position.y = 0.28;
      chair.lookAt(new THREE.Vector3(0, chair.position.y, 0));

      // bot (humanoid)
      const bot = this._makeBot();
      bot.position.copy(seatPos);
      // seat height: chair seat top approx y=0.55, bot should sit on it
      bot.position.y = 0.55 + 0.22; // hips on seat
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // name tag
      const nameTag = this.makeTextTag(names[i], 0.36, "#00ffaa");
      nameTag.position.set(seatPos.x, this.nameHoverY, seatPos.z);

      // stack tag
      const stackTag = this.makeTextTag(`$${this.startingStack}`, 0.30, "#ffd27a");
      stackTag.position.set(seatPos.x, this.nameHoverY - 0.32, seatPos.z);

      // bet tag (shows what they put in this street)
      const betTag = this.makeTextTag(`BET $0`, 0.26, "#2bd7ff");
      betTag.position.set(seatPos.x, this.nameHoverY - 0.62, seatPos.z);

      // cards-over-head group (shows hole cards to spectator)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);

      // chip stack group (left of player)
      const chips = new THREE.Group();
      chips.position.set(
        seatPos.x - 0.42 * Math.cos(angle),
        1.08,
        seatPos.z - 0.42 * Math.sin(angle)
      );

      this.tableGroup.add(chair, bot, nameTag, stackTag, betTag, handGroup, chips);

      this.players.push({
        i,
        name: names[i],
        seatPos,
        angle,
        chair,
        bot,
        nameTag,
        stackTag,
        betTag,
        handGroup,
        chips,
        stack: this.startingStack,
        inHand: true,
        busted: false,
        hole: [],
        bet: 0,
        streetBet: 0,
        action: "WAIT",
      });
    }
  }

  _royalBotNames(n) {
    // suit squads — looks cool and consistent
    const suits = ["♠", "♥", "♦", "♣"];
    const royals = ["King", "Queen", "Jack", "Ace"];
    const list = [];
    let s = 0;
    let r = 0;
    while (list.length < n) {
      list.push(`${suits[s]} ${royals[r]} of ${suits[s] === "♠" ? "Spades" : suits[s] === "♥" ? "Hearts" : suits[s] === "♦" ? "Diamonds" : "Clubs"}`);
      r++;
      if (r >= royals.length) {
        r = 0;
        s = (s + 1) % suits.length;
      }
    }
    return list;
  }

  _makeChair() {
    const g = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 });

    // seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.62), mat);
    seat.position.y = 0.52;

    // back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.10), mat);
    back.position.set(0, 0.85, -0.26);

    // legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.52, 10);
    for (const [x, z] of [[-0.26,-0.26],[0.26,-0.26],[-0.26,0.26],[0.26,0.26]]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(x, 0.26, z);
      g.add(leg);
    }

    g.add(seat, back);
    return g;
  }

  _makeBot() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.65, metalness: 0.08 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // hips/torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), bodyMat);
    torso.position.y = 0.55;

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), bodyMat);
    head.position.y = 1.05;

    // shoulders
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.22), accentMat);
    shoulder.position.y = 0.82;

    g.add(torso, head, shoulder);
    return g;
  }

  // =========================
  // BUILD: UI
  // =========================
  buildUI() {
    // small, centered, above community cards, NOT blocking players
    const potTag = this.makeTextTag("POT: $0", 0.30, "#2bd7ff");
    potTag.position.set(0, 1.70, 0.0);

    const phaseTag = this.makeTextTag("PHASE", 0.26, "#ff2bd6");
    phaseTag.position.set(0, 1.52, 0.0);

    this.uiGroup.add(potTag, phaseTag);
    this._potTag = potTag;
    this._phaseTag = phaseTag;
  }

  makeTextTag(text, scale = 0.32, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 84px Arial";
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 160);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8 * scale, 0.7 * scale), mat);
    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;
    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    if (!mesh?.userData?.ctx) return;
    const { canvas, ctx, tex } = mesh.userData;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 84px Arial";
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 160);
    tex.needsUpdate = true;
  }

  // =========================
  // GAME FLOW
  // =========================
  startMatch(reset = false) {
    if (reset) {
      this.handIndex = 0;
      this.dealerIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
      }
    }
    this.startHand();
  }

  startHand() {
    // reset state
    this._winnerHold = 0;
    this._winnerWalker = null;

    // clear pot + street bets
    this.pot = 0;
    this.community = [];
    this._clearCommunityCards();
    this._rebuildPotPile();

    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.streetBet = 0;
      p.action = "WAIT";
      p.hole = [];
      this._clearHandGroup(p);
      this.refreshChips(p);
      this.updateStackTag(p);
      this.updateBetTag(p);
    }

    this._moveDealerButton();

    // blinds (after dealer moves)
    this._postBlinds();

    // build a scripted queue that matches real poker rhythm
    this._queue = [];
    this._phase = "DEAL_HOLE";
    this._queueDealHole();
    this._queueBetting("PREFLOP");
    this._queueDealCommunity(3, "FLOP");
    this._queueBetting("FLOP");
    this._queueDealCommunity(1, "TURN");
    this._queueBetting("TURN");
    this._queueDealCommunity(1, "RIVER");
    this._queueBetting("RIVER");
    this._queue.push({ type: "SHOWDOWN" });

    this._timer = 0;

    this.setTag(this._phaseTag, `HAND ${this.handIndex + 1}/${this.handsPerMatch}`, "#ff2bd6");
    this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");

    this._pushLeaderboard();
  }

  _pushLeaderboard() {
    const standings = [...this.players].sort((a, b) => b.stack - a.stack);
    const lines = [
      `Boss Tournament — Hand ${this.handIndex + 1}/${this.handsPerMatch}`,
      `1) ${standings[0]?.name} — $${standings[0]?.stack}`,
      `2) ${standings[1]?.name} — $${standings[1]?.stack}`,
      `3) ${standings[2]?.name} — $${standings[2]?.stack}`,
      `4) ${standings[3]?.name} — $${standings[3]?.stack}`,
    ];
    this.onLeaderboard(lines);
  }

  _moveDealerButton() {
    const dealer = this.players[this.dealerIndex % this.players.length];
    if (!dealer) return;
    const a = dealer.angle;
    // dealer button sits on table rim near that seat
    this._dealerButton.position.set(Math.cos(a) * 2.15, 1.095, Math.sin(a) * 2.15);
  }

  _postBlinds() {
    const n = this.players.length;
    const sb = this.players[(this.dealerIndex + 1) % n];
    const bb = this.players[(this.dealerIndex + 2) % n];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");
  }

  // ===== Queue builders =====
  _queueDealHole() {
    // Deal 2 rounds: one card each, twice
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.inHand) continue;
        this._queue.push({ type: "DEAL_TO_PLAYER", playerIndex: p.i });
      }
    }
  }

  _queueDealCommunity(n, label) {
    this._queue.push({ type: "PHASE", label });
    for (let i = 0; i < n; i++) {
      this._queue.push({ type: "DEAL_COMMUNITY_ONE" });
    }
  }

  _queueBetting(streetLabel) {
    this._queue.push({ type: "PHASE", label: `${streetLabel} — BETTING` });

    // reset street bets for new street
    this._queue.push({ type: "RESET_STREET_BETS" });

    // each active player acts once (watchable)
    for (let i = 0; i < this.players.length; i++) {
      const idx = (this.dealerIndex + 1 + i) % this.players.length;
      this._queue.push({ type: "PLAYER_ACT", playerIndex: idx, street: streetLabel });
    }

    // pull bets into pot visually
    this._queue.push({ type: "COLLECT_BETS" });
  }

  // ===== Cards =====
  _makeCardMeshFaceDown() {
    const back = this._safeTex("Card back.jpg", [1, 1]);
    const mat = new THREE.MeshBasicMaterial({ map: back });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    mesh.rotation.x = -Math.PI / 2; // start flat
    return mesh;
  }

  _makeCardMeshFaceUp(card) {
    // uses canvas so ranks are big and readable
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, 256, 384);

    const isRed = card.s === "♥" || card.s === "♦";
    const suitColor = isRed ? "#d01818" : "#111111";

    ctx.font = "bold 92px Arial";
    ctx.fillStyle = suitColor;
    ctx.fillText(card.r, 18, 100);
    ctx.font = "bold 98px Arial";
    ctx.fillText(card.s, 18, 190);

    ctx.font = "bold 150px Arial";
    ctx.globalAlpha = 0.82;
    ctx.fillText(card.s, 82, 280);
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  _dealCardToPlayer(p) {
    const c = this._drawCard();
    p.hole.push(c);

    // animate a facedown card flying to overhead area
    const cardMesh = this._makeCardMeshFaceDown();
    cardMesh.position.copy(this._dealerOrigin);

    const target = new THREE.Vector3(
      p.seatPos.x,
      this.cardsOverHeadY,
      p.seatPos.z
    );

    // offset card positions (two cards)
    const offsetX = p.hole.length === 1 ? -0.22 : 0.22;
    target.x += offsetX;

    this.tableGroup.add(cardMesh);

    this._flyingCards.push({
      mesh: cardMesh,
      t: 0,
      dur: this.dealDelay,
      from: cardMesh.position.clone(),
      to: target,
      onDone: () => {
        // replace with faceup card so spectators can see it
        const faceUp = this._makeCardMeshFaceUp(c);
        faceUp.position.copy(target);
        this.tableGroup.add(faceUp);
        p.handGroup.add(faceUp); // keep grouped for camera facing
        this.tableGroup.remove(cardMesh);

        // ensure overhead group exists + is clean
        // (handGroup holds faceUp cards; this is fine)
      },
    });
  }

  _dealOneCommunity(label) {
    const c = this._drawCard();
    this.community.push(c);

    // animate facedown to center then flip faceup
    const cardMesh = this._makeCardMeshFaceDown();
    cardMesh.position.copy(this._dealerOrigin);

    const idx = this.community.length - 1;
    const spacing = 0.46;
    const startX = -0.92;
    const target = new THREE.Vector3(startX + idx * spacing, this.communityHoverY, 0);

    this.tableGroup.add(cardMesh);

    this._flyingCards.push({
      mesh: cardMesh,
      t: 0,
      dur: this.dealDelay,
      from: cardMesh.position.clone(),
      to: target,
      onDone: () => {
        const faceUp = this._makeCardMeshFaceUp(c);
        faceUp.position.copy(target);
        this._communityGroup.add(faceUp);
        this.tableGroup.remove(cardMesh);
      },
    });
  }

  _clearCommunityCards() {
    while (this._communityGroup.children.length) {
      this._communityGroup.remove(this._communityGroup.children[0]);
    }
  }

  _clearHandGroup(p) {
    while (p.handGroup.children.length) {
      p.handGroup.remove(p.handGroup.children[0]);
    }
  }

  _drawCard() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    return {
      r: ranks[(this._rng() * ranks.length) | 0],
      s: suits[(this._rng() * suits.length) | 0]
    };
  }

  // ===== Betting visuals =====
  takeBet(p, amount, label = "") {
    if (!p.inHand) return;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    p.streetBet += bet;
    this.pot += bet;
    p.action = label || `BET ${bet}`;
    this.updateStackTag(p);
    this.updateBetTag(p);
    this.refreshChips(p);
    this._rebuildPotPile();
    this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
  }

  updateStackTag(p) {
    this.setTag(p.stackTag, `$${p.stack}`, "#ffd27a");
  }

  updateBetTag(p) {
    this.setTag(p.betTag, `BET $${p.streetBet}`, "#2bd7ff");
  }

  _rebuildPotPile() {
    while (this._potPile.children.length) this._potPile.remove(this._potPile.children[0]);

    // build a visible pot stack (simple but clear)
    const chips = Math.min(40, Math.max(2, Math.floor(this.pot / 250)));
    for (let i = 0; i < chips; i++) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.02, 18),
        new THREE.MeshStandardMaterial({
          color: i % 4 === 0 ? 0xffd27a : i % 4 === 1 ? 0x2bd7ff : i % 4 === 2 ? 0xff2bd6 : 0xffffff,
          roughness: 0.45,
          metalness: 0.18,
          emissive: 0x000000
        })
      );
      chip.position.set((i % 5) * 0.09 - 0.18, 0.02 + i * 0.018, ((i / 5) | 0) * 0.06 - 0.12);
      this._potPile.add(chip);
    }
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    const denoms = [
      { v: 100,  c: 0xffffff },
      { v: 500,  c: 0xff2bd6 },
      { v: 1000, c: 0x2bd7ff },
      { v: 5000, c: 0xffd27a },
      { v: 10000, c: 0x00ffaa },
    ];

    let remaining = p.stack;
    let stackIndex = 0;

    for (const d of denoms.reverse()) {
      const count = Math.min(10, Math.floor(remaining / d.v));
      if (count <= 0) continue;
      remaining -= count * d.v;

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.5, metalness: 0.2 })
        );
        chip.position.set(stackIndex * 0.095, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      stackIndex += 1.15;
    }
  }

  // =========================
  // WINNER / CROWN
  // =========================
  _showCrown(winner) {
    this._clearCrown();

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.24, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.2,
        roughness: 0.28,
        metalness: 0.45,
      })
    );

    const glow = new THREE.PointLight(0xffd27a, 0.8, 7);

    this.tableGroup.add(crown);
    this.tableGroup.add(glow);

    this._crown = { crown, glow, winner };
    this._winnerHold = 0;
    this._winnerWalker = winner;
  }

  _clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crown);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  // =========================
  // HAND EVAL (simple flavor)
  // =========================
  evaluateHandSimple(player) {
    if (player.hole.length < 2) return "High Card";
    const r1 = player.hole[0].r;
    const r2 = player.hole[1].r;
    if (r1 === r2) return `Pair of ${r1}s`;
    return "High Card";
  }

  // =========================
  // UPDATE LOOP
  // =========================
  update(dt) {
    // face tags/cards toward camera
    if (this.camera) {
      for (const p of this.players) {
        p.nameTag.lookAt(this.camera.position);
        p.stackTag.lookAt(this.camera.position);
        p.betTag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this._potTag.lookAt(this.camera.position);
      this._phaseTag.lookAt(this.camera.position);
      this._communityGroup.lookAt(this.camera.position);
    }

    // animate flying cards
    for (let i = this._flyingCards.length - 1; i >= 0; i--) {
      const f = this._flyingCards[i];
      f.t += dt;
      const a = Math.min(1, f.t / f.dur);
      f.mesh.position.lerpVectors(f.from, f.to, a);
      if (a >= 1) {
        try { f.onDone?.(); } catch {}
        this._flyingCards.splice(i, 1);
      }
    }

    // crown pulse + follow winner head
    if (this._crown) {
      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.7 * pulse;

      // keep crown above winner (even while walking)
      const w = this._crown.winner;
      this._crown.crown.position.set(w.bot.position.x, w.bot.position.y + 0.95, w.bot.position.z);
      this._crown.glow.position.copy(this._crown.crown.position);

      // winner walk-around for 60 seconds
      if (this._winnerWalker && this._winnerHold <= 60) {
        const t = this._winnerHold;
        const r = 4.25;
        // circle path around the table
        this._winnerWalker.bot.position.x = Math.cos(t * 0.35) * r;
        this._winnerWalker.bot.position.z = Math.sin(t * 0.35) * r;
        this._winnerWalker.bot.lookAt(new THREE.Vector3(0, this._winnerWalker.bot.position.y, 0));
      }

      // after 60 seconds, clear crown and start next hand
      if (this._winnerHold > 60) {
        this._clearCrown();
        this._winnerWalker = null;

        // advance dealer + hand
        this.handIndex++;
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

        // match end?
        if (this.handIndex >= this.handsPerMatch) {
          const standings = [...this.players].sort((a,b) => b.stack - a.stack);
          this.setTag(this._phaseTag, `MATCH WINNER: ${standings[0].name}`, "#00ffaa");
          this.onLeaderboard([
            "Boss Tournament — FINAL",
            `1) ${standings[0].name} — $${standings[0].stack}`,
            `2) ${standings[1].name} — $${standings[1].stack}`,
            `3) ${standings[2].name} — $${standings[2].stack}`,
            `4) ${standings[3].name} — $${standings[3].stack}`,
          ]);
          // restart match
          this.startMatch(true);
          return;
        }

        this.startHand();
        return;
      }
    }

    // run queue if no crown intermission
    if (this._crown) return;

    this._timer += dt;
    if (!this._queue || this._queue.length === 0) return;

    // spacing between steps
    const next = this._queue[0];
    const needed =
      next.type === "DEAL_TO_PLAYER" || next.type === "DEAL_COMMUNITY_ONE"
        ? this.dealDelay
        : next.type === "PLAYER_ACT"
        ? this.betDelay
        : this.stepDelay;

    if (this._timer < needed) return;
    this._timer = 0;

    try {
      this._tickQueue();
    } catch (e) {
      console.error("PokerSim queue error:", e);
      this.setTag(this._phaseTag, "SIM RESET (recovered)", "#ff2bd6");
      this.startHand();
    }
  }

  _tickQueue() {
    const step = this._queue.shift();
    if (!step) return;

    if (step.type === "PHASE") {
      this.setTag(this._phaseTag, step.label, "#ff2bd6");
      return;
    }

    if (step.type === "RESET_STREET_BETS") {
      for (const p of this.players) {
        p.streetBet = 0;
        this.updateBetTag(p);
      }
      return;
    }

    if (step.type === "DEAL_TO_PLAYER") {
      const p = this.players.find(x => x.i === step.playerIndex);
      if (p && p.inHand) this._dealCardToPlayer(p);
      return;
    }

    if (step.type === "DEAL_COMMUNITY_ONE") {
      this._dealOneCommunity();
      // keep pot/phase centered above community
      return;
    }

    if (step.type === "PLAYER_ACT") {
      const p = this.players[step.playerIndex];
      if (!p || !p.inHand || p.busted) return;

      // show whose turn
      this.setTag(this._phaseTag, `TURN: ${p.name}`, "#ff2bd6");

      // watchable behavior
      const roll = this._rng();
      if (roll < 0.12) {
        p.inHand = false;
        p.action = "FOLD";
        this.setTag(p.nameTag, `${p.name} — FOLD`, "#ff2bd6");
        return;
      }
      if (roll < 0.28) {
        this.takeBet(p, 400, "RAISE 400");
        return;
      }
      this.takeBet(p, 200, "CALL 200");
      return;
    }

    if (step.type === "COLLECT_BETS") {
      // visually, bets are already in pot; this step just updates phase label
      this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
      this._pushLeaderboard();
      return;
    }

    if (step.type === "SHOWDOWN") {
      // choose a winner among players still in hand
      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(this._rng() * alive.length) | 0] : this.players[0];

      // award pot
      winner.stack += this.pot;
      const won = this.pot;
      this.pot = 0;
      this._rebuildPotPile();
      this.updateStackTag(winner);
      this.refreshChips(winner);

      const handType = this.evaluateHandSimple(winner);
      this.setTag(this._phaseTag, `${winner.name} WINS — ${handType}`, "#00ffaa");
      this.setTag(this._potTag, `WON: $${won}`, "#2bd7ff");

      // crown + winner walk for 60s
      this._showCrown(winner);

      // rotate dealer will happen after crown intermission ends
      return;
    }
  }
                           }
