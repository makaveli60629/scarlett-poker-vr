// /js/table.js — Oval green poker table + subtle rim

export function createTable({ THREE, scene, Diagnostics }) {
  const g = new THREE.Group();
  g.name = 'poker_table';

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b5d2a, roughness: 0.9, metalness: 0.0 })
  );
  top.position.y = 0.78;
  top.scale.set(1.35, 1, 1.0); // oval
  g.add(top);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.18, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.1 })
  );
  rim.position.y = 0.86;
  rim.rotation.x = Math.PI/2;
  rim.scale.set(1.35, 1.0, 1.0);
  g.add(rim);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.8, 0.8, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.8 })
  );
  base.position.y = 0.4;
  g.add(base);

  // Invisible collider for table top (so teleport won't land on it)
  const collider = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.4, 24),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
  );
  collider.position.y = 0.85;
  collider.scale.set(1.35, 1, 1);
  collider.name = 'table_collider';
  collider.userData.isObstacle = true;
  g.add(collider);

  scene.add(g);
  Diagnostics.log('world', 'table ready ✅');

  return { group: g, update() {} };
}
