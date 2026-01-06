// /js/poker_simulation.js — Watchable Poker Sim (9.0 Fix Pack A)
// - 8 bots
// - startingStack = 1000
// - slow + readable
// - chairs + bots seated correctly
// - chips appear ON TABLE near each seat
// - unified action screen above community: street + pot + whose turn + bet
// - turn glow on acting player
// - crown stays 60s, winner walks a bit

import * as THREE from "./three.js";
import { TextureBank, Textures } from "./textures.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.8);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // pacing
    this.stepDelay = 1.35;         // slower actions
    this.thinkDelay = 0.8;         // pause between actors
    this._stateTimer = 0;
    this._thinkTimer = 0;

    // match
    this.handsPerMatch = 12;
    this.handIndex = 0;

    // chips
    this.startingStack = 1000;     // YOU REQUESTED
    this.smallBlind = 10;
    this.bigBlind = 20;

    this.players = [];
    this.community = [];
    this.pot = 0;

    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    this._rng = Math.random;

    // visuals
    this.cardSize = { w: 0.32, h: 0.46 };
    this.tableTopY = 0.92;         // lowered table
    this.communityY = this.tableTopY + 0.20;
    this.uiY = this.tableTopY + 0.70;

    this.nameY = 1.92;
    this.cardsOverHeadY = 2.30;

    this._crown = null;
    this._winnerHold = 0;

    // action state
    this._phase = "PREFLOP";
    this._actorIndex = 0;
    this._dealerIndex = 0;

    // meshes
    this._actionScreen = null;
    this._communityGroup = null;
    this._potChipsGroup = null;
  }

  async build(scene) {
    this.scene = scene;

    this.buildTable();
    this.buildPlayers(8);
    this.buildCommunity();
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  // ---------- TABLE ----------
  buildTable() {
    const g = this.tableGroup;
    g.position.copy(this.tableCenter);

    // felt texture
    const feltMat = TextureBank.standard({
      mapFile: Textures.TABLE_FELT_GREEN || "table_felt_green.jpg",
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      repeat: [2, 2]
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.15, 0.6, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95 })
    );
    base.position.y = 0.30;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.95, 3.05, 0.18, 64),
      feltMat
    );
    top.position.y = this.tableTopY;

    // leather trim ring
    const trimMat = TextureBank.standard({
      mapFile: Textures.TABLE_LEATHER_TRIM || "Table leather trim.jpg",
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.10,
      repeat: [4, 1]
    });

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.02, 0.12, 16, 120),
      trimMat
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = this.tableTopY + 0.03;

    // pass line
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
    line.position.y = this.tableTopY + 0.06;

    g.add(base, top, trim, line);
  }

  // ---------- PLAYERS ----------
  buildPlayers(count = 8) {
    const radius = 3.65;

    const suits = ["♠", "♥", "♦", "♣"];
    const royals = ["King", "Queen", "Jack", "Ace"];

    const names = [];
    for (const s of suits) for (const r of royals) names.push(`${s} ${r}`);

    // BOT look: pill + colored band so they don't look plain
    const botBodyGeo = new THREE.CapsuleGeometry(0.19, 0.58, 7, 12);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // chair (simple + looks like chair)
      const chairMat = TextureBank.standard({
        mapFile: Textures.SOFA_DIFF || "sofa_02_diff_4k.jpg",
        color: 0x3a3a44,
        roughness: 0.95,
        metalness: 0.05,
        repeat: [1, 1]
      });

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.62), chairMat);
      chair.position.copy(seatPos);
      chair.position.y = 0.28;

      // chair back
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.12), chairMat);
      back.position.copy(seatPos);
      back.position.y = 0.75;
      back.position.x += Math.cos(angle) * -0.24;
      back.position.z += Math.sin(angle) * -0.24;

      // bot body
      const colorSet = [0x2bd7ff, 0xff2bd6, 0xffd27a, 0x00ffaa, 0x9aa1ff, 0xff8a2b, 0x7cff2b, 0xffffff];
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x9aa1ab,
        roughness: 0.65,
        metalness: 0.05
      });

      const bot = new THREE.Mesh(botBodyGeo, bodyMat);
      bot.position.copy(seatPos);

      // FIX: bot sits ON chair
      const seatTopY = chair.position.y + 0.275;
      bot.position.y = seatTopY + 0.60;

      // colored chest band
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.025, 10, 36),
        new THREE.MeshStandardMaterial({
          color: colorSet[i % colorSet.length],
          emissive: colorSet[i % colorSet.length],
          emissiveIntensity: 0.45,
          roughness: 0.35
        })
      );
      band.position.copy(bot.position);
      band.position.y -= 0.12;
      band.rotation.x = Math.PI / 2;

      // face table center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // name+stack combined tag (ONE PANEL so it’s readable)
      const tag = this.makeTextTag(`${names[i]}   |   $${this.startingStack}`, 0.52);
      tag.position.set(seatPos.x, this.nameY, seatPos.z);

      // cards-over-head group (visible but not blocking tag)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);
      handGroup.visible = true;

      // chips ON TABLE in front of seat (not floating)
      const chips = new THREE.Group();
      const chipX = seatPos.x + Math.cos(angle) * -0.55;
      const chipZ = seatPos.z + Math.sin(angle) * -0.55;
      chips.position.set(chipX, this.tableTopY + 0.02, chipZ);

      // turn glow ring around seat
      const turnRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.03, 10, 42),
        new THREE.MeshStandardMaterial({
          color: 0x00ffaa,
          emissive: 0x00ffaa,
          emissiveIntensity: 0.0,
          roughness: 0.35
        })
      );
      turnRing.rotation.x = Math.PI / 2;
      turnRing.position.set(seatPos.x, this.tableTopY + 0.06, seatPos.z);

      this.tableGroup.add(chair, back, bot, band, tag, handGroup, chips, turnRing);

      this.players.push({
        i,
        name: names[i],
        seatPos,
        angle,
        chair,
        bot,
        band,
        tag,
        handGroup,
        chips,
        turnRing,
        stack: this.startingStack,
        inHand: true,
        busted: false,
        hole: [],
        action: "WAIT",
        bet: 0,
      });
    }
  }

  // ---------- COMMUNITY CARDS ----------
  buildCommunity() {
    this._communityGroup = new THREE.Group();
    this._communityGroup.position.set(0, this.communityY, 0);
    this.tableGroup.add(this._communityGroup);

    // pot chips stack under action screen
    this._potChipsGroup = new THREE.Group();
    this._potChipsGroup.position.set(0, this.tableTopY + 0.03, 0.62);
    this.tableGroup.add(this._potChipsGroup);
  }

  // ---------- UI (one screen above community cards) ----------
  buildUI() {
    this._actionScreen = this.makeActionScreen();
    this._actionScreen.position.set(0, this.uiY, 0.0);
    this.uiGroup.add(this._actionScreen);
  }

  makeActionScreen() {
    const panel = this.makeTextTag("POT $0 | PREFLOP | DEALER: — | TURN: — | BET: —", 0.55);
    panel.userData.isActionScreen = true;
    return panel;
  }

  makeTextTag(text, scale = 0.5) {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // glassy black
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // gold border
    ctx.strokeStyle = "rgba(255,210,122,0.95)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.font = "bold 78px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 40, 170);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2 * scale, 0.62 * scale), mat);
    mesh.userData = { canvas, ctx, tex };
    return mesh;
  }

  setTag(mesh, text) {
    const { canvas, ctx, tex } = mesh.userData;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,210,122,0.95)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.font = "bold 78px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 40, 170);

    tex.needsUpdate = true;
  }

  // ---------- GAME FLOW ----------
  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
      }
    }

    this.clearCrown();

    this.pot = 0;
    this.community = [];
    this._phase = "PREFLOP";
    this._actorIndex = (this._dealerIndex + 1) % this.players.length;
    this._stateTimer = 0;
    this._thinkTimer = 0;

    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.action = "WAIT";
      p.hole = this.dealHole();
      this.renderHoleOverHead(p);
      this.refreshChips(p);
      this.updatePlayerTag(p);
      this.setTurnGlow(p, false);
    }

    this.postBlinds();
    this.refreshPotChips();

    this.updateActionScreen("PREFLOP", null, "BLINDS");
    this.updateLeaderboard();
  }

  updatePlayerTag(p) {
    this.setTag(p.tag, `${p.name}   |   $${p.stack}`);
  }

  updateActionScreen(street, actorName, betText) {
    const dealer = this.players[this._dealerIndex]?.name || "—";
    const turn = actorName || "—";
    const bet = betText || "—";
    this.setTag(this._actionScreen, `POT $${this.pot} | ${street} | DEALER: ${dealer} | TURN: ${turn} | BET: ${bet}`);
  }

  updateLeaderboard() {
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

  setTurnGlow(p, on) {
    if (!p.turnRing) return;
    const mat = p.turnRing.material;
    mat.emissiveIntensity = on ? 1.2 : 0.0;
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

    const makeCard = (c) => {
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
    };

    const c0 = makeCard(player.hole[0]);
    const c1 = makeCard(player.hole[1]);

    // offset so it doesn't block the tag
    c0.position.set(-0.18, 0, 0);
    c1.position.set( 0.18, 0, 0);

    player.handGroup.add(c0, c1);
  }

  renderCommunity() {
    while (this._communityGroup.children.length) this._communityGroup.remove(this._communityGroup.children[0]);

    const makeCard = (c) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 384);

      const isRed = (c.s === "♥" || c.s === "♦");
      const suitColor = isRed ? "#d01818" : "#111111";

      ctx.font = "bold 88px Arial";
      ctx.fillStyle = suitColor;
      ctx.fillText(c.r, 18, 96);

      ctx.font = "bold 96px Arial";
      ctx.fillText(c.s, 18, 184);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      return new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    };

    const startX = -0.72;
    for (let i = 0; i < this.community.length; i++) {
      const card = makeCard(this.community[i]);
      card.position.set(startX + i * 0.36, 0, 0);
      this._communityGroup.add(card);
    }
  }

  postBlinds() {
    const sb = this.players[(this._dealerIndex + 1) % this.players.length];
    const bb = this.players[(this._dealerIndex + 2) % this.players.length];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");
  }

  takeBet(p, amount, label = "") {
    if (!p.inHand) return;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;
    p.action = label ? `${label} ${bet}` : `BET ${bet}`;
    this.updatePlayerTag(p);
    this.refreshChips(p);
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    const denoms = [
      { v: 10,  c: 0xffffff },
      { v: 50,  c: 0xff2bd6 },
      { v: 100, c: 0x2bd7ff },
      { v: 500, c: 0xffd27a },
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
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.45, metalness: 0.15 })
        );
        chip.position.set(stackIndex * 0.10, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      stackIndex += 1.15;
    }
  }

  refreshPotChips() {
    while (this._potChipsGroup.children.length) this._potChipsGroup.remove(this._potChipsGroup.children[0]);

    const stacks = Math.min(6, Math.max(1, Math.floor(this.pot / 50)));
    for (let s = 0; s < stacks; s++) {
      const pile = new THREE.Group();
      const chips = 8 + (s % 3) * 3;
      for (let i = 0; i < chips; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18),
          new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.25 })
        );
        chip.position.set(0, 0.02 + i * 0.022, 0);
        pile.add(chip);
      }
      pile.position.set((s - (stacks - 1) / 2) * 0.14, 0, 0);
      this._potChipsGroup.add(pile);
    }
  }

  evaluateHandSimple(player) {
    const r = player.hole[0].r;
    const r2 = player.hole[1].r;
    if (r === r2) return `Pair of ${r}s`;
    return "High Card";
  }

  awardWinner(winner) {
    winner.stack += this.pot;
    const won = this.pot;
    this.pot = 0;

    this.updatePlayerTag(winner);
    this.refreshChips(winner);
    this.refreshPotChips();

    const handType = this.evaluateHandSimple(winner);
    this.updateActionScreen("SHOWDOWN", winner.name, `WINS ${won} (${handType})`);

    this.showCrown(winner);
  }

  showCrown(player) {
    this.clearCrown();

    const crownTexMat = TextureBank.standard({
      mapFile: Textures.CROWN || "Crown.jpg",
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.2,
      repeat: [1, 1]
    });

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.24, 14),
      crownTexMat
    );

    crown.position.copy(player.seatPos);
    crown.position.y = this.cardsOverHeadY + 0.70;

    const glow = new THREE.PointLight(0xffd27a, 0.9, 7);
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, player };
    this._winnerHold = 0;

    // make winner walk slightly for 1 minute (small loop)
    player._victoryWalk = 0;
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
        p._leaveTarget = new THREE.Vector3(p.seatPos.x * 1.35, p.bot.position.y, -12.8);
        this.setTag(p.tag, `${p.name}   |   OUT`);
      }
    }
  }

  // ---------- UPDATE LOOP ----------
  update(dt) {
    // face tags/cards to camera
    if (this.camera) {
      for (const p of this.players) {
        p.tag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this._actionScreen.lookAt(this.camera.position);
      this._communityGroup.lookAt(this.camera.position);
    }

    // busted walk-away
    for (const p of this.players) {
      if (p._leaveTarget) {
        p.bot.position.lerp(p._leaveTarget, 0.01);
        p.band.position.lerp(new THREE.Vector3(p._leaveTarget.x, p._leaveTarget.y - 0.12, p._leaveTarget.z), 0.01);
      }
    }

    // winner victory walk (tiny loop near seat)
    if (this._crown) {
      const p = this._crown.player;
      p._victoryWalk = (p._victoryWalk || 0) + dt;
      const wob = Math.sin(p._victoryWalk * 1.5) * 0.08;
      p.bot.position.x = p.seatPos.x + wob;
      p.band.position.x = p.bot.position.x;

      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.85 * pulse;

      this._crown.crown.position.copy(p.bot.position);
      this._crown.crown.position.y = this.cardsOverHeadY + 0.70;
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
      this.updateActionScreen("RESET", null, "RECOVERED");
      this.startNewHand(false);
    }
  }

  tick() {
    // Think pause per actor
    if (this._thinkTimer > 0) {
      this._thinkTimer -= 1;
      return;
    }

    // clear all glows
    for (const p of this.players) this.setTurnGlow(p, false);

    // Determine actor
    const actor = this.players[this._actorIndex];
    if (!actor || actor.busted) {
      this._actorIndex = (this._actorIndex + 1) % this.players.length;
      return;
    }

    // show actor glow
    this.setTurnGlow(actor, true);

    if (this._phase === "PREFLOP") {
      // one actor acts per tick (readable)
      const roll = this._rng();

      let actionText = "CHECK";
      if (!actor.inHand) {
        actionText = "SKIP";
      } else if (roll < 0.18) {
        actor.inHand = false;
        actionText = "FOLD";
      } else if (roll < 0.35) {
        this.takeBet(actor, 40, "RAISE");
        actionText = "RAISE 40";
      } else {
        this.takeBet(actor, 20, "CALL");
        actionText = "CALL 20";
      }

      this.refreshPotChips();
      this.updateActionScreen("PREFLOP", actor.name, actionText);

      // advance actor
      this._actorIndex = (this._actorIndex + 1) % this.players.length;
      this._thinkTimer = this.thinkDelay;

      // after full loop, go to flop
      if (this._actorIndex === (this._dealerIndex + 1) % this.players.length) {
        this._phase = "FLOP";
        this.community = this.dealCommunity(3);
        this.renderCommunity();
        this.updateActionScreen("FLOP", null, "DEAL 3");
        this._thinkTimer = 1.2;
      }
      return;
    }

    if (this._phase === "FLOP") {
      this._phase = "TURN";
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.updateActionScreen("TURN", null, "DEAL 1");
      this._thinkTimer = 1.2;
      return;
    }

    if (this._phase === "TURN") {
      this._phase = "RIVER";
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.updateActionScreen("RIVER", null, "DEAL 1");
      this._thinkTimer = 1.2;
      return;
    }

    if (this._phase === "RIVER") {
      this._phase = "SHOWDOWN";

      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(Math.random() * alive.length) | 0] : this.players[0];

      this.awardWinner(winner);
      this.eliminateIfBusted();

      this.handIndex++;
      this.updateLeaderboard();

      // move dealer
      this._dealerIndex = (this._dealerIndex + 1) % this.players.length;
      this._actorIndex = (this._dealerIndex + 1) % this.players.length;

      if (this.handIndex >= this.handsPerMatch) {
        const standings = [...this.players].sort((a,b) => b.stack - a.stack);
        this.updateActionScreen("FINAL", standings[0].name, "MATCH WINNER");
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
