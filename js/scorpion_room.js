// /js/scorpion_room.js — Scorpion Room v3.0 (CIRCULAR ARENA)
// - Circular room (no store, no pads)
// - Central poker table only
// - Chairs aligned correctly
// - Player ALWAYS faces the table
// - Guardrail prevents spectators from approaching felt
// - Decorative, calm, casino-focused environment

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8, 0, 0);
    scene.add(group);

    /* --------------------------------------------------
       ROOM SHELL (CIRCULAR)
    -------------------------------------------------- */
    const roomRadius = 5.2;
    const roomHeight = 3.2;

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 48, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x120816,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.BackSide,
      })
    );
    shell.position.set(0, roomHeight / 2, 0);
    shell.receiveShadow = true;
    shell.name = "SCORPION_SHELL";
    group.add(shell);

    /* --------------------------------------------------
       LIGHTING (SOFT, FOCUSED)
    -------------------------------------------------- */
    const ambient = new THREE.AmbientLight(0x442244, 0.35);
    group.add(ambient);

    const tableLight = new THREE.PointLight(0xb266ff, 2.1, 6.5);
    tableLight.position.set(0, 2.6, 0);
    group.add(tableLight);

    /* --------------------------------------------------
       TABLE
    -------------------------------------------------- */
    const table = new THREE.Group();
    table.name = "SCORPION_TABLE";
    table.position.set(0, 0, 0);
    group.add(table);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6 })
    );
    base.position.set(0, 0.375, 0);
    base.castShadow = true;
    table.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c5a3a, roughness: 0.9 })
    );
    top.position.set(0, 0.80, 0);
    top.castShadow = true;
    table.add(top);

    table.userData.surfaceY =
      group.position.y + table.position.y + top.position.y + 0.05;
    table.userData.dealRadius = 0.62;

    /* --------------------------------------------------
       GUARDRAIL (SPECTATOR BOUNDARY)
    -------------------------------------------------- */
    const railRadius = 1.95;
    const railHeight = 0.9;

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, 0.06, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0x7a6a8a,
        roughness: 0.6,
        metalness: 0.3,
      })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = railHeight;
    rail.name = "SCORPION_GUARDRAIL";
    group.add(rail);

    // Physical blocker (invisible)
    const railBlocker = new THREE.Mesh(
      new THREE.CylinderGeometry(railRadius, railRadius, 1.2, 32),
      new THREE.MeshStandardMaterial({ visible: false })
    );
    railBlocker.position.set(0, 0.6, 0);
    railBlocker.name = "SCORPION_RAIL_BLOCKER";
    group.add(railBlocker);

    ctx.colliders?.push?.(railBlocker);

    /* --------------------------------------------------
       CHAIRS (PLAYER + 4 BOTS)
    -------------------------------------------------- */
    const chairRadius = 1.55;

    function makeChair() {
      const c = new THREE.Group();

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.08, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x1b1b24 })
      );
      seat.position.y = 0.45;
      c.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.55, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x161621 })
      );
      back.position.set(0, 0.72, -0.18);
      c.add(back);

      return c;
    }

    const seats = [
      { key: "scorpion_seat_1", angle:   0 },   // PLAYER
      { key: "bot_1",          angle: 180 },
      { key: "bot_2",          angle: 120 },
      { key: "bot_3",          angle: 240 },
      { key: "bot_4",          angle:  60 },
    ];

    let playerChair = null;

    for (const s of seats) {
      const r = (s.angle * Math.PI) / 180;
      const x = Math.sin(r) * chairRadius;
      const z = Math.cos(r) * chairRadius;

      const chair = makeChair();
      chair.position.set(x, 0, z);

      // FACE TABLE CENTER (THIS FIXES YOUR BACKWARDS SPAWN)
      chair.lookAt(0, 0.45, 0);

      table.add(chair);

      if (s.key === "scorpion_seat_1") {
        playerChair = chair;
      }
    }

    /* --------------------------------------------------
       FORCE SPAWN TO MATCH CHAIR (POSITION + YAW)
    -------------------------------------------------- */
    if (playerChair && ctx.spawns?.map?.scorpion_seat_1) {
      const pos = new THREE.Vector3();
      playerChair.getWorldPosition(pos);

      const quat = new THREE.Quaternion();
      playerChair.getWorldQuaternion(quat);

      const yaw = new THREE.Euler().setFromQuaternion(quat, "YXZ").y;

      const sp = ctx.spawns.map.scorpion_seat_1;
      sp.x = pos.x;
      sp.z = pos.z;
      sp.yaw = yaw;
      sp.seatBack = 0.45;

      log?.(
        `[scorpion] seat patched -> x=${sp.x.toFixed(2)} z=${sp.z.toFixed(
          2
        )} yaw=${sp.yaw.toFixed(2)}`
      );
    }

    /* --------------------------------------------------
       PUBLISH REFERENCES
    -------------------------------------------------- */
    ctx.scorpionRoom = { group, table };
    ctx.scorpionTable = table;
    ctx.tables ||= {};
    ctx.tables.scorpion = table;

    log?.("[scorpion] build ✅ v3.0 (circular arena, aligned seating)");
    return ctx.scorpionRoom;
  },
};
