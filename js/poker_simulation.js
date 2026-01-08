// /js/poker_simulation.js — Watchable Poker Loop 9.0
// Visible cards hovering per seat + rotating rounds + winner crown + chip stacks.

export const PokerSimulation = {
  inited: false,
  t: 0,
  round: 0,
  phase: "deal",
  phaseT: 0,

  cards: [],
  chips: [],
  lastWinner: 0,

  init({ THREE, scene, world, bots, seats, tableFocus, tex, log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.world = world;
    this.bots = bots;
    this.seats = seats;
    this.tableFocus = tableFocus;
    this.tex = tex;
    this.log = log;

    this.t = 0;
    this.round = 0;
    this.phase = "deal";
    this.phaseT = 0;

    // clear old
    for (const m of this.cards) m.removeFromParent?.();
    for (const m of this.chips) m.removeFromParent?.();
    this.cards = [];
    this.chips = [];

    // card texture
    const cardBack = tex?.load ? tex.load("assets/textures/Card back.jpg") : null;
    if (cardBack) cardBack.colorSpace = THREE.SRGBColorSpace;

    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cardBack || null,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true
    });

    // make 2 hover cards per seat
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      for (let c = 0; c < 2; c++) {
        const card = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.32), cardMat);
        card.position.set(s.position.x + (c * 0.12 - 0.06), 1.15, s.position.z);
        card.rotation.x = -Math.PI / 2;
        card.userData.seatIndex = i;
        card.userData.cardIndex = c;
        this.scene.add(card);
        this.cards.push(card);
      }
    }

    // chip stacks on table (flat + stacked)
    const chipTex = tex?.load ? tex.load("assets/textures/chip_1000.jpg") : null;
    if (chipTex) chipTex.colorSpace = THREE.SRGBColorSpace;

    const chipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: chipTex || null,
      roughness: 0.65
    });

    const chipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18);

    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      const stack = new THREE.Group();
      stack.position.set(
        (s.position.x + tableFocus.x) * 0.5,
        1.03,
        (s.position.z + tableFocus.z) * 0.5
      );

      const count = 10;
      for (let k = 0; k < count; k++) {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.y = k * 0.021; // stacked up
        stack.add(chip);
      }
      this.scene.add(stack);
      this.chips.push(stack);
    }

    this.inited = true;
    log("[PokerSimulation] init ✅");
  },

  update(dt) {
    if (!this.inited) return;
    this.t += dt;
    this.phaseT += dt;

    // animate hover cards (bob + slight rotate)
    for (const card of this.cards) {
      const i = card.userData.seatIndex;
      const baseY = 1.12;
      card.position.y = baseY + Math.sin(this.t * 2.2 + i) * 0.02;
      card.rotation.z = Math.sin(this.t * 1.4 + i) * 0.08;
    }

    // rotate phases every ~10s
    if (this.phaseT > 10) {
      this.phaseT = 0;
      this.round++;

      // pick winner
      const winnerSeat = this.round % 6;
      this.lastWinner = winnerSeat;

      // crown on the winner bot (seat index matches bot id 0-5)
      if (this.bots?.setWinner) this.bots.setWinner(winnerSeat, true);

      this.log?.(`[PokerSimulation] Round ${this.round} winner seat ${winnerSeat + 1}`);
    }
  }
};
