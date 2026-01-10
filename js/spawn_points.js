// /js/spawn_points.js — SpawnPoints v3.1 (SEAT HEIGHT FIX)
// Builds visible pads + registers named spawn transforms.
// Convention: we store { x, z, y, yaw } and apply to player safely.

export const SpawnPoints = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    // --- helpers ---
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

    // --- registry ---
    const spawns = {};
    const register = (name, x, z, yaw, opts = {}) => {
      spawns[name] = {
        x, z,
        y: opts.y ?? 0,
        yaw,
        room: opts.room ?? "any",
      };
      if (opts.pad !== false) mkPad(name, x, z, yaw, opts.color ?? 0x7fe7ff);
      log?.(`[spawns] ✅ ${name} @ ${x.toFixed(2)},${z.toFixed(2)} yaw=${yaw.toFixed(2)}`);
    };

    // --- EXISTING ---
    register("lobby_spawn", 0.00, 3.20, Math.PI, { room: "lobby", color: 0x7fe7ff });
    register("store_spawn", 4.50, -3.50, Math.PI, { room: "store", color: 0xff2d7a });
    register("spectator", 0.00, -3.00, 0.00, { room: "spectate", color: 0xffcc00 });

    // ✅ Seat height fix:
    // Lower the rig so standing players "feel seated" at the table.
    // If it feels too low/high, tweak -0.60 to -0.50 or -0.70.
    const SEAT_Y = -0.60;

    register("table_seat_1", 0.00, 0.95, Math.PI, { room: "table", color: 0x4cd964, pad: false, y: SEAT_Y });

    register("scorpion_gate", 8.00, 0.00, -Math.PI / 2, { room: "scorpion", color: 0xb266ff });

    // ✅ Scorpion seat (auto-seat target)
    // yaw=Math.PI is correct for seat at z=0.95 facing toward table center near z=0.
    register("scorpion_seat_1", 8.00, 0.95, Math.PI, { room: "scorpion", color: 0x4cd964, pad: false, y: SEAT_Y });

    // ✅ Safe standing spawn (optional, still useful if you ever want free-roam in scorpion)
    register(
      "scorpion_safe_spawn",
      7.10,
      1.85,
      Math.PI,
      { room: "scorpion", color: 0x00e5ff }
    );

    register("scorpion_exit", 8.00, 0.00, Math.PI, { room: "lobby", color: 0xff6b6b, pad: false });

    // expose
    ctx.spawns = {
      map: spawns,

      get(name) {
        return spawns[name] || null;
      },

      apply(name, player, opts = {}) {
        const s = spawns[name];
        if (!s || !player) return false;

        const standY = opts.standY ?? 1.65;

        player.position.set(s.x, s.y + standY, s.z);
        player.rotation.set(0, s.yaw, 0);

        if (player.userData?.velocity) {
          player.userData.velocity.set(0, 0, 0);
        }

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
