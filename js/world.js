// /js/world.js
export function buildWorld({ THREE, scene, player, camera, renderer, dwrite }) {
  // Basic light rig
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 10, 3);
  dir.castShadow = false;
  scene.add(dir);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Grid helper (visible reference)
  const grid = new THREE.GridHelper(80, 80, 0x333333, 0x222222);
  grid.position.y = 0.01;
  scene.add(grid);

  // “Table” placeholder (so you KNOW it’s rendering)
  const tableGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.18, 48);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, 0.95, 0);
  scene.add(table);

  // Felt top
  const feltGeo = new THREE.CylinderGeometry(1.32, 1.32, 0.06, 48);
  const feltMat = new THREE.MeshStandardMaterial({ color: 0x0b2a18, roughness: 1.0, metalness: 0.0 });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.set(0, 1.05, 0);
  scene.add(felt);

  // Red “pillar” debug marker
  const pGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 16);
  const pMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.6 });
  const pillar = new THREE.Mesh(pGeo, pMat);
  pillar.position.set(0, 1.25, 0);
  scene.add(pillar);

  // Simple walls so you don’t feel “void”
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 1.0 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 0.25), wallMat);
  back.position.set(0, 3, -9);
  scene.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 18), wallMat);
  left.position.set(-9, 3, 0);
  scene.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 18), wallMat);
  right.position.set(9, 3, 0);
  scene.add(right);

  // Spawn point sanity
  player.position.set(0, 1.65, 4.5);
  player.rotation.set(0, 0, 0);

  dwrite?.("[world] floor+grid+table+walls ✅");
}
