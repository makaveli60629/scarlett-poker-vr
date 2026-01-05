// js/table.js — GitHub Pages SAFE
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Table = {
  group: null,

  build(scene, pos = { x: 0, y: 0, z: 0 }) {
    this.group = new THREE.Group();
    this.group.name = "PokerTable";
    this.group.position.set(pos.x, pos.y, pos.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.05, 0.6, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.85 })
    );
    base.position.y = 0.3;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.95, 0.2, 44),
      new THREE.MeshStandardMaterial({ color: 0x0e6b3a, roughness: 0.65 })
    );
    top.position.y = 0.92;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.85, 0.1, 14, 56),
      new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 0.75 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.0;

    const plate = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 36),
      new THREE.MeshStandardMaterial({ color: 0x0b2c1b, roughness: 0.9 })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = 1.03;

    this.group.add(base, top, rim, plate);
    scene.add(this.group);

    return this.group;
  }
};
