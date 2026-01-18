// /js/modules/casino_shell.js
export function createCasinoShell({ THREE, dwrite }){
  const group = new THREE.Group();
  group.name = "casinoShell";

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness:0.9, metalness:0.05 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  group.add(floor);

  // Subtle grid lines
  const grid = new THREE.GridHelper(70, 70, 0x333344, 0x22222a);
  grid.position.y = 0.001;
  group.add(grid);

  // Walls (simple box room)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness:0.95, metalness:0.0 });
  const room = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 70), wallMat);
  room.position.set(0, 8, 0);
  room.material.side = THREE.BackSide;
  group.add(room);

  // Ceiling glow panel
  const ceiling = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshStandardMaterial({ color: 0x222233, emissive:0x222255, emissiveIntensity:0.55, roughness:0.9 })
  );
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0, 15.8, 0);
  group.add(ceiling);

  // Neon sign block
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive:0xff00aa, emissiveIntensity:1.2, roughness:0.3 })
  );
  sign.position.set(0, 4.5, -18);
  group.add(sign);

  dwrite?.("[shell] casino shell ready");
  return { group };
}
