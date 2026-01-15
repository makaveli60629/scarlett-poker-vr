// /js/scarlett1/modules/cards_system.js
// Pinch near deck => deal a card to current seat (turn system).
// Cards hover nicely above felt. No physics. Quest-safe.

export class CardsSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "CardsSystem";

    this.deck = null;
    this.cards = [];

    this._handMod = null;
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    if (!table) return;

    // Deck block
    const deckMat = new this.THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.75, metalness: 0.15 });
    const deck = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.12, 0.05, 0.18), deckMat);
    deck.position.copy(table.anchors.deck);
    deck.userData.isDeck = true;
    this.group.add(deck);
    this.deck = deck;

    // Subscribe pinch
    this._handMod = world.bus.mods.find(m => m?.constructor?.name === "HandInput");
    if (this._handMod?.addPinchListener) {
      this._handMod.addPinchListener((e) => this.onPinch(e, world));
    }

    world.poker = world.poker || {};
    world.poker.cards = this;
  }

  onPinch(e, world) {
    if (!this.deck) return;

    // Must pinch near deck to deal
    if (e.jointPos.distanceTo(this.deck.position) > 0.18) return;

    const table = world?.poker?.table;
    const turn = world?.poker?.turnUI?.turnIndex ?? 0;

    const seat = table?.anchors?.seats?.[turn];
    if (!seat) return;

    this.dealTo(seat.cardZone, seat.i);
  }

  dealTo(pos, seatIndex) {
    const THREE = this.THREE;

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.05
    });

    const card = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.004, 0.095), mat);
    card.position.set(pos.x, pos.y, pos.z);
    card.rotation.y = Math.atan2(pos.x, pos.z) + Math.PI;
    card.userData.seatIndex = seatIndex;

    // hover
    card.position.y += 0.03 + (this.cards.length % 4) * 0.004;

    this.group.add(card);
    this.cards.push(card);
  }

  update() {}
}
