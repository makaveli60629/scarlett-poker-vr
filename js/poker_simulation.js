export const PokerSimulation = {
  THREE: null,
  scene: null,
  world: null,
  getSeats: null,
  t: 0,
  cards: [],

  init({ THREE, scene, world, getSeats }) {
    this.THREE = THREE;
    this.scene = scene;
    this.world = world;
    this.getSeats = getSeats;
    this.t = 0;
    this.clearCards();
    this.deal();
  },

  update(dt) {
    this.t += dt;
    if (this.t > 8) {
      this.t = 0;
      this.clearCards();
      this.deal();
    }
    // tiny float animation so it looks alive
    for (const c of this.cards) c.position.y = 1.05 + Math.sin((this.t + c.userData.phase) * 4) * 0.01;
  },

  clearCards() {
    for (const c of this.cards) this.scene.remove(c);
    this.cards.length = 0;
  },

  deal() {
    const seats = this.getSeats?.() || [];
    const table = this.world?.tableFocus || new this.THREE.Vector3(0, 0, -6.5);

    const cardMatA = new this.THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const cardMatB = new this.THREE.MeshStandardMaterial({ color: 0xffd6f2, roughness: 0.7 });

    for (let i = 0; i < Math.min(6, seats.length); i++) {
      const s = seats[i];
      for (let k = 0; k < 2; k++) {
        const card = new this.THREE.Mesh(
          new this.THREE.PlaneGeometry(0.18, 0.26),
          k === 0 ? cardMatA : cardMatB
        );
        card.rotation.x = -Math.PI / 2;
        card.position.set(
          s.position.x + (k * 0.08),
          1.05,
          s.position.z + 0.12
        );
        card.userData.phase = Math.random() * 10;
        this.scene.add(card);
        this.cards.push(card);
      }
    }

    // community cards area hint
    for (let i = 0; i < 5; i++) {
      const cc = new this.THREE.Mesh(
        new this.THREE.PlaneGeometry(0.18, 0.26),
        new this.THREE.MeshStandardMaterial({ color: 0xd6f7ff, roughness: 0.7 })
      );
      cc.rotation.x = -Math.PI / 2;
      cc.position.set(table.x - 0.4 + i * 0.2, 1.06, table.z);
      cc.userData.phase = Math.random() * 10;
      this.scene.add(cc);
      this.cards.push(cc);
    }
  }
};
