// /js/scarlett1/world.js — Scarlett1 World (FULL)
// BUILD: WORLD_FULL_v1_0
// Goal: never black-screen; clear center reference; easy debug.

export function buildWorld(ctx) {
  const { THREE, scene, rig, writeHud } = ctx;

  writeHud("[world] build starting…");

  // Center marker
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.02, 48),
    new THREE.MeshStandardMaterial({ color: 0x7a1cff, roughness: 0.65, metalness: 0.15 })
  );
  center.position.set(0, 0.01, 0);
  scene.add(center);

  // Outer ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.06, 16, 160),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.8, metalness: 0.1 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // Simple “table” so you can instantly confirm scale
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x243040, roughness: 0.9, metalness: 0.05 })
  );
  table.position.set(0, 0.75, 0);
  scene.add(table);

  // 4 pillars like “room anchors”
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 1, metalness: 0 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.5, 0.25), pillarMat);
    p.position.set(Math.cos(a) * 5.0, 1.25, Math.sin(a) * 5.0);
    scene.add(p);
  }

  // Spawn the rig facing center
  rig.position.set(0, 1.65, 4.0);

  writeHud("[world] build done ✅");
    }
