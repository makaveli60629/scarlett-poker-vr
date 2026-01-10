// /js/scorpion_room.js — Scorpion Room v3.0 (FULL)
// Circular poker lounge + single table + decor + guardrail + chairs.
// Patches scorpion_seat_1 spawn to chair world transform (position + yaw) so you face the table.

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8, 0, 0);
    scene.add(group);

    // ROOM
    const ROOM_R = 5.2;
    const ROOM_H = 3.2;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_R, 64),
      new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "SCORPION_FLOOR";
    group.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(ROOM_R, ROOM_R, ROOM_H, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x120816, roughness: 0.92, metalness: 0.04, side: THREE.BackSide })
    );
    walls.position.set(0, ROOM_H / 2, 0);
    walls.receiveShadow = true;
    walls.name = "SCORPION_WALLS";
    group.add(walls);

    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_R, 64),
      new THREE.MeshStandardMaterial({ color: 0x07070b, roughness: 0.98, metalness: 0.01 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ROOM_H, 0);
    ceiling.name = "SCORPION_CEILING";
    group.add(ceiling);

    const carpet = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 3.6, 96),
      new THREE.MeshStandardMaterial({ color: 0x0c0f1b, roughness: 1.0, metalness: 0.0 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.005;
    carpet.name = "SCORPION_CARPET_RING";
    group.add(carpet);

    // LIGHTS
    group.add(new THREE.AmbientLight(0x4b2466, 0.35));

    const centerGlow = new THREE.PointLight(0xb266ff, 2.2, 14);
    centerGlow.position.set(0, 2.6, 0);
    centerGlow.name = "SCORPION_CENTER_GLOW";
    group.add(centerGlow);

    const tableKey = new THREE.SpotLight(0x7fe7ff, 1.7, 12, Math.PI / 5, 0.55, 1.0);
    tableKey.position.set(0, 3.0, 1.2);
    tableKey.target.position.set(0, 0.9, 0);
    tableKey.name = "SCORPION_TABLE_KEY";
    group.add(tableKey);
    group.add(tableKey.target);

    // TABLE
    const table = new THREE.Group();
    table.name = "SCORPION_TABLE";
    group.add(table);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6, metalness: 0.1 })
    );
    base.position.set(0, 0.375, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    table.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c5a3a, roughness: 0.85, metalness: 0.0 })
    );
    top.position.set(0, 0.75 + 0.05, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.02, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xb266ff, transparent: true, opacity: 0.55 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = top.position.y + 0.06;
    table.add(rim);

    const surfaceY = group.position.y + table.position.y + top.position.y + 0.05;
    table.userData.surfaceY = surfaceY;
    table.userData.tableHeight = surfaceY;
    table.userData.dealRadius = 0.62;

    // GUARDRAIL
    const RAIL_R = 2.15;
    const RAIL_H = 1.05;

    const railRing = new THREE.Mesh(
      new THREE.TorusGeometry(RAIL_R, 0.03, 10, 120),
      new THREE.MeshStandardMaterial({ color: 0x202036, roughness: 0.35, metalness: 0.35 })
    );
    railRing.rotation.x = Math.PI / 2;
    railRing.position.y = RAIL_H;
    railRing.name = "SCORPION_RAIL_RING";
    group.add(railRing);

    // invisible blocker collider (spectators can't come in)
    const railCollider = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIL_R, RAIL_R, 2.2, 48, 1, true),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    railCollider.position.set(0, 1.1, 0);
    railCollider.name = "SCORPION_RAIL_COLLIDER";
    railCollider.userData.isCollider = true;
    group.add(railCollider);
    ctx.colliders?.push?.(railCollider);

    // DECOR (simple: benches + plants + banner)
    const deco = new THREE.Group();
    deco.name = "SCORPION_DECOR";
    group.add(deco);

    function addBench(name, x, z, yaw) {
      const bench = new THREE.Group();
      bench.name = name;
      bench.position.set(x, 0, z);
      bench.rotation.y = yaw;

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.18, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x141421, roughness: 0.9, metalness: 0.02 })
      );
      seat.position.set(0, 0.22, 0);
      seat.castShadow = true;
      seat.receiveShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.55, 0.10),
        new THREE.MeshStandardMaterial({ color: 0x10101a, roughness: 0.95, metalness: 0.02 })
      );
      back.position.set(0, 0.55, -0.18);
      back.castShadow = true;
      back.receiveShadow = true;
      bench.add(back);

      deco.add(bench);
    }

    addBench("SCORPION_BENCH_A", 0, -(ROOM_R - 0.75), 0);
    addBench("SCORPION_BENCH_B", (ROOM_R - 0.75), 0, -Math.PI / 2);
    addBench("SCORPION_BENCH_C", -(ROOM_R - 0.75), 0, Math.PI / 2);

    const potMat = new THREE.MeshStandardMaterial({ color: 0x11111a, roughness: 0.9, metalness: 0.05 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x0a6b44, roughness: 0.9, metalness: 0.0 });

    function addPlant(i, a) {
      const x = Math.sin(a) * (ROOM_R - 0.9);
      const z = Math.cos(a) * (ROOM_R - 0.9);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.22, 14), potMat);
      pot.position.set(x, 0.11, z);
      pot.castShadow = true;
      pot.receiveShadow = true;
      deco.add(pot);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), leafMat);
      leaf.position.set(x, 0.42, z);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      deco.add(leaf);

      pot.name = `SCORPION_PLANT_POT_${i}`;
      leaf.name = `SCORPION_PLANT_LEAF_${i}`;
    }

    addPlant(0, 0.65);
    addPlant(1, 2.15);
    addPlant(2, 4.05);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.75),
      new THREE.MeshBasicMaterial({ color: 0xb266ff, transparent: true, opacity: 0.65 })
    );
    banner.position.set(0, 2.0, -(ROOM_R - 0.02));
    banner.name = "SCORPION_BANNER";
    group.add(banner);

    // CHAIRS
    const chairRadius = 1.55;
    const chairRefs = {};

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

    const seats = [
      { key: "scorpion_seat_1", angle:   0 }, // player
      { key: "scorpion_bot_1",  angle: 180 },
      { key: "scorpion_bot_2",  angle: 135 },
      { key: "scorpion_bot_3",  angle: 225 },
      { key: "scorpion_bot_4",  angle:  90 },
    ];

    let playerChair = null;

    for (const s of seats) {
      const rad = (s.angle * Math.PI) / 180;
      const x = Math.sin(rad) * chairRadius;
      const z = Math.cos(rad) * chairRadius;

      const chair = makeChair(`CHAIR_${s.key}`);
      chair.position.set(x, 0, z);

      // ✅ ALWAYS face the table center (fixes wall-facing spawns)
      chair.lookAt(0, 0.45, 0);

      table.add(chair);
      chairRefs[s.key] = chair;
      if (s.key === "scorpion_seat_1") playerChair = chair;
    }

    // PATCH SPAWNPOINT (position + yaw) to chair transform
    if (playerChair) {
      const worldPos = new THREE.Vector3();
      playerChair.getWorldPosition(worldPos);

      const q = new THREE.Quaternion();
      playerChair.getWorldQuaternion(q);
      const yaw = new THREE.Euler().setFromQuaternion(q, "YXZ").y;

      const sp = ctx.spawns?.map?.scorpion_seat_1;
      if (sp) {
        sp.x = worldPos.x;
        sp.z = worldPos.z;
        sp.yaw = yaw;
        sp.seatBack = 0.45;
        log?.(`[scorpion] ✅ patched seat -> x=${sp.x.toFixed(2)} z=${sp.z.toFixed(2)} yaw=${sp.yaw.toFixed(2)}`);
      } else {
        log?.("[scorpion] ⚠️ ctx.spawns.map.scorpion_seat_1 missing (SpawnPoints not wired?)");
      }
    }

    // publish handles
    ctx.scorpionRoom = { group, table };
    ctx.scorpionTable = table;
    ctx.tables ||= {};
    ctx.tables.scorpion = table;

    log?.("[scorpion] build ✅ v3.0 (circular lounge + guardrail + chairs + facing fix)");
    return ctx.scorpionRoom;
  },
};
