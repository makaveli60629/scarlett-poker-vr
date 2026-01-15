// /js/scarlett1/spine_world_stub.js
// Always-on fallback world so you NEVER get a black void.
// This stays even if real modules fail.

export function buildStubWorld({ THREE, scene, log }) {
  const group = new THREE.Group();
  group.name = "StubWorld";
  scene.add(group);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0d111a, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  // Ring marker (helps alignment)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.8, 2.0, 64),
    new THREE.MeshBasicMaterial({
      color: 0x2244ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.01, 0);
  group.add(ring);

  // Table top
  const tableCenter = new THREE.Vector3(0, 0.78, 0);
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a5a3a, roughness: 0.9, metalness: 0.05 })
  );
  table.position.copy(tableCenter);
  group.add(table);

  // Rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.06, 16, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.85, metalness: 0.05 })
  );
  rail.position.set(0, tableCenter.y + 0.07, 0);
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  // Leg
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.78, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9, metalness: 0.05 })
  );
  leg.position.set(0, 0.39, 0);
  group.add(leg);

  // Seat dots (8)
  const seatGeo = new THREE.CircleGeometry(0.12, 24);
  const seatMat = new THREE.MeshBasicMaterial({
    color: 0xff2bd6,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 1.6;
    const s = new THREE.Mesh(seatGeo, seatMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(Math.cos(a) * r, 0.015, Math.sin(a) * r);
    group.add(s);
  }

  log("Stub world built ✅");
  return {
    group,
    tableCenter,
    spawn: new THREE.Vector3(0, 1.65, 2.4),
    update(dt) {
      ring.material.opacity = 0.38 + 0.12 * Math.sin(performance.now() * 0.002);
    }
  };
}
