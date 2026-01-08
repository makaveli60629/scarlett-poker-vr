// /js/controls.js — smooth move + snap turn for Quest
export const Controls = {
  init({ THREE, renderer, camera, player, controllers, log, world }) {
    let session = null;

    renderer.xr.addEventListener("sessionstart", () => {
      session = renderer.xr.getSession();
      log("[controls] XR session started");
    });
    renderer.xr.addEventListener("sessionend", () => {
      session = null;
      log("[controls] XR session ended");
    });

    let snapCooldown = 0;

    function applyMove(dt) {
      if (!session) return;

      const sources = session.inputSources || [];
      for (const src of sources) {
        const gp = src.gamepad;
        if (!gp || !gp.axes) continue;

        // Left stick usually axes[2], axes[3] on Quest, but can vary.
        // We'll detect both common layouts.
        const axX = (gp.axes.length >= 4) ? gp.axes[2] : gp.axes[0];
        const axY = (gp.axes.length >= 4) ? gp.axes[3] : gp.axes[1];

        // deadzone
        const dz = 0.15;
        const x = Math.abs(axX) < dz ? 0 : axX;
        const y = Math.abs(axY) < dz ? 0 : axY;

        // Smooth move (forward/back + strafe) in camera yaw space
        if (x || y) {
          const speed = 2.2;
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          forward.y = 0; forward.normalize();

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          right.y = 0; right.normalize();

          const delta = new THREE.Vector3()
            .addScaledVector(forward, -y * speed * dt)
            .addScaledVector(right, x * speed * dt);

          player.position.add(delta);

          // Optional clamp if world provides bounds
          if (world?.roomClamp) {
            player.position.x = Math.max(world.roomClamp.minX, Math.min(world.roomClamp.maxX, player.position.x));
            player.position.z = Math.max(world.roomClamp.minZ, Math.min(world.roomClamp.maxZ, player.position.z));
          }
        }

        // Snap turn (right stick if available)
        const rx = (gp.axes.length >= 4) ? gp.axes[0] : 0; // fallback
        snapCooldown = Math.max(0, snapCooldown - dt);
        if (snapCooldown === 0) {
          if (rx > 0.85) { player.rotation.y -= Math.PI / 6; snapCooldown = 0.22; }
          if (rx < -0.85) { player.rotation.y += Math.PI / 6; snapCooldown = 0.22; }
        }

        break; // only use first valid gamepad
      }
    }

    return {
      update(dt) { applyMove(dt); }
    };
  }
};
