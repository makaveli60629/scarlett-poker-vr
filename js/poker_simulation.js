// /js/poker_simulation.js — Update 9.0 Fix Pack (No Textures import)
// Spectator-friendly poker sim: slow pacing, 8 bots, crown, bust/leave, pot chips.
// Uses local ./three.js + TextureBank with direct filenames in /assets/textures/.

import * as THREE from "./three.js";
import { TextureBank } from "./textures.js";

export class PokerSimulation {
  constructor(opts = {}) {
    // external references
    this.scene = null;
    this.camera = opts.camera || null;

    // placement
    this.tableCenter = (opts.tableCenter || new THREE.Vector3(0, 0, -4.8)).clone();

    // callbacks
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // gameplay tuning
    this.playerCount = 8;
    this.handsPerMatch = 999999; // basically endless
    this.handIndex = 0;

    // stacks: default to 1000 per your last request (fast bust + leave)
    // You can override when you construct: new PokerSimulation({ startingStack: 25000 })
    this.startingStack = opts.startingStack ?? 1000;

    this.smallBlind = opts.smallBlind ?? 25;
    this.bigBlind = opts.bigBlind ?? 50;

    // pacing (seconds)
    this.stepDelay = opts.stepDelay ?? 1.15;       // each state tick
    this.dealAnimTime = opts.dealAnimTime ?? 0.65; // card travel time
    this.turnPause = opts.turnPause ?? 0.65;       // thinking pause

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.nameTagY = 1.95;
    this.cardsOverHeadY = 2.45;
    this.communityY = 1.30;
    this.hudY = 1.92;

    // state
    this.players = [];
    this.community = [];
    this.pot = 0;

    this._phase = "INIT";
    this._phaseTimer = 0;
    this._animTimer = 0;

    // groups
    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();

    // center pot chips
    this.potChips = new THREE.Group();

    // crown
    this._crown = null;
    this._winnerHold = 0;

    // rng
    this._rng = Math.random;

    // filenames (direct, from your assets/textures list)
    this.files = {
      CARD_BACK: "Card back.jpg",
      FELT: "table_felt_green.jpg",
      LEATHER: "Table leather trim.jpg",
      CHIP_1000: "chip_1000.jpg",
      CHIP_5000: "chip_5000.jpg",
      CHIP_10000: "chip_10000.jpg",
      CROWN: "Crown.jpg", // used as optional texture (crown mesh still works without)
    };

    // dealer/turn highlighting
    this._dealerIndex = 0;
    this._turnIndex = 0;

    // community meshes
    this._communityGroup = new THREE.Group();

    // HUD meshes
    this._hudPanel = null;
    this._hudCtx = null;
    this._hudTex = null;

    // dealer "deck" origin (visual)
    this._deckPos = new THREE.Vector3(0, 1.18, 0.0); // relative to tableGroup

    // internal: pending animations list
    this._flyCards = [];
  }

  setCamera(camera) {
    this.camera = camera;
  }

  async build(scene) {
    this.scene = scene;

    this.tableGroup.position.copy(this.tableCenter);

    this.buildTable();
    this.buildPlayers();
    this.buildCenterPot();
    this.buildCommunity();
    this.buildHUD();

    scene.add(this.tableGroup);
    scene.add(this.uiGroup);

    this.startNewHand(true);
  }

  // -----------------------------
  // BUILD: TABLE + SCENE OBJECTS
  // -----------------------------

