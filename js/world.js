import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function setupWorld(scene, camera) {
  const loader = new THREE.TextureLoader();

  // Ambient + point light
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  // ---------- FLOOR ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  loader.load('assets/textures/lobby_carpet.jpg',
    tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4); floorMat.map = tex; floorMat.needsUpdate = true; },
    undefined,
    err => console.warn("Floor texture failed, using fallback color")
  );
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ---------- WALLS ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
  const wallGeo = new THREE.BoxGeometry(20, 4, 0.5);
  const walls = [
    { x: 0, y: 2, z: -10 },
    { x: 0, y: 2, z: 10 },
    { x: -10, y: 2, z: 0, rotY: Math.PI / 2 },
    { x: 10, y: 2, z: 0, rotY: Math.PI / 2 }
  ];
  walls.forEach(pos => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(pos.x, pos.y, pos.z);
    if (pos.rotY) wall.rotation.y = pos.rotY;
    scene.add(wall);
  });

  // ---------- TEST SPAWN MARKER ----------
  const spawnMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  spawnMarker.position.set(0, 1.6, 6);
  scene.add(spawnMarker); // visible marker at your official spawn
}
