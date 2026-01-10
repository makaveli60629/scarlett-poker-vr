// /js/poker_sim.js — PokerSim v2.1 (DUAL TABLE: LOBBY + SCORPION)
// - Anchors cards/chips to the correct table origin per mode
// - Scorpion mode: player sits + 4 bots + instant deal
// - Lobby mode: demo loop

export const PokerSim = {
  init(ctx) {
    this.ctx = ctx;
    this.mode = "lobby_demo";
    this._t = 0;
    this._handTimer = 0;

    const { THREE, scene, log } = ctx;

    // root group for all poker visuals
    this.group = new THREE.Group();
    this.group.name = "PokerSimGroup";
    scene.add(this.group);

    // Materials (simple, readable)
    this.matCard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    this.matCardBack = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.8, metalness: 0.05 });

    // Card geometry
    this.geoCard = new THREE.PlaneGeometry(0.07, 0.10); // ~poker card aspect in VR scale

    // Active table visuals
    this.table = {
      origin: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      community: [],
      player: [],
      bots: [],
    };

    log?.("[PokerSim] init ✅ visual loop");
    return this;
  },

  setMode(mode) {
    this.mode = mode;
    this._handTimer = 0;

    // rebuild visuals for that table
    this._clearTable();
    this._configureTableForMode(mode);
    this._startHand();

    this.ctx?.log?.(`[PokerSim] mode=${mode}`);
  },

  _configureTableForMode(mode) {
    const { THREE } = this.ctx;

    // Default lobby
    let origin = new THREE.Vector3(0, 0.78, 0.0); // y is felt height-ish
    let yaw = 0;

    if (mode === "scorpion_play") {
      origin = new THREE.Vector3(8.0, 0.78, 0.0); // Scorpion table center area
      yaw = 0;
    }

    this.table.origin.copy(origin);
    this.table.yaw = yaw;

    // seats (relative positions around table)
    // We'll do: player near near-side, bots around
    if (mode === "scorpion_play") {
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.35, 0, -0.10) },
        { name: "Bot B", seat: new THREE.Vector3( 0.35, 0, -0.10) },
        { name: "Bot C", seat: new THREE.Vector3( 0.35, 0,  0.20) },
        { name: "Bot D", seat: new THREE.Vector3(-0.35, 0,  0.20) },
      ];
    } else {
      // lobby demo can be lighter
      this.table.bots = [
        { name: "Bot A", seat: new THREE.Vector3(-0.30, 0,  0.20) },
        { name: "Bot B", seat: new THREE.Vector3( 0.30, 0,  0.20) },
      ];
    }
  },

  _clearTable() {
    // remove all meshes from group
    if (!this.group) return;
    while (this.group.children.length) this.group.remove(this.group.children[0]);

    this.table.community = [];
    this.table.player = [];
  },

  _startHand() {
    // Create community (5 face-down) + player (2 face-down) + bot cards (optional visual)
    const { THREE } = this.ctx;

    const base = this.table.origin;

    // Community cards: centered, small fan
    const commStartX = -0.16;
    for (let i = 0; i < 5; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + commStartX + i * 0.08, base.y + 0.01, base.z + 0.02);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i - 2) * 0.04;
      this.group.add(m);
      this.table.community.push(m);
    }

    // Player hole cards: closer to player edge for immersion focus
    for (let i = 0; i < 2; i++) {
      const m = this._makeCardMesh(true);
      m.position.set(base.x + (-0.05 + i * 0.09), base.y + 0.012, base.z + 0.22);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i === 0 ? -0.08 : 0.08);
      this.group.add(m);
      this.table.player.push(m);
    }

    // Optional: bot hole cards (face-down near their seats)
    for (let b = 0; b < this.table.bots.length; b++) {
      const seat = this.table.bots[b].seat;
      for (let i = 0; i < 2; i++) {
        const m = this._makeCardMesh(true);
        m.position.set(base.x + seat.x + (-0.03 + i * 0.06), base.y + 0.011, base.z + seat.z);
        m.rotation.x = -Math.PI / 2;
        this.group.add(m);
      }
    }

    // Make it feel instant
    this._handTimer = 0;

    // HUD-ish notification (if you have a UI system, use it)
    this.ctx?.ui?.toast?.(
      this.mode === "scorpion_play"
        ? "Scorpion Table: Dealing you in (B/Y = Leave)"
        : "Lobby Table: Demo hand"
    );

    this.ctx?.log?.(
      this.mode === "scorpion_play"
        ? "[PokerSim] 🦂 scorpion hand started (player + 4 bots)"
        : "[PokerSim] 🎲 lobby demo hand started"
    );
  },

  _makeCardMesh(faceDown = true) {
    const { THREE } = this.ctx;
    const mesh = new THREE.Mesh(this.geoCard, faceDown ? this.matCardBack : this.matCard);
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;
    return mesh;
  },

  update(dt) {
    if (!this.group) return;

    this._t += dt;
    this._handTimer += dt;

    // Simple staged reveal for vibe (not full poker logic yet)
    // 0.8s: reveal player cards
    if (this._handTimer > 0.8 && !this._revealedPlayer) {
      this._revealedPlayer = true;
      for (const c of this.table.player) c.material = this.matCard;
    }

    // 1.6s / 2.4s / 3.2s: reveal community 3/1/1
    if (this._handTimer > 1.6 && !this._revealedFlop) {
      this._revealedFlop = true;
      for (let i = 0; i < 3; i++) this.table.community[i].material = this.matCard;
    }
    if (this._handTimer > 2.4 && !this._revealedTurn) {
      this._revealedTurn = true;
      this.table.community[3].material = this.matCard;
    }
    if (this._handTimer > 3.2 && !this._revealedRiver) {
      this._revealedRiver = true;
      this.table.community[4].material = this.matCard;
    }

    // restart hand loop every ~8 seconds (keeps it lively)
    if (this._handTimer > 8.0) {
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
