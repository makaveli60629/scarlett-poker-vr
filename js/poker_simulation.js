// /js/poker_simulation.js — Skylark Poker VR — Update 9.0 (FULL FIX)
// GitHub Pages safe: uses local ./three.js wrapper (NOT "three")

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    // Where the whole table scene lives in World coordinates
    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.8);

    // callback for main leaderboard screen
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // ---- pacing (watchable) ----
    this.speed = {
      dealCard: 0.55,         // how long a card "flies"
      pause: 0.65,            // short pauses between beats
      betPause: 1.15,         // how long we hold bet/action
      phasePause: 1.25,       // how long we hold FLOP/TURN/RIVER text
      victoryLapSeconds: 9.0, // winner lap before next hand
      crownHoldSeconds: 60.0  // crown stays up to 60s max
    };

    // ---- stacks ----
    // You asked for different stacks at different times; set what you want here:
    // (you asked last: bots only 1000 so bust happens fast)
    this.startingStack = opts.startingStack ?? 1000;

    this.smallBlind = 10;
    this.bigBlind = 20;

    // ---- seats ----
    this.seatCount = 8;
    this.seatRadius = 3.9;

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.tableTopY = 1.05;        // matches table top in sim
    this.communityY = 1.42;       // hover line for community
    this.hudY = 1.78;             // HUD above community
    this.nameY = 1.98;            // name tag height
    this.cardsOverHeadY = 2.28;   // cards over head
    this.chipsY = 1.10;           // chips on table surface

    // game state
    this.players = [];
    this.pot = 0;
    this.community = [];
    this.handIndex = 0;
    this.handsPerMatch = 999999; // endless until you change it

    // groups
    this.root = new THREE.Group();
    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();
    this.cardFlightGroup = new THREE.Group();

    // phases
    this._phase = "IDLE";
    this._phaseT = 0;

    // dealer button index
    this._dealerIndex = 0;
    this._actionIndex = 0;

    // crown
    this._crown = null;
    this._winner = null;
    this._crownHold = 0;

    // spectator vs seated
    this.userSeated = false;  // default spectator (no cards dealt to user)

    // replacements queue
    this._replacementCounter = 1;

    // rng
    this._rng = Math.random;

    // internal: active flying cards
    this._fliers = [];
  }

  build(scene) {
    this.scene = scene;

    this.root.position.copy(this.tableCenter);
    this.tableGroup.position.set(0, 0, 0);
    this.uiGroup.position.set(0, 0, 0);
    this.cardFlightGroup.position.set(0, 0, 0);

    this.buildTable();
    this.buildSeatsAndBots();
    this.buildTableHUD();

    this.root.add(this.tableGroup);
    this.root.add(this.uiGroup);
    this.root.add(this.cardFlightGroup);

    scene.add(this.root);

    // start first hand (bots only)
    this.startNewHand(true);
  }

  /* ---------------- TABLE ---------------- */

  buildTable() {
    const g = this.tableGroup;

    // felt + base + leather trim
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: null,
      roughness: 0.95
    });

    // If you later want to apply felt texture, do it in textures.js + world materials.
    // Keeping sim table stable even if textures missing.
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.35, 0.72, 36),
      new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.9 })
    );
    base.position.y = 0.36;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.30, 0.22, 56),
      feltMat
    );
    top.position.y = this.tableTopY;

    // leather trim ring
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.10, 0.11, 16, 110),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1d,
        roughness: 0.65,
        metalness: 0.10
      })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = this.tableTopY + 0.06;

    // betting line ring (gold glow)
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.20, 0.045, 12, 96),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.75,
        roughness: 0.35
      })
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = this.tableTopY + 0.05;

    // dealer chip marker (moves each hand)
    const dealer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.035, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05 })
    );
    dealer.position.set(0, this.tableTopY + 0.07, 0);
    dealer.userData.isDealerChip = true;
    this._dealerChip = dealer;

    // dealer position for card flights (in table local coords)
    this._dealerPos = new THREE.Vector3(0, this.tableTopY + 0.52, 0.95);

    g.add(base, top, trim, line, dealer);
  }

  /* ---------------- PLAYERS/BOTS ---------------- */

  buildSeatsAndBots() {
    const names = [
      "♠ King of Spades",
      "♠ Queen of Spades",
      "♠ Jack of Spades",
      "♠ Ace of Spades",
      "♥ King of Hearts",
      "♥ Queen of Hearts",
      "♦ Jack of Diamonds",
      "♣ Ace of Clubs"
    ];

    for (let i = 0; i < this.seatCount; i++) {
      const angle = (i / this.seatCount) * Math.PI * 2;

      const seatPos = new THREE.Vector3(
        Math.cos(angle) * this.seatRadius,
        0,
        Math.sin(angle) * this.seatRadius
      );

      // chair
      const chair = this.makeChair();
      chair.position.copy(seatPos);
      chair.position.y = 0.28;
      chair.lookAt(new THREE.Vector3(0, chair.position.y, 0));

      // bot (capsule body + colored "shirt" band)
      const bot = this.makeBot(i);
      bot.position.copy(seatPos);

      // sit height: chair top + body half height
      bot.position.y = chair.position.y + 0.62;

      // face table center
      bot.lookAt(new THREE.Vector3(0, bot.position.y, 0));

      // combined tag (ONE tag block, not two separate)
      const tag = this.makeTextTag(`${names[i]}\n$${this.startingStack}`, 0.46, "#ffffff", true);
      tag.position.set(seatPos.x, this.nameY, seatPos.z);

      // cards above head (group)
      const handGroup = new THREE.Group();
      handGroup.position.set(seatPos.x, this.cardsOverHeadY, seatPos.z);

      // chip stacks on TABLE (group)
      const chips = new THREE.Group();
      // place slightly inward from seat, ON table
      const inward = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle)).multiplyScalar(1.15);
      chips.position.set(seatPos.x + inward.x, this.chipsY, seatPos.z + inward.z);

      this.tableGroup.add(chair, bot, tag, handGroup, chips);

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
        stack: this.startingStack,
        bet: 0,
        inHand: true,
        busted: false,
        leaving: false,
        hole: [],
        lastAction: "WAIT",
        glow: null
      });
    }
  }

  makeChair() {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.10, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 })
    );
    seat.position.y = 0.30;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.55, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.95 })
    );
    back.position.set(0, 0.62, -0.26);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.30, 10);

    const l1 = new THREE.Mesh(legGeo, legMat);
    const l2 = l1.clone(), l3 = l1.clone(), l4 = l1.clone();
    l1.position.set(-0.26, 0.15, -0.26);
    l2.position.set( 0.26, 0.15, -0.26);
    l3.position.set(-0.26, 0.15,  0.26);
    l4.position.set( 0.26, 0.15,  0.26);

    g.add(seat, back, l1, l2, l3, l4);
    return g;
  }

  makeBot(i) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.55, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.75 })
    );

    // shirt band (color variation)
    const colors = [0xff2bd6, 0x00ffaa, 0xffd27a, 0x2bd7ff, 0xb86cff, 0xff6b2b, 0x2bff62, 0xffffff];
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.20, 0.05, 10, 26),
      new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        emissive: colors[i % colors.length],
        emissiveIntensity: 0.25,
        roughness: 0.45
      })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.14;

    group.add(body, band);
    return group;
  }

  /* ---------------- HUD / TEXT ---------------- */

  buildTableHUD() {
    // One small HUD above community cards:
    // line1: PHASE
    // line2: POT + ACTION
    this._hud = this.makeTextTag("READY\nPOT: $0", 0.56, "#ffffff", true);
    this._hud.position.set(0, this.hudY, 0);
    this.uiGroup.add(this._hud);
  }

  makeTextTag(text, scale = 0.5, color = "#ffffff", multiline = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.9 * scale, 0.72 * scale), mat);

    mesh.userData = { canvas, ctx, tex, multiline };
    this.setTag(mesh, text, color);

    return mesh;
  }

  setTag(mesh, text, color = "#ffffff") {
    const { canvas, ctx, tex, multiline } = mesh.userData;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // glassy-ish bg
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // gold border
    ctx.strokeStyle = "rgba(255,210,122,0.90)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // text
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    if (multiline) {
      const lines = String(text).split("\n");
      ctx.font = "bold 58px Arial";
      ctx.fillText(lines[0] || "", 40, 92);

      ctx.font = "bold 50px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(lines[1] || "", 40, 170);
    } else {
      ctx.font = "bold 64px Arial";
      ctx.fillText(String(text), 40, 128);
    }

    tex.needsUpdate = true;
  }

  /* ---------------- CARDS ---------------- */

  makeCardMesh(card, faceUp = true) {
    // Simple canvas card; stable in VR and readable.
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    // body
    ctx.fillStyle = faceUp ? "#f6f6f6" : "#2a2a34";
    ctx.fillRect(0, 0, 256, 384);

    // border
    ctx.strokeStyle = faceUp ? "rgba(0,0,0,0.35)" : "rgba(255,210,122,0.65)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 364);

    if (faceUp) {
      const isRed = card.s === "♥" || card.s === "♦";
      const suitColor = isRed ? "#d01818" : "#111111";

      ctx.fillStyle = suitColor;
      ctx.font = "bold 86px Arial";
      ctx.fillText(card.r, 18, 92);

      ctx.font = "bold 92px Arial";
      ctx.fillText(card.s, 18, 180);

      // center suit
      ctx.globalAlpha = 0.85;
      ctx.font = "bold 150px Arial";
      ctx.fillText(card.s, 88, 270);
      ctx.globalAlpha = 1;

      // bottom mirrored
      ctx.save();
      ctx.translate(256, 384);
      ctx.rotate(Math.PI);
      ctx.font = "bold 86px Arial";
      ctx.fillText(card.r, 18, 92);
      ctx.font = "bold 92px Arial";
      ctx.fillText(card.s, 18, 180);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff2bd6";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SKYLARK", 128, 192);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    return new THREE.Mesh(new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h), mat);
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
    const out = [];
    for (let i = 0; i < n; i++) out.push(this.dealHole()[0]);
    return out;
  }

  clearGroup(group) {
    while (group.children.length) group.remove(group.children[0]);
  }

  renderHoleOverHead(player) {
    this.clearGroup(player.handGroup);

    const c0 = this.makeCardMesh(player.hole[0], true);
    const c1 = this.makeCardMesh(player.hole[1], true);

    // spacing so it does NOT block name tag
    c0.position.set(-0.22, 0, 0);
    c1.position.set( 0.22, 0, 0);

    // slight tilt for style
    c0.rotation.y =  0.12;
    c1.rotation.y = -0.12;

    player.handGroup.add(c0, c1);
  }

  renderCommunity() {
    if (!this._communityGroup) {
      this._communityGroup = new THREE.Group();
      this._communityGroup.position.set(0, this.communityY, 0);
      this.tableGroup.add(this._communityGroup);
    }
    this.clearGroup(this._communityGroup);

    const spacing = 0.42;
    for (let i = 0; i < this.community.length; i++) {
      const m = this.makeCardMesh(this.community[i], true);
      m.position.set((i - (this.community.length - 1) / 2) * spacing, 0, 0);
      this._communityGroup.add(m);
    }
  }

  /* ---------------- CHIPS ---------------- */

  refreshChips(player) {
    this.clearGroup(player.chips);

    // show "bet" chips nearer the center + stack chips at player position
    const denoms = [
      { v: 10, c: 0xffffff },
      { v: 50, c: 0xff2bd6 },
      { v: 100, c: 0x2bd7ff },
      { v: 500, c: 0xffd27a }
    ];

    let remaining = Math.max(0, player.stack);
    let stackIndex = 0;

    for (const d of denoms.slice().reverse()) {
      const count = Math.min(10, Math.floor(remaining / d.v));
      if (count <= 0) continue;

      remaining -= count * d.v;

      for (let i = 0; i < count; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.022, 18),
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.4, metalness: 0.2 })
        );
        chip.position.set(stackIndex * 0.10, 0.015 + i * 0.024, 0);
        player.chips.add(chip);
      }
      stackIndex += 1.2;
    }
  }

  /* ---------------- CROWN + WINNER LAP ---------------- */

  showCrown(player) {
    this.clearCrown();

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.24, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.35,
        roughness: 0.28,
        metalness: 0.45
      })
    );

    const glow = new THREE.PointLight(0xffd27a, 0.85, 7);

    // crown attached above head
    crown.position.set(0, 0.78, 0);
    glow.position.set(0, 0.90, 0);

    const crownGroup = new THREE.Group();
    crownGroup.name = "CrownGroup";
    crownGroup.add(crown, glow);

    player.bot.add(crownGroup);

    this._crown = crownGroup;
    this._winner = player;
    this._crownHold = 0;
  }

  clearCrown() {
    if (!this._crown) return;
    // detach from winner if still attached
    if (this._winner?.bot) this._winner.bot.remove(this._crown);
    this._crown = null;
    this._winner = null;
    this._crownHold = 0;
  }

  /* ---------------- GAME FLOW ---------------- */

  startNewHand(resetStacks = false) {
    if (resetStacks) {
      for (const p of this.players) {
        p.stack = this.startingStack;
        p.busted = false;
        p.leaving = false;
      }
    }

    // clear fliers and community
    this._fliers.length = 0;
    this.pot = 0;
    this.community = [];
    this.renderCommunity();

    // reset everyone in-hand
    for (const p of this.players) {
      p.inHand = !p.busted && !p.leaving && p.stack > 0;
      p.bet = 0;
      p.lastAction = "WAIT";
      p.hole = p.inHand ? this.dealHole() : [];
      if (p.inHand) this.renderHoleOverHead(p);
      else this.clearGroup(p.handGroup);

      this.refreshChips(p);
      this.updatePlayerTag(p);
    }

    // move dealer chip to dealer seat
    this._dealerIndex = this.handIndex % this.seatCount;
    this.moveDealerChip();

    // blinds
    this.postBlinds();

    // update leaderboard
    this.pushLeaderboard();

    // go into animated phases
    this._phase = "DEAL_HOLE_ANIM";
    this._phaseT = 0;

    // NOTE: you are spectator by default, so you will not receive cards here.
    this.setHUD("DEALING", `POT: $${this.pot}`);
  }

  moveDealerChip() {
    const dealerSeat = this.players[this._dealerIndex];
    if (!dealerSeat) return;

    // position chip slightly in front of dealer on table
    const a = dealerSeat.angle;
    const forwardToCenter = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(1.65);

    this._dealerChip.position.set(
      dealerSeat.seatPos.x + forwardToCenter.x,
      this.tableTopY + 0.07,
      dealerSeat.seatPos.z + forwardToCenter.z
    );
  }

  updatePlayerTag(p) {
    const status = p.busted ? "OUT" : p.leaving ? "LEAVING" : p.inHand ? p.lastAction : "FOLDED";
    this.setTag(p.tag, `${p.name}\n$${p.stack} — ${status}`, "#ffffff");
  }

  setHUD(line1, line2) {
    this.setTag(this._hud, `${line1}\n${line2}`, "#ffffff");
  }

  postBlinds() {
    const sb = this.players[(this.handIndex + 1) % this.seatCount];
    const bb = this.players[(this.handIndex + 2) % this.seatCount];

    this.takeBet(sb, this.smallBlind, "SB");
    this.takeBet(bb, this.bigBlind, "BB");
  }

  takeBet(p, amount, label) {
    if (!p || !p.inHand || p.busted || p.leaving) return;

    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet += bet;
    this.pot += bet;
    p.lastAction = label ? `${label} $${bet}` : `BET $${bet}`;

    this.refreshChips(p);
    this.updatePlayerTag(p);
  }

  doBettingRound(roundName) {
    // simple spectator-friendly actions
    // choose an action index starting left of dealer
    const start = (this._dealerIndex + 3) % this.seatCount;

    // everyone acts once (who is still in hand)
    for (let k = 0; k < this.seatCount; k++) {
      const idx = (start + k) % this.seatCount;
      const p = this.players[idx];
      if (!p || !p.inHand || p.busted || p.leaving) continue;

      const r = this._rng();

      if (r < 0.18) {
        p.inHand = false;
        p.lastAction = "FOLD";
        this.updatePlayerTag(p);
      } else if (r < 0.35) {
        this.takeBet(p, this.bigBlind * 2, "RAISE");
      } else {
        this.takeBet(p, this.bigBlind, "CALL");
      }
    }

    this.setHUD(roundName, `POT: $${this.pot}`);
  }

  pickWinner() {
    const alive = this.players.filter(p => p.inHand && !p.busted && !p.leaving);
    if (!alive.length) return this.players.find(p => !p.busted && !p.leaving) || this.players[0];
    return alive[(this._rng() * alive.length) | 0];
  }

  awardWinner(winner) {
    if (!winner) return;
    winner.stack += this.pot;
    winner.lastAction = `WINS $${this.pot}`;
    this.pot = 0;

    this.refreshChips(winner);
    this.updatePlayerTag(winner);

    this.showCrown(winner);
  }

  eliminateAndReplace() {
    for (const p of this.players) {
      if (p.busted || p.leaving) continue;
      if (p.stack <= 0) {
        p.busted = true;
        p.inHand = false;
        p.lastAction = "OUT";
        this.updatePlayerTag(p);

        // stand up + walk away
        p.leaving = true;
        p._leaveT = 0;

        // mark a target path outward
        const exit = new THREE.Vector3(0, p.bot.position.y, -12.8);
        p._leaveTarget = exit;

        // schedule replacement
        p._replaceAt = performance.now() + 6500;
      }
    }
  }

  spawnReplacementForSeat(seatIndex) {
    const p = this.players[seatIndex];
    if (!p) return;

    // reset this seat as a "new bot"
    p.busted = false;
    p.leaving = false;
    p.inHand = true;

    p.name = `${p.name.split(" — ")[0]} — R${this._replacementCounter++}`;
    p.stack = this.startingStack;

    // move bot back to seat and sit
    p.bot.position.copy(p.seatPos);
    p.bot.position.y = p.chair.position.y + 0.62;
    p.bot.lookAt(new THREE.Vector3(0, p.bot.position.y, 0));

    // clear leaving motion
    p._leaveTarget = null;
    p._leaveT = 0;

    // update tag/chips
    p.lastAction = "SIT IN";
    this.refreshChips(p);
    this.updatePlayerTag(p);
  }

  pushLeaderboard() {
    const standings = [...this.players].slice().sort((a, b) => b.stack - a.stack);
    const lines = [
      `Boss Tournament — Hand ${this.handIndex + 1}`,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
      `4) ${standings[3].name} — $${standings[3].stack}`,
      `5) ${standings[4].name} — $${standings[4].stack}`,
    ];
    this.onLeaderboard(lines);
  }

  /* ---------------- UPDATE LOOP ---------------- */

  update(dt) {
    if (!this.scene) return;

    // face tags + cards + HUD toward camera (spectator-friendly)
    if (this.camera) {
      for (const p of this.players) {
        p.tag.lookAt(this.camera.position);
        p.handGroup.lookAt(this.camera.position);
      }
      this._hud.lookAt(this.camera.position);
      if (this._communityGroup) this._communityGroup.lookAt(this.camera.position);
    }

    // animate leaving bots
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.leaving && p._leaveTarget) {
        p._leaveT += dt;
        p.bot.position.lerp(p._leaveTarget, 0.012);

        // if enough time passed, hide them low-key (or keep walking)
        if (p._leaveT > 7.0) {
          // keep off stage
          p.bot.position.copy(p._leaveTarget);
        }

        // replacement timer
        if (p._replaceAt && performance.now() > p._replaceAt) {
          p._replaceAt = null;
          // bring a new bot back to seat
          this.spawnReplacementForSeat(i);
        }
      }
    }

    // crown pulsing (if any)
    if (this._crown) {
      this._crownHold += dt;
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.22;
      // pointlight intensity is child[1] in crown group (crown, glow)
      const glow = this._crown.children?.[1];
      if (glow && glow.isLight) glow.intensity = 0.85 * pulse;

      if (this._crownHold > this.speed.crownHoldSeconds) {
        this.clearCrown();
      }
    }

    // PHASE MACHINE
    this._phaseT += dt;

    switch (this._phase) {
      case "DEAL_HOLE_ANIM":
        if (this._phaseT > this.speed.phasePause) {
          this._phase = "PREFLOP_BET";
          this._phaseT = 0;
          this.doBettingRound("PREFLOP");
        }
        break;

      case "PREFLOP_BET":
        if (this._phaseT > this.speed.betPause) {
          this._phase = "FLOP_DEAL";
          this._phaseT = 0;
          this.community = this.dealCommunity(3);
          this.renderCommunity();
          this.setHUD("FLOP", `POT: $${this.pot}`);
        }
        break;

      case "FLOP_DEAL":
        if (this._phaseT > this.speed.phasePause) {
          this._phase = "FLOP_BET";
          this._phaseT = 0;
          this.doBettingRound("FLOP BET");
        }
        break;

      case "FLOP_BET":
        if (this._phaseT > this.speed.betPause) {
          this._phase = "TURN_DEAL";
          this._phaseT = 0;
          this.community.push(...this.dealCommunity(1));
          this.renderCommunity();
          this.setHUD("TURN", `POT: $${this.pot}`);
        }
        break;

      case "TURN_DEAL":
        if (this._phaseT > this.speed.phasePause) {
          this._phase = "TURN_BET";
          this._phaseT = 0;
          this.doBettingRound("TURN BET");
        }
        break;

      case "TURN_BET":
        if (this._phaseT > this.speed.betPause) {
          this._phase = "RIVER_DEAL";
          this._phaseT = 0;
          this.community.push(...this.dealCommunity(1));
          this.renderCommunity();
          this.setHUD("RIVER", `POT: $${this.pot}`);
        }
        break;

      case "RIVER_DEAL":
        if (this._phaseT > this.speed.phasePause) {
          this._phase = "RIVER_BET";
          this._phaseT = 0;
          this.doBettingRound("RIVER BET");
        }
        break;

      case "RIVER_BET":
        if (this._phaseT > this.speed.betPause) {
          this._phase = "SHOWDOWN";
          this._phaseT = 0;

          const winner = this.pickWinner();
          this.awardWinner(winner);
          this.eliminateAndReplace();
          this.pushLeaderboard();

          this.setHUD("SHOWDOWN", `${winner.name} WINS`);
        }
        break;

      case "SHOWDOWN":
        if (this._phaseT > this.speed.phasePause) {
          // winner victory lap before next hand
          this._phase = "VICTORY_LAP";
          this._phaseT = 0;
          this.setHUD("VICTORY LAP", "Winner walks the rail");
        }
        break;

      case "VICTORY_LAP":
        // simple circle walk around table for winner (if not leaving)
        if (this._winner && !this._winner.leaving) {
          const t = this._phaseT;
          const r = 5.2;
          const ang = t * 0.65;
          this._winner.bot.position.x = Math.cos(ang) * r;
          this._winner.bot.position.z = Math.sin(ang) * r;
          this._winner.bot.position.y = this._winner.chair.position.y + 0.62; // keep seated height consistent (standing illusion)
          this._winner.bot.lookAt(new THREE.Vector3(0, this._winner.bot.position.y, 0));
        }

        if (this._phaseT > this.speed.victoryLapSeconds) {
          // put winner back at seat if they were moved
          if (this._winner && !this._winner.leaving) {
            const w = this._winner;
            w.bot.position.copy(w.seatPos);
            w.bot.position.y = w.chair.position.y + 0.62;
            w.bot.lookAt(new THREE.Vector3(0, w.bot.position.y, 0));
          }

          this.handIndex++;
          this._phase = "NEXT_HAND";
          this._phaseT = 0;
          this.setHUD("NEXT HAND", "Dealing…");
        }
        break;

      case "NEXT_HAND":
        if (this._phaseT > this.speed.pause) {
          // crown stays on winner until timeout; hand restarts
          this.startNewHand(false);
        }
        break;

      default:
        break;
    }
  }
}
