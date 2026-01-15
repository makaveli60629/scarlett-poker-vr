export function buildStubWorld({ THREE, scene, log }) {
  const group = new THREE.Group();
  scene.add(group);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0d111a, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.8, 2.0, 48),
    new THREE.MeshBasicMaterial({ color: 0x2244ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a5a3a, roughness: 0.9 })
  );
  table.position.set(0, 0.78, 0);
  group.add(table);

  log("Stub world built ✅");
  return { group, tableCenter: new THREE.Vector3(0, 0.78, 0) };
}
