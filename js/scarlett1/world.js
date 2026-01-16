// /js/scarlett1/world.js — Scarlett World (FULL + FIXED)
// BUILD: WORLD_FULL_v1_1
// This file MUST export buildWorld()

export function buildWorld(ctx) {
  const { THREE, scene, rig, writeHud } = ctx;

  writeHud("[world] build starting…");

  // ===== FLOOR =====
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({
      color: 0x0f1116,
      roughness: 1,
      metalness: 0
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ===== CENTER TABLE =====
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.15, 64),
    new THREE.MeshStandardMaterial({
      color: 0x243040,
      roughness: 0.85,
      metalness: 0.05
    })
  );
  table.position.set(0, 0.75, 0);
  scene.add(table);

  // ===== FELT TOP =====
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.03, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1b6b3a,
      roughness: 0.9
    })
  );
  felt.position.y = 0.84;
  scene.add(felt);

  // ===== CENTER MARKER =====
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.45, 48),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.01;
  scene.add(marker);

  // ===== ROOM PILLARS =====
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f2a,
    roughness: 1
  });

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3, 0.3),
      pillarMat
    );
    pillar.position.set(
      Math.cos(angle) * 6,
      1.5,
      Math.sin(angle) * 6
    );
    scene.add(pillar);
  }

  // ===== PLAYER SPAWN =====
  rig.position.set(0, 1.65, 4);
  rig.lookAt(0, 1.5, 0);

  writeHud("[world] build done ✅");
}
