// /js/scorpion_room.js — Scorpion Room v2.2 (FULL)
// Fixes/Adds:
// - Uses ctx (NOT ctx.world) for publishing refs
// - Room shell uses BackSide so you can see inside
// - Adds chairs aligned around the table (player + 4 bots)
// - Forces ctx.spawns.map.scorpion_seat_1 to match the player chair transform (prevents "spawn in table")
// - Sets table.userData.surfaceY for PokerSim dealing on top

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8, 0, 0);
    scene.add(group);

    // ---------- ROOM SHELL (render inside) ----------
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 6),
      new THREE.MeshStandardMaterial({
        color: 0x120816,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.BackSide, // ✅ important
      })
    );
    room.position.set(0, 1.5, 0);
    room.receiveShadow = true;
    room.name = "SCORPION_SHELL";
    group.add(room);

    // Soft local lighting (helps immersion)
    const ambient = new THREE.AmbientLight(0x552266, 0.35);
    ambient.name = "SCORPION_AMBIENT";
    group.add(ambient);

    const key = new THREE.PointLight(0xb266ff, 1.6, 10);
    key.position.set(0, 2.3, 1.8);
    key.name = "SCORPION_KEY";
    key.castShadow = false;
    group.add(key);

    // ---------- TABLE ----------
    const table = new THREE.Group();
    table.name = "SCORPION_TABLE";
    table.position.set(0, 0, 0);
    group.add(table);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6, metalness: 0.1 })
    );
    base.position.set(0, 0.375, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    base.name = "SCORPION_TABLE_BASE";
    table.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c5a3a, roughness: 0.85, metalness: 0.0 })
    );
    top.position.set(0, 0.75 + 0.05, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    top.name = "SCORPION_TABLE_FELT";
    table.add(top);

    // Surface for dealing
    const surfaceY = group.position.y + table.position.y + top.position.y + 0.05;
    table.userData.surfaceY = surfaceY;
    table.userData.tableHeight = surfaceY;
    table.userData.dealRadius = 0.62;

    // ---------- CHAIRS (player + 4 bots) ----------
    // Chair ring outside felt so seating never intersects table collider.
    const chairRadius = 1.55; // ✅ outside table radius (~0.95)
    const chairY = 0.0;

    function makeChair(name) {
      const chair = new THREE.Group();
      chair.name = name;

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.08, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x1b1b24, roughness: 0.7, metalness: 0.05 })
      );
      seat.position.set(0, 0.45, 0);
      seat.castShadow = true;
      seat.receiveShadow = true;
      chair.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.55, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x161621, roughness: 0.8, metalness: 0.03 })
      );
      back.position.set(0, 0.72, -0.18);
      back.castShadow = true;
      back.receiveShadow = true;
      chair.add(back);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.40, 14),
        new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.55, metalness: 0.15 })
      );
      pole.position.set(0, 0.20, 0);
      chair.add(pole);

      const feet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.24, 0.06, 18),
        new THREE.MeshStandardMaterial({ color: 0x11111a, roughness: 0.8, metalness: 0.05 })
      );
      feet.position.set(0, 0.03, 0);
      chair.add(feet);

      return chair;
    }

    // Angles: player is "south" of table (positive Z), facing north (yaw=Math.PI)
    const seats = [
      { key: "scorpion_seat_1", angle: 0,    yaw: Math.PI },        // player (z+)
      { key: "scorpion_bot_1",  angle: 180,  yaw: 0 },              // opposite (z-)
      { key: "scorpion_bot_2",  angle: 135,  yaw: -Math.PI / 4 },   // back-left
      { key: "scorpion_bot_3",  angle: 225,  yaw:  Math.PI / 4 },   // back-right
      { key: "scorpion_bot_4",  angle: 90,   yaw: -Math.PI / 2 },   // left
    ];

    const chairRefs = {};

    for (const s of seats) {
      const rad = (s.angle * Math.PI) / 180;
      const x = Math.sin(rad) * chairRadius;
      const z = Math.cos(rad) * chairRadius;

      const chair = makeChair(`CHAIR_${s.key}`);
      chair.position.set(x, chairY, z);
      chair.rotation.y = s.yaw; // face toward center
      table.add(chair);
      chairRefs[s.key] = chair;
    }

    // ---------- FORCE SPAWNPOINT TO MATCH PLAYER CHAIR ----------
    // This is the big fix: even if your SpawnPoints file is slightly off,
    // we overwrite scorpion_seat_1 to the real chair position in world space.
    const playerChair = chairRefs["scorpion_seat_1"];
    if (playerChair) {
      // world position = group + table + chair
      const worldPos = new THREE.Vector3();
      playerChair.getWorldPosition(worldPos);

      const yaw = playerChair.getWorldQuaternion(new THREE.Quaternion());
      const eul = new THREE.Euler().setFromQuaternion(yaw, "YXZ");
      const chairYaw = eul.y;

      // Update SpawnPoints map if available
      const sp = ctx.spawns?.map?.scorpion_seat_1;
      if (sp) {
        sp.x = worldPos.x;
        sp.z = worldPos.z;
        sp.yaw = chairYaw;
        // optional seatBack hint for Controls seat nudge
        sp.seatBack = 0.45;

        log?.(
          `[scorpion] ✅ patched spawn scorpion_seat_1 -> x=${sp.x.toFixed(2)} z=${sp.z.toFixed(2)} yaw=${sp.yaw.toFixed(2)}`
        );
      } else {
        log?.("[scorpion] ⚠️ ctx.spawns.map.scorpion_seat_1 missing (SpawnPoints not wired?)");
      }
    }

    // ---------- Publish handles ----------
    ctx.scorpionRoom = { group, table };
    ctx.scorpionTable = table;
    ctx.tables ||= {};
    ctx.tables.scorpion = table;

    log?.("[scorpion] build ✅ v2.2 (chairs + spawn alignment)");
    return ctx.scorpionRoom;
  },
};
