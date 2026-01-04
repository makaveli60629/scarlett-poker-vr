import * as THREE from 'three';
import { Table } from './table.js';

export const World = {
  build(scene) {
    // Bright + safe
    scene.background = new THREE.Color(0x0b0b12);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    const point = new THREE.PointLight(0xffffff, 1.5, 80);
    point.position.set(0, 8, 0);
    scene.add(point);

    // Floor (big, always visible)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Simple walls so you can orient
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 1 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 1), wallMat);
    back.position.set(0, 4, -20);
    scene.add(back);

    // Table (separate module)
    Table.createTable(scene, 0, 0);
    Table.createChairs(scene, 0, 0); // 6 simple chairs for now (we’ll swap to your model after baseline passes)
  }
};
