// /js/spawn_points.js — SpawnPoints v3 (SAFE PADS + APPLY)
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

      // subtle ring
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

    // --- EXISTING (keep your world layout coordinates) ---
    register("lobby_spawn", 0.00, 3.20, Math.PI, { room: "lobby", color: 0x7fe7ff });
    register("store_spawn", 4.50, -3.50, Math.PI, { room: "store", color: 0xff2d7a });
    register("spectator", 0.00, -3.00, 0.00, { room: "spectate", color: 0xffcc00 });

    // seats / gates you already had
    register("table_seat_1", 0.00, 0.95, Math.PI, { room: "table", color: 0x4cd964, pad: false });
    register("scorpion_gate", 8.00, 0.00, -Math.PI / 2, { room: "scorpion", color: 0xb266ff });

    // ❗ OLD scorpion seat (keep for when you want to auto-seat later)
    register("scorpion_seat_1", 8.00, 0.95, Math.PI, { room: "scorpion", color: 0x4cd964, pad: false });

    // ✅ NEW: SAFE SCORPION ROOM SPAWN (IN FRONT OF MACHINE / ENTRY)
    // This is intentionally NOT on/near the table.
    // Adjust x/z slightly if you want it closer/farther from the machine.
    register(
      "scorpion_safe_spawn",
      7.10,   // x
      1.85,   // z  (forward from the room entrance, away from table)
      Math.PI, // yaw (face "into" the room)
      { room: "scorpion", color: 0x00e5ff }
    );

    // exit
    register("scorpion_exit", 8.00, 0.00, Math.PI, { room: "lobby", color: 0xff6b6b, pad: false });

    // expose
    ctx.spawns = {
      map: spawns,

      get(name) {
        return spawns[name] || null;
      },

      // Apply spawn to player safely (also clears controller velocity if present)
      apply(name, player, opts = {}) {
        const s = spawns[name];
        if (!s || !player) return false;

        // Put headset/player capsule safely above ground
        // (Most of your world seems to treat Y as vertical; we set a safe standing height)
        const standY = opts.standY ?? 1.65;

        player.position.set(s.x, s.y + standY, s.z);
        player.rotation.set(0, s.yaw, 0);

        // If you have a "playerRig" / "cameraRig" etc, also try to reset it
        if (player.userData?.velocity) {
          player.userData.velocity.set(0, 0, 0);
        }

        // If controls has its own velocity/collision state, reset it politely
        ctx.controls?.resetVelocity?.();
        ctx.controls?.clearMotion?.();
        ctx.controls?.setEnabled?.(true);

        ctx.log?.(`[spawns] ▶ apply(${name}) -> x=${s.x.toFixed(2)} y=${(s.y + standY).toFixed(2)} z=${s.z.toFixed(2)} yaw=${s.yaw.toFixed(2)}`);
        return true;
      },
    };

    log?.("[spawns] ✅ pads built + ctx.spawns registered");
    return ctx.spawns;
  },
};
