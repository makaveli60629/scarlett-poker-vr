// /js/poker_simulation.js — 9.0 Watchable Poker Sim (8 bots)
// Stable spectator sim: readable pacing, chips/pot, community cards, crown, walk-away.

import * as T from "./three.js";
const THREE = T;

import { Leaderboard } from "./leaderboard.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.8);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // pacing
    this.stepDelay = 1.25;
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
    this.cardsGroup = new THREE.Group();

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.communityHoverY = 1.55;
    this.nameHoverY = 2.15;
    this.cardsOverHeadY = 2.85;

    this._potTag = null;
    this._actionTag = null;

    this._crown = null;
    this._winnerHold = 0;

    // for walk cycles
    this._walkClock = 0;

    // simple RNG
    this._rng = Math.random;

    // lift to stop “under floor”
    this.floorY = 0;
    this.tableLiftY = 0.55;
  }

  async build(scene) {
    this.scene = scene;

    this.buildTable();
    this.buildPlayers(8);
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  buildTable() {
    const g = this.tableGroup;
    g.position.set(this.tableCenter.x, this.floorY + this.tableLiftY, this.tableCenter.z);

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

    // betting line ring (pass line)
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.18, 0.045, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.75,
        roughness: 0.35
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = 1.09;

    // pot marker base (invisible placeholder — no dealer object)
    const potSpot = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x000000, transparent:true, opacity:0.0 })
    );
    potSpot.rotation.x = -Math.PI/2;
    potSpot.position.y = 1.08;

    g.add(base, top, line, potSpot);

    // community cards group
    this.cardsGroup = new THREE.Group();
    this.cardsGroup.position.set(0, this.communityHoverY, 0);
    g.add(this.cardsGroup);
  }

  buildPlayers(count = 8) {
    const radius = 3.62;

    // Royal suit bosses
    const names = [
      "♠ King of Spades", "♠ Queen of Spades", "♠ Jack of Spades", "♠ Ace of Spades",
      "♥ King of Hearts", "♥ Queen of Hearts", "♦ King of Diamonds", "♣ King of Clubs",
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // chair
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.40, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x1c1d24, roughness: 0.95 })
      );
      chair.position.copy(seatPos);
      chair.position.y = 0.30; // relative to lifted tableGroup

      // bot (capsule)
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.62, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xa5adba, roughness: 0.75 })
      );
      bot.position.copy(seatPos);

      // FIX: bot sits ON chair (not inside)
      bot.position.y = chair.position.y + 0.62;

      // face center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // name tag (higher + readable)
      const nameTag = this.makeTextTag(names[i] || `Bot ${i+1}`, 0.44, "#00ffaa");
      nameTag.position.set(seatPos.x, this.nameHoverY, seatPos.z);

      const stackTag = this.makeTextTag(`$${this.startingStack}`, 0.34, "#ffd27a");
      stackTag.position.set(seatPos.x, this.nameHoverY - 0.34, seatPos.z);

      // hole cards over head (higher, no overlap)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);

      // chip stacks: left side of player (on table)
      const chips = new THREE.Group();
      const leftVec = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      chips.position.set(
        seatPos.x + leftVec.x * 0.52,
        1.08,
        seatPos.z + leftVec.z * 0.52
      );

      this.tableGroup.add(chair, bot, nameTag, stackTag, handGroup, chips);

      this.players.push({
        i,
        name: names[i] || `Bot ${i+1}`,
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
        bet: 0,
        action: "WAIT",
        walkMode: "SEATED", // SEATED | WALKING | WATCHING
        walkT: 0,
        baseBotY: bot.position.y
      });
    }
  }

  buildUI() {
    // Pot / action board raised high so visible from far
    this._potTag = this.makeTextTag("POT: $0", 0.68, "#2bd7ff");
    this._potTag.position.set(0, 2.35, 0);
    this.uiGroup.add(this._potTag);

    this._actionTag = this.makeTextTag("READY", 0.52, "#ff2bd6");
    this._actionTag.position.set(0, 2.02, 0);
    this.uiGroup.add(this._actionTag);
  }

  makeTextTag(text, scale = 0.4, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const draw = (t, c) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "900 84px system-ui";
      ctx.fillStyle = c;
      ctx.fillText(t, 40, 160);
    };

    draw(text, color);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8 * scale, 0.7 * scale), mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;
    mesh.userData.draw = draw;
    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    if (!mesh?.userData?.draw) return;
    mesh.userData.draw(text, color);
    mesh.userData.tex.needsUpdate = true;
  }

  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
        p.walkMode = "SEATED";
      }
      this.onLeaderboard(this._standingsLines("Boss Tournament — Hand 1/10"));
    }

    this.clearCrown();

    this.pot = 0;
    this.community = [];
    this._phase = "PREFLOP";
    this._stateTimer = 0;

    // reset per hand
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

    this.renderCommunity(); // starts empty
    this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
    this.setTag(this._actionTag, `HAND ${this.handIndex + 1}/${this.handsPerMatch}`, "#ff2bd6");
  }

  _standingsLines(title = "Boss Tournament") {
    const standings = [...this.players].sort((a, b) => b.stack - a.stack);
    const lines = [
      title,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
    ];
    return lines;
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
    while (player.handGroup.children.length) player.handGroup.remove(player.handGroup.children[0]);

    const c0 = this._makeCardMesh(player.hole[0]);
    const c1 = this._makeCardMesh(player.hole[1]);

    c0.position.set(-0.22, 0, 0);
    c1.position.set( 0.22, 0, 0);

    player.handGroup.add(c0, c1);
  }

  renderCommunity() {
    while (this.cardsGroup.children.length) this.cardsGroup.remove(this.cardsGroup.children[0]);

    const spacing = 0.40; // spread out more (you asked)
    const startX = -((this.community.length - 1) * spacing) / 2;

    for (let i = 0; i < this.community.length; i++) {
      const cm = this._makeCardMesh(this.community[i]);
      cm.position.set(startX + i * spacing, 0, 0);
      this.cardsGroup.add(cm);
    }
  }

  _makeCardMesh(c) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    // card body
    ctx.fillStyle = "#f7f7f8";
    ctx.fillRect(0, 0, 256, 384);

    const isRed = (c.s === "♥" || c.s === "♦");
    const suitColor = isRed ? "#d01818" : "#111111";

    // BIG rank + suit in corner (larger like you requested)
    ctx.font = "900 98px system-ui";
    ctx.fillStyle = suitColor;
    ctx.fillText(c.r, 16, 104);
    ctx.font = "900 112px system-ui";
    ctx.fillText(c.s, 18, 210);

    // center suit
    ctx.font = "900 170px system-ui";
    ctx.globalAlpha = 0.85;
    ctx.fillText(c.s, 88, 300);
    ctx.globalAlpha = 1;

    // mirror bottom
    ctx.save();
    ctx.translate(256, 384);
    ctx.rotate(Math.PI);
    ctx.font = "900 98px system-ui";
    ctx.fillText(c.r, 16, 104);
    ctx.font = "900 112px system-ui";
    ctx.fillText(c.s, 18, 210);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    return mesh;
  }

  updateStackTag(p) {
    this.setTag(p.stackTag, `$${p.stack}`, "#ffd27a");
  }

  postBlinds() {
    const alive = this.players.filter(p => !p.busted && p.stack > 0);
    if (alive.length < 2) return;

    const sb = alive[this.handIndex % alive.length];
    const bb = alive[(this.handIndex + 1) % alive.length];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");
  }

  takeBet(p, amount, label = "") {
    if (!p.inHand || p.busted) return;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;
    p.action = label ? label : `BET ${bet}`;
    this.updateStackTag(p);
    this.refreshChips(p);
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    const denoms = [
      { v: 100,  c: 0xffffff },
      { v: 500,  c: 0xff2bd6 },
      { v: 1000, c: 0x2bd7ff },
      { v: 5000, c: 0xffd27a },
    ];

    let remaining = p.stack;
    let col = 0;

    for (const d of denoms.slice().reverse()) {
      const count = Math.min(10, Math.floor(remaining / d.v));
      if (count <= 0) continue;
      remaining -= count * d.v;

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.45, metalness: 0.2 })
        );
        chip.position.set(col * 0.11, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      col += 1;
    }
  }

  evaluateHandFlavor(p) {
    const a = p.hole[0].r, b = p.hole[1].r;
    if (a === b) return `Pair of ${a}s`;
    return "High Card";
  }

  awardWinner(winner) {
    winner.stack += this.pot;
    this.pot = 0;
    this.updateStackTag(winner);
    this.refreshChips(winner);

    const flavor = this.evaluateHandFlavor(winner);
    this.setTag(this._actionTag, `${winner.name} wins — ${flavor}`, "#00ffaa");
    this.setTag(this._potTag, `POT: $0`, "#2bd7ff");

    this.showCrown(winner);
    this._winnerHold = 0;

    // winner walks around for a minute
    winner.walkMode = "WALKING";
    winner.walkT = 0;

    this.onLeaderboard(this._standingsLines(`Boss Tournament — Hand ${this.handIndex + 1}/${this.handsPerMatch}`));
    try { Leaderboard.update(0, null, this._standingsLines()); } catch {}
  }

  showCrown(p) {
    this.clearCrown();

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.35,
        roughness: 0.28,
        metalness: 0.4,
      })
    );

    crown.position.copy(p.seatPos);
    crown.position.y = this.cardsOverHeadY + 0.80; // higher (you asked)

    const glow = new THREE.PointLight(0xffd27a, 0.95, 7);
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, player: p };
  }

  clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crown);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  eliminateBusted() {
    for (const p of this.players) {
      if (p.busted) continue;
      if (p.stack <= 0) {
        p.busted = true;
        p.inHand = false;

        // walk away path
        p.walkMode = "WALKING";
        p.walkT = 0;

        this.setTag(p.nameTag, `${p.name} — OUT`, "#ff2bd6");
      }
    }
  }

  update(dt) {
    // face tags/cards to camera safely (avoid earlier crash)
    if (this.camera && typeof this.camera.getWorldPosition === "function") {
      const camPos = new THREE.Vector3();
      this.camera.getWorldPosition(camPos);

      for (const p of this.players) {
        p.nameTag.lookAt(camPos);
        p.stackTag.lookAt(camPos);
        p.handGroup.lookAt(camPos);
      }
      this._potTag.lookAt(camPos);
      this._actionTag.lookAt(camPos);
      this.cardsGroup.lookAt(camPos);
    }

    // crown pulse + keep on winner
    if (this._crown) {
      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.9 * pulse;

      this._crown.crown.position.copy(this._crown.player.bot.position);
      this._crown.crown.position.y = this.cardsOverHeadY + 0.85;
      this._crown.glow.position.copy(this._crown.crown.position);

      // after 60s, crown disappears before next cycle
      if (this._winnerHold > 60) this.clearCrown();
    }

    // bot walking (winners walk loop, losers walk out)
    this._walkClock += dt;
    for (const p of this.players) {
      if (p.walkMode !== "WALKING") continue;

      p.walkT += dt;

      const isOut = p.busted;
      const radius = isOut ? 8.5 : 1.3;
      const speed = isOut ? 0.55 : 0.75;

      // walk around in a small loop, then stop
      const ang = p.angle + p.walkT * speed;
      const cx = Math.cos(ang) * radius;
      const cz = Math.sin(ang) * radius;

      // move bot only (keeps seat positions stable)
      p.bot.position.x = p.seatPos.x + cx * 0.06;
      p.bot.position.z = p.seatPos.z + cz * 0.06;

      // if busted, drift farther away
      if (isOut) {
        p.bot.position.z -= 0.02 * p.walkT;
      }

      // stand height stable
      p.bot.position.y = p.baseBotY;

      // stop after 60 seconds for winner, 8 seconds for bust
      if (!isOut && p.walkT > 60) p.walkMode = "SEATED";
      if (isOut && p.walkT > 8) p.walkMode = "WATCHING";
    }

    // pacing
    this._stateTimer += dt;
    if (this._stateTimer < this.stepDelay) return;
    this._stateTimer = 0;

    try {
      this.tick();
    } catch (e) {
      console.error("PokerSim tick error:", e);
      this.setTag(this._actionTag, "SIM RESET (recovered)", "#ff2bd6");
      this.startNewHand(false);
    }
  }

  tick() {
    // PREFLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
    if (this._phase === "PREFLOP") {
      for (const p of this.players) {
        if (!p.inHand || p.busted) continue;

        const roll = this._rng();
        if (roll < 0.18) {
          p.inHand = false; // fold
        } else if (roll < 0.35) {
          this.takeBet(p, 600, "RAISE 600");
        } else {
          this.takeBet(p, 250, "CALL 250");
        }
      }
      this._phase = "FLOP";
      this.community = this.dealCommunity(3);
      this.renderCommunity();
      this.setTag(this._actionTag, "FLOP", "#ff2bd6");
      this.setTag(this._potTag, `POT: $${this.pot}`, "#2bd7ff");
      return;
    }

    if (this._phase === "FLOP") {
      this._phase = "TURN";
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.setTag(this._actionTag, "TURN", "#ff2bd6");
      return;
    }

    if (this._phase === "TURN") {
      this._phase = "RIVER";
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.setTag(this._actionTag, "RIVER", "#ff2bd6");
      return;
    }

    if (this._phase === "RIVER") {
      this._phase = "SHOWDOWN";

      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(Math.random() * alive.length) | 0] : this.players.find(p => !p.busted) || this.players[0];

      this.awardWinner(winner);
      this.eliminateBusted();

      this.handIndex++;

      if (this.handIndex >= this.handsPerMatch) {
        const standings = [...this.players].sort((a,b)=>b.stack-a.stack);
        this.setTag(this._actionTag, `MATCH WINNER: ${standings[0].name}`, "#00ffaa");
        this.onLeaderboard(this._standingsLines("Boss Tournament — FINAL"));
        this.startNewHand(true);
        return;
      }

      this.startNewHand(false);
      return;
    }

    // safety
    if (this._phase === "SHOWDOWN") this.startNewHand(false);
  }
}
