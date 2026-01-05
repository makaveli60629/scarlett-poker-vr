// js/poker_simulation.js — Demo dealing loop (8.0.3)
import * as THREE from "./three.js";

export const PokerSim = {
  group: null,
  tableCenter: new THREE.Vector3(0, 0, -6.5),
  seats: [],
  cardsBySeat: [],
  timer: 0,
  roundEvery: 7.0,
  dealing: false,

  build(scene, seats, tableCenter = new THREE.Vector3(0, 0, -6.5)) {
    this.tableCenter = tableCenter.clone();
    this.seats = seats || [];
    this.group = new THREE.Group();
    this.group.name = "PokerSim";
    scene.add(this.group);

    this.cardsBySeat = this.seats.map(() => []);
    this.timer = 0;
    this.dealing = false;

    // Start with a first round
    this.startRound();
    return this.group;
  },

  makeCardMesh() {
    const geo = new THREE.PlaneGeometry(0.16, 0.22);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x111111,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; // lay flat
    m.position.y = 0.86; // float above table
    return m;
  },

  clearCards() {
    for (const arr of this.cardsBySeat) {
      for (const c of arr) this.group.remove(c);
      arr.length = 0;
    }
  },

  startRound() {
    if (!this.seats?.length) return;
    this.clearCards();
    this.dealing = true;

    // Deal 2 cards per seat, one-by-one
    let step = 0;
    const totalSteps = this.seats.length * 2;

    const dealOne = () => {
      const seatIndex = step % this.seats.length;
      const cardIndex = Math.floor(step / this.seats.length);

      const seat = this.seats[seatIndex];

      // Position cards near each seat, slightly offset
      const offsetX = (cardIndex === 0 ? -0.07 : 0.07);
      const offsetZ = 0.10;

      const card = this.makeCardMesh();

      // Face the table center
      card.position.x = seat.x;
      card.position.z = seat.z;
      card.lookAt(this.tableCenter.x, 0.86, this.tableCenter.z);

      // Move inward slightly so it appears "on the rail/table edge"
      const dir = new THREE.Vector3().subVectors(this.tableCenter, seat).normalize();
      card.position.addScaledVector(dir, 0.55);

      // Card offset in local right direction
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(card.quaternion);
      card.position.addScaledVector(right, offsetX);
      card.position.addScaledVector(dir, offsetZ);

      // Slight random angle
      card.rotation.z += (Math.random() - 0.5) * 0.25;

      this.group.add(card);
      this.cardsBySeat[seatIndex].push(card);

      step++;
      if (step < totalSteps) {
        setTimeout(dealOne, 140);
      } else {
        this.dealing = false;
      }
    };

    dealOne();
  },

  update(dt) {
    if (!this.group) return;
    this.timer += dt;

    if (!this.dealing && this.timer >= this.roundEvery) {
      this.timer = 0;
      this.startRound();
    }
  },
};
