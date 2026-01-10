// /js/spawn_points.js — SpawnPoints v3.6 (XR HEIGHT FIX + FLOOR SAFE + WALL SAFE)
//
// ✅ IMPORTANT:
// - Spawn y values are FLOOR LEVEL (0), NOT eye height.
// - If opts.standY / opts.seatY is passed, we compute rig.y so camera eye is correct.
//   rigY = desiredEyeHeight - cameraLocalY
// - Supports apply(name, rigOverride, opts)
// - Keeps compatibility with ctx.spawns.map / list / direct refs
// - Adds gentle clamp so you can't spawn outside playable area

export const SpawnPoints = {
  build(ctx) {
    // FLOOR-LEVEL spawns (y = 0)
    const spawns = {
      // Lobby
      lobby_spawn: { x: 0.00, y: 0.00, z: 2.80, yaw: 0.00 },

      store_spawn: { x: 4.50, y: 0.00, z: -3.50, yaw: 3.14 },
      spectator:   { x: 0.00, y: 0.00, z: -3.00, yaw: 0.00 },

      // Scorpion
      scorpion_safe_spawn: { x: 7.00, y: 0.00, z: 1.40, yaw: 3.14 },
      scorpion_seat_1:     { x: 8.00, y: 0.00, z: 1.55, yaw: 3.14, seatBack: 0.45 },
    };

    // Make sure ctx.spawns exists + supports patching
    ctx.spawns = ctx.spawns || {};
    ctx.spawns.map = ctx.spawns.map || {};
    ctx.spawns.list = ctx.spawns.list || {};

    // Fill all references (map/list/direct)
    for (const k of Object.keys(spawns)) {
      ctx.spawns.map[k]  = ctx.spawns.map[k]  || spawns[k];
      ctx.spawns.list[k] = ctx.spawns.list[k] || spawns[k];
      ctx.spawns[k]      = ctx.spawns[k]      || spawns[k];
    }

    // Helpers
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    function getRig() {
      return ctx.playerGroup || ctx.player || ctx.playerRig || null;
    }

    function getSpawn(name) {
      return (
        ctx.spawns.map?.[name] ||
        ctx.spawns.list?.[name] ||
        ctx.spawns?.[name] ||
        ctx.spawns.map?.lobby_spawn ||
        spawns.lobby_spawn
      );
    }

    function cameraLocalY() {
      // In XR, camera.position.y is local inside rig.
      // In non-XR, it might be 1.6-ish. Either way, we use it.
      return (ctx.camera?.position?.y ?? 0);
    }

    function applyEyeHeight(rig, desiredEyeY) {
      // rigY = desiredEyeHeight - cameraLocalY
      const camY = cameraLocalY();
      const rigY = desiredEyeY - camY;
      rig.position.y = rigY;
      return rigY;
    }

    // ✅ apply(name, rigOverride, opts)
    // opts:
    //  - standY: desired standing eye height (meters), e.g. 1.65
    //  - seatY:  desired seated eye height, e.g. 1.05
    //  - clampXZ: { minX,maxX,minZ,maxZ } optional
    ctx.spawns.apply = (name = "lobby_spawn", rigOverride = null, opts = {}) => {
      const s = getSpawn(name);
      const rig = rigOverride || getRig();
      if (!rig) return false;

      // Put rig at XZ spawn. Keep y at floor for now.
      rig.position.set(s.x || 0, s.y || 0, s.z || 0);
      rig.rotation.set(0, s.yaw || 0, 0);

      // Optional clamp to keep you inside play area
      // Default bounds are generous
      const bounds = opts.clampXZ || { minX: -18, maxX: 18, minZ: -18, maxZ: 18 };
      rig.position.x = clamp(rig.position.x, bounds.minX, bounds.maxX);
      rig.position.z = clamp(rig.position.z, bounds.minZ, bounds.maxZ);

      // ✅ Height correction (THIS is the key fix)
      // If standY/seatY provided, compute rig.y so camera eye is correct.
      let appliedRigY = rig.position.y;

      if (typeof opts.seatY === "number") {
        appliedRigY = applyEyeHeight(rig, opts.seatY);
      } else if (typeof opts.standY === "number") {
        appliedRigY = applyEyeHeight(rig, opts.standY);
      } else {
        // If no opts provided, keep rig on floor (0) and let XR local-floor handle head height
        rig.position.y = s.y || 0;
        appliedRigY = rig.position.y;
      }

      console.log(
        `[spawns] ▶ apply(${name}) -> x=${rig.position.x.toFixed(2)} y=${appliedRigY.toFixed(2)} z=${rig.position.z.toFixed(2)} yaw=${(s.yaw||0).toFixed(2)} camLocalY=${cameraLocalY().toFixed(2)}`
      );

      return true;
    };

    // Convenience getter (some systems use it)
    ctx.spawns.get = (name) => getSpawn(name);

    console.log("[spawns] ✅ built (v3.6 XR height fix)");
    return spawns;
  },
};
