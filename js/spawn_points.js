// /js/spawn_points.js — Scarlett SpawnPoints v1 (FULL)
// Creates visible spawn pads + registers world.spawns used by Controls.teleportToSpawn()

export const SpawnPoints = {
  build({ THREE, scene, world, log }) {
    if (!world || !THREE || !scene) return;

    // Ensure spawns container exists
    world.spawns ||= {};

    // Helper: register spawn + add pad mesh
    const add = (name, pos, yaw = 0, color = 0x7fe7ff) => {
      world.spawns[name] = { position: pos.clone(), yaw };

      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.copy(pos);
      pad.position.y = 0.01; // slight above floor to avoid z-fighting
      pad.name = `SPAWN_PAD_${name}`;
      scene.add(pad);

      // small “post” indicator
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.65, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      );
      post.position.set(pos.x, 0.33, pos.z);
      post.name = `SPAWN_POST_${name}`;
      scene.add(post);

      log?.(`[spawns] ✅ ${name} @ ${pos.x.toFixed(2)},${pos.z.toFixed(2)} yaw=${yaw.toFixed(2)}`);
    };

    // If anchors exist, use them; else fall back to sane defaults.
    const A = world.anchors || {};

    // Lobby spawn (front of table, standing)
    add(
      "lobby_spawn",
      A.lobby_spawn ? A.lobby_spawn.clone() : new THREE.Vector3(0, 0, 3.2),
      Math.PI // face toward table by default
    );

    // Store spawn
    add(
      "store_spawn",
      A.store_spawn ? A.store_spawn.clone() : new THREE.Vector3(4.5, 0, -3.5),
      Math.PI
    );

    // Spectator rail spawn (nice viewing angle)
    add(
      "spectator",
      A.spectator ? A.spectator.clone() : new THREE.Vector3(0, 0, -3.0),
      0
    );

    // Table seat spawn (standing at a seat spot — you can auto-sit in scorpion only)
    add(
      "table_seat_1",
      A.table_seat_1 ? A.table_seat_1.clone() : new THREE.Vector3(0, 0, 0.95),
      Math.PI
    );

    // Scorpion room “gate” / entry spawn
    add(
      "scorpion_gate",
      A.scorpion_gate ? A.scorpion_gate.clone() : new THREE.Vector3(8.0, 0, 0.0),
      -Math.PI / 2,
      0xff2d7a
    );

    // Convenience alias for recenter button
    world.spawns.default = world.spawns.lobby_spawn;

    log?.("[spawns] ✅ pads built + world.spawns registered");
  },
};
