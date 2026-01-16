// /js/scarlett1/world.js — Scarlett World (FULL)
// BUILD: WORLD_FULL_v1_2_LOBBY
// MUST export buildWorld(ctx)

export function buildWorld(ctx) {
  const { THREE, scene, rig, writeHud } = ctx;

  writeHud("[world] build starting…");

  // --------------------------
  // Constants (tune-friendly)
  // --------------------------
  const FLOOR_SIZE = 60;
  const LOBBY_RADIUS = 6.0;
  const TABLE_Y = 0.78;
  const TABLE_RADIUS = 1.2;
  const PILLAR_RADIUS = 7.0;

  // --------------------------
  // Floor (always visible)
  // --------------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
    new THREE.MeshStandardMaterial({
      color: 0x0f1116,
      roughness: 1,
      metalness: 0,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  // Subtle floor ring accents (helps orientation in VR)
  addRing(LOBBY_RADIUS, 0.06, 0x102735, 0.02);
  addRing(LOBBY_RADIUS * 0.67, 0.04, 0x11202a, 0.021);

  // --------------------------
  // Center marker (where table is)
  // --------------------------
  const centerDot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.5, metalness: 0.15 })
  );
  centerDot.position.set(0, 0.011, 0);
  scene.add(centerDot);

  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.42, 64),
    new THREE.MeshStandardMaterial({
      color: 0x7a1cff,
      roughness: 0.65,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
  );
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.y = 0.012;
  scene.add(centerRing);

  // --------------------------
  // Table base
  // --------------------------
  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.16, 64),
    new THREE.MeshStandardMaterial({
      color: 0x223044,
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  tableBase.position.set(0, TABLE_Y, 0);
  scene.add(tableBase);

  // Table felt top
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS * 0.96, TABLE_RADIUS * 0.96, 0.03, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1b6b3a,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  felt.position.set(0, TABLE_Y + 0.095, 0);
  scene.add(felt);

  // Table rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(TABLE_RADIUS * 0.98, 0.06, 16, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0f1a24,
      roughness: 0.8,
      metalness: 0.1,
    })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, TABLE_Y + 0.11, 0);
  scene.add(rim);

  // --------------------------
  // 4 Pillars ONLY (N,E,S,W)
  // --------------------------
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f2a,
    roughness: 1,
    metalness: 0,
  });

  const pillarGeo = new THREE.BoxGeometry(0.35, 3.0, 0.35);
  const pillarAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  pillarAngles.forEach((a, idx) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(Math.cos(a) * PILLAR_RADIUS, 1.5, Math.sin(a) * PILLAR_RADIUS);
    pillar.name = `PILLAR_${idx}`;
    scene.add(pillar);

    // small glowing cap to help you see them in VR
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.06, 18),
      new THREE.MeshStandardMaterial({ color: 0x223a4a, roughness: 0.4, metalness: 0.2 })
    );
    cap.position.set(pillar.position.x, 3.03, pillar.position.z);
    scene.add(cap);
  });

  // --------------------------
  // Cardinal arrows (simple cues)
  // --------------------------
  addArrow(0, 0, -4.5, 0x00e5ff); // forward
  addArrow(0, 0, 4.5, 0xff2bd6);  // back
  addArrow(4.5, 0, 0, 0x7a1cff);  // right
  addArrow(-4.5, 0, 0, 0x24ff6a); // left

  // --------------------------
  // Spawn: facing the table
  // --------------------------
  // Put player slightly behind table on +Z so camera faces toward origin.
  rig.position.set(0, 1.65, 4.2);

  // IMPORTANT: clear any weird rig rotations so you face center consistently
  rig.rotation.set(0, 0, 0);
  rig.updateMatrixWorld(true);

  writeHud("[world] build done ✅");

  // ==========================
  // Helpers
  // ==========================
  function addRing(radius, tube, color, y) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 16, 160),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.08 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    scene.add(ring);
  }

  function addArrow(x, y, z, color) {
    const g = new THREE.ConeGeometry(0.22, 0.45, 20);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
    const cone = new THREE.Mesh(g, m);
    cone.position.set(x, 0.05, z);

    // aim cone toward center
    cone.lookAt(0, 0.05, 0);
    cone.rotateX(Math.PI / 2);

    scene.add(cone);
  }
}
