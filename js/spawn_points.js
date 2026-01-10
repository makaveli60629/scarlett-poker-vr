// /js/spawn_points.js — Scarlett SpawnPoints v1.1 (FULL)
// Creates visible spawn pads + registers world.spawns
// Adds: scorpion_seat_1 + scorpion_exit so RoomManager can seat correctly.

export const SpawnPoints = {
  build(ctx) {
    const { THREE, scene, world, log } = ctx;

    world.spawns ||= {};

    function add(name, x, y, z, yaw = 0, color = 0x7fe7ff) {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.20 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, y + 0.01, z);
      pad.name = `SPAWN_PAD_${name}`;
      scene.add(pad);

      world.spawns[name] = {
        pos: new THREE.Vector3(x, y, z),
        yaw,
        pad,
      };
      log?.(`[spawns] ✅ ${name} @ ${x.toFixed(2)},${y.toFixed(2)} yaw=${yaw.toFixed(2)}`);
    }

    // ---- Existing lobby/system spawns (match your logs) ----
    add("lobby_spawn",   0.00, 3.20,  0.00,  Math.PI, 0x7fe7ff);
    add("store_spawn",   4.50,-3.50,  0.00,  Math.PI, 0x7fe7ff);
    add("spectator",     0.00,-3.00,  0.00,  0.00,   0x98a0c7);
    add("table_seat_1",  0.00, 0.95,  0.00,  Math.PI, 0xff2d7a);
    add("scorpion_gate", 8.00, 0.00,  0.00, -Math.PI/2, 0xffcc00);

    // ---- NEW: Scorpion room dedicated spawns ----
    // ScorpionRoom group is positioned at (8,0,0) in your current build.
    // Seat: offset slightly back so you see the felt and not clip into table.
    // Y is table-seat rig height (your lobby seat uses 0.95)
    add("scorpion_seat_1", 8.00, 0.95, 0.85, Math.PI, 0xff2d7a);

    // Standing exit spot in scorpion room (safe to teleport to when leaving seat)
    add("scorpion_exit",   8.00, 0.00, 2.00, Math.PI, 0x7fe7ff);

    // Default convenience alias
    world.spawns.default = world.spawns.lobby_spawn;

    log?.("[spawns] ✅ pads built + world.spawns registered");
    return world.spawns;
  },
};
