// xr_locomotion_module.js
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createXRLocomotionModule({ speed = 2.25 } = {}) {
  const eul = new THREE.Euler();

  return {
    name: "xr_locomotion",
    update({ dt, input, camera, playerRig }) {
      // prefer left stick, fallback right
      const stickL = Math.hypot(input.left.stickX, input.left.stickY);
      const stickR = Math.hypot(input.right.stickX, input.right.stickY);
      const sx = (stickL > 0.01) ? input.left.stickX : input.right.stickX;
      const sy = (stickL > 0.01) ? input.left.stickY : input.right.stickY;

      // forward is typically -Y
      const strafe = sx;
      const forward = -sy;

      eul.setFromQuaternion(camera.quaternion, "YXZ");
      const yaw = eul.y;

      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const wx = (strafe * cos) - (forward * sin);
      const wz = (strafe * sin) + (forward * cos);

      if (Math.hypot(wx, wz) > 0.001) {
        playerRig.position.x += wx * speed * dt;
        playerRig.position.z += wz * speed * dt;
      }
    }
  };
}
