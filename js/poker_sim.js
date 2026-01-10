// /js/poker_sim.js — PokerSim v2 (FULL)
// Visual-only poker loop: creates cards, deals to seats, cycles.
// Modes: "lobby_demo" and "scorpion_table".

export const PokerSim = {
  async init(ctx) {
    this.ctx = ctx;
    this.mode = "lobby_demo";
    this.humanSeat = 0;

    this._buildCardAssets(ctx);
    this._buildLobbyDemoTable(ctx);

    ctx.log?.("[poker] init ✅ (cards + dealer loop ready)");
  },

  setMode(mode) {
    this.mode = mode || "lobby_demo";
    this.ctx?.log?.(`[poker] mode=${this.mode}`);

    // show/hide lobby demo
    if (this.lobbyGroup) this.lobbyGroup.visible = (this.mode === "lobby_demo");

    // scorpion room cards live inside scorpion group
    // we'll spawn scorpion set on demand
    if (this.mode === "scorpion_table") {
      if (!this.scorpionCardsBuilt) this._buildScorpionCards(this.ctx);
      this._startLoop();
    }
  },

  setHumanSeat(i) {
    this.humanSeat = i | 0;
  },

  // ---------- internals ----------
  _buildCardAssets(ctx) {
    const { THREE } = ctx;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 256; cardCanvas.height = 356;
    const g = cardCanvas.getContext("2d");

    // front texture (simple)
    g.fillStyle = "#f8fafc";
    g.fillRect(0, 0, 256, 356);
    g.strokeStyle = "#111827";
    g.lineWidth = 8;
    g.strokeRect(8, 8, 240, 340);
    g.fillStyle = "#111827";
    g.font = "bold 54px system-ui, Arial";
    g.fillText("A♠", 24, 72);

    const frontTex = new THREE.CanvasTexture(cardCanvas);

    // back texture
    const backCanvas = document.createElement("canvas");
    backCanvas.width = 256; backCanvas.height = 356;
    const b = backCanvas.getContext("2d");
    b.fillStyle = "#0b1220";
    b.fillRect(0, 0, 256, 356);
    b.fillStyle = "#7fe7ff";
    for (let y = 18; y < 356; y += 26) {
      for (let x = 18; x < 256; x += 26) {
        b.fillRect(x, y, 8, 8);
      }
    }
    b.strokeStyle = "#e8ecff";
    b.lineWidth = 8;
    b.strokeRect(8, 8, 240, 340);

    const backTex = new THREE.CanvasTexture(backCanvas);

    this.cardGeo = new THREE.PlaneGeometry(0.18, 0.25);
    this.cardFrontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.6, metalness: 0.05 });
    this.cardBackMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.6, metalness: 0.05 });
  },

  _buildLobbyDemoTable(ctx) {
    const { THREE, scene } = ctx;

    const group = new THREE.Group();
    group.name = "LobbyDemoPoker";
    scene.add(group);
    this.lobbyGroup = group;

    // simple small table for “bots playing in front”
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f2a1d, roughness: 0.9, metalness: 0.05 })
    );
    t.position.set(0, 0.75, -2.8);
    group.add(t);

    // community cards for demo
    this.lobbyCards = [];
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(this.cardGeo, this.cardFrontMat);
      c.position.set(-0.36 + i * 0.18, 0.83, -2.8);
      c.rotation.x = -Math.PI / 2;
      group.add(c);
      this.lobbyCards.push(c);
    }
  },

  _buildScorpionCards(ctx) {
    const { THREE } = ctx;
    const room = ctx?.scorpion;
    if (!room?.group || !room?.tableTop) return;

    // Community cards on scorpion table
    this.scorpionCommunity = [];
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(this.cardGeo, this.cardBackMat);
      c.position.set(-0.32 + i * 0.16, 0.86, 0);
      c.rotation.x = -Math.PI / 2;
      room.group.add(c);
      this.scorpionCommunity.push(c);
    }

    // Hole cards per seat (5 seats total)
    this.scorpionHole = [];
    for (let s = 0; s < 5; s++) {
      const arr = [];
      for (let k = 0; k < 2; k++) {
        const c = new THREE.Mesh(this.cardGeo, this.cardBackMat);
        c.rotation.x = -Math.PI / 2;
        room.group.add(c);
        arr.push(c);
      }
      this.scorpionHole.push(arr);
    }

    this.scorpionCardsBuilt = true;
    this._layoutScorpionCards(ctx);
    this._startLoop();

    ctx.log?.("[poker] scorpion cards built ✅");
  },

  _layoutScorpionCards(ctx) {
    const room = ctx.scorpion;
    const seats = room?.seats;
    if (!seats) return;

    // place each seat's two cards near the table edge facing that seat
    for (let i = 0; i < 5; i++) {
      const seat = seats[i];
      const forward = new ctx.THREE.Vector3(0, 0, -1).applyEuler(seat.rotation);
      const right = new ctx.THREE.Vector3(1, 0, 0).applyEuler(seat.rotation);

      const base = room.tableTop.position.clone()
        .add(forward.multiplyScalar(0.65))
        .add(new ctx.THREE.Vector3(0, 0.09, 0));

      const c0 = this.scorpionHole[i][0];
      const c1 = this.scorpionHole[i][1];

      c0.position.copy(base.clone().add(right.clone().multiplyScalar(-0.09)));
      c1.position.copy(base.clone().add(right.clone().multiplyScalar(0.09)));

      // rotate to face seat
      c0.rotation.y = seat.rotation.y;
      c1.rotation.y = seat.rotation.y;
    }
  },

  _startLoop() {
    if (this._looping) return;
    this._looping = true;

    const tick = () => {
      if (!this._looping) return;

      // only animate when in scorpion_table mode
      if (this.mode === "scorpion_table" && this.scorpionCardsBuilt) {
        this._cycleDeal();
      }

      setTimeout(tick, 1600);
    };

    tick();
  },

  _cycleDeal() {
    // flip some cards so you SEE action right away
    this._step = (this._step || 0) + 1;

    // reveal community gradually
    const n = Math.min(5, Math.floor(this._step / 2));
    for (let i = 0; i < 5; i++) {
      const mat = (i < n) ? this.cardFrontMat : this.cardBackMat;
      this.scorpionCommunity[i].material = mat;
    }

    // reveal human seat hole cards so player sees theirs
    const hs = this.humanSeat || 0;
    this.scorpionHole[hs][0].material = this.cardFrontMat;
    this.scorpionHole[hs][1].material = this.cardFrontMat;
  },
};
