// /js/scarlett1/modules/xr/xr_locomotion_module.js
// Uses normalized input ONLY.

export function createXRLocomotionModule({ speed = 2.25 } = {}) {
  return {
    name: "xr_locomotion",
    update(ctx, { dt, input }) {
      const stickL = Math.hypot(input.left.stickX, input.left.stickY);
      const sx = (stickL > 0.01) ? input.left.stickX : input.right.stickX;
      const sy = (stickL > 0.01) ? input.left.stickY : input.right.stickY;

      const strafe = sx;
      const forward = -sy;

      const THREE = ctx.THREE;
      const e = new THREE.Euler().setFromQuaternion(ctx.camera.quaternion, "YXZ");
      const yaw = e.y;

      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const wx = (strafe * cos) - (forward * sin);
      const wz = (strafe * sin) + (forward * cos);

      if (Math.hypot(wx, wz) > 0.001) {
        ctx.playerRig.position.x += wx * speed * dt;
        ctx.playerRig.position.z += wz * speed * dt;
      }
    }
  };
}
