// /js/scarlett1/modules/xr/xr_teleport_blink_module.js
// Primary (A/X) = blink forward. Grip NEVER teleports.

export function createXRTeleportBlinkModule({ distance = 1.25 } = {}) {
  const prev = { left: 0, right: 0 };

  return {
    name: "xr_teleport_blink",
    update(ctx, { input }) {
      if (!ctx.xrSession) return;

      function primaryDown(hand) {
        const v = input[hand].primary;
        const down = (v > 0.55 && prev[hand] <= 0.55);
        prev[hand] = v;
        return down;
      }

      if (primaryDown("left") || primaryDown("right")) {
        const THREE = ctx.THREE;
        const q = new THREE.Quaternion();
        ctx.camera.getWorldQuaternion(q);

        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
        fwd.y = 0;
        fwd.normalize();

        ctx.playerRig.position.addScaledVector(fwd, distance);
      }
    }
  };
}
