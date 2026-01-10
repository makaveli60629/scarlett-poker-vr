// /js/poker_sim.js — PokerSim v2.3 (BOTS VISIBLE + SCORPION TABLE ALIGN)
// - Same cards as v2.1
// - Adds simple bot bodies so you SEE opponents
// - Scorpion origin derives from scorpion_seat_1 and is placed forward into felt

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

    this.matCard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    this.matCardBack = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.8, metalness: 0.05 });

    this.geoCard = new THREE.PlaneGeometry(0.07, 0.10);

    // simple bot visuals
    this.geoBot = new THREE.CylinderGeometry(0.12, 0.14, 0.70, 16);
    this.matBot = new THREE.MeshStandardMaterial({ color: 0xb266ff, roughness: 0.65, metalness: 0.05 });
    this.botMeshes = [];

    this.table = {
      origin: new THREE.Vector3(0, 0.78, 0),
      yaw: 0,
      community: [],
      player: [],
      bots: [],
      layout: null,
    };

    log?.("[PokerSim] init ✅ visual loop");
    return this;
  },

  setMode(mode) {
    this.mode = mode;

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
    return this.ctx?.spawns?.get?.(name) || this.ctx?.spawns?.map?.[name] || null;
  },

  _configureTableForMode(mode) {
    const { THREE } = this.ctx;

    let origin = new THREE.Vector3(0.0, 0.78, 0.0);
    let yaw = 0;

    let layout = {
      community: { startX: -0.16, dz: 0.02, y: 0.01, stepX: 0.08, zTilt: 0.04 },
      player:    { x0: -0.05, stepX: 0.09, dz: 0.22, y: 0.012, tilt: 0.08 },
      bots:      { y: 0.011, dz: 0.00, x0: -0.03, stepX: 0.06 },
      reveal:    { player: 0.8, flop: 1.6, turn: 2.4, river: 3.2, loop: 8.0 },
    };

    if (mode === "scorpion_play") {
      const seat = this._getSpawn("scorpion_seat_1");

      if (seat) {
        // Forward direction given yaw
        const fwd = new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
        // Put table center ~0.85m in front of seat (felt)
        origin = new THREE.Vector3(seat.x, 0.78, seat.z).add(fwd.multiplyScalar(0.85));
        yaw = seat.yaw;
      } else {
        origin = new THREE.Vector3(8.0, 0.78, 0.0);
        yaw = 0;
      }

      // tighter scorpion focus
      layout = {
        community: { startX: -0.14, dz: 0.07, y: 0.012, stepX: 0.075, zTilt: 0.035 },
        player:    { x0: -0.045, stepX: 0.085, dz: 0.18, y: 0.014, tilt: 0.10 },
        bots:      { y: 0.012, dz: 0.00, x0: -0.028, stepX: 0.058 },
        reveal:    { player: 0.35, flop: 1.10, turn: 1.80, river: 2.50, loop: 7.0 },
      };

      // ✅ 4 bots guaranteed
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

    this.table.origin.copy(origin);
    this.table.yaw = yaw;
    this.table.layout = layout;
  },

  _clearTable() {
    if (!this.group) return;
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.table.community = [];
    this.table.player = [];
    this.botMeshes = [];
  },

  _startHand() {
    const base = this.table.origin;
    const L = this.table.layout;

    // --- bot bodies (so you see opponents) ---
    for (let b = 0; b < this.table.bots.length; b++) {
      const seat = this.table.bots[b].seat;
      const bot = new THREE.Mesh(this.geoBot, this.matBot);
      bot.position.set(base.x + seat.x, base.y + 0.35, base.z + seat.z);
      bot.rotation.y = this.table.yaw + Math.PI; // face toward center-ish
      bot.castShadow = true;
      bot.receiveShadow = true;
      this.group.add(bot);
      this.botMeshes.push(bot);
    }

    // --- community cards ---
    for (let i = 0; i < 5; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + L.community.startX + i * L.community.stepX, base.y + L.community.y, base.z + L.community.dz);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i - 2) * L.community.zTilt;
      this.group.add(m);
      this.table.community.push(m);
    }

    // --- player hole cards ---
    for (let i = 0; i < 2; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + (L.player.x0 + i * L.player.stepX), base.y + L.player.y, base.z + L.player.dz);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i === 0 ? -L.player.tilt : L.player.tilt);
      this.group.add(m);
      this.table.player.push(m);
    }

    // --- bot hole cards (visual only) ---
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
        ? "Scorpion Table: Dealing you in (Leave = B/Y/A/X or L/Esc)"
        : "Lobby Table: Demo hand";
    this.ctx?.ui?.toast?.(msg);
    this.ctx?.log?.(msg);
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
    }

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
