// Scarlett Poker VR — World v4.2 BASELINE

export class World {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;
  }

  async init() {
    console.log("WORLD INIT START");

    // FLOOR
    const floor = new this.THREE.Mesh(
      new this.THREE.CircleGeometry(20, 64),
      new this.THREE.MeshStandardMaterial({
        color: 0x0b2a2a,
        metalness: 0.2,
        roughness: 0.8
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // CENTER MARKER
    const marker = new this.THREE.Mesh(
      new this.THREE.TorusGeometry(1, 0.05, 16, 64),
      new this.THREE.MeshStandardMaterial({ color: 0x33ffcc })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.01;
    this.scene.add(marker);

    // TABLE PLACEHOLDER
    const table = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(2.2, 2.2, 0.4, 64),
      new this.THREE.MeshStandardMaterial({ color: 0x552200 })
    );
    table.position.y = 0.2;
    this.scene.add(table);

    console.log("WORLD READY");
  }

  update() {
    // future: chips, bots, UI, hands
  }
}
