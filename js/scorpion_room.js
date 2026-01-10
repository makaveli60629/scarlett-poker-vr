// /js/scorpion_room.js — Scorpion Room v2.1 (FULL)
// Fixes:
// - Exposes world.scorpionTable
// - Sets scorpionTable.userData.surfaceY so PokerSim deals ON TOP

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, world, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8, 0, 0);
    scene.add(group);

    // Simple room shell
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x120816, roughness: 0.9, metalness: 0.0 })
    );
    room.position.set(0, 1.5, 0);
    room.receiveShadow = true;
    group.add(room);

    // Table (simple but deterministic)
    const table = new THREE.Group();
    table.name = "SCORPION_TABLE";
    table.position.set(0, 0, 0);
    group.add(table);

    // table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6, metalness: 0.1 })
    );
    base.position.set(0, 0.375, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    table.add(base);

    // felt top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c5a3a, roughness: 0.85, metalness: 0.0 })
    );
    top.position.set(0, 0.75 + 0.05, 0); // sits on base
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);

    // CRITICAL: set surfaceY for dealing
    // surface is the top face of the felt cylinder:
    const surfaceY = group.position.y + table.position.y + top.position.y + 0.05; // half height of top
    table.userData.surfaceY = surfaceY;
    table.userData.tableHeight = surfaceY; // optional fallback
    table.userData.dealRadius = 0.62;

    // Publish handles for PokerSim & others
    world.scorpionRoom = { group, table };
    world.scorpionTable = table;
    world.tables ||= {};
    world.tables.scorpion = table;

    // If you want to switch PokerSim when entering scorpion later:
    // ctx.poker?.setTable?.("scorpion");

    log?.("[scorpion] build ✅ (master wing)");
    return world.scorpionRoom;
  },
};
