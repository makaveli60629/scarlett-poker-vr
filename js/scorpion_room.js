// /js/scorpion_room.js — Scorpion Room v3.4 (FULL)
// Changes:
// - Chairs are bigger + brighter + emissive trim (easy to see)
// - Rail is brighter
// - Still patches scorpion_seat_1 spawn to chair world transform so you face table
// - Returns { setActive() } system so RoomManager can show/hide the room

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
      new THREE.MeshStandardMaterial({ color: 0x080910, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(ROOM_R, ROOM_R, ROOM_H, 72, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x14061c,
        roughness: 0.92,
        metalness: 0.04,
        side: THREE.BackSide,
        emissive: 0x240a33,
        emissiveIntensity: 0.08,
      })
    );
    walls.position.set(0, ROOM_H / 2, 0);
    walls.receiveShadow = true;
    group.add(walls);

    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_R, 64),
      new THREE.MeshStandardMaterial({ color: 0x06060a, roughness: 0.98, metalness: 0.01 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ROOM_H, 0);
    group.add(ceiling);

    // LIGHTS
    group.add(new THREE.AmbientLight(0x5a2b78, 0.40));

    const centerGlow = new THREE.PointLight(0xb266ff, 2.8, 16);
    centerGlow.position.set(0, 2.6, 0);
    group.add(centerGlow);

    const key = new THREE.SpotLight(0x7fe7ff, 1.9, 14, Math.PI / 5, 0.55, 1.0);
    key.position.set(0, 3.0, 1.2);
    key.target.position.set(0, 0.9, 0);
    group.add(key);
    group.add(key.target);

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
    top.position.set(0, 0.80, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);

    // rim glow
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.025, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0xb266ff, transparent: true, opacity: 0.70 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = top.position.y + 0.06;
    table.add(rim);

    // surfaceY for PokerSim
    const surfaceY = group.position.y + table.position.y + top.position.y + 0.05;
    table.userData.surfaceY = surfaceY;
    table.userData.dealRadius = 0.62;

    // GUARDRAIL
    const RAIL_R = 2.15;
    const RAIL_H = 1.05;

    const railRing = new THREE.Mesh(
      new THREE.TorusGeometry(RAIL_R, 0.04, 10, 140),
      new THREE.MeshStandardMaterial({
        color: 0x2a2a44,
        roughness: 0.35,
        metalness: 0.35,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.20,
      })
    );
    railRing.rotation.x = Math.PI / 2;
    railRing.position.y = RAIL_H;
    group.add(railRing);

    const railCollider = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIL_R, RAIL_R, 2.2, 60, 1, true),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    railCollider.position.set(0, 1.1, 0);
    railCollider.userData.isCollider = true;
    group.add(railCollider);
    ctx.colliders?.push?.(railCollider);

    // CHAIRS (bigger + emissive trim so you SEE them)
    const chairRadius = 1.55;

    const matSeat = new THREE.MeshStandardMaterial({
      color: 0x1b1b24,
      roughness: 0.7,
      metalness: 0.08,
      emissive: 0x120816,
      emissiveIntensity: 0.10,
    });

    const matTrim = new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.55 });

    function makeChair(name) {
      const chair = new THREE.Group();
      chair.name = name;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), matSeat);
      seat.position.set(0, 0.48, 0);
      seat.castShadow = true;
      seat.receiveShadow = true;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.10), matSeat);
      back.position.set(0, 0.80, -0.22);
      back.castShadow = true;
      back.receiveShadow = true;
      chair.add(back);

      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.015, 10, 60), matTrim);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(0, 0.56, 0);
      chair.add(trim);

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
      chair.lookAt(0, 0.45, 0); // face table center
      table.add(chair);

      if (s.key === "scorpion_seat_1") playerChair = chair;
    }

    // Patch spawn to the chair transform so you face the table
    if (playerChair && ctx.spawns?.map?.scorpion_seat_1) {
      const pos = new THREE.Vector3();
      playerChair.getWorldPosition(pos);

      const q = new THREE.Quaternion();
      playerChair.getWorldQuaternion(q);
      const yaw = new THREE.Euler().setFromQuaternion(q, "YXZ").y;

      const sp = ctx.spawns.map.scorpion_seat_1;
      sp.x = pos.x;
      sp.z = pos.z;
      sp.yaw = yaw;
      sp.seatBack = 0.45;

      log?.(`[scorpion] ✅ patched scorpion_seat_1 -> x=${sp.x.toFixed(2)} z=${sp.z.toFixed(2)} yaw=${sp.yaw.toFixed(2)}`);
    }

    // publish
    ctx.scorpionTable = table;
    ctx.tables ||= {};
    ctx.tables.scorpion = table;

    const system = {
      group,
      table,
      setActive(v) {
        group.visible = !!v;
      },
    };

    system.setActive(false); // hidden until you enter
    log?.("[scorpion] build ✅ v3.4 (visible chairs + bright rail)");
    return system;
  },
};
