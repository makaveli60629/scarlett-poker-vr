// /js/poker_simulation.js — Skylark Poker VR — Update 9.0
// 16 bots total:
// - 8 seated at table (active match)
// - 8 roaming lobby bots (crowd)
// Rules:
// - Active bots play hands slowly
// - When a seated bot busts (stack <= 0): leave seat -> join lobby roam
// - Replace seat with a lobby bot (always keep 8 seated)
// - When match ends: winner wears crown and walks around for 60 seconds,
//   THEN a new match begins.

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor(opts = {}) {
    this.scene = null;
    this.camera = opts.camera || null;

    this.tableCenter = opts.tableCenter || new THREE.Vector3(0, 0, -4.5);
    this.onLeaderboard = opts.onLeaderboard || (() => {});

    // pacing (slow + watchable)
    this.stepDelay = 1.25;
    this._stateTimer = 0;

    // match config
    this.handsPerMatch = 10;
    this.handIndex = 0;

    // chips
    this.startingStack = 1000; // per your latest request
    this.smallBlind = 25;
    this.bigBlind = 50;

    // 16 bots
    this.totalBots = 16;
    this.seatedCount = 8;

    this.bots = [];       // all bots
    this.seated = [];     // references to bots at table
    this.roamers = [];    // lobby walkers

    this.community = [];
    this.pot = 0;

    this.tableGroup = new THREE.Group();
    this.uiGroup = new THREE.Group();
    this.lobbyGroup = new THREE.Group();

    // visuals
    this.cardSize = { w: 0.34, h: 0.48 };
    this.nameHoverY = 1.75;
    this.cardsOverHeadY = 2.25;

    // crown + victory lap
    this._crown = null;
    this._victory = null; // { bot, t, duration }

    this._rng = Math.random;
  }

  async build(scene) {
    this.scene = scene;

    this.buildTable();
    this.buildBots();
    this.buildUI();

    this.scene.add(this.tableGroup);
    this.scene.add(this.uiGroup);
    this.scene.add(this.lobbyGroup);

    // assign initial seating + roaming
    this.assignInitialRoles();

    // start match
    this.startNewHand(true);
  }

  buildTable() {
    const g = this.tableGroup;
    g.position.copy(this.tableCenter);

    // table base/top
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.25, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.9 })
    );
    base.position.y = 0.35;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.15, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x145c3a, roughness: 0.95 })
    );
    top.position.y = 1.05;

    // betting ring
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
  }

  buildBots() {
    const names = [
      "♠ King of Spades","♠ Queen of Spades","♠ Jack of Spades","♠ Ace of Spades",
      "♥ King of Hearts","♥ Queen of Hearts","♥ Jack of Hearts","♥ Ace of Hearts",
      "♦ King of Diamonds","♦ Queen of Diamonds","♦ Jack of Diamonds","♦ Ace of Diamonds",
      "♣ King of Clubs","♣ Queen of Clubs","♣ Jack of Clubs","♣ Ace of Clubs"
    ];

    // bot visuals (pill + color bands)
    const colors = [
      0x9aa1ab, 0xff2bd6, 0x2bd7ff, 0x00ffaa,
      0xffd27a, 0xa98cff, 0xff6b2b, 0x55ff99
    ];

    for (let i = 0; i < this.totalBots; i++) {
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.55, 6, 12),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6, metalness: 0.1 })
      );

      // shirt band
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.03, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.85 })
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.12;
      bot.add(band);

      // data
      const tag = this.makeTextTag(names[i], 0.45, "#00ffaa");
      const stackTag = this.makeTextTag(`$${this.startingStack}`, 0.34, "#ffd27a");

      const handGroup = new THREE.Group();
      handGroup.visible = true;

      const chips = new THREE.Group(); // chips shown near seat on table

      this.bots.push({
        id: i,
        name: names[i],
        mesh: bot,
        tag,
        stackTag,
        handGroup,
        chips,
        stack: this.startingStack,
        seated: false,
        inHand: false,
        busted: false,
        seatIndex: -1,
        seatPos: new THREE.Vector3(),
        roamTarget: new THREE.Vector3(),
        roamT: 0
      });

      // add to lobby by default (we assign later)
      this.lobbyGroup.add(bot, tag, stackTag, handGroup);
    }
  }

  assignInitialRoles() {
    // first 8 seated, rest roam
    this.seated = [];
    this.roamers = [];

    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      b.stack = this.startingStack;
      b.busted = false;

      if (i < this.seatedCount) {
        this.setBotSeated(b, i);
        this.seated.push(b);
      } else {
        this.setBotRoaming(b);
        this.roamers.push(b);
      }
    }
  }

  setBotSeated(bot, seatIndex) {
    bot.seated = true;
    bot.seatIndex = seatIndex;

    const radius = 3.55;
    const angle = (seatIndex / this.seatedCount) * Math.PI * 2;

    bot.seatPos.set(
      this.tableCenter.x + Math.cos(angle) * radius,
      0,
      this.tableCenter.z + Math.sin(angle) * radius
    );

    // position bot so feet are on floor (no sinking)
    bot.mesh.position.copy(bot.seatPos);
    bot.mesh.position.y = 0.95; // tuned for standing near chair height look

    // face table
    bot.mesh.lookAt(new THREE.Vector3(this.tableCenter.x, bot.mesh.position.y, this.tableCenter.z));

    // tag positions (combined readable stack)
    bot.tag.position.set(bot.seatPos.x, this.nameHoverY, bot.seatPos.z);
    bot.stackTag.position.set(bot.seatPos.x, this.nameHoverY - 0.35, bot.seatPos.z);

    // cards over head (offset so it doesn’t block tags)
    bot.handGroup.position.set(bot.seatPos.x, this.cardsOverHeadY, bot.seatPos.z);

    // chips area (ON TABLE near community, not floating in air)
    bot.chips.position.set(
      bot.seatPos.x * 0.55 + this.tableCenter.x * 0.45,
      1.10,
      bot.seatPos.z * 0.55 + this.tableCenter.z * 0.45
    );

    // ensure groups are in table group
    this.tableGroup.add(bot.mesh, bot.tag, bot.stackTag, bot.handGroup, bot.chips);
  }

  setBotRoaming(bot) {
    bot.seated = false;
    bot.seatIndex = -1;

    // random roam start around lobby
    const r = 7 + Math.random() * 4;
    const a = Math.random() * Math.PI * 2;

    bot.mesh.position.set(this.tableCenter.x + Math.cos(a) * r, 0.95, this.tableCenter.z + Math.sin(a) * r);
    bot.roamTarget.copy(bot.mesh.position);
    bot.roamT = 0;

    bot.tag.position.set(bot.mesh.position.x, this.nameHoverY, bot.mesh.position.z);
    bot.stackTag.position.set(bot.mesh.position.x, this.nameHoverY - 0.35, bot.mesh.position.z);
    bot.handGroup.position.set(bot.mesh.position.x, this.cardsOverHeadY, bot.mesh.position.z);

    // hide hand for roamers (so it’s not visual noise)
    bot.handGroup.visible = false;

    this.lobbyGroup.add(bot.mesh, bot.tag, bot.stackTag, bot.handGroup);
  }

  buildUI() {
    // Combined center HUD above community area (NOT blocking players)
    this.hud = this.makeTextTag("POT: $0  |  PREFLOP", 0.62, "#2bd7ff");
    this.hud.position.set(this.tableCenter.x, 2.25, this.tableCenter.z);
    this.uiGroup.add(this.hud);
  }

  makeTextTag(text, scale = 0.4, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 84px Arial";
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 160);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.9 * scale, 0.7 * scale), mat);
    mesh.userData = { canvas, ctx, tex };
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
    if (this._victory) return; // pause during crown walk

    if (resetMatch) this.handIndex = 0;

    this.clearCrown();
    this.pot = 0;
    this.community = [];
    this._phase = "PREFLOP";
    this._stateTimer = 0;

    // reset everyone currently seated
    for (const p of this.seated) {
      p.inHand = !p.busted && p.stack > 0;
      p.bet = 0;
      p.hole = this.dealHole();
      this.renderHoleOverHead(p, true);
      this.refreshChips(p);
      this.updateStackTag(p);
    }

    this.postBlinds();

    this.setTag(this.hud, `POT: $${this.pot}  |  HAND ${this.handIndex + 1}/${this.handsPerMatch}`, "#2bd7ff");

    // leaderboard callback
    const standings = [...this.seated].sort((a, b) => b.stack - a.stack);
    this.onLeaderboard([
      `Boss Tournament — Hand ${this.handIndex + 1}/${this.handsPerMatch}`,
      `1) ${standings[0].name} — $${standings[0].stack}`,
      `2) ${standings[1].name} — $${standings[1].stack}`,
      `3) ${standings[2].name} — $${standings[2].stack}`,
      `4) ${standings[3].name} — $${standings[3].stack}`,
    ]);
  }

  dealHole() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const pick = () => ({ r: ranks[(Math.random()*ranks.length)|0], s: suits[(Math.random()*suits.length)|0] });
    return [pick(), pick()];
  }

  renderHoleOverHead(player, visible) {
    while (player.handGroup.children.length) player.handGroup.remove(player.handGroup.children[0]);
    player.handGroup.visible = !!visible;

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

      return new THREE.Mesh(
        new THREE.PlaneGeometry(this.cardSize.w, this.cardSize.h),
        new THREE.MeshBasicMaterial({ map: tex })
      );
    };

    const c0 = makeCard(player.hole[0]);
    const c1 = makeCard(player.hole[1]);

    // offset so it doesn’t cover tags
    c0.position.set(-0.22, 0, 0);
    c1.position.set( 0.22, 0, 0);

    player.handGroup.add(c0, c1);
  }

  updateStackTag(p) {
    this.setTag(p.stackTag, `$${p.stack}`, "#ffd27a");
  }

  postBlinds() {
    const sb = this.seated[this.handIndex % this.seated.length];
    const bb = this.seated[(this.handIndex + 1) % this.seated.length];
    this.takeBet(sb, this.smallBlind);
    this.takeBet(bb, this.bigBlind);
  }

  takeBet(p, amount) {
    if (!p.inHand) return;
    const bet = Math.min(amount, p.stack);
    p.stack -= bet;
    p.bet = (p.bet || 0) + bet;
    this.pot += bet;
    this.updateStackTag(p);
    this.refreshChips(p);
  }

  refreshChips(p) {
    while (p.chips.children.length) p.chips.remove(p.chips.children[0]);

    const denoms = [
      { v: 25,  c: 0xffffff },
      { v: 100, c: 0xff2bd6 },
      { v: 250, c: 0x2bd7ff },
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
          new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.5, metalness: 0.2 })
        );
        chip.position.set(stackIndex * 0.10, 0.02 + i * 0.022, 0);
        p.chips.add(chip);
      }
      stackIndex += 1.0;
    }
  }

  awardWinner(winner) {
    winner.stack += this.pot;
    this.pot = 0;
    this.updateStackTag(winner);
    this.refreshChips(winner);
    this.showCrown(winner);
    this.setTag(this.hud, `${winner.name} wins!  |  POT PAID`, "#00ffaa");
  }

  showCrown(bot) {
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

    const glow = new THREE.PointLight(0xffd27a, 0.9, 6);

    crown.position.copy(bot.mesh.position);
    crown.position.y = bot.mesh.position.y + 0.75;
    glow.position.copy(crown.position);

    this.tableGroup.add(crown, glow);
    this._crown = { crown, glow, bot };
  }

  clearCrown() {
    if (!this._crown) return;
    this.tableGroup.remove(this._crown.crown);
    this.tableGroup.remove(this._crown.glow);
    this._crown = null;
  }

  // Bust: move to lobby, pull a roamer into seat
  handleBustsAndReplace() {
    for (let i = 0; i < this.seated.length; i++) {
      const p = this.seated[i];
      if (p.stack > 0) continue;

      p.busted = true;
      p.inHand = false;

      // Move busted to roamer crowd
      this.setBotRoaming(p);
      this.roamers.push(p);

      // Replace with roamer (if any)
      const replacement = this.roamers.shift();
      if (replacement) {
        replacement.stack = this.startingStack;
        replacement.busted = false;
        replacement.inHand = true;

        this.setBotSeated(replacement, i);
        this.seated[i] = replacement;
      }
    }
  }

  startVictoryLap(winner) {
    // Winner walks in lobby with crown for 60 seconds
    this._victory = { bot: winner, t: 0, duration: 60 };

    // Move winner out of seat into lobby
    this.setBotRoaming(winner);
    if (!this.roamers.includes(winner)) this.roamers.push(winner);

    // Pull a roamer into winner’s empty seat to keep table full
    // (so table always has 8 “playing” bots even during lap)
    const seatIdx = 0; // pick seat 0 as the “King seat” for consistency
    const replacement = this.roamers.shift();
    if (replacement && replacement !== winner) {
      replacement.stack = this.startingStack;
      replacement.busted = false;
      this.setBotSeated(replacement, seatIdx);
      this.seated[seatIdx] = replacement;
    }

    // Crown will follow the winner during lap
  }

  update(dt) {
    // Face tags to camera
    if (this.camera) {
      for (const b of this.bots) {
        b.tag.lookAt(this.camera.position);
        b.stackTag.lookAt(this.camera.position);
        if (b.handGroup.visible) b.handGroup.lookAt(this.camera.position);
      }
      this.hud.lookAt(this.camera.position);
    }

    // Crown follow
    if (this._crown) {
      const p = this._crown.bot;
      this._crown.crown.position.copy(p.mesh.position);
      this._crown.crown.position.y = p.mesh.position.y + 0.75;
      this._crown.glow.position.copy(this._crown.crown.position);
      this._crown.glow.intensity = 0.8 + Math.sin(performance.now() * 0.006) * 0.2;
    }

    // Roamer wander
    this.updateRoamers(dt);

    // Victory lap logic
    if (this._victory) {
      this._victory.t += dt;

      // Keep winner crown for full duration
      this.setTag(this.hud, `MATCH WINNER WALKING: ${this._victory.bot.name}`, "#ffd27a");

      if (this._victory.t >= this._victory.duration) {
        // end lap, start fresh match
        this._victory = null;

        // re-seat first 8 non-busted bots (fresh stacks)
        this.assignInitialRoles();
        this.startNewHand(true);
      }
      return;
    }

    // Sim pacing
    this._stateTimer += dt;
    if (this._stateTimer < this.stepDelay) return;
    this._stateTimer = 0;

    this.tick();
  }

  updateRoamers(dt) {
    for (const r of this.roamers) {
      r.roamT += dt;
      if (r.roamT > 3.5) {
        r.roamT = 0;
        const rr = 7 + Math.random() * 4;
        const aa = Math.random() * Math.PI * 2;
        r.roamTarget.set(this.tableCenter.x + Math.cos(aa) * rr, 0.95, this.tableCenter.z + Math.sin(aa) * rr);
      }

      r.mesh.position.lerp(r.roamTarget, 0.01);

      r.tag.position.set(r.mesh.position.x, this.nameHoverY, r.mesh.position.z);
      r.stackTag.position.set(r.mesh.position.x, this.nameHoverY - 0.35, r.mesh.position.z);
      r.mesh.lookAt(new THREE.Vector3(this.tableCenter.x, r.mesh.position.y, this.tableCenter.z));
    }
  }

  tick() {
    if (this._phase === "PREFLOP") {
      // betting round (slow, readable)
      for (const p of this.seated) {
        if (!p.inHand || p.stack <= 0) continue;
        const roll = this._rng();

        if (roll < 0.12) {
          p.inHand = false; // fold
        } else if (roll < 0.28) {
          this.takeBet(p, 100); // raise
        } else {
          this.takeBet(p, 50); // call
        }
      }

      this._phase = "FLOP";
      this.setTag(this.hud, `POT: $${this.pot}  |  FLOP`, "#2bd7ff");
      return;
    }

    if (this._phase === "FLOP") {
      this._phase = "TURN";
      this.setTag(this.hud, `POT: $${this.pot}  |  TURN`, "#2bd7ff");
      return;
    }

    if (this._phase === "TURN") {
      this._phase = "RIVER";
      this.setTag(this.hud, `POT: $${this.pot}  |  RIVER`, "#2bd7ff");
      return;
    }

    if (this._phase === "RIVER") {
      this._phase = "SHOWDOWN";

      const alive = this.seated.filter(p => p.inHand && p.stack > 0 && !p.busted);
      const winner = alive.length ? alive[(Math.random() * alive.length) | 0] : this.seated[0];

      this.awardWinner(winner);

      // bust + replacements
      this.handleBustsAndReplace();

      // next hand count
      this.handIndex++;

      // match end -> winner victory lap for 60 seconds
      if (this.handIndex >= this.handsPerMatch) {
        this.startVictoryLap(winner);
        return;
      }

      // continue match
      this.startNewHand(false);
      return;
    }
  }
}
