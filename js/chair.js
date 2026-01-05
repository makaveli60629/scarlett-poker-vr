// js/chair.js — GitHub Pages SAFE
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Chair = {
  buildSet(scene, center = { x: 0, z: 0 }, count = 6) {
    const chairs = [];
    const radius = 3.7;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;

      const chair = new THREE.Group();
      chair.name = `Chair_${i}`;

      chair.position.set(center.x + Math.sin(a) * radius, 0, center.z + Math.cos(a) * radius);
      chair.rotation.y = a + Math.PI;

      const mat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 });

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), mat);
      seat.position.y = 0.46;

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.12), mat);
      back.position.set(0, 0.82, -0.28);

      const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10), legMat);
      leg.position.y = 0.22;

      chair.add(seat, back, leg);
      scene.add(chair);
      chairs.push(chair);
    }

    return chairs;
  }
};
