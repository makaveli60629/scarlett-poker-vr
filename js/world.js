import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Table } from './table.js';

export const World = {
  build(scene) {
    // BRIGHT + SAFE VISIBILITY
    scene.background = new THREE.Color(0x0b0b12);

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    const fill = new THREE.PointLight(0xffffff, 1.2, 120);
    fill.position.set(0, 10, 0);
    scene.add(fill);

    // FLOOR
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // SIMPLE ROOM (so you know where you are)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a46, roughness: 1 });

    const back = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 1), wallMat);
    back.position.set(0, 5, -25);
    scene.add(back);

    const front = back.clone();
    front.position.set(0, 5, 25);
    scene.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 70), wallMat);
    left.position.set(-25, 5, 0);
    scene.add(left);

    const right = left.clone();
    right.position.set(25, 5, 0);
    scene.add(right);

    // TABLE + CHAIRS (baseline)
    Table.createTable(scene, 0, 0);
    Table.createChairs(scene, 0, 0);

    // ORIENTATION MARKER (big green pillar so you can find center)
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 4, 16),
      new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.5 })
    );
    marker.position.set(0, 2, 0);
    scene.add(marker);
  }
};
