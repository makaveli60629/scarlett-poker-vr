// /js/scarlett1/modules/poker_table_system.js
// Builds a Quest-safe poker table in your pit center.
// Provides anchors: seats[], pot, deck, betting spots.
// Also marks table top as teleportSurface=false (so you don't teleport onto table).

export class PokerTableSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "PokerTableSystem";

    this.table = null;
    this.felt = null;

    this.anchors = {
      center: new THREE.Vector3(0, 0, 0),
      seats: [],
      pot: new THREE.Vector3(0, 0, 0),
      deck: new THREE.Vector3(0, 0, 0),
      statusPanel: new THREE.Vector3(0, 0, 0),
    };

    this.cfg = {
      shape: "oval", // "oval" or "round"
      seats: 8,
      tableY: 0.78,      // top height
      radiusX: 2.65,
      radiusZ: 1.95
    };
  }

  async init({ world }) {
    const THREE = this.THREE;

    this.scene.add(this.group);

    // Materials
    const wood = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.75, metalness: 0.12 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.55, metalness: 0.22 });
    const felt = new THREE.MeshStandardMaterial({ color: 0x0a3a2a, roughness: 0.95, metalness: 0.02 });

    // Table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.55, 0.65, 28),
      wood
    );
    base.position.set(0, 0.32, 0);

    // Table top (oval via scaled cylinder)
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.16, 48),
      rail
    );
    top.scale.set(this.cfg.radiusX, 1, this.cfg.radiusZ);
    top.position.set(0, this.cfg.tableY, 0);

    // Felt inset
    const feltMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.07, 48),
      felt
    );
    feltMesh.scale.set(this.cfg.radiusX * 0.92, 1, this.cfg.radiusZ * 0.92);
    feltMesh.position.set(0, this.cfg.tableY + 0.02, 0);

    // Mark table as NOT teleport surface
    top.userData.teleportSurface = false;
    feltMesh.userData.teleportSurface = false;

    this.group.add(base, top, feltMesh);
    this.table = top;
    this.felt = feltMesh;

    // Seat anchors around the table
    this._buildAnchors();

    // Optional: tiny neon edge ring
    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.02, 10, 80),
      new THREE.MeshStandardMaterial({ color: 0x061a22, emissive: 0x00e5ff, emissiveIntensity: 0.7, roughness: 0.6, metalness: 0.2 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.set(0, this.cfg.tableY + 0.10, 0);
    edge.scale.set(this.cfg.radiusX, 1, this.cfg.radiusZ);
    this.group.add(edge);

    // Expose to world so other modules can find
    world.poker = world.poker || {};
    world.poker.table = this;
  }

  _buildAnchors() {
    const THREE = this.THREE;

    this.anchors.center.set(0, this.cfg.tableY, 0);
    this.anchors.pot.set(0, this.cfg.tableY + 0.05, 0.15);
    this.anchors.deck.set(-0.65, this.cfg.tableY + 0.06, -0.45);

    // a place for UI panel in world space (near “status wall” vibe)
    this.anchors.statusPanel.set(0, 1.7, -6.5);

    this.anchors.seats.length = 0;
    const n = this.cfg.seats;

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * (this.cfg.radiusX + 0.55);
      const z = Math.sin(a) * (this.cfg.radiusZ + 0.55);
      const seat = new THREE.Vector3(x, 0, z);

      // Each seat gets: seatPos + cardZone + chipZone
      const cardZone = new THREE.Vector3(
        Math.cos(a) * (this.cfg.radiusX * 0.55),
        this.cfg.tableY + 0.06,
        Math.sin(a) * (this.cfg.radiusZ * 0.55)
      );

      const chipZone = new THREE.Vector3(
        Math.cos(a) * (this.cfg.radiusX * 0.72),
        this.cfg.tableY + 0.06,
        Math.sin(a) * (this.cfg.radiusZ * 0.72)
      );

      this.anchors.seats.push({ i, a, seat, cardZone, chipZone });
    }
  }

  update() {}
                              }
