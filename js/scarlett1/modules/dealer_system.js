// /js/scarlett1/modules/dealer_system.js
// Dealer button: flat on felt, rotates correctly.
// Auto-advances dealer every 12 seconds (demo). Later: connect to hand results.

export class DealerSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "DealerSystem";

    this.button = null;
    this.dealerIndex = 0;
    this._timer = 0;
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    const anchor = table?.anchors?.pot || new this.THREE.Vector3(0, 0.85, 0);

    const mat = new this.THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.35,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    });

    // Flat disk
    const disk = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.14, 0.14, 0.02, 24),
      mat
    );
    disk.rotation.x = 0; // cylinder is already upright; we place on table top (y)
    disk.position.set(anchor.x + 0.25, anchor.y, anchor.z - 0.05);

    // Small notch indicator (so you can see facing)
    const notch = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(0.06, 0.01, 0.03),
      new this.THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6 })
    );
    notch.position.set(0.08, 0.02, 0);
    disk.add(notch);

    this.group.add(disk);
    this.button = disk;

    world.poker = world.poker || {};
    world.poker.dealer = this;
  }

  setDealer(i, seatsCount) {
    this.dealerIndex = ((i % seatsCount) + seatsCount) % seatsCount;

    // Position near that seat, but on felt edge
    // (we compute from table anchors if present)
    // If no table, just rotate in place.
  }

  update({ dt, world }) {
    const table = world?.poker?.table;
    if (!table?.anchors?.seats?.length || !this.button) return;

    // Demo rotate dealer slowly through seats
    this._timer += dt;
    if (this._timer > 12) {
      this._timer = 0;
      this.dealerIndex = (this.dealerIndex + 1) % table.anchors.seats.length;
    }

    const seat = table.anchors.seats[this.dealerIndex];
    const p = seat.chipZone.clone();
    p.multiplyScalar(0.72);
    p.y = table.cfg.tableY + 0.045;

    this.button.position.lerp(p, 1 - Math.pow(0.001, dt));

    // Face toward center
    const yaw = Math.atan2(-p.x, -p.z);
    this.button.rotation.y = yaw;
  }
}
