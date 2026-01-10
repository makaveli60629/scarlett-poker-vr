// /js/poker_sim.js — PokerSim v2.2 (SCORPION IMMERSION + ORIGIN FROM SPAWN)
// - Anchors cards/chips to the correct table origin per mode
// - Scorpion origin derives from scorpion_seat_1 spawn (more reliable than hardcoded x/z)
// - Scorpion layout = closer, tighter, centered for focus
// - Scorpion mode: player + 4 bots + instant deal vibe
// - Lobby mode: demo loop

export const PokerSim = {
  init(ctx) {
    this.ctx = ctx;
    this.mode = "lobby_demo";
    this._t = 0;
    this._handTimer = 0;

    const { THREE, scene, log } = ctx;

    this.group = new THREE.Group();
    this.group.name = "PokerSimGroup";
    scene.add(this.group);

    // Materials
    this.matCard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    this.matCardBack = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.8, metalness: 0.05 });

    // Card geo
    this.geoCard = new THREE.PlaneGeometry(0.07, 0.10);

    this.table = {
      origin: new THREE.Vector3(0, 0.78, 0),
      yaw: 0,
      community: [],
      player: [],
      bots: [],
      // layout presets (filled per mode)
      layout: null,
    };

    log?.("[PokerSim] init ✅ visual loop");
    return this;
  },

  setMode(mode) {
    this.mode = mode;

    // reset reveal flags
    this._handTimer = 0;
    this._revealedPlayer = false;
    this._revealedFlop = false;
    this._revealedTurn = false;
    this._revealedRiver = false;

    this._clearTable();
    this._configureTableForMode(mode);
    this._startHand();

    this.ctx?.log?.(`[PokerSim] mode=${mode}`);
  },

  _getSpawn(name) {
    // SpawnPoints v3+ lives at ctx.spawns.map or ctx.spawns.get()
    const sp = this.ctx?.spawns?.get?.(name) || this.ctx?.spawns?.map?.[name] || null;
    return sp;
  },

  _configureTableForMode(mode) {
    const { THREE } = this.ctx;

    // Default: lobby anchored at known center
    let origin = new THREE.Vector3(0.0, 0.78, 0.0);
    let yaw = 0;

    // Layout presets (relative to origin)
    // These numbers are tuned to feel good in VR.
    let layout = {
      community: { startX: -0.16, dz: 0.02, y: 0.01, stepX: 0.08, zTilt: 0.04 },
      player:    { x0: -0.05, stepX: 0.09, dz: 0.22, y: 0.012, tilt: 0.08 },
      bots:      { y: 0.011, dz: 0.00, x0: -0.03, stepX: 0.06 },
      reveal:    { player: 0.8, flop: 1.6, turn: 2.4, river: 3.2, loop: 8.0 },
    };

    if (mode === "scorpion_play") {
      // ✅ Derive origin from scorpion seat spawn so cards always align with YOUR room placement.
      // Seat is at (8.00, z=0.95) facing toward table center near z~0.
      // We place table origin slightly forward from the seat, and a bit down-table.
      const seat = this._getSpawn("scorpion_seat_1");

      if (seat) {
        // Convert yaw into forward direction on XZ plane
        const fwd = new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw)); // yaw=PI => fwd=(0,-1)
        // Place table origin about 0.65m in front of the seat (toward table)
        const tableCenter = new THREE.Vector3(seat.x, 0.78, seat.z).add(fwd.multiplyScalar(0.65));
        origin = tableCenter;
        yaw = seat.yaw;
      } else {
        // fallback to your old hardcode
        origin = new THREE.Vector3(8.0, 0.78, 0.0);
        yaw = 0;
      }

      // ✅ Close-quarters scorpion layout: pull everything closer + slightly larger feel
      layout = {
        community: { startX: -0.14, dz: 0.06, y: 0.012, stepX: 0.075, zTilt: 0.035 },
        // player cards closer and more centered
        player:    { x0: -0.045, stepX: 0.085, dz: 0.18, y: 0.014, tilt: 0.10 },
        // bot cards near their seats
        bots:      { y: 0.012, dz: 0.00, x0: -0.028, stepX: 0.058 },
        // faster reveals for "instant action"
        reveal:    { player: 0.35, flop: 1.10, turn: 1.80, river: 2.50, loop: 7.0 },
      };
    }

    this.table.origin.copy(origin);
    this.table.yaw = yaw;
    this.table.layout = layout;

    // bots seats around table (relative positions around table)
    if (mode === "scorpion_play") {
      // 4 bots guaranteed
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.36, 0, -0.05) },
        { name: "Bot B", seat: new THREE.Vector3( 0.36, 0, -0.05) },
        { name: "Bot C", seat: new THREE.Vector3( 0.34, 0,  0.23) },
        { name: "Bot D", seat: new THREE.Vector3(-0.34, 0,  0.23) },
      ];
    } else {
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.30, 0,  0.20) },
        { name: "Bot B", seat: new THREE.Vector3( 0.30, 0,  0.20) },
      ];
    }
  },

  _clearTable() {
    if (!this.group) return;
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.table.community = [];
    this.table.player = [];
  },

  _startHand() {
    const base = this.table.origin;
    const L = this.table.layout;

    // Community cards
    for (let i = 0; i < 5; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + L.community.startX + i * L.community.stepX, base.y + L.community.y, base.z + L.community.dz);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i - 2) * L.community.zTilt;
      this.group.add(m);
      this.table.community.push(m);
    }

    // Player hole cards
    for (let i = 0; i < 2; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + (L.player.x0 + i * L.player.stepX), base.y + L.player.y, base.z + L.player.dz);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i === 0 ? -L.player.tilt : L.player.tilt);
      this.group.add(m);
      this.table.player.push(m);
    }

    // Bot hole cards
    for (let b = 0; b < this.table.bots.length; b++) {
      const seat = this.table.bots[b].seat;
      for (let i = 0; i < 2; i++) {
        const m = this._makeCardMesh(true);
        m.position.set(
          base.x + seat.x + (L.bots.x0 + i * L.bots.stepX),
          base.y + L.bots.y,
          base.z + seat.z + L.bots.dz
        );
        m.rotation.x = -Math.PI / 2;
        this.group.add(m);
      }
    }

    this._handTimer = 0;

    const msg =
      this.mode === "scorpion_play"
        ? "Scorpion Table: You’re seated in. (B/Y = Leave to Lobby)"
        : "Lobby Table: Demo hand";

    this.ctx?.ui?.toast?.(msg);
    this.ctx?.log?.(this.mode === "scorpion_play"
      ? "[PokerSim] 🦂 scorpion hand started (player + 4 bots)"
      : "[PokerSim] 🎲 lobby demo hand started");
  },

  _makeCardMesh(faceDown = true) {
    const mesh = new THREE.Mesh(this.geoCard, faceDown ? this.matCardBack : this.matCard);
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;
    return mesh;
  },

  update(dt) {
    if (!this.group) return;

    this._t += dt;
    this._handTimer += dt;

    const R = this.table.layout?.reveal || { player: 0.8, flop: 1.6, turn: 2.4, river: 3.2, loop: 8.0 };

    // Reveal player
    if (this._handTimer > R.player && !this._revealedPlayer) {
      this._revealedPlayer = true;
      for (const c of this.table.player) c.material = this.matCard;
    }

    // Reveal community
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
    }

    // Loop
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
