// /js/scarlett1/modules/hand_boxes_system.js — Update 4.2
// Visible "box hands" zones on the felt for each seat.
// Highlights current turn + your seat.

export class HandBoxesSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "HandBoxesSystem";

    this.boxes = []; // per seat
    this.activeTurn = 0;
    this.mySeat = null;
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    if (!table?.anchors?.seats?.length) return;

    const baseMat = new this.THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      emissive: 0x001018,
      emissiveIntensity: 0.25,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.75
    });

    const turnMat = new this.THREE.MeshStandardMaterial({
      color: 0x06202a,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.65,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    const myMat = new this.THREE.MeshStandardMaterial({
      color: 0x1a081a,
      emissive: 0xff2bd6,
      emissiveIntensity: 0.6,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88
    });

    const geo = new this.THREE.BoxGeometry(0.28, 0.01, 0.42);

    for (const s of table.anchors.seats) {
      const g = new this.THREE.Group();
      g.name = `HAND_BOX_${s.i}`;

      const b1 = new this.THREE.Mesh(geo, baseMat);
      const b2 = new this.THREE.Mesh(geo, baseMat);

      b1.position.set(s.cardZone.x - 0.16, s.cardZone.y, s.cardZone.z);
      b2.position.set(s.cardZone.x + 0.16, s.cardZone.y, s.cardZone.z);

      // face roughly to center
      const yaw = Math.atan2(s.cardZone.x, s.cardZone.z) + Math.PI;
      b1.rotation.y = yaw;
      b2.rotation.y = yaw;

      g.add(b1, b2);
      this.group.add(g);

      this.boxes.push({
        seatIndex: s.i,
        a: s.a,
        b1, b2,
        baseMat, turnMat, myMat
      });
    }

    world.poker = world.poker || {};
    world.poker.handBoxes = this;
  }

  setTurn(turnIndex) {
    this.activeTurn = turnIndex ?? 0;
    this._applyMats();
  }

  setSeat(seatIndexOrNull) {
    this.mySeat = (seatIndexOrNull === null || seatIndexOrNull === undefined) ? null : seatIndexOrNull;
    this._applyMats();
  }

  _applyMats() {
    for (const b of this.boxes) {
      const isTurn = b.seatIndex === this.activeTurn;
      const isMine = (this.mySeat !== null && b.seatIndex === this.mySeat);

      const mat = isMine ? b.myMat : (isTurn ? b.turnMat : b.baseMat);
      b.b1.material = mat;
      b.b2.material = mat;
    }
  }

  update({ world }) {
    // Sync with TurnUI if present
    const ti = world?.poker?.turnUI?.turnIndex ?? this.activeTurn;
    if (ti !== this.activeTurn) {
      this.activeTurn = ti;
      this._applyMats();
    }
  }
}
