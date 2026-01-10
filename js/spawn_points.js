// /js/spawn_points.js — SpawnPoints v3.3 (SCORPION SEAT HARD SAFE)
// Builds pads + registers named spawns.
// Adds optional seat hints (seatBack) for Controls.sitAt() safety.

export const SpawnPoints = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const mkPad = (name, x, z, yaw, color = 0x7fe7ff) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.08, 28),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.25,
          roughness: 0.35,
          emissive: color,
          emissiveIntensity: 0.12,
        })
      );
      pad.position.set(x, 0.04, z);
      pad.rotation.y = yaw;
      pad.name = `spawnpad:${name}`;
      pad.receiveShadow = true;
      pad.castShadow = false;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.58, 44),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.051;
      pad.add(ring);

      scene.add(pad);
      return pad;
    };

    const spawns = {};
    const register = (name, x, z, yaw, opts = {}) => {
      spawns[name] = {
        x, z,
        y: opts.y ?? 0,
        yaw,
        room: opts.room ?? "any",
        // optional seat hints
        seatBack: opts.seatBack ?? 0,
      };
      if (opts.pad !== false) mkPad(name, x, z, yaw, opts.color ?? 0x7fe7ff);
      log?.(`[spawns] ✅ ${name} @ ${x.toFixed(2)},${z.toFixed(2)} yaw=${yaw.toFixed(2)}`);
    };

    register("lobby_spawn", 0.00, 3.20, Math.PI, { room: "lobby", color: 0x7fe7ff });
    register("store_spawn", 4.50, -3.50, Math.PI, { room: "store", color: 0xff2d7a });
    register("spectator", 0.00, -3.00, 0.00, { room: "spectate", color: 0xffcc00 });

    // Lobby seat (safe)
    register("table_seat_1", 0.00, 1.55, Math.PI, { room: "table", color: 0x4cd964, pad: false, seatBack: 0.35 });

    register("scorpion_gate", 8.00, 0.00, -Math.PI / 2, { room: "scorpion", color: 0xb266ff });

    // ✅ HARD SAFE SCORPION SEAT
    // This is intentionally farther back so you cannot spawn inside the felt/table collider.
    // If it feels too far, we can pull it forward later in small increments.
    register("scorpion_seat_1", 8.00, 2.35, Math.PI, {
      room: "scorpion",
      color: 0x4cd964,
      pad: false,
      seatBack: 0.75, // Controls will nudge back along yaw by this much as extra safety
    });

    register("scorpion_safe_spawn", 7.10, 1.85, Math.PI, { room: "scorpion", color: 0x00e5ff });

    register("scorpion_exit", 8.00, 0.00, Math.PI, { room: "lobby", color: 0xff6b6b, pad: false });

    ctx.spawns = {
      map: spawns,
      get(name) { return spawns[name] || null; },

      apply(name, player, opts = {}) {
        const s = spawns[name];
        if (!s || !player) return false;

        const standY = opts.standY ?? 1.65;
        player.position.set(s.x, s.y + standY, s.z);
        player.rotation.set(0, s.yaw, 0);

        if (player.userData?.velocity) player.userData.velocity.set(0, 0, 0);

        ctx.controls?.resetVelocity?.();
        ctx.controls?.clearMotion?.();
        ctx.controls?.setEnabled?.(true);

        ctx.log?.(
          `[spawns] ▶ apply(${name}) -> x=${s.x.toFixed(2)} y=${(s.y + standY).toFixed(2)} z=${s.z.toFixed(2)} yaw=${s.yaw.toFixed(2)}`
        );
        return true;
      },
    };

    log?.("[spawns] ✅ pads built + ctx.spawns registered");
    return ctx.spawns;
  },
};
