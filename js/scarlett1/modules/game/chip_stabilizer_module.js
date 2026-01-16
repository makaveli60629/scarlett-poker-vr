// /js/scarlett1/modules/game/chip_stabilizer_module.js
// CHIP STABILIZER MODULE (FULL) — Modular Forever
// - Keeps chips flat/upright (no sideways chips)
// - Optional: snap chips back into neat stacks when released
// Requires chips have userData.type === "chip" (world module already does this)

export function createChipStabilizerModule({
  uprightStrength = 1.0,      // 1.0 = hard lock upright
  maxTiltRadians = 0.18,      // allow tiny tilt while held (visual), then correct
  snapOnRelease = true,       // snap chips back to original stack positions
  snapDelay = 0.10,           // seconds after release to snap back
} = {}) {
  // Track chip "home" transforms so stacks stay clean
  const homes = new WeakMap();     // chip -> { parent, pos, quat }
  const heldState = new WeakMap(); // chip -> { heldBy: "left/right"/null, lastHeldBy, releasedAt }

  function rememberHome(chip) {
    if (homes.has(chip)) return;
    homes.set(chip, {
      parent: chip.parent,
      pos: chip.position.clone(),
      quat: chip.quaternion.clone(),
    });
  }

  function isChip(obj) {
    return obj?.userData?.type === "chip";
  }

  function clampTiltKeepYaw(ctx, obj) {
    // Force chip upright: keep yaw, zero roll/pitch
    const THREE = ctx.THREE;
    const e = new THREE.Euler().setFromQuaternion(obj.quaternion, "YXZ");

    // clamp pitch/roll
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    e.x = clamp(e.x, -maxTiltRadians, maxTiltRadians);
    e.z = clamp(e.z, -maxTiltRadians, maxTiltRadians);

    // Blend toward upright based on uprightStrength
    // upright = x=0,z=0, keep y
    e.x *= (1.0 - uprightStrength);
    e.z *= (1.0 - uprightStrength);

    obj.quaternion.setFromEuler(e);
  }

  function snapToHome(ctx, chip) {
    const home = homes.get(chip);
    if (!home) return;

    // Put chip back under original parent and restore transform
    const THREE = ctx.THREE;

    // Capture world transform before reparent (not strictly needed if we snap)
    // We are snapping so we just restore home local transform.
    if (chip.parent !== home.parent && home.parent) {
      home.parent.add(chip);
    }
    chip.position.copy(home.pos);
    chip.quaternion.copy(home.quat);

    // Make sure it's flat
    clampTiltKeepYaw(ctx, chip);
  }

  return {
    name: "chip_stabilizer",

    onEnable(ctx) {
      // Record home transforms for all chips already registered
      for (const obj of (ctx.interactables || [])) {
        if (isChip(obj)) rememberHome(obj);
      }
      console.log("[chip_stabilizer] ready ✅ homes=", (ctx.interactables || []).filter(isChip).length);
    },

    update(ctx, { dt }) {
      // Keep homes updated if new chips appear
      for (const obj of (ctx.interactables || [])) {
        if (isChip(obj)) rememberHome(obj);
      }

      const now = performance.now() / 1000;

      for (const obj of (ctx.interactables || [])) {
        if (!isChip(obj)) continue;

        // Keep chips upright always (even while held)
        clampTiltKeepYaw(ctx, obj);

        const heldBy = obj.userData?.heldBy || null;

        let st = heldState.get(obj);
        if (!st) {
          st = { heldBy: null, lastHeldBy: null, releasedAt: -1 };
          heldState.set(obj, st);
        }

        // Detect transitions
        if (heldBy && st.heldBy !== heldBy) {
          st.heldBy = heldBy;
          st.lastHeldBy = heldBy;
          st.releasedAt = -1;
        } else if (!heldBy && st.heldBy) {
          // released
          st.heldBy = null;
          st.releasedAt = now;
        }

        // Snap after release
        if (snapOnRelease && st.releasedAt > 0 && (now - st.releasedAt) >= snapDelay) {
          // Only snap once per release
          st.releasedAt = -1;
          snapToHome(ctx, obj);
        }
      }
    },
  };
}
