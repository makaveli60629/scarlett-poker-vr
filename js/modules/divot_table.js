// /js/modules/divot_table.js
export function createDivotTable({ THREE, dwrite }, { center }){
  const group = new THREE.Group();
  group.name = "divotPit";

  const pitRadius = 6.2;
  const pitDepth  = 0.8;

  // Outer floor ring (around pit)
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(pitRadius, pitRadius+0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness:0.95 })
  );
  outer.rotation.x = -Math.PI/2;
  outer.position.set(center.x, center.y + 0.002, center.z);
  group.add(outer);

  // Inner floor (lowered)
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(pitRadius-0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness:0.98 })
  );
  inner.rotation.x = -Math.PI/2;
  inner.position.set(center.x, center.y - pitDepth + 0.002, center.z);
  group.add(inner);

  // Pit wall (cylinder side)
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x171722, roughness:0.8, metalness:0.05, side:THREE.DoubleSide })
  );
  wall.position.set(center.x, center.y - pitDepth/2, center.z);
  group.add(wall);

  // Rails (top ring + inner rail)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x885533, roughness:0.55, metalness:0.08 });
  const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius+0.15, 0.12, 16, 80), railMat);
  rail.rotation.x = Math.PI/2;
  rail.position.set(center.x, center.y + 0.18, center.z);
  group.add(rail);

  const rail2 = new THREE.Mesh(new THREE.TorusGeometry(pitRadius-0.55, 0.08, 16, 80), railMat);
  rail2.rotation.x = Math.PI/2;
  rail2.position.set(center.x, center.y - pitDepth + 0.18, center.z);
  group.add(rail2);

  // Table in pit
  if (feltTex){ feltTex.repeat.set(2,2); }
const tableMat = new THREE.MeshStandardMaterial({ color: 0x0b6b3a, roughness:0.85, metalness:0.05,  });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.25, 48), tableMat);
  table.position.set(center.x, center.y - pitDepth + 0.55, center.z);
  group.add(table);

  // Table rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 16, 64), new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness:0.6 }));
  rim.rotation.x = Math.PI/2;
  rim.position.copy(table.position);
  rim.position.y += 0.12;
  group.add(rim);

  // Dealer chip
  const dealer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive:0xffffff, emissiveIntensity:0.3 }));
  dealer.position.set(center.x, table.position.y + 0.14, center.z - 1.1);
  group.add(dealer);

  dwrite?.("[divot] pit + rails + table ready");
  return { group, pitRadius, pitDepth, table, tableMatRef: table.material };
}
