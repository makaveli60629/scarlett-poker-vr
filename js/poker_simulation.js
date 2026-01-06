// /js/poker_simulation.js — Skylark Poker VR (Update 9.0)
// Watchable Poker Sim — 8 bots, community cards, visible chips, slow dealing,
// combined tags, crown + 60s victory lap, busted walk-out + replacement.
// IMPORTANT: Uses local "./three.js" wrapper (NOT "three") for GitHub Pages stability.

import * as THREE from "./three.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter ? opts.tableCenter.clone() : new THREE.Vector3(0, 0, -6.0);
    this.onLeaderboard = opts.onLeaderboard || (() => {});
    this.spectatorOnly = opts.spectatorOnly !== false; // default true

    // pacing (slower / watchable)
    this.stepDelay = 1.0;          // state step pacing
    this.dealAnimSeconds = 0.55;   // card flight time
    this.actionAnimSeconds = 0.65; // time to show action

    // tournament
    this.handsPerMatch = 12;
    this.handIndex = 0;

    // chips / blinds
    this.startingStack = 20000;
    this.smallBlind = 100;
    this.bigBlind = 200;

    // runtime
    this.players = [];
    this.community = [];
    this.pot = 0;

    // groups
    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    // visuals
    this.cardSize = { w: 0.30, h: 0.42 };
    this.tableTopY = 1.05;          // top surface height
    this.communityY = 1.28;         // community cards height
    this.potTagY = 1.70;            // pot/phase tag height
    this.headTagY = 2.10;           // combined tag height
    this.cardsOverHeadY = 2.38;     // hole cards hover height

    // dealing origin (dealer position)
    this.dealerPos = new THREE.Vector3(0, 1.35, 0);

    // crown / victory lap
    this._crown = null;
    this._victory = null; // { player, t, duration }
    this._winnerHoldSeconds = 60;

    // state machine
    this._phase = "INIT";
    this._stateTimer = 0;
    this._anim = null; // active animation tracker

    // rng
    this._rng = Math.random;

    // textures
    this._tl = new THREE.TextureLoader();
    this.tex = {};
  }

  async build(scene) {
    this.scene = scene;

    this.tableGroup.position.copy(this.tableCenter);
    this.uiGroup.position.copy(this.tableCenter);

    // Load textures safely
    this.loadTextures();

    this.buildTable();
    this.buildPlayers(8);
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  loadTextures() {
    // IMPORTANT: Use your exact filenames from /assets/textures/
    // (case + spaces matter on GitHub Pages)
    const load = (file) => {
      const path = `assets/textures/${file}`;
      const t = this._tl.load(
        path,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = 4;
          tex.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => console.warn("Missing texture:", path)
      );
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    this.tex.felt = load("table_felt_green.jpg");
    this.tex.trim = load("Table leather trim.jpg");
    this.tex.crown = load("Crown.jpg");
    this.tex.cardBack = load("Card back.jpg");

    // optional chip images (if you want later we can map these onto chip faces)
    this.tex.chip1k = load("chip_1000.jpg");
    this.tex.chip5k = load("chip_5000.jpg");
    this.tex.chip10k = load("chip_10000.jpg");
  }

  // -----------------------------
  // TABLE
  // -----------------------------
  buildTable() {
    const g = this.tableGroup;

    // base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.25, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.9 })
    );
    base.position.y = 0.35;

    // top felt
    this.tex.felt.repeat.set(2.6, 2.6);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.15, 0.22, 48),
      new THREE.MeshStandardMaterial({ map: this.tex.felt, roughness: 0.95 })
    );
    top.position.y = this.tableTopY;

    // leather trim ring
    this.tex.trim.repeat.set(6, 1);
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.03, 0.12, 16, 100),
      new THREE.MeshStandardMaterial({
        map: this.tex.trim,
        roughness: 0.65,
        metalness: 0.05
      })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = this.tableTopY + 0.08;

    // betting line ring (gold glow)
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.045, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.75,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = this.tableTopY + 0.04;

    // dealer marker position (used for dealing animations)
    this.dealerPos.set(0, this.tableTopY + 0.33, 0.95);

    g.add(base, top, trim, line);

    // tiny dealer puck (visual)
    const dealerPuck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20),
      new THREE.MeshStandardMaterial({
        color: 0x2bd7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 0.65,
        roughness: 0.4
      })
    );
    dealerPuck.position.copy(this.dealerPos);
    dealerPuck.position.y = this.tableTopY + 0.08;
    g.add(dealerPuck);
    this._dealerPuck = dealerPuck;
  }

  // -----------------------------
  // PLAYERS
  // -----------------------------
  buildPlayers(count = 8) {
    const radius = 3.75;

    // Royal boss roster (all suits)
    const roster = [
      "♠ King of Spades", "♠ Queen of Spades", "♠ Jack of Spades", "♠ Ace of Spades",
      "♥ King of Hearts", "♥ Queen of Hearts", "♦ Jack of Diamonds", "♣ Ace of Clubs"
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // Chair (low poly but nicer than cubes)
      const chair = this.makeChair();
      chair.position.copy(seatPos);
      chair.position.y = 0.0;
      chair.lookAt(new THREE.Vector3(0, 0.0, 0));

      // Bot (capsule + simple “cloth” torso)
      const bot = this.makeBot(i);
      bot.position.copy(seatPos);
      bot.position.y = 1.08; // <-- IMPORTANT: keeps bots above floor and seated correctly
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // Combined tag (single readable panel)
      const tag = this.makeTag(`${roster[i]}  |  $${this.startingStack}  |  WAIT`, "#ffffff");
      tag.position.set(seatPos.x, this.headTagY, seatPos.z);

      // Hole cards over head (visible, but above tag so it doesn't block it)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);
      handGroup.visible = true;

      // chip stacks next to each player + bet pile in front
      const chips = new THREE.Group();
      chips.position.set(seatPos.x, this.tableTopY + 0.02, seatPos.z);
      this.tableGroup.add(chips);

      const betPile = new THREE.Group();
      // bet pile placed closer to table center
      betPile.position.set(seatPos.x * 0.72, this.tableTopY + 0.02, seatPos.z * 0.72);
      this.tableGroup.add(betPile);

      this.tableGroup.add(chair, bot, tag, handGroup);

      this.players.push({
        i,
        name: roster[i],
        seatPos,
        angle,
        chair,
        bot,
        tag,
        handGroup,
        chips,
        betPile,

        stack: this.startingStack,
        inHand: true,
        busted: false,

        hole: [],
        action: "WAIT",
        bet: 0,

        // movement anim
        _leaveTarget: null,
        _enterTarget: null
      });
    }
  }

  makeChair() {
    const g = new THREE.Group();

    const legMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.85 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1f1f24, roughness: 0.9 });

    // seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.10, 0.70), seatMat);
    seat.position.y = 0.55;

    // back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.60, 0.10), backMat);
    back.position.set(0, 0.90, -0.30);

    // legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 10);
    const legOffsets = [
      [-0.28, 0.275, -0.28],
      [ 0.28, 0.275, -0.28],
      [-0.28, 0.275,  0.28],
      [ 0.28, 0.275,  0.28],
    ];
    legOffsets.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      g.add(leg);
    });

    g.add(seat, back);
    return g;
  }

  makeBot(i) {
    const g = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.7 });
    const clothColors = [0x2bd7ff, 0xff2bd6, 0xffd27a, 0x00ffaa, 0x8f7bff, 0xff8844, 0x44ff88, 0xffffff];
    const cloth = new THREE.MeshStandardMaterial({ color: clothColors[i % clothColors.length], roughness: 0.85 });

    // legs (simple)
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.35, 4, 10), cloth);
    legs.position.y = 0.20;

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 12), cloth);
    torso.position.y = 0.72;

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skin);
    head.position.y = 1.15;

    g.add(legs, torso, head);
    return g;
  }

  // -----------------------------
  // UI / TAGS / CARDS
  // -----------------------------
  buildUI() {
    // Community group
    this.communityGroup = new THREE.Group();
    this.communityGroup.position.set(0, this.communityY, 0);
    this.tableGroup.add(this.communityGroup);

    // Pot tag (small and centered above community)
    this.potTag = this.makeTag("POT: $0", "#2bd7ff", 0.52);
    this.potTag.position.set(0, this.potTagY, 0.05);
    this.uiGroup.add(this.potTag);

    // Phase tag (small above pot)
    this.phaseTag = this.makeTag("HAND 1", "#ff2bd6", 0.42);
    this.phaseTag.position.set(0, this.potTagY + 0.28, 0.05);
    this.uiGroup.add(this.phaseTag);

    // Pot chips pile (center)
    this.potPile = new THREE.Group();
    this.potPile.position.set(0, this.tableTopY + 0.02, 0);
    this.tableGroup.add(this.potPile);
  }

  makeTag(text, color = "#ffffff", scale = 0.46) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const paint = (t, c) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // glassy black
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // gold border
      ctx.strokeStyle = "rgba(255,210,122,0.85)";
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      ctx.font = "bold 72px Arial";
      ctx.fillStyle = c;
      ctx.fillText(t, 40, 160);
    };

    paint(text, color);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.9 * scale, 0.72 * scale), mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;
    mesh.userData.paint = paint;

    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    const { paint, tex } = mesh.userData;
    paint(text, color);
    tex.needsUpdate = true;
  }

  makeCardMesh(card, faceUp = true) {
    // Card face via canvas
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    if (!faceUp) {
      // Use your card back texture if available
      const mat = new THREE.MeshBasicMaterial({ map: this.tex.cardBack });
      return new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    }

    // white card
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, 256, 384);

    const isRed = card.s === "♥" || card.s === "♦";
    const suitColor = isRed ? "#d01818" : "#111111";

    ctx.font = "bold 84px Arial";
    ctx.fillStyle = suitColor;
    ctx.fillText(card.r, 18, 92);

    ctx.font = "bold 92px Arial";
    ctx.fillText(card.s, 18, 175);

    ctx.font = "bold 140px Arial";
    ctx.globalAlpha = 0.85;
    ctx.fillText(card.s, 82, 260);
    ctx.globalAlpha = 1;

    // mirror bottom
    ctx.save();
    ctx.translate(256, 384);
    ctx.rotate(Math.PI);
    ctx.font = "bold 84px Arial";
    ctx.fillText(card.r, 18, 92);
    ctx.font = "bold 92px Arial";
    ctx.fillText(card.s, 18, 175);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex });
    return new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
  }

  // -----------------------------
  // HAND FLOW
  // -----------------------------
  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
      }
    }

    // clear victory/crown from last hand
    this.clearCrown();
    this._victory = null;

    // reset hand
    this.pot = 0;
    this.community = [];
    this._phase = "DEAL_HOLE";
    this._stateTimer = 0;
    this._anim = null;

    // clear center cards
    while (this.communityGroup.children.length) this.communityGroup.remove(this.communityGroup.children[0]);
    this.clearPotPile();

    // reset players
    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.action = "WAIT";
      p.hole = p.inHand ? this.dealHole() : [];
      this.renderHoleOverHead(p);
      this.refreshChips(p);
      this.refreshBetPile(p);
      this.updateCombinedTag(p);
    }

    // blinds
    this.postBlinds();

    // UI tags
    this.setTag(this.potTag, `POT: $${this.pot}`, "#2bd7ff");
    this.setTag(this.phaseTag, `HAND ${this.handIndex + 1}/${this.handsPerMatch}`, "#ff2bd6");

    // leaderboard
    this.pushLeaderboard();
  }

  pushLeaderboard() {
    const standings = [...this.players].slice().sort((a, b) => b.stack - a.stack);
    const lines = [
      `Boss Tournament — Hand ${this.handIndex + 1}/${this.handsPerMatch}`,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
      `4) ${standings[3].name} — $${standings[3].stack}`,
      `5) ${standings[4].name} — $${standings[4].stack}`,
    ];
    this.onLeaderboard(lines);
  }

  dealHole() {
    const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
    const suits = ["♠", "♥", "♦", "♣"];
    const pick = () => ({
      r: ranks[(this._rng() * ranks.length) | 0],
      s: suits[(this._rng() * suits.length) | 0],
    });
    return [pick(), pick()];
  }

  dealCommunity(n) {
    const cards = [];
    for (let i = 0; i < n; i++) {
      const c = this.dealHole()[0];
      cards.push(c);
    }
    return cards;
  }

  renderHoleOverHead(player) {
    while (player.handGroup.children.length) player.handGroup.remove(player.handGroup.children[0]);

    if (!player.inHand || player.hole.length < 2) return;

    const c0 = this.makeCardMesh(player.hole[0], true);
    const c1 = this.makeCardMesh(player.hole[1], true);

    // keep them above tag (won’t block)
    c0.position.set(-0.18, 0, 0);
    c1.position.set(0.18, 0, 0);

    player.handGroup.add(c0, c1);
  }

  renderCommunity() {
    while (this.communityGroup.children.length) this.communityGroup.remove(this.communityGroup.children[0]);

    const spacing = 0.34;
    for (let i = 0; i < this.community.length; i++) {
      const mesh = this.makeCardMesh(this.community[i], true);
      mesh.position.set((i - (this.community.length - 1) / 2) * spacing, 0, 0);
      mesh.rotation.x = -Math.PI / 2; // lays flat
      mesh.position.y = 0.02;
      this.communityGroup.add(mesh);
    }
  }

  updateCombinedTag(p) {
    const text = `${p.name}  |  $${p.stack}  |  ${p.action}`;
    this.setTag(p.tag, text, "#ffffff");
  }

  // -----------------------------
  // BLINDS / BETTING / CHIPS
  // -----------------------------
  postBlinds() {
    const alive = this.players.filter(p => !p.busted && p.stack > 0);
    if (alive.length < 2) return;

    const sb = alive[this.handIndex % alive.length];
    const bb = alive[(this.handIndex + 1) % alive.length];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");
  }

  takeBet(p, amount, label = "") {
    if (!p.inHand) return;

    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;

    p.action = label ? label : `BET ${bet}`;
    this.updateCombinedTag(p);

    this.refreshChips(p);
    this.refreshBetPile(p);
    this.refreshPotPile();
    this.setTag(this.potTag, `POT: $${this.pot}`, "#2bd7ff");
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    // small visible stacks beside each player seat (on table rim)
    const seat = p.seatPos.clone();
    const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), seat).normalize();
    const side = new THREE.Vector3(toCenter.z, 0, -toCenter.x); // perpendicular

    const basePos = new THREE.Vector3(
      seat.x + side.x * 0.45,
      this.tableTopY + 0.02,
      seat.z + side.z * 0.45
    );

    // denoms
    const denoms = [
      { v: 100, c: 0xffffff },
      { v: 500, c: 0xff2bd6 },
      { v: 1000, c: 0x2bd7ff },
      { v: 5000, c: 0xffd27a },
    ];

    let remaining = p.stack;
    let stackIndex = 0;

    for (const d of denoms.slice().reverse()) {
      const count = Math.min(10, Math.floor(remaining / d.v));
      if (count <= 0) continue;

      remaining -= count * d.v;

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.018, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.5, metalness: 0.2 })
        );
        chip.position.set(basePos.x + stackIndex * 0.09, basePos.y + i * 0.020, basePos.z);
        p.chips.add(chip);
      }
      stackIndex += 1.2;
    }
  }

  refreshBetPile(p) {
    while (p.betPile.children.length) p.betPile.remove(p.betPile.children[0]);

    // represent bet as a small pile
    const chips = Math.min(10, Math.floor(p.bet / 200));
    for (let i = 0; i < chips; i++) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.018, 18),
        new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.4, metalness: 0.35 })
      );
      chip.position.set(0, i * 0.02, 0);
      p.betPile.add(chip);
    }
  }

  clearPotPile() {
    while (this.potPile.children.length) this.potPile.remove(this.potPile.children[0]);
  }

  refreshPotPile() {
    this.clearPotPile();

    const chips = Math.min(22, Math.floor(this.pot / 200));
    for (let i = 0; i < chips; i++) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.02, 20),
        new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.35, metalness: 0.25 })
      );
      chip.position.set((i % 5) * 0.07 - 0.14, (i / 5) * 0.02, ((i % 3) * 0.06 - 0.06));
      this.potPile.add(chip);
    }
  }

  // -----------------------------
  // WIN / BUST / CROWN / WALKOUT
  // -----------------------------
  evaluateHandSimple(player) {
    const r1 = player.hole[0]?.r;
    const r2 = player.hole[1]?.r;
    if (!r1 || !r2) return "High Card";
    if (r1 === r2) return `Pair of ${r1}s`;
    return "High Card";
  }

  awardWinner(winner) {
    // collect all bets into pot already
    winner.stack += this.pot;
    this.pot = 0;

    // reset bets
    for (const p of this.players) {
      p.bet = 0;
      this.refreshBetPile(p);
    }

    this.refreshChips(winner);
    this.refreshPotPile();
    this.setTag(this.potTag, `POT: $0`, "#2bd7ff");

    const handType = this.evaluateHandSimple(winner);
    winner.action = `WIN (${handType})`;
    this.updateCombinedTag(winner);

    this.showCrown(winner);

    // Start victory lap (60s)
    this._victory = { player: winner, t: 0, duration: this._winnerHoldSeconds };

    // Everyone else updates
    for (const p of this.players) {
      if (p !== winner && p.inHand) {
        p.action = "LOSE";
        this.updateCombinedTag(p);
      }
    }
  }

  showCrown(player) {
    this.clearCrown();

    // Crown as textured billboard + glow (looks better than cone)
    const crownPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.24),
      new THREE.MeshBasicMaterial({
        map: this.tex.crown,
        transparent: true
      })
    );

    crownPlane.position.copy(player.seatPos);
    crownPlane.position.y = this.cardsOverHeadY + 0.62;

    const glow = new THREE.PointLight(0xffd27a, 0.95, 7);
    glow.position.copy(crownPlane.position);
    glow.position.y += 0.35;

    this.tableGroup.add(crownPlane, glow);
    this._crown = { crownPlane, glow, player };
  }

  clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crownPlane);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  eliminateIfBusted() {
    for (const p of this.players) {
      if (p.busted) continue;
      if (p.stack <= 0) {
        p.busted = true;
        p.inHand = false;

        p.action = "OUT";
        this.updateCombinedTag(p);

        // walk to exit (toward far back wall)
        p._leaveTarget = new THREE.Vector3(0, p.bot.position.y, -14.5);
      }
    }
  }

  maybeReplaceBusted() {
    // After they walk far enough, replace with a new bot
    for (const p of this.players) {
      if (!p.busted) continue;
      if (!p._leaveTarget) continue;

      const dist = p.bot.position.distanceTo(p._leaveTarget);
      if (dist < 0.5) {
        // replace
        p.busted = false;
        p.inHand = true;
        p.stack = this.startingStack;
        p.bet = 0;
        p.action = "NEW";
        p._leaveTarget = null;

        // teleport bot back to seat
        p.bot.position.set(p.seatPos.x, 1.08, p.seatPos.z);
        p.bot.lookAt(new THREE.Vector3(0, p.bot.position.y, 0));

        this.refreshChips(p);
        this.refreshBetPile(p);
        this.updateCombinedTag(p);
        this.renderHoleOverHead(p);
      }
    }
  }

  // -----------------------------
  // DEALING ANIMATION
  // -----------------------------
  startDealAnimation(targetMesh, from, to, seconds, onDone) {
    this._anim = {
      mesh: targetMesh,
      from: from.clone(),
      to: to.clone(),
      t: 0,
      dur: Math.max(0.001, seconds),
      onDone
    };
    targetMesh.position.copy(from);
    targetMesh.visible = true;
  }

  // -----------------------------
  // MAIN UPDATE LOOP
  // -----------------------------
  update(dt) {
    // Face tags and cards toward camera (readable)
    if (this.camera) {
      for (const p of this.players) {
        p.tag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this.potTag.lookAt(this.camera.position);
      this.phaseTag.lookAt(this.camera.position);
    }

    // Animate busted walk-out
    for (const p of this.players) {
      if (p._leaveTarget) {
        p.bot.position.lerp(p._leaveTarget, 0.018);
      }
    }
    this.maybeReplaceBusted();

    // Crown follow + pulse
    if (this._crown) {
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.85 * pulse;

      const y = this.cardsOverHeadY + 0.62;
      this._crown.crownPlane.position.set(this._crown.player.bot.position.x, y, this._crown.player.bot.position.z);
      this._crown.glow.position.set(this._crown.crownPlane.position.x, y + 0.35, this._crown.crownPlane.position.z);

      // face camera always
      if (this.camera) this._crown.crownPlane.lookAt(this.camera.position);
    }

    // Victory lap (winner walks around table with crown)
    if (this._victory) {
      const v = this._victory;
      v.t += dt;

      const p = v.player;
      const lapR = 4.7;
      const a = (v.t / v.duration) * Math.PI * 2;

      const x = Math.cos(a) * lapR;
      const z = Math.sin(a) * lapR;

      p.bot.position.set(x, 1.08, z);
      p.bot.lookAt(new THREE.Vector3(0, p.bot.position.y, 0));

      // keep tag and cards above head
      p.tag.position.set(x, this.headTagY, z);
      p.handGroup.position.set(x, this.cardsOverHeadY, z);

      if (v.t >= v.duration) {
        // return to seat when done
        p.bot.position.set(p.seatPos.x, 1.08, p.seatPos.z);
        p.tag.position.set(p.seatPos.x, this.headTagY, p.seatPos.z);
        p.handGroup.position.set(p.seatPos.x, this.cardsOverHeadY, p.seatPos.z);

        this._victory = null;
        this.clearCrown();
        this.startNewHand(false);
      }
      return; // pause state machine while celebrating
    }

    // If an animation is active, advance it
    if (this._anim) {
      const a = this._anim;
      a.t += dt;
      const t = clamp(a.t / a.dur, 0, 1);

      // arc upwards slightly
      const mid = a.from.clone().lerp(a.to, 0.5);
      mid.y += 0.35;

      // quadratic bezier
      const p0 = a.from, p1 = mid, p2 = a.to;
      const pA = p0.clone().lerp(p1, t);
      const pB = p1.clone().lerp(p2, t);
      const pC = pA.clone().lerp(pB, t);

      a.mesh.position.copy(pC);
      a.mesh.lookAt(new THREE.Vector3(0, a.mesh.position.y, 0));

      if (t >= 1) {
        const done = a.onDone;
        this._anim = null;
        if (done) done();
      }
      return; // don’t tick main state while animating
    }

    // State pacing
    this._stateTimer += dt;
    if (this._stateTimer < this.stepDelay) return;
    this._stateTimer = 0;

    // Main state machine
    this.tick();
  }

  tick() {
    // DEAL HOLE: animate dealing to each player (watchable)
    if (this._phase === "DEAL_HOLE") {
      this.setTag(this.phaseTag, "DEALING", "#ff2bd6");

      // Create temp card backs to “fly” to each player (2 rounds)
      this._dealQueue = [];
      for (let r = 0; r < 2; r++) {
        for (const p of this.players) {
          if (!p.inHand) continue;
          this._dealQueue.push(p);
        }
      }

      // Start first deal
      this._phase = "DEAL_HOLE_ANIM";
      this._dealIndex = 0;
      this.dealNextHoleCard();
      return;
    }

    if (this._phase === "DEAL_HOLE_ANIM") {
      // waiting on animations (handled in update)
      return;
    }

    if (this._phase === "PREFLOP_ACTION") {
      this.setTag(this.phaseTag, "PREFLOP", "#ff2bd6");
      this.runActionRound();
      this._phase = "FLOP_DEAL";
      return;
    }

    if (this._phase === "FLOP_DEAL") {
      this.setTag(this.phaseTag, "FLOP", "#ff2bd6");
      this.community.push(...this.dealCommunity(3));
      this.renderCommunity();
      this._phase = "FLOP_ACTION";
      return;
    }

    if (this._phase === "FLOP_ACTION") {
      this.runActionRound();
      this._phase = "TURN_DEAL";
      return;
    }

    if (this._phase === "TURN_DEAL") {
      this.setTag(this.phaseTag, "TURN", "#ff2bd6");
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this._phase = "TURN_ACTION";
      return;
    }

    if (this._phase === "TURN_ACTION") {
      this.runActionRound();
      this._phase = "RIVER_DEAL";
      return;
    }

    if (this._phase === "RIVER_DEAL") {
      this.setTag(this.phaseTag, "RIVER", "#ff2bd6");
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this._phase = "RIVER_ACTION";
      return;
    }

    if (this._phase === "RIVER_ACTION") {
      this.runActionRound();
      this._phase = "SHOWDOWN";
      return;
    }

    if (this._phase === "SHOWDOWN") {
      // pick winner among those still in hand
      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(this._rng() * alive.length) | 0] : this.players[0];

      this.awardWinner(winner);
      this.eliminateIfBusted();

      this.handIndex++;
      this.pushLeaderboard();

      if (this.handIndex >= this.handsPerMatch) {
        const standings = [...this.players].sort((a, b) => b.stack - a.stack);
        this.onLeaderboard([
          "Boss Tournament — FINAL",
          `1) ${standings[0].name} — $${standings[0].stack}`,
          `2) ${standings[1].name} — $${standings[1].stack}`,
          `3) ${standings[2].name} — $${standings[2].stack}`,
          `4) ${standings[3].name} — $${standings[3].stack}`,
          `5) ${standings[4].name} — $${standings[4].stack}`,
        ]);
        // restart tournament after winner lap completes
        // (we restart on next StartNewHand(true) when lap ends)
        // For now we just keep going; stacks stay.
      }

      // after awardWinner we enter victory lap in update()
      this._phase = "VICTORY";
      return;
    }

    if (this._phase === "VICTORY") {
      // handled in update until lap ends
      return;
    }
  }

  dealNextHoleCard() {
    if (!this._dealQueue || this._dealIndex >= this._dealQueue.length) {
      // done dealing
      this._phase = "PREFLOP_ACTION";
      this.setTag(this.phaseTag, "PREFLOP", "#ff2bd6");
      return;
    }

    const p = this._dealQueue[this._dealIndex++];
    const cardBack = this.makeCardMesh({ r: "?", s: "?" }, false);
    cardBack.rotation.x = -Math.PI / 2;
    cardBack.visible = true;
    this.tableGroup.add(cardBack);

    const from = this.dealerPos.clone();
    const to = new THREE.Vector3(p.seatPos.x * 0.65, this.tableTopY + 0.03, p.seatPos.z * 0.65);

    this.startDealAnimation(cardBack, from, to, this.dealAnimSeconds, () => {
      // remove temp deal card
      this.tableGroup.remove(cardBack);

      // ensure hole cards are visible above head after each deal chunk
      this.renderHoleOverHead(p);

      // chain next
      this.dealNextHoleCard();
    });
  }

  runActionRound() {
    // Simple readable actions: fold/call/raise; show action on combined tag.
    for (const p of this.players) {
      if (!p.inHand || p.busted) continue;

      const roll = this._rng();

      if (roll < 0.14) {
        p.inHand = false;
        p.action = "FOLD";
        this.updateCombinedTag(p);
      } else if (roll < 0.30) {
        this.takeBet(p, 400, "RAISE 400");
      } else {
        this.takeBet(p, 200, "CALL 200");
      }
    }

    // After round, update pot tag
    this.setTag(this.potTag, `POT: $${this.pot}`, "#2bd7ff");
  }
  }
