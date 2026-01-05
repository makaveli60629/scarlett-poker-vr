// js/chair.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Chairs = {
  group: null,

  build(scene, center = new THREE.Vector3(0, 0, -6.5)) {
    this.group = new THREE.Group();
    this.group.name = "Chairs";
    scene.add(this.group);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.95 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });

    const radius = 3.6;
    const count = 6;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const x = center.x + Math.cos(t) * radius;
      const z = center.z + Math.sin(t) * radius;

      const chair = new THREE.Group();
      chair.position.set(x, 0, z);
      chair.rotation.y = -t + Math.PI; // face table

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), chairMat);
      seat.position.set(0, 0.55, 0);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.12), chairMat);
      back.position.set(0, 0.88, -0.22);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 12), accentMat);
      base.position.set(0, 0.27, 0);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 18), accentMat);
      foot.position.set(0, 0.02, 0);

      chair.add(seat, back, base, foot);
      this.group.add(chair);
    }

    return this.group;
  },
};
