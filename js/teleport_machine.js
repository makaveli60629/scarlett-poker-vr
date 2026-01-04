import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  mesh: null,

  build(scene, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.25, 22),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.85 })
    );
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.05, 18, 36),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066aa, emissiveIntensity: 1.6, roughness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.34;
    g.add(ring);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.12, 1.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x1b1c2a, roughness: 0.7, metalness: 0.2 })
    );
    pillar.position.y = 0.85;
    pillar.castShadow = true;
    g.add(pillar);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xC9A24D, emissive: 0x7a5b15, emissiveIntensity: 1.4 })
    );
    beacon.position.y = 1.48;
    g.add(beacon);

    // Click zone (your right trigger action can hit this)
    base.userData.action = "teleport_machine";
    g.userData.action = "teleport_machine";

    scene.add(g);
    this.mesh = g;
    return g;
  }
};
