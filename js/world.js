import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const World = {
  build(scene) {
    const colliders = [];
    const floorPlanes = [];

    // Lighting (bright enough to see)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(10, 18, 8);
    scene.add(key);

    const warm = new THREE.PointLight(0xffcc88, 0.7, 45);
    warm.position.set(8, 6, 10);
    scene.add(warm);

    const cool = new THREE.PointLight(0x88bbff, 0.75, 45);
    cool.position.set(-8, 6, 10);
    scene.add(cool);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x2a0d15, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    floorPlanes.push(floor);

    // Carpet grid overlay (subtle)
    const grid = new THREE.GridHelper(40, 40, 0x552233, 0x221018);
    grid.position.y = 0.01;
    scene.add(grid);

    // Room walls (SOLID)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 });
    const wallH = 4;
    const thick = 0.35;
    const size = 18;

    const makeWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      scene.add(m);
      const box = new THREE.Box3().setFromObject(m);
      colliders.push(box);
      return m;
    };

    // 4 walls around lobby
    makeWall(size, wallH, thick, 0, wallH / 2, -size / 2); // back
    makeWall(size, wallH, thick, 0, wallH / 2,  size / 2); // front
    makeWall(thick, wallH, size, -size / 2, wallH / 2, 0); // left
    makeWall(thick, wallH, size,  size / 2, wallH / 2, 0); // right

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.95 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallH, 0);
    scene.add(ceiling);

    // Neon strips
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(size - 1.5, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x44ccff })
    );
    neon.position.set(0, wallH - 0.25, -size / 2 + 0.35);
    scene.add(neon);

    const neon2 = neon.clone();
    neon2.position.set(0, wallH - 0.25, size / 2 - 0.35);
    scene.add(neon2);

    return { colliders, floorPlanes };
  }
};
