// /js/spawn_points.js — SpawnPoints v3.4 (FLOOR SAFE + WALL SAFE)

export const SpawnPoints = {
  build(ctx) {
    const spawns = {
      // always human height
      lobby_spawn: { x: 0.00, y: 1.60, z: 2.80, yaw: 0.00 },

      store_spawn: { x: 4.50, y: 1.60, z: -3.50, yaw: 3.14 },
      spectator:   { x: 0.00, y: 1.60, z: -3.00, yaw: 0.00 },

      // scorpion
      scorpion_safe_spawn: { x: 7.00, y: 1.60, z: 1.40, yaw: 3.14 },
      scorpion_seat_1:     { x: 8.00, y: 1.60, z: 1.55, yaw: 3.14 },
    };

    // Support both map and list (so any module can patch them)
    ctx.spawns = ctx.spawns || {};
    ctx.spawns.map = ctx.spawns.map || {};
    ctx.spawns.list = ctx.spawns.list || {};

    // Fill both references
    for (const k of Object.keys(spawns)) {
      ctx.spawns.map[k] = ctx.spawns.map[k] || spawns[k];
      ctx.spawns.list[k] = ctx.spawns.list[k] || spawns[k];
      ctx.spawns[k] = ctx.spawns[k] || spawns[k];
    }

    ctx.spawns.apply = (name = "lobby_spawn") => {
      const s =
        ctx.spawns.map?.[name] ||
        ctx.spawns.list?.[name] ||
        ctx.spawns?.[name] ||
        ctx.spawns.map?.lobby_spawn ||
        spawns.lobby_spawn;

      const pg = ctx.playerGroup || ctx.player || ctx.playerRig;
      if (!pg) return;

      pg.position.set(s.x, s.y, s.z);
      pg.rotation.set(0, s.yaw || 0, 0);

      console.log(
        `[spawns] ▶ apply(${name}) -> x=${s.x.toFixed(2)} y=${s.y.toFixed(2)} z=${s.z.toFixed(2)} yaw=${(s.yaw||0).toFixed(2)}`
      );
    };

    console.log("[spawns] ✅ built (v3.4)");
    return spawns;
  },
};
