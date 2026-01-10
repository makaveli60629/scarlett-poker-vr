// /js/poker_sim.js — PokerSim v2.4 (POLISH PASS: DEALER + CHIPS + BOT IDLE)
// Adds:
// - Dealer hands animation (simple but effective)
// - Chips + pot + bet toss animation (visual loop)
// - Better bot bodies (body+head) + idle + look-at-table
// - Winner crown glow moment
// - Uses ctx.tables.scorpion userData.surfaceY when available
//
// Modes:
// - "lobby_demo"
// - "scorpion_play"

export const PokerSim = {
  init(ctx) {
    this.ctx = ctx;
    this.mode = "lobby_demo";

    const { THREE, scene, log } = ctx;

    this.group = new THREE.Group();
    this.group.name = "PokerSimGroup";
    scene.add(this.group);

    // --- Materials ---
    this.matCard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    this.matCardBack = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.8, metalness: 0.05 });

    // Chips
    this.matChipRed   = new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.55, metalness: 0.12 });
    this.matChipAqua  = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.55, metalness: 0.12 });
    this.matChipGold  = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45, metalness: 0.20 });

    // Bots
    this.matBotBody = new THREE.MeshStandardMaterial({ color: 0x2a2338, roughness: 0.75, metalness: 0.08 });
    this.matBotHead = new THREE.MeshStandardMaterial({ color: 0xb266ff, roughness: 0.65, metalness: 0.10 });

    // Dealer hands
    this.matHand = new THREE.MeshStandardMaterial({ color: 0xd8c1aa, roughness: 0.75, metalness: 0.02 });

    // Winner crown glow
    this.matCrown = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9 });

    // --- Geometry ---
    this.geoCard = new THREE.PlaneGeometry(0.07, 0.10);
    this.geoChip = new THREE.CylinderGeometry(0.022, 0.022, 0.008, 18);
    this.geoBotBody = new THREE.CylinderGeometry(0.12, 0.15, 0.72, 16);
    this.geoBotHead = new THREE.SphereGeometry(0.12, 16, 16);
    this.geoHand = new THREE.BoxGeometry(0.10, 0.02, 0.14);
    this.geoCrown = new THREE.TorusGeometry(0.10, 0.02, 10, 20);

    // --- State ---
    this._t = 0;
    this._handTimer = 0;
    this._betTimer = 0;

    this._revealedPlayer = false;
    this._revealedFlop = false;
    this._revealedTurn = false;
    this._revealedRiver = false;

    this.table = {
      origin: new THREE.Vector3(0, 0.78, 0),
      yaw: 0,
      surfaceY: 0.81,
      community: [],
      player: [],
      bots: [],
      botMeshes: [],
      dealerHands: [],
      chips: {
        pot: [],
        playerStack: [],
        botStacks: [],
        toss: [],
      },
      winner: { idx: -1, crown: null, until: 0 },
      layout: null,
    };

    log?.("[PokerSim] init ✅ v2.4 polish");
    return this;
  },

  setMode(mode) {
    this.mode = mode;

    this._handTimer = 0;
    this._betTimer = 0;

    this._revealedPlayer = false;
    this._revealedFlop = false;
    this._revealedTurn = false;
    this._revealedRiver = false;

    this._clearTable();
    this._configureTableForMode(mode);
    this._startHand();

    this.ctx?.log?.(`[PokerSim] mode=${mode}`);
  },

  _clearTable() {
    if (!this.group) return;
    while (this.group.children.length) this.group.remove(this.group.children[0]);

    this.table.community = [];
    this.table.player = [];
    this.table.botMeshes = [];
    this.table.dealerHands = [];
    this.table.chips = { pot: [], playerStack: [], botStacks: [], toss: [] };

    if (this.table.winner?.crown) {
      this.table.winner.crown = null;
      this.table.winner.idx = -1;
      this.table.winner.until = 0;
    }
  },

  _configureTableForMode(mode) {
    const { THREE } = this.ctx;

    // Default: lobby
    let origin = new THREE.Vector3(0.0, 0.78, 0.0);
    let yaw = 0;
    let surfaceY = 0.81;

    // Layout presets
    let layout = {
      community: { startX: -0.16, dz: 0.03, y: 0.01, stepX: 0.08, zTilt: 0.04 },
      player:    { x0: -0.05, stepX: 0.09, dz: 0.22, y: 0.012, tilt: 0.08 },
      reveal:    { player: 0.8, flop: 1.6, turn: 2.4, river: 3.2, loop: 8.0 },
      // Chip anchors
      pot:       { x: 0.00, z: 0.06 },
      playerChips:{ x: -0.22, z: 0.26 },
      betEvery:  0.95,
    };

    // Scorpion: read real table surfaceY if available
    if (mode === "scorpion_play") {
      const scTable = this.ctx?.tables?.scorpion || this.ctx?.scorpionTable;
      if (scTable?.getWorldPosition) {
        const wp = new THREE.Vector3();
        scTable.getWorldPosition(wp);

        // table is centered at scorpion room (x=8), so use its world pos
        origin = new THREE.Vector3(wp.x, 0.78, wp.z);
        yaw = scTable.rotation?.y || 0;

        // Use provided surfaceY if it exists
        surfaceY = scTable.userData?.surfaceY ?? surfaceY;
      } else {
        // fallback
        origin = new THREE.Vector3(8.0, 0.78, 0.0);
        yaw = 0;
      }

      layout = {
        community: { startX: -0.14, dz: 0.07, y: 0.012, stepX: 0.075, zTilt: 0.035 },
        player:    { x0: -0.045, stepX: 0.085, dz: 0.18, y: 0.014, tilt: 0.10 },
        reveal:    { player: 0.35, flop: 1.10, turn: 1.80, river: 2.50, loop: 7.0 },
        pot:       { x: 0.00, z: 0.06 },
        playerChips:{ x: -0.22, z: 0.23 },
        betEvery:  0.85,
      };
    }

    this.table.origin.copy(origin);
    this.table.yaw = yaw;
    this.table.surfaceY = surfaceY;
    this.table.layout = layout;

    // Seats around table (relative to origin)
    if (mode === "scorpion_play") {
      // 4 bots + you (you’re implicit; bots placed opposite/around)
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.38, 0, -0.08) },
        { name: "Bot B", seat: new THREE.Vector3( 0.38, 0, -0.08) },
        { name: "Bot C", seat: new THREE.Vector3( 0.34, 0,  0.26) },
        { name: "Bot D", seat: new THREE.Vector3(-0.34, 0,  0.26) },
      ];
    } else {
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.30, 0,  0.20) },
        { name: "Bot B", seat: new THREE.Vector3( 0.30, 0,  0.20) },
      ];
    }
  },

  _makeCard(faceDown = true) {
    const mesh = new THREE.Mesh(this.geoCard, faceDown ? this.matCardBack : this.matCard);
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;
    return mesh;
  },

  _makeChip(mat) {
    const c = new THREE.Mesh(this.geoChip, mat);
    c.castShadow = true;
    c.receiveShadow = true;
    return c;
  },

  _spawnChipStack(baseX, baseY, baseZ, count = 12) {
    const mats = [this.matChipRed, this.matChipAqua, this.matChipGold];
    const out = [];
    for (let i = 0; i < count; i++) {
      const chip = this._makeChip(mats[i % mats.length]);
      chip.position.set(baseX + (i % 3) * 0.03, baseY + i * 0.0085, baseZ + ((i % 2) ? 0.02 : 0));
      this.group.add(chip);
      out.push(chip);
    }
    return out;
  },

  _spawnBotVisual(x, y, z, lookAtX, lookAtZ) {
    const bot = new THREE.Group();

    const body = new THREE.Mesh(this.geoBotBody, this.matBotBody);
    body.position.set(0, 0.36, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    bot.add(body);

    const head = new THREE.Mesh(this.geoBotHead, this.matBotHead);
    head.position.set(0, 0.82, 0.02);
    head.castShadow = true;
    head.receiveShadow = true;
    bot.add(head);

    // face toward table center
    bot.position.set(x, y, z);
    bot.lookAt(lookAtX, y + 0.6, lookAtZ);

    // store references for idle anim
    bot.userData._head = head;
    bot.userData._baseY = y;
    bot.userData._seed = Math.random() * 10;

    this.group.add(bot);
    return bot;
  },

  _spawnDealerHands(base) {
    // Two “hands” hovering near top of table, doing subtle deal motion
    const left = new THREE.Mesh(this.geoHand, this.matHand);
    const right = new THREE.Mesh(this.geoHand, this.matHand);

    left.castShadow = true; right.castShadow = true;
    left.receiveShadow = true; right.receiveShadow = true;

    left.position.set(base.x - 0.18, this.table.surfaceY + 0.12, base.z - 0.16);
    right.position.set(base.x + 0.18, this.table.surfaceY + 0.12, base.z - 0.16);

    left.rotation.x = -0.35;
    right.rotation.x = -0.35;

    this.group.add(left);
    this.group.add(right);

    this.table.dealerHands.push(left, right);
  },

  _startHand() {
    const base = this.table.origin;
    const L = this.table.layout;

    // Dealer hands for vibe
    this._spawnDealerHands(base);

    // Bots (visible bodies + heads)
    const centerX = base.x;
    const centerZ = base.z;
    for (let i = 0; i < this.table.bots.length; i++) {
      const seat = this.table.bots[i].seat;
      const bx = base.x + seat.x;
      const bz = base.z + seat.z;
      const bot = this._spawnBotVisual(bx, 0, bz, centerX, centerZ);
      this.table.botMeshes.push(bot);
    }

    // Community (face-down)
    for (let i = 0; i < 5; i++) {
      const c = this._makeCard(true);
      c.position.set(base.x + L.community.startX + i * L.community.stepX, this.table.surfaceY + L.community.y, base.z + L.community.dz);
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = (i - 2) * L.community.zTilt;
      this.group.add(c);
      this.table.community.push(c);
    }

    // Player hole cards (face-down)
    for (let i = 0; i < 2; i++) {
      const c = this._makeCard(true);
      c.position.set(base.x + (L.player.x0 + i * L.player.stepX), this.table.surfaceY + L.player.y, base.z + L.player.dz);
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = (i === 0 ? -L.player.tilt : L.player.tilt);
      this.group.add(c);
      this.table.player.push(c);
    }

    // Bot hole cards (visual only)
    for (let b = 0; b < this.table.bots.length; b++) {
      const seat = this.table.bots[b].seat;
      for (let i = 0; i < 2; i++) {
        const c = this._makeCard(true);
        c.position.set(base.x + seat.x + (-0.03 + i * 0.06), this.table.surfaceY + 0.011, base.z + seat.z);
        c.rotation.x = -Math.PI / 2;
        this.group.add(c);
      }
    }

    // Chips + pot stacks
    // Pot at center
    this.table.chips.pot = this._spawnChipStack(base.x + L.pot.x, this.table.surfaceY + 0.01, base.z + L.pot.z, 10);

    // Player stack near your edge
    this.table.chips.playerStack = this._spawnChipStack(base.x + L.playerChips.x, this.table.surfaceY + 0.01, base.z + L.playerChips.z, 12);

    // Each bot gets a small stack
    this.table.chips.botStacks = [];
    for (let b = 0; b < this.table.bots.length; b++) {
      const seat = this.table.bots[b].seat;
      const stack = this._spawnChipStack(base.x + seat.x * 0.95, this.table.surfaceY + 0.01, base.z + seat.z * 0.95, 8);
      this.table.chips.botStacks.push(stack);
    }

    // HUD-ish message
    const msg =
      this.mode === "scorpion_play"
        ? "Scorpion Table: Dealing you in (Leave = B/Y/A/X or L/Esc)"
        : "Lobby Table: Demo hand";
    this.ctx?.ui?.toast?.(msg);
    this.ctx?.log?.(msg);

    // reset timers
    this._handTimer = 0;
    this._betTimer = 0;
  },

  _tossChip(from, to, mat) {
    const { THREE } = this.ctx;
    const chip = this._makeChip(mat);
    chip.position.copy(from);
    chip.userData = {
      t: 0,
      dur: 0.55 + Math.random() * 0.25,
      from: from.clone(),
      to: to.clone(),
      arc: 0.18 + Math.random() * 0.10,
      spin: (Math.random() * 8 - 4),
    };
    this.group.add(chip);
    this.table.chips.toss.push(chip);
  },

  _showWinnerCrown(botIdx) {
    if (botIdx < 0 || botIdx >= this.table.botMeshes.length) return;

    const bot = this.table.botMeshes[botIdx];
    const crown = new this.ctx.THREE.Mesh(this.geoCrown, this.matCrown);
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0, 1.05, 0);
    bot.add(crown);

    this.table.winner = {
      idx: botIdx,
      crown,
      until: this._t + 1.2,
    };
  },

  update(dt) {
    if (!this.group) return;

    this._t += dt;
    this._handTimer += dt;
    this._betTimer += dt;

    const L = this.table.layout;
    const R = L?.reveal || { player: 0.8, flop: 1.6, turn: 2.4, river: 3.2, loop: 8.0 };

    // --- Bot idle + look motion ---
    for (let i = 0; i < this.table.botMeshes.length; i++) {
      const bot = this.table.botMeshes[i];
      const seed = bot.userData._seed || 0;
      const head = bot.userData._head;

      const bob = Math.sin(this._t * 1.2 + seed) * 0.015;
      bot.position.y = bob;

      // head turns slightly as reveals happen
      if (head) {
        const focus = this._revealedRiver ? 0.35 : this._revealedFlop ? 0.25 : 0.15;
        head.rotation.y = Math.sin(this._t * 1.6 + seed) * focus;
      }
    }

    // --- Dealer hand motion ---
    if (this.table.dealerHands.length === 2) {
      const [left, right] = this.table.dealerHands;
      const s = Math.sin(this._t * 2.5) * 0.04;
      left.position.x += (s - left.userData._lastS || 0);
      right.position.x -= (s - right.userData._lastS || 0);
      left.userData._lastS = s;
      right.userData._lastS = s;
    }

    // --- Reveal staged ---
    if (this._handTimer > R.player && !this._revealedPlayer) {
      this._revealedPlayer = true;
      for (const c of this.table.player) c.material = this.matCard;
    }

    if (this._handTimer > R.flop && !this._revealedFlop) {
      this._revealedFlop = true;
      for (let i = 0; i < 3; i++) this.table.community[i].material = this.matCard;
    }

    if (this._handTimer > R.turn && !this._revealedTurn) {
      this._revealedTurn = true;
      this.table.community[3].material = this.matCard;
    }

    if (this._handTimer > R.river && !this._revealedRiver) {
      this._revealedRiver = true;
      this.table.community[4].material = this.matCard;

      // crown moment: pick a random bot as "winner"
      if (this.table.botMeshes.length) {
        const w = Math.floor(Math.random() * this.table.botMeshes.length);
        this._showWinnerCrown(w);
      }
    }

    // --- Betting chip toss loop ---
    if (this._betTimer > (L?.betEvery ?? 0.9)) {
      this._betTimer = 0;

      const base = this.table.origin;
      const pot = new this.ctx.THREE.Vector3(base.x + L.pot.x, this.table.surfaceY + 0.04, base.z + L.pot.z);

      // pick a random bettor: player or bot
      const r = Math.random();
      if (r < 0.35) {
        // player toss
        const from = new this.ctx.THREE.Vector3(base.x + L.playerChips.x, this.table.surfaceY + 0.05, base.z + L.playerChips.z);
        this._tossChip(from, pot, this.matChipGold);
      } else {
        // bot toss
        if (this.table.bots.length) {
          const bi = Math.floor(Math.random() * this.table.bots.length);
          const seat = this.table.bots[bi].seat;
          const from = new this.ctx.THREE.Vector3(base.x + seat.x * 0.92, this.table.surfaceY + 0.05, base.z + seat.z * 0.92);
          this._tossChip(from, pot, (Math.random() < 0.5 ? this.matChipAqua : this.matChipRed));
        }
      }
    }

    // Animate tossed chips along arc to pot, then "merge"
    for (let i = this.table.chips.toss.length - 1; i >= 0; i--) {
      const chip = this.table.chips.toss[i];
      const u = chip.userData;
      u.t += dt;
      const p = Math.min(1, u.t / u.dur);

      // smooth step
      const t = p * p * (3 - 2 * p);

      // lerp
      chip.position.x = u.from.x + (u.to.x - u.from.x) * t;
      chip.position.z = u.from.z + (u.to.z - u.from.z) * t;
      chip.position.y = u.from.y + (u.to.y - u.from.y) * t + Math.sin(Math.PI * t) * u.arc;

      chip.rotation.y += u.spin * dt;
      chip.rotation.x = Math.PI / 2;

      if (p >= 1) {
        // remove chip and "thicken" the pot visually by nudging top chips a bit
        this.group.remove(chip);
        this.table.chips.toss.splice(i, 1);

        for (let k = 0; k < this.table.chips.pot.length; k++) {
          this.table.chips.pot[k].position.y += 0.002;
        }
      }
    }

    // Winner crown timeout
    if (this.table.winner?.crown && this._t > this.table.winner.until) {
      const bot = this.table.botMeshes[this.table.winner.idx];
      if (bot) bot.remove(this.table.winner.crown);
      this.table.winner = { idx: -1, crown: null, until: 0 };
    }

    // --- Loop hand ---
    if (this._handTimer > R.loop) {
      this._revealedPlayer = false;
      this._revealedFlop = false;
      this._revealedTurn = false;
      this._revealedRiver = false;

      this._clearTable();
      this._configureTableForMode(this.mode);
      this._startHand();
    }
  },
};