  buildTable() {
    const g = this.tableGroup;

    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.78, 36),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95 })
    );
    base.position.y = 0.39;

    // Felt top
    const feltMat = TextureBank.standard({
      mapFile: this.files.FELT,
      color: 0x145c3a,
      roughness: 0.95,
      metalness: 0.05,
      repeat: [2, 2],
    });

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.25, 0.22, 64),
      feltMat
    );
    top.position.y = 1.05;

    // Leather trim ring (visible)
    const leatherMat = TextureBank.standard({
      mapFile: this.files.LEATHER,
      color: 0x2a1c12,
      roughness: 0.75,
      metalness: 0.08,
      repeat: [6, 1],
    });

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.12, 0.17, 16, 120),
      leatherMat
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 1.15;

    // Betting line ring
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.045, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.25,
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = 1.09;

    // Dealer deck placeholder
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.30),
      TextureBank.standard({ mapFile: this.files.CARD_BACK, color: 0xffffff, roughness: 0.9 })
    );
    deck.position.copy(this._deckPos);

    // subtle light above table
    const tableLight = new THREE.PointLight(0xfff0d0, 0.9, 12);
    tableLight.position.set(0, 3.2, 0);

    g.add(base, top, trim, line, deck, tableLight);
  }

  buildPlayers() {
    const g = this.tableGroup;

    const radius = 3.75; // chair ring radius
    const names = this.makeBossNames(this.playerCount);

    // materials
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.95 });
    const botMats = [
      new THREE.MeshStandardMaterial({ color: 0x7fd4ff, roughness: 0.6, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xff7fd7, roughness: 0.6, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.55, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0x9eff7f, roughness: 0.6, metalness: 0.05 }),
    ];

    for (let i = 0; i < this.playerCount; i++) {
      const angle = (i / this.playerCount) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      // CHAIR (seat + back)
      const chair = new THREE.Group();
      chair.position.copy(seatPos);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.62), chairMat);
      seat.position.y = 0.52;

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.70, 0.10), chairMat);
      back.position.set(0, 0.92, -0.26);

      chair.add(seat, back);

      // BOT (capsule) aligned to sit ON seat
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.62, 6, 14),
        botMats[i % botMats.length]
      );
      bot.position.copy(seatPos);

      // seat top is ~0.57 (0.52 + half of seat thickness 0.05)
      // capsule half-height approx (0.62 + 2*0.20)/2 = 0.51
      // place bot so bottom touches seat top:
      bot.position.y = 0.57 + 0.51;

      // face table center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // combined tag panel
      const tag = this.makeComboTag(`${names[i]}\n$${this.startingStack}\nWAIT`, 0.46);
      tag.position.set(seatPos.x, this.nameTagY, seatPos.z);

      // cards-over-head group (does not block tag)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);
      handGroup.visible = true;

      // "turn ring" indicator at seat
      const turnRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.03, 10, 44),
        new THREE.MeshStandardMaterial({
          color: 0x2bd7ff,
          emissive: 0x2bd7ff,
          emissiveIntensity: 0.0,
          roughness: 0.35,
          metalness: 0.2,
        })
      );
      turnRing.rotation.x = Math.PI / 2;
      turnRing.position.set(seatPos.x, 1.07, seatPos.z);

      // each player's chip stack area ON TABLE edge near them
      const chips = new THREE.Group();
      const chipOffset = 1.95;
      chips.position.set(
        seatPos.x - chipOffset * Math.cos(angle),
        1.12,
        seatPos.z - chipOffset * Math.sin(angle)
      );

      g.add(chair, bot, tag, handGroup, turnRing, chips);

      this.players.push({
        i,
        name: names[i],
        seatPos,
        angle,
        chair,
        bot,
        tag,
        handGroup,
        chips,
        turnRing,

        stack: this.startingStack,
        bet: 0,
        inHand: true,
        busted: false,

        hole: [],
        action: "WAIT",

        // walk targets when leaving / winner stroll
        _walkTarget: null,
        _walkSpeed: 0.012,
      });
    }
  }

  buildCenterPot() {
    this.potChips.position.set(0, 1.12, 0.25);
    this.tableGroup.add(this.potChips);
  }

  buildCommunity() {
    this._communityGroup.position.set(0, this.communityY, -0.15);
    this.tableGroup.add(this._communityGroup);
  }

  buildHUD() {
    // One compact HUD panel above community cards:
    // shows: phase, pot, whose turn, last action
    const panel = this.makeHUDPanel();
    panel.position.set(0, this.hudY, -0.15);
    this.uiGroup.add(panel);
    this._hudPanel = panel;
  }

  // -----------------------------
  // TEXT / HUD HELPERS
  // -----------------------------

  makeHUDPanel() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // initial paint
    this.paintHUD(ctx, canvas, {
      title: "BOSS TABLE",
      phase: "—",
      pot: 0,
      turn: "—",
      last: "—",
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.38), mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;

    this._hudCtx = ctx;
    this._hudTex = tex;

    return mesh;
  }

  paintHUD(ctx, canvas, data) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // glassy look
    ctx.fillStyle = "rgba(10,10,14,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // border
    ctx.strokeStyle = "rgba(255,210,122,0.85)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // title watermark-ish
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 96px Arial";
    ctx.fillText("SKYLARK", 28, 150);
    ctx.globalAlpha = 1;

    // readable text
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 44px Arial";
    ctx.fillText(data.title, 34, 64);

    ctx.fillStyle = "#2bd7ff";
    ctx.font = "bold 42px Arial";
    ctx.fillText(`PHASE: ${data.phase}`, 34, 118);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";
    ctx.fillText(`POT: $${data.pot}`, 520, 118);

    ctx.fillStyle = "#00ffaa";
    ctx.font = "bold 38px Arial";
    ctx.fillText(`TURN: ${data.turn}`, 34, 170);

    ctx.fillStyle = "#ff2bd6";
    ctx.font = "bold 36px Arial";
    ctx.fillText(`LAST: ${data.last}`, 520, 170);
  }

  setHUD({ phase, pot, turn, last }) {
    if (!this._hudPanel) return;
    const { canvas, ctx, tex } = this._hudPanel.userData;

    this.paintHUD(ctx, canvas, {
      title: "BOSS TABLE",
      phase,
      pot,
      turn,
      last,
    });

    tex.needsUpdate = true;
  }

  makeComboTag(text, scale = 0.46) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    this.paintComboTag(ctx, canvas, text);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.25 * scale, 0.95 * scale), mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;

    return mesh;
  }

  paintComboTag(ctx, canvas, text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,210,122,0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px Arial";

    const lines = String(text).split("\n");
    let y = 110;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // color per line
      if (i === 0) ctx.fillStyle = "#00ffaa";        // name
      else if (i === 1) ctx.fillStyle = "#ffd27a";   // stack
      else ctx.fillStyle = "#2bd7ff";                // action

      ctx.fillText(line, 44, y);
      y += 100;
    }
  }

  setComboTag(mesh, name, stack, action) {
    const { canvas, ctx, tex } = mesh.userData;
    this.paintComboTag(ctx, canvas, `${name}\n$${stack}\n${action}`);
    tex.needsUpdate = true;
  }

  // -----------------------------
  // CARDS + CHIPS HELPERS
  // -----------------------------

  makeCardMesh(card, faceUp = true) {
    // card is { r, s }
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    if (!faceUp) {
      // back
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, 256, 384);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 44px Arial";
      ctx.fillText("SKYLARK", 40, 210);
    } else {
      // face
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, 256, 384);

      const isRed = (card.s === "♥" || card.s === "♦");
      const suitColor = isRed ? "#d01818" : "#111111";

      ctx.fillStyle = suitColor;
      ctx.font = "bold 84px Arial";
      ctx.fillText(card.r, 18, 92);
      ctx.font = "bold 92px Arial";
      ctx.fillText(card.s, 18, 175);

      ctx.globalAlpha = 0.86;
      ctx.font = "bold 140px Arial";
      ctx.fillText(card.s, 82, 260);
      ctx.globalAlpha = 1;

      // bottom mirrored
      ctx.save();
      ctx.translate(256, 384);
      ctx.rotate(Math.PI);
      ctx.font = "bold 84px Arial";
      ctx.fillText(card.r, 18, 92);
      ctx.font = "bold 92px Arial";
      ctx.fillText(card.s, 18, 175);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
    return mesh;
  }

  renderHoleOverHead(p) {
    // clear
    while (p.handGroup.children.length) p.handGroup.remove(p.handGroup.children[0]);

    // make 2 cards, slight spacing, and lift forward a bit so tag stays visible
    const c0 = this.makeCardMesh(p.hole[0], true);
    const c1 = this.makeCardMesh(p.hole[1], true);

    c0.position.set(-0.20, 0, 0);
    c1.position.set( 0.20, 0, 0);

    // tiny tilt so visible
    c0.rotation.x = -0.10;
    c1.rotation.x = -0.10;

    p.handGroup.add(c0, c1);
  }

  renderCommunity() {
    while (this._communityGroup.children.length) this._communityGroup.remove(this._communityGroup.children[0]);

    const spacing = 0.42;
    const startX = -((this.community.length - 1) * spacing) / 2;

    for (let i = 0; i < this.community.length; i++) {
      const m = this.makeCardMesh(this.community[i], true);
      m.position.set(startX + i * spacing, 0, 0);
      m.rotation.x = -0.10;
      this._communityGroup.add(m);
    }
  }

  makeChipMat(denom) {
    // Optional texture map files, but will look fine even if missing
    let file = null;
    if (denom === 1000) file = this.files.CHIP_1000;
    if (denom === 5000) file = this.files.CHIP_5000;
    if (denom === 10000) file = this.files.CHIP_10000;

    return TextureBank.standard({
      mapFile: file,
      color: denom === 1000 ? 0x2bd7ff : denom === 5000 ? 0xffd27a : 0xff2bd6,
      roughness: 0.45,
      metalness: 0.15,
      repeat: [1, 1],
    });
  }

  rebuildPlayerChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    // represent stack visually with a few piles
    const denoms = [1000, 5000, 10000];
    let remaining = p.stack;

    const chipGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18);
    let pileIndex = 0;

    for (let di = denoms.length - 1; di >= 0; di--) {
      const d = denoms[di];
      const count = Math.min(12, Math.floor(remaining / d));
      if (count <= 0) continue;

      remaining -= count * d;
      const mat = this.makeChipMat(d);

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(chipGeo, mat);
        chip.position.set(pileIndex * 0.11, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }

      pileIndex += 1.2;
    }
  }

  rebuildPotChips() {
    while (this.potChips.children.length) this.potChips.remove(this.potChips.children[0]);

    const chipGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 18);

    // show pot as a mixed stack
    const approxChips = Math.min(40, Math.max(6, Math.floor(this.pot / 50)));
    for (let i = 0; i < approxChips; i++) {
      const mat = this.makeChipMat(i % 3 === 0 ? 1000 : (i % 3 === 1 ? 5000 : 10000));
      const chip = new THREE.Mesh(chipGeo, mat);
      chip.position.set(
        (this._rng() - 0.5) * 0.28,
        0.02 + i * 0.012,
        (this._rng() - 0.5) * 0.22
      );
      this.potChips.add(chip);
    }
  }

  // -----------------------------
  // GAME FLOW
  // -----------------------------

  startNewHand(resetMatch = false) {
    if (resetMatch) {
      this.handIndex = 0;
      this._dealerIndex = 0;
      this._turnIndex = 0;
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.inHand = true;
        p.bet = 0;
        p.action = "WAIT";
        p._walkTarget = null;
        this.setComboTag(p.tag, p.name, p.stack, "WAIT");
        this.rebuildPlayerChips(p);
      }
    }

    // clear crown
    this.clearCrown();

    // reset hand
    this.pot = 0;
    this.community = [];
    this.renderCommunity();
    this.rebuildPotChips();

    // everyone who isn't busted sits in
    for (const p of this.players) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.action = "WAIT";
      p.hole = this.dealHole();
      this.renderHoleOverHead(p);
      this.setComboTag(p.tag, p.name, p.stack, "WAIT");
      this.rebuildPlayerChips(p);
      p.turnRing.material.emissiveIntensity = 0.0;
    }

    // blinds
    this.postBlinds();

    // phase start
    this._phase = "DEAL_HOLE";
    this._phaseTimer = 0;
    this._animTimer = 0;

    this.setHUD({
      phase: "DEAL",
      pot: this.pot,
      turn: this.players[this._dealerIndex]?.name ?? "—",
      last: "New Hand",
    });

    // leaderboard update
    this.updateLeaderboard();

    // advance dealer each hand
    this._dealerIndex = (this._dealerIndex + 1) % this.players.length;

    // reset turn index to left of dealer
    this._turnIndex = (this._dealerIndex + 1) % this.players.length;
  }

  updateLeaderboard() {
    const standings = [...this.players].slice().sort((a, b) => b.stack - a.stack);
    const lines = [
      `Boss Tournament — Hand ${this.handIndex + 1}`,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
      `4) ${standings[3].name} — $${standings[3].stack}`,
    ];
    this.onLeaderboard(lines);
  }

  dealHole() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const pick = () => ({
      r: ranks[(this._rng() * ranks.length) | 0],
      s: suits[(this._rng() * suits.length) | 0]
    });
    return [pick(), pick()];
  }

  dealCommunity(n) {
    const cards = [];
    for (let i = 0; i < n; i++) cards.push(this.dealHole()[0]);
    return cards;
  }

  postBlinds() {
    const sb = this.players[(this._dealerIndex + 1) % this.players.length];
    const bb = this.players[(this._dealerIndex + 2) % this.players.length];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");

    this.rebuildPotChips();
    this.setHUD({
      phase: "BLINDS",
      pot: this.pot,
      turn: sb.name,
      last: `SB $${this.smallBlind} / BB $${this.bigBlind}`
    });
  }

  takeBet(p, amount, label = "") {
    if (!p.inHand || p.busted) return 0;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;
    p.action = label ? `${label} $${bet}` : `BET $${bet}`;

    this.setComboTag(p.tag, p.name, p.stack, p.action);
    this.rebuildPlayerChips(p);
    return bet;
  }

  fold(p) {
    p.inHand = false;
    p.action = "FOLD";
    this.setComboTag(p.tag, p.name, p.stack, p.action);
  }

  // -----------------------------
  // WIN / BUST / REPLACE
  // -----------------------------

  awardWinner(winner) {
    // pot to winner
    winner.stack += this.pot;
    winner.action = `WIN +$${this.pot}`;
    this.pot = 0;

    this.setComboTag(winner.tag, winner.name, winner.stack, winner.action);
    this.rebuildPlayerChips(winner);
    this.rebuildPotChips();

    this.showCrown(winner);

    this.setHUD({
      phase: "SHOWDOWN",
      pot: 0,
      turn: winner.name,
      last: "Winner crowned (60s)"
    });
  }

  showCrown(player) {
    this.clearCrown();

    // crown mesh (simple, reliable)
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.25,
        roughness: 0.35,
        metalness: 0.35,
      })
    );

    crown.position.copy(player.seatPos);
    crown.position.y = this.cardsOverHeadY + 0.70;

    const glow = new THREE.PointLight(0xffd27a, 0.85, 6);
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, player };
    this._winnerHold = 0;

    // winner stroll target (walk toward teleport side then back)
    const stroll = new THREE.Vector3(0.0, player.bot.position.y, 2.8);
    player._walkTarget = stroll;
    player._walkSpeed = 0.009;
  }

  clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crown);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  eliminateAndReplace() {
    // mark busted + walk away
    for (const p of this.players) {
      if (p.busted) continue;
      if (p.stack <= 0) {
        p.busted = true;
        p.inHand = false;
        p.action = "OUT";
        this.setComboTag(p.tag, p.name, p.stack, "OUT");

        // leave target: walk out toward back wall
        p._walkTarget = new THREE.Vector3(0, p.bot.position.y, -10.8);
        p._walkSpeed = 0.012;
      }
    }

    // replacements: if someone is busted, "respawn" them as a new bot after they reached far zone
    for (const p of this.players) {
      if (!p.busted) continue;

      // if they're far enough, reset them with fresh stack and re-seat them
      if (p.bot.position.z < -10.0) {
        p.busted = false;
        p.inHand = true;
        p.stack = this.startingStack;
        p.bet = 0;
        p.action = "JOIN";
        p._walkTarget = null;

        // snap bot back to seat
        p.bot.position.set(p.seatPos.x, p.bot.position.y, p.seatPos.z);
        p.bot.lookAt(new THREE.Vector3(0, p.bot.position.y, 0));

        this.setComboTag(p.tag, p.name, p.stack, "JOIN");
        this.rebuildPlayerChips(p);
      }
    }
  }

  // -----------------------------
  // UPDATE LOOP
  // -----------------------------

  update(dt) {
    // face UI to camera
    if (this.camera) {
      for (const p of this.players) {
        p.tag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      if (this._hudPanel) this._hudPanel.lookAt(this.camera.position);

      // community faces camera too
      this._communityGroup.lookAt(this.camera.position);
    }

    // animate walk targets
    for (const p of this.players) {
      if (p._walkTarget) {
        p.bot.position.lerp(p._walkTarget, p._walkSpeed);
      }
    }

    // crown pulse + follow
    if (this._crown) {
      this._winnerHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.25;
      this._crown.glow.intensity = 0.8 * pulse;

      // keep crown above winner
      const pl = this._crown.player;
      this._crown.crown.position.set(pl.bot.position.x, this.cardsOverHeadY + 0.70, pl.bot.position.z);
      this._crown.glow.position.copy(this._crown.crown.position);

      // hold crown for 60 seconds
      if (this._winnerHold > 60) {
        this.clearCrown();
      }
    }

    // phase machine timing
    this._phaseTimer += dt;
    if (this._phaseTimer < this.stepDelay) return;
    this._phaseTimer = 0;

    try {
      this.tick();
    } catch (e) {
      console.error("PokerSim tick error:", e);
      // self heal
      this.setHUD({ phase: "RESET", pot: this.pot, turn: "—", last: "Recovered from error" });
      this.startNewHand(false);
    }
  }

  // -----------------------------
  // STATE MACHINE (slow watchable)
  // -----------------------------

  tick() {
    // highlight current turn seat ring
    for (const p of this.players) p.turnRing.material.emissiveIntensity = 0.0;
    const turnP = this.players[this._turnIndex];
    if (turnP) turnP.turnRing.material.emissiveIntensity = 0.85;

    if (this._phase === "DEAL_HOLE") {
      // just show that dealing happened (cards already visible over heads)
      this.setHUD({ phase: "PREFLOP", pot: this.pot, turn: turnP?.name ?? "—", last: "Hole cards dealt" });
      this._phase = "PREFLOP_ACTION";
      return;
    }

    if (this._phase === "PREFLOP_ACTION") {
      const done = this.performOneAction("PREFLOP");
      if (!done) return;

      // deal flop
      this.community = this.dealCommunity(3);
      this.renderCommunity();
      this.setHUD({ phase: "FLOP", pot: this.pot, turn: turnP?.name ?? "—", last: "Flop dealt" });
      this._phase = "FLOP_ACTION";
      this.resetTurnToFirstAlive();
      return;
    }

    if (this._phase === "FLOP_ACTION") {
      const done = this.performOneAction("FLOP");
      if (!done) return;

      // deal turn
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.setHUD({ phase: "TURN", pot: this.pot, turn: turnP?.name ?? "—", last: "Turn dealt" });
      this._phase = "TURN_ACTION";
      this.resetTurnToFirstAlive();
      return;
    }

    if (this._phase === "TURN_ACTION") {
      const done = this.performOneAction("TURN");
      if (!done) return;

      // deal river
      this.community.push(...this.dealCommunity(1));
      this.renderCommunity();
      this.setHUD({ phase: "RIVER", pot: this.pot, turn: turnP?.name ?? "—", last: "River dealt" });
      this._phase = "RIVER_ACTION";
      this.resetTurnToFirstAlive();
      return;
    }

    if (this._phase === "RIVER_ACTION") {
      const done = this.performOneAction("RIVER");
      if (!done) return;

      // showdown
      this._phase = "SHOWDOWN";
      const alive = this.players.filter(p => p.inHand && !p.busted);
      const winner = alive.length ? alive[(this._rng() * alive.length) | 0] : this.players[0];
      this.awardWinner(winner);

      // bust/replace
      this.eliminateAndReplace();
      this.updateLeaderboard();

      // next hand after short pause
      this.handIndex++;
      this.startNewHand(false);
      return;
    }

    // fallback
    this.startNewHand(false);
  }

  resetTurnToFirstAlive() {
    // start action from left of dealer each street
    let idx = (this._dealerIndex + 1) % this.players.length;
    for (let k = 0; k < this.players.length; k++) {
      const p = this.players[idx];
      if (p && p.inHand && !p.busted && p.stack > 0) {
        this._turnIndex = idx;
        return;
      }
      idx = (idx + 1) % this.players.length;
    }
    this._turnIndex = 0;
  }

  performOneAction(street) {
    // do a single player action per tick so it is slow and readable
    const p = this.players[this._turnIndex];
    if (!p) return true;

    // if player already folded/busted skip
    if (!p.inHand || p.busted || p.stack <= 0) {
      this._turnIndex = (this._turnIndex + 1) % this.players.length;
      return this.isStreetDone();
    }

    // simple watchable action model:
    // small chance fold, some call, some raise (small amounts)
    const roll = this._rng();

    if (roll < 0.12) {
      this.fold(p);
      this.setHUD({ phase: street, pot: this.pot, turn: p.name, last: "FOLD" });
    } else if (roll < 0.30) {
      const amt = street === "PREFLOP" ? 60 : 50;
      this.takeBet(p, amt, "RAISE");
      this.rebuildPotChips();
      this.setHUD({ phase: street, pot: this.pot, turn: p.name, last: `RAISE $${amt}` });
    } else {
      const amt = street === "PREFLOP" ? 30 : 25;
      this.takeBet(p, amt, "CALL");
      this.rebuildPotChips();
      this.setHUD({ phase: street, pot: this.pot, turn: p.name, last: `CALL $${amt}` });
    }

    // next turn
    this._turnIndex = (this._turnIndex + 1) % this.players.length;

    return this.isStreetDone();
  }

  isStreetDone() {
    // street ends when we've looped a full ring AND at least 2 players remain
    // We approximate: if current turn is back at dealer+1, end street.
    const target = (this._dealerIndex + 1) % this.players.length;
    const alive = this.players.filter(p => p.inHand && !p.busted);
    if (alive.length <= 1) return true;
    return this._turnIndex === target;
  }

  // -----------------------------
  // NAME SETS (ROYAL BOSSES)
  // -----------------------------

  makeBossNames(n) {
    // You asked: royal boss bots with each suit.
    const suits = ["♠", "♥", "♦", "♣"];
    const royals = ["King", "Queen", "Jack", "Ace"];
    const out = [];
    let si = 0, ri = 0;

    for (let i = 0; i < n; i++) {
      const name = `${suits[si]} ${royals[ri]} of ${this.suitWord(suits[si])}`;
      out.push(name);

      ri++;
      if (ri >= royals.length) { ri = 0; si = (si + 1) % suits.length; }
    }
    return out;
  }

  suitWord(sym) {
    if (sym === "♠") return "Spades";
    if (sym === "♥") return "Hearts";
    if (sym === "♦") return "Diamonds";
    return "Clubs";
  }
}
