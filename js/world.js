import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function setupWorld(scene, camera) {
  const loader = new THREE.TextureLoader();

  // ---------- LIGHTS ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  // ---------- FLOOR ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 }); // fallback
  loader.load(
    'assets/textures/lobby_carpet.jpg',
    tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      floorMat.map = tex;
      floorMat.needsUpdate = true;
    },
    undefined,
    err => {
      console.warn("Failed to load lobby_carpet.jpg, using fallback gray", err);
      floorMat.color.set(0x444444); // fallback color
    }
  );
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ---------- WALLS ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b }); // fallback
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

  // ---------- TABLE WITH FALLBACK ----------
  const tableFelt = new THREE.MeshStandardMaterial({ color: 0x145a32 }); // fallback
  loader.load(
    'assets/textures/table_felt_green.jpg',
    tex => { tableFelt.map = tex; tableFelt.needsUpdate = true; },
    undefined,
    err => {
      console.warn("Failed to load table_felt_green.jpg, using fallback green", err);
      tableFelt.color.set(0x145a32);
    }
  );
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.2, 32), tableFelt);
  table.position.set(0, 1, 0);
  scene.add(table);

  // ---------- TABLE LEATHER TRIM ----------
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1e }); // fallback
  loader.load(
    'assets/textures/Table leather trim.jpg',
    tex => { trimMat.map = tex; trimMat.needsUpdate = true; },
    undefined,
    err => {
      console.warn("Failed to load Table leather trim.jpg, using fallback brown", err);
      trimMat.color.set(0x4b2e1e);
    }
  );
  const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.15, 16, 100), trimMat);
  tableTrim.rotation.x = Math.PI / 2;
  tableTrim.position.y = 1.1;
  scene.add(tableTrim);

  // ---------- HANDS ----------
  const handMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // fallback
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), handMat);
  leftHand.position.set(-0.3, 1.4, 7.5);
  scene.add(leftHand);
  const rightHand = leftHand.clone();
  rightHand.position.x = 0.3;
  scene.add(rightHand);

  // ---------- TELEPORT LASER ----------
  loader.load(
    'assets/textures/Teleport glow.jpg',
    tex => {
      const laserMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const laserGeom = new THREE.CylinderGeometry(0.02, 0.02, 5, 8);
      const laser = new THREE.Mesh(laserGeom, laserMat);
      laser.position.set(-0.3, 1.4, 6.5);
      laser.rotation.x = -Math.PI / 2;
      scene.add(laser);
    },
    undefined,
    err => {
      console.warn("Failed to load Teleport glow.jpg, using fallback red", err);
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const laserGeom = new THREE.CylinderGeometry(0.02, 0.02, 5, 8);
      const laser = new THREE.Mesh(laserGeom, laserMat);
      laser.position.set(-0.3, 1.4, 6.5);
      laser.rotation.x = -Math.PI / 2;
      scene.add(laser);
    }
  );

  console.log("World setup complete (textures will fallback if missing).");
}
