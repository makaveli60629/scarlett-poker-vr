import * as THREE from "three";

export const Table = {
  create() {
    const g = new THREE.Group();
    g.name = "poker_table";

    // Oval top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0d3b2a, roughness: 0.85, metalness: 0.05 })
    );
    top.scale.set(1.25, 1.0, 0.85); // oval
    top.position.y = 0.88;
    g.add(top);

    // Rail (outer rim)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.14, 18, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.7, metalness: 0.05 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.scale.set(1.25, 1.0, 0.85);
    rail.position.y = 0.96;
    g.add(rail);

    // Base pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 0.85, 32),
      new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 })
    );
    base.position.y = 0.42;
    g.add(base);

    // Foot
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.95 })
    );
    foot.position.y = 0.06;
    g.add(foot);

    return g;
  }
};
