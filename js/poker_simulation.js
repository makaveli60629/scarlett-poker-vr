// /js/poker_simulation.js — Update 9.0
// Watchable Poker Sim (spectator-first), 8 bots, $25k stacks, slower pacing,
// cards above heads (no tag blocking), community cards hover and face camera,
// bust players stand + walk out.

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;
    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.6);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // pacing (slower + readable)
    this.stepDelay = 1.75;
    this._stateTimer = 0;

    // tournament
    this.handsPerMatch = 12;
    this.handIndex = 0;

    // chips
    this.startingStack = 25000;  // ✅ your request
    this.smallBlind = 250;
    this.bigBlind = 500;

    this.players = [];
    this.community = [];
    this.pot = 0;

    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    // visuals
    this.cardSize = { w: 0.30, h: 0.42 };
    this.communityHoverY = 1.45;
    this.tagHoverY = 1.92;
    this.cardsOverHeadY = 2.35;

    // crown
    this._crown = null;
    this._winnerHold = 0;

    // dealing animation queue
    this._animCards = [];
    this._phase = "IDLE";
  }

  async build(scene) {
    this.scene = scene;

    this.buildTableAnchor();
    this.buildPlayers(8);
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  buildTableAnchor() {
    this.tableGroup.position.copy(this.tableCenter);
  }

  buildPlayers(count = 8) {
    const radius = 3.85;

    const names = [
      "♠ King of Spades", "♠ Queen of Spades", "♠ Jack of Spades", "♠ Ace of Spades",
      "♥ King of Hearts", "♥ Queen of Hearts", "♥ Jack of Hearts", "♥ Ace of Hearts",
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // chair (simple but aligned to ground)
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.62, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x232329, roughness: 0.95 })
      );
      chair.position.copy(seatPos);
      chair.position.y = 0.31;

      // bot (capsule)
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.19, 0.62, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.65 })
      );
      bot.position.copy(seatPos);

      // ✅ sit ON chair (touch top)
      bot.position.y = chair.position.y + 0.62;

      // Face table center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // Combined tag (name + stack + action) so it’s readable
      const tag = this.makeTag(`${names[i]}\n$${this.startingStack}\nWAIT`, 0.60);
      tag.position.set(seatPos.x, this.tagHoverY, seatPos.z);

      // cards-over-head group (above tag so it doesn't block)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);
      this.tableGroup.add(handGroup);

      // chips pile near player
      const chips = new THREE.Group();
      chips.position.set(seatPos.x - 0.36 * Math.cos(angle), 1.10, seatPos.z - 0.36 * Math.sin(angle));
      this.tableGroup.add(chips);

      this.tableGroup.add(chair, bot, tag);

      this.players.push({
        i,
        name: names[i],
        angle,
        seatPos,
        chair,
        bot,
        tag,
        handGroup,
        chips,
        stack: this.startingStack,
        inHand: true,
        busted: false,
        hole: [],
        action: "WAIT",
        bet: 0,
        _leaveTarget: null
      });
    }
  }

  buildUI() {
    // POT (tiny, above community)
    this._potTag = this.makeTag("POT: $0", 0.46, "#2bd7ff");
    this._potTag.position.set(0, 1.78, 0);
    this.uiGroup.add(this._potTag);

    // PHASE/ACTION (tiny, above pot)
    this._phaseTag = this.makeTag("READY", 0.40, "#ff2bd6");
    this._phaseTag.position.set(0, 2.02, 0);
    this.uiGroup.add(this._phaseTag);

    // community cards group
    this._communityGroup = new THREE.Group();
    this._communityGroup.position.set(0, this.communityHoverY, 0);
    this.tableGroup.add(this._communityGroup);
  }

  makeTag(text, scale = 0.55, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2 * scale, 1.0 * scale), mat);

    mesh.userData = { canvas, ctx, tex, scale, color };
    this.setTag(mesh, text, color);
    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    const { canvas, ctx, tex } = mesh.userData;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,210,122,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = color;
    ctx.font = "bold 72px Arial";

    const lines = String(text).split("\n");
    let y = 105;
    for (const line of lines.slice(0, 5)) {
      ctx.fillText(line, 50, y);
      y += 92;
    }

    tex.needsUpdate = true;
  }

  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
        p._leaveTarget = null;
      }
    }

    this.clearCrown();

    this.pot = 0;
    this.community = [];
    this._phase = "DEAL_HOLE";
    this._stateTimer = 0;
    this._animCards.length = 0;

    // reset player state
    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.action = "WAIT";
      p.hole = this.dealHole();
      this.renderHoleOverHead(p);      // visible above head
      this.refreshChips(p);
      this.updateTag(p);
    }

    // clear community visuals
    while (this._communityGroup.children.length) this._communityGroup.remove(this._communityGroup.children[0]);

    // blinds
    this.postBlinds();

    this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
    this.setTag(this._phaseTag, `HAND ${this.handIndex + 1}/${this.handsPerMatch} — DEAL`, "#ff2bd6");

    this.pushLeaderboard();
  }

  pushLeaderboard() {
    const standings = [...this.players].sort((a, b) => b.stack - a.stack);
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

    const c0 = this.makeCardFace(player.hole[0]);
    const c1 = this.makeCardFace(player.hole[1]);

    c0.position.set(-0.18, 0, 0);
    c1.position.set( 0.18, 0, 0);

    player.handGroup.add(c0, c1);
  }

  makeCardFace(c) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, 256, 384);

    const isRed = (c.s === "♥" || c.s === "♦");
    const suitColor = isRed ? "#d01818" : "#111111";

    ctx.font = "bold 84px Arial";
    ctx.fillStyle = suitColor;
    ctx.fillText(c.r, 18, 92);

    ctx.font = "bold 92px Arial";
    ctx.fillText(c.s, 18, 175);

    ctx.font = "bold 140px Arial";
    ctx.globalAlpha = 0.85;
    ctx.fillText(c.s, 82, 260);
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex });
    return new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
  }

  updateTag(p) {
    const text = `${p.name}\n$${p.stack}\n${p.action}`;
    this.setTag(p.tag, text, "#ffffff");
  }

  postBlinds() {
    const alive = this.players.filter(p => !p.busted);
    if (alive.length < 2) return;

    const sb = alive[this.handIndex % alive.length];
    const bb = alive[(this.handIndex + 1) % alive.length];

    this.takeBet(sb, this.smallBlind, `SB $${this.smallBlind}`);
    this.takeBet(bb, this.bigBlind, `BB $${this.bigBlind}`);
  }

  takeBet(p, amount, label = "") {
    if (!p.inHand) return;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;
    p.action = label || `BET $${bet}`;
    this.updateTag(p);
    this.refreshChips(p);
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    // big visible piles (includes your 5000 denom)
    const denoms = [
      { v: 100,  c: 0xffffff },
      { v: 500,  c: 0xff2bd6 },
      { v: 1000, c: 0x2bd7ff },
      { v: 5000, c: 0xffd27a }, // ✅ 5000 chip style
    ];

    let remaining = p.stack;
    let stackIndex = 0;

    for (const d of denoms.reverse()) {
      const count = Math.min(14, Math.floor(remaining / d.v));
      if (count <= 0) continue;
      remaining -= count * d.v;

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.074, 0.074, 0.02, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.45, metalness: 0.22 })
        );
        chip.position.set(stackIndex * 0.10, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      stackIndex += 1.2;
    }
  }

  showCommunity(cards) {
    while (this._communityGroup.children.length) this._communityGroup.remove(this._communityGroup.children[0]);

    const spacing = 0.36;
    const total = (cards.length - 1) * spacing;
    cards.forEach((c, idx) => {
      const card = this.makeCardFace(c);
      card.position.set(-total / 2 + idx * spacing, 0, 0);
      this._communityGroup.add(card);
    });
  }

  evaluateHandSimple(player) {
    const r = player.hole[0].r;
    const r2 = player.hole[1].r;
    if (r === r2) return `Pair of ${r}s`;
    return "High Card";
  }

  awardWinner(winner) {
    winner.stack += this.pot;
    this.pot = 0;
    winner.action = "WIN";
    this.updateTag(winner);
    this.refreshChips(winner);

    this.showCrown(winner);

    const handType = this.evaluateHandSimple(winner);
    this.setTag(this._phaseTag, `${winner.name} wins — ${handType}`, "#00ffaa");
    this.setTag(this._potTag, `POT: $0`, "#2bd7ff");
  }

  showCrown(player) {
    this.clearCrown();

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.35,
        roughness: 0.25,
        metalness: 0.45,
      })
    );

    crown.position.copy(player.seatPos);
    crown.position.y = this.cardsOverHeadY + 0.72;

    const glow = new THREE.PointLight(0xffd27a, 0.85, 7);
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, player };
    this._winnerHold = 0;
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

        // stand up (raise bot a little) + walk out
        p.bot.position.y = 1.25;
        p._leaveTarget = new THREE.Vector3(0, p.bot.position.y, -12.8);

        p.action = "OUT";
        this.updateTag(p);
      }
    }
  }

  update(dt) {
    // face tags/cards toward camera
    if (this.camera) {
      for (const p of this.players) {
        p.tag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this._potTag.lookAt(this.camera.position);
      this._phaseTag.lookAt(this.camera.position);
      this._communityGroup.lookAt(this.camera.position);
    }

    // busted walk-away
    for (const p of this.players) {
      if (p._leaveTarget) {
        p.bot.position.lerp(p._leaveTarget, 0.012);
      }
    }

    // crown hold + pulse (hold ~60s)
    if (this._crown) {
      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.8 * pulse;

      // keep crown above winner
      this._crown.crown.position.copy(this._crown.player.seatPos);
      this._crown.crown.position.y = this.cardsOverHeadY + 0.72;
      this._crown.glow.position.copy(this._crown.crown.position);

      if (this._winnerHold > 60) this.clearCrown();
    }

    // pacing
    this._stateTimer += dt;
    if (this._stateTimer < this.stepDelay) return;
    this._stateTimer = 0;

    try {
      this.tick();
    } catch (e) {
      console.error("PokerSim tick error:", e);
      this.setTag(this._phaseTag, "SIM RESET (recovered)", "#ff2bd6");
      this.startNewHand(false);
    }
  }

  tick() {
    // phases: PREFLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
    if (this._phase === "DEAL_HOLE") {
      this._phase = "PREFLOP";
      this.setTag(this._phaseTag, "PREFLOP — BETTING", "#ff2bd6");
      return;
    }

    if (this._phase === "PREFLOP") {
      for (const p of this.players) {
        if (!p.inHand) continue;

        const roll = Math.random();
        if (roll < 0.14) {
          p.inHand = false;
          p.action = "FOLD";
          this.updateTag(p);
        } else if (roll < 0.30) {
          this.takeBet(p, 1000, "RAISE $1000");
        } else {
          this.takeBet(p, 500, "CALL $500");
        }
      }

      this._phase = "FLOP";
      this.community = this.dealCommunity(3);
      this.showCommunity(this.community);
      this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
      this.setTag(this._phaseTag, "FLOP — BETTING", "#ff2bd6");
      return;
    }

    if (this._phase === "FLOP") {
      this._phase = "TURN";
      this.community.push(...this.dealCommunity(1));
      this.showCommunity(this.community);
      this.setTag(this._phaseTag, "TURN — BETTING", "#ff2bd6");
      return;
    }

    if (this._phase === "TURN") {
      this._phase = "RIVER";
      this.community.push(...this.dealCommunity(1));
      this.showCommunity(this.community);
      this.setTag(this._phaseTag, "RIVER — BETTING", "#ff2bd6");
      return;
    }

    if (this._phase === "RIVER") {
      this._phase = "SHOWDOWN";

      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(Math.random() * alive.length) | 0] : this.players[0];

      this.awardWinner(winner);
      this.eliminateIfBusted();

      this.handIndex++;
      this.pushLeaderboard();

      if (this.handIndex >= this.handsPerMatch) {
        const standings = [...this.players].sort((a,b) => b.stack - a.stack);
        this.setTag(this._phaseTag, `MATCH WINNER: ${standings[0].name}`, "#00ffaa");
        this.onLeaderboard([
          "Boss Tournament — FINAL",
          `1) ${standings[0].name} — $${standings[0].stack}`,
          `2) ${standings[1].name} — $${standings[1].stack}`,
          `3) ${standings[2].name} — $${standings[2].stack}`,
          `4) ${standings[3].name} — $${standings[3].stack}`,
          `5) ${standings[4].name} — $${standings[4].stack}`,
        ]);

        this.startNewHand(true);
        return;
      }

      // next hand
      this.startNewHand(false);
      return;
    }

    if (this._phase === "SHOWDOWN") {
      this.startNewHand(false);
    }
  }
      }
