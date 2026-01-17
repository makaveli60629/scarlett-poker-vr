// /js/world.js — Scene basics (floor + simple walls + kiosk)

export function createWorld({ THREE, scene, Diagnostics }) {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  floor.name = 'floor';
  scene.add(floor);

  // Soft grid helper for debugging alignment
  const grid = new THREE.GridHelper(30, 30, 0x222222, 0x111111);
  grid.position.y = 0.001;
  scene.add(grid);

  // Simple “room” boundaries (visual walls)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9, metalness: 0.0 });
  const wallGeo = new THREE.BoxGeometry(30, 4, 0.3);
  const wall1 = new THREE.Mesh(wallGeo, wallMat); wall1.position.set(0, 2, -15);
  const wall2 = new THREE.Mesh(wallGeo, wallMat); wall2.position.set(0, 2,  15);
  const wallGeoSide = new THREE.BoxGeometry(0.3, 4, 30);
  const wall3 = new THREE.Mesh(wallGeoSide, wallMat); wall3.position.set(-15, 2, 0);
  const wall4 = new THREE.Mesh(wallGeoSide, wallMat); wall4.position.set( 15, 2, 0);
  scene.add(wall1, wall2, wall3, wall4);

  // Kiosk (store)
  const kiosk = buildKiosk({ THREE, Diagnostics });
  kiosk.position.set(-4.5, 0, 1.5);
  scene.add(kiosk);

  Diagnostics.ok('world.ready');

  return {
    floorMesh: floor,
    kiosk,
    update() {}
  };
}

function buildKiosk({ THREE, Diagnostics }) {
  const g = new THREE.Group();
  g.name = 'kiosk';

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 1.0, 24),
    new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 0.7 })
  );
  base.position.y = 0.5;
  g.add(base);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.6),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(THREE, 'STORE', '#ffffff', '#2b2b55') })
  );
  sign.position.set(0, 1.45, 0);
  g.add(sign);

  // Interaction collider
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.8, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 })
  );
  hit.position.set(0, 0.9, 0);
  hit.name = 'kiosk_hit';
  hit.userData.onClick = () => Diagnostics.log('KIOSK', 'Store clicked');
  g.add(hit);

  return g;
}

function makeLabelTexture(THREE, text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = fg;
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width/2, c.height/2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
