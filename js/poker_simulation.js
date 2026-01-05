// js/poker_simulation.js — Minimal Auto-Deal Loop (8.0.5)
import * as THREE from "./three.js";

export const PokerSim = {
  seats: [],
  center: new THREE.Vector3(),
  bots: [],
  cards: [],
  timer: 0,
  step: 0,
  running: false,

  build(scene, seats, center, bots = []) {
    this.seats = seats || [];
    this.center = center ? center.clone() : new THREE.Vector3(0, 0, 0);
    this.bots = bots || [];
    this.cards = [];
    this.timer = 0;
    this.step = 0;
    this.running = true;

    // Make a small “deck” indicator on the table (visual anchor)
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })
    );
    deck.position.set(this.center.x, 1.08, this.center.z); // near table top height
    deck.name = "DeckBlock";
    scene.add(deck);

    this._scene = scene;
  },

  makeCard() {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.0,
        emissive: 0x111111,
        emissiveIntensity: 0.15,
        side: THREE.DoubleSide,
      })
    );
    card.rotation.x = -Math.PI / 2; // lie flat while moving
    card.position.set(this.center.x, 1.12, this.center.z); // start at deck
    card.userData = { t: 0, start: card.position.clone(), end: card.position.clone() };
    return card;
  },

  dealToSeat(seat) {
    const card = this.makeCard();

    // End position: in front of the bot, closer to table
    const dirToCenter = new THREE.Vector3().subVectors(this.center, seat.position).normalize();
    const end = seat.position.clone()
      .add(dirToCenter.multiplyScalar(0.55)); // push toward table

    end.y = 1.08;

    card.userData.start = card.position.clone();
    card.userData.end = end.clone();
    card.userData.t = 0;

    this._scene.add(card);
    this.cards.push(card);
  },

  update(dt) {
    if (!this.running) return;

    // Animate existing cards
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const c = this.cards[i];
      c.userData.t += dt * 1.8;
      const t = Math.min(c.userData.t, 1);

      c.position.lerpVectors(c.userData.start, c.userData.end, t);
      c.rotation.y += dt * 0.4;

      if (t >= 1) {
        // leave card there for a bit, then remove later
        c.userData.life = (c.userData.life ?? 0) + dt;
        if (c.userData.life > 4.5) {
          this._scene.remove(c);
          this.cards.splice(i, 1);
        }
      }
    }

    // Deal loop
    this.timer += dt;

    // every ~0.6 sec, deal one card to the next seat
    if (this.timer > 0.6) {
      this.timer = 0;

      if (!this.seats.length) return;

      const seat = this.seats[this.step % this.seats.length];
      this.dealToSeat(seat);

      this.step++;

      // after full round, pause slightly
      if (this.step % this.seats.length === 0) {
        this.timer = -0.9; // small pause
      }
    }
  },
};
