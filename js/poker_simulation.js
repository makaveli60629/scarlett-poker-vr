// /js/poker_simulation.js — Watchable Poker Sim (8.2)
// Focus: spectator-friendly, stable, readable

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.5);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // pacing
    this.stepDelay = 1.15; // slower & readable
    this._t = 0;
    this._stateTimer = 0;

    // tournament
    this.handsPerMatch = 10;
    this.handIndex = 0;

    // chips
    this.startingStack = 20000;
    this.smallBlind = 100;
    this.bigBlind = 200;

    this.players = [];
    this.community = [];
    this.pot = 0;

    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    this._rng = Math.random;

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.communityHoverY = 1.35;
    this.nameHoverY = 1.75;
    this.cardsOverHeadY = 2.25;

    this._crown = null;
    this._winnerHold = 0;
  }

  async build(scene) {
    this.scene = scene;

    this.buildTable();
    this.buildPlayers();
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  buildTable() {
    const g = this.tableGroup;
    g.position.copy(this.tableCenter);

    const felt = new THREE.MeshStandardMaterial({ color: 0x145c3a, roughness: 0.95 });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.25, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.9 })
    );
    base.position.y = 0.35;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.15, 0.22, 48),
      felt
    );
    top.position.y = 1.05;

    // betting line ring (you requested a “pass line”)
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.045, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.7,
        roughness: 0.35
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = 1.09;

    g.add(base, top, line);

    // move table slightly forward so it never intersects back wall
    g.position.z = THREE.MathUtils.clamp(g.position.z, -12.5, 6);
  }

  buildPlayers() {
    const count = 4; // easy to expand
    const radius = 3.55; // chair ring radius

    const names = [
      "♠ King of Spades",
      "♠ Queen of Spades",
      "♠ Jack of Spades",
      "♠ Ace of Spades",
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // CHAIR placeholder
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 })
      );
      chair.position.copy(seatPos);
      chair.position.y = 0.28;

      // BOT placeholder (cylinder) — we align properly so bot touches seat
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.55, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.75 })
      );
      bot.position.copy(seatPos);

      // FIX: bot sits ON chair, not inside it
      bot.position.y = chair.position.y + 0.55; // tuned so bottom touches seat top

      // Face table center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // name tag
      const nameTag = this.makeTextTag(names[i], 0.42, "#00ffaa");
      nameTag.position.set(seatPos.x, this.nameHoverY, seatPos.z);

      // stack tag
      const stackTag = this.makeTextTag(`$${this.startingStack}`, 0.34, "#ffd27a");
      stackTag.position.set(seatPos.x, this.nameHoverY - 0.35, seatPos.z);

      // cards-over-head group
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);
      handGroup.visible = true; // you requested visible over head
      this.tableGroup.add(handGroup);

      // chip stack (left side of player)
      const chips = new THREE.Group();
      chips.position.set(seatPos.x - 0.35 * Math.cos(angle), 1.08, seatPos.z - 0.35 * Math.sin(angle));
      this.tableGroup.add(chips);

      this.tableGroup.add(chair, bot, nameTag, stackTag);

      this.players.push({
        i,
        name: names[i],
        seatPos,
        angle,
        chair,
        bot,
        nameTag,
        stackTag,
        handGroup,
        chips,
        stack: this.startingStack,
        inHand: true,
        busted: false,
        hole: [],
        action: "WAIT",
        bet: 0,
      });
    }
  }

  buildUI() {
    // Pot / action board raised higher so it’s visible from distance
    const potTag = this.makeTextTag("POT: $0", 0.62, "#2bd7ff");
    potTag.position.set(0, 2.15, 0);
    this.uiGroup.add(potTag);
    this._potTag = potTag;

    const actionTag = this.makeTextTag("ACTION", 0.48, "#ff2bd6");
    actionTag.position.set(0, 1.85, 0);
    this.uiGroup.add(actionTag);
    this._actionTag = actionTag;
  }

  makeTextTag(text, scale = 0.4, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
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
    mesh.userData.scale = scale;
    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    const { canvas, ctx, tex } = mesh.userData;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 84px Arial";
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 160);
    tex.needsUpdate = true;
  }

  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
      }
    }

    // Clear crown and winner hold
    this.clearCrown();

    this.pot = 0;
    this.community = [];
    this._phase = "PREFLOP";
    this._stateTimer = 0;

    // everyone still alive sits in
    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.action = "WAIT";
      p.hole = this.dealHole();
      this.renderHoleOverHead(p);
      this.refreshChips(p);
      this.updateStackTag(p);
    }

    // blinds
    this.postBlinds();

    this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
    this.setTag(this._actionTag, `HAND ${this.handIndex + 1}/${this.handsPerMatch}`, "#ff2bd6");

    // Leaderboard callback
    const standings = [...this.players].sort((a, b) => b.stack - a.stack);
    const lines = [
      `Boss Tournament — Hand ${this.handIndex + 1}/${this.handsPerMatch}`,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
      `4) ${standings[3].name} — $${standings[3].stack}`,
    ];
    this.onLeaderboard(lines);
  }

  dealHole() {
    // simple pseudo-deck
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const pick = () => ({ r: ranks[(Math.random()*ranks.length)|0], s: suits[(Math.random()*suits.length)|0] });
    return [pick(), pick()];
  }

  dealCommunity(n) {
    const cards = [];
    for (let i = 0; i < n; i++) cards.push(this.dealHole()[0]);
    return cards;
  }

  renderHoleOverHead(player) {
    // Clear previous
    while (player.handGroup.children.length) player.handGroup.remove(player.handGroup.children[0]);

    const makeCard = (c) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");

      // card body
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, 256, 384);

      // suit color
      const isRed = (c.s === "♥" || c.s === "♦");
      const suitColor = isRed ? "#d01818" : "#111111";

      // big rank & suit
      ctx.font = "bold 84px Arial";
      ctx.fillStyle = suitColor;
      ctx.fillText(c.r, 18, 92);

      ctx.font = "bold 92px Arial";
      ctx.fillText(c.s, 18, 175);

      // center suit
      ctx.font = "bold 140px Arial";
      ctx.globalAlpha = 0.85;
      ctx.fillText(c.s, 82, 260);
      ctx.globalAlpha = 1;

      // bottom mirrored
      ctx.save();
      ctx.translate(256, 384);
      ctx.rotate(Math.PI);
      ctx.font = "bold 84px Arial";
      ctx.fillText(c.r, 18, 92);
      ctx.font = "bold 92px Arial";
      ctx.fillText(c.s, 18, 175);
      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
      return mesh;
    };

    const c0 = makeCard(player.hole[0]);
    const c1 = makeCard(player.hole[1]);

    c0.position.set(-0.2, 0, 0);
    c1.position.set( 0.2, 0, 0);

    player.handGroup.add(c0, c1);
  }

  updateStackTag(p) {
    this.setTag(p.stackTag, `$${p.stack}`, "#ffd27a");
  }

  postBlinds() {
    // simplest blind posting by index
    const sb = this.players[this.handIndex % this.players.length];
    const bb = this.players[(this.handIndex + 1) % this.players.length];

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
    this.updateStackTag(p);
    this.refreshChips(p);
  }

  refreshChips(p) {
    // Clear chip stack and rebuild with colored piles
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    const denoms = [
      { v: 100,  c: 0xffffff },
      { v: 500,  c: 0xff2bd6 },
      { v: 1000, c: 0x2bd7ff },
      { v: 5000, c: 0xffd27a },
    ];

    let remaining = p.stack;
    let stackIndex = 0;

    for (const d of denoms.reverse()) {
      const count = Math.min(12, Math.floor(remaining / d.v));
      if (count <= 0) continue;

      remaining -= count * d.v;

      // make a small stack
      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.5, metalness: 0.2 })
        );
        chip.position.set(stackIndex * 0.09, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      stackIndex += 1.2;
    }
  }

  evaluateHandSimple(player) {
    // simple “hand type” flavor until full evaluator
    const r = player.hole[0].r;
    const r2 = player.hole[1].r;
    if (r === r2) return `Pair of ${r}s`;
    return "High Card";
  }

  awardWinner(winner) {
    // pot to winner
    winner.stack += this.pot;
    this.pot = 0;
    this.updateStackTag(winner);
    this.refreshChips(winner);

    // crown
    this.showCrown(winner);

    // leaderboard line: what they won
    const handType = this.evaluateHandSimple(winner);
    this.setTag(this._actionTag, `${winner.name} wins — ${handType}`, "#00ffaa");
  }

  showCrown(player) {
    this.clearCrown();

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.35,
        roughness: 0.3,
        metalness: 0.4,
      })
    );

    // Higher crown like you asked
    crown.position.copy(player.seatPos);
    crown.position.y = this.cardsOverHeadY + 0.65;

    const glow = new THREE.PointLight(0xffd27a, 0.85, 6);
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, player };
    this._winnerHold = 0; // hold timer resets
  }

  clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crown);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  eliminateIfBusted() {
    for (const p of this.players) {
      if (p.busted) continue;
      if (p.stack <= 0) {
        p.busted = true;
        p.inHand = false;

        // stand up and “walk away” (simple animation target)
        p._leaveTarget = new THREE.Vector3(0, p.bot.position.y, -12.8);
        this.setTag(p.nameTag, `${p.name} — OUT`, "#ff2bd6");
      }
    }
  }

  update(dt) {
    // Face tags and cards toward camera
    if (this.camera) {
      for (const p of this.players) {
        p.nameTag.lookAt(this.camera.position);
        p.stackTag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this._potTag.lookAt(this.camera.position);
      this._actionTag.lookAt(this.camera.position);
    }

    // Animate busted walk-away
    for (const p of this.players) {
      if (p._leaveTarget) {
        p.bot.position.lerp(p._leaveTarget, 0.01);
      }
    }

    // Crown hold + glow pulse
    if (this._crown) {
      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.8 * pulse;

      // keep crown above winner if they move
      this._crown.crown.position.copy(this._crown.player.seatPos);
      this._crown.crown.position.y = this.cardsOverHeadY + 0.65;
      this._crown.glow.position.copy(this._crown.crown.position);

      // Hold crown 60 seconds like you requested
      if (this._winnerHold > 60) {
        this.clearCrown();
      }
    }

    // Main sim pacing
    this._stateTimer += dt;
    if (this._stateTimer < this.stepDelay) return;
    this._stateTimer = 0;

    try {
      this.tick();
    } catch (e) {
      console.error("PokerSim tick error:", e);
      // Self-heal: restart hand
      this.setTag(this._actionTag, "SIM RESET (error recovered)", "#ff2bd6");
      this.startNewHand(false);
    }
  }

  tick() {
    // A simple watchable state machine (preflop->flop->turn->river->showdown)
    if (this._phase === "PREFLOP") {
      // fake actions: each player randomly calls/raises/folds
      for (const p of this.players) {
        if (!p.inHand) continue;
        const roll = this._rng();

        if (roll < 0.15) {
          p.inHand = false;
          p.action = "FOLD";
        } else if (roll < 0.30) {
          this.takeBet(p, 400, "RAISE 400");
        } else {
          this.takeBet(p, 200, "CALL 200");
        }
      }

      this._phase = "FLOP";
      this.community = this.dealCommunity(3);
      this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
      this.setTag(this._actionTag, "FLOP", "#ff2bd6");
      return;
    }

    if (this._phase === "FLOP") {
      this._phase = "TURN";
      this.community.push(...this.dealCommunity(1));
      this.setTag(this._actionTag, "TURN", "#ff2bd6");
      return;
    }

    if (this._phase === "TURN") {
      this._phase = "RIVER";
      this.community.push(...this.dealCommunity(1));
      this.setTag(this._actionTag, "RIVER", "#ff2bd6");
      return;
    }

    if (this._phase === "RIVER") {
      this._phase = "SHOWDOWN";

      // choose a winner among those in-hand (basic)
      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(Math.random() * alive.length) | 0] : this.players[0];

      this.awardWinner(winner);

      // Eliminate busts
      this.eliminateIfBusted();

      // advance hand count
      this.handIndex++;

      if (this.handIndex >= this.handsPerMatch) {
        // match winner = highest stack
        const standings = [...this.players].sort((a,b) => b.stack - a.stack);
        this.setTag(this._actionTag, `MATCH WINNER: ${standings[0].name}`, "#00ffaa");
        this.onLeaderboard([
          "Boss Tournament — FINAL",
          `1) ${standings[0].name} — $${standings[0].stack}`,
          `2) ${standings[1].name} — $${standings[1].stack}`,
          `3) ${standings[2].name} — $${standings[2].stack}`,
          `4) ${standings[3].name} — $${standings[3].stack}`,
        ]);

        // restart match
        this.startNewHand(true);
        return;
      }

      // start next hand (crown stays but clears at startNewHand)
      this.startNewHand(false);
      return;
    }

    if (this._phase === "SHOWDOWN") {
      // should not stay here
      this.startNewHand(false);
    }
  }
        }
