// js/solid_walls.js — Simple solid walls (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SolidWalls = {
  group: null,

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "SolidWalls";

    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.95 });

    const h = 3.2;
    const size = 18;
    const t = 0.25;

    const wallGeoX = new THREE.BoxGeometry(size, h, t);
    const wallGeoZ = new THREE.BoxGeometry(t, h, size);

    const north = new THREE.Mesh(wallGeoX, mat);
    north.position.set(0, h / 2, -size / 2);

    const south = new THREE.Mesh(wallGeoX, mat);
    south.position.set(0, h / 2, size / 2);

    const east = new THREE.Mesh(wallGeoZ, mat);
    east.position.set(size / 2, h / 2, 0);

    const west = new THREE.Mesh(wallGeoZ, mat);
    west.position.set(-size / 2, h / 2, 0);

    this.group.add(north, south, east, west);
    scene.add(this.group);
    return this.group;
  }
};
