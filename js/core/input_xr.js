import { log } from './diag.js';

function deadzone(v, dz=0.18) {
  if (Math.abs(v) < dz) return 0;
  const s = Math.sign(v);
  return s * (Math.abs(v) - dz) / (1 - dz);
}

export class XRMovement {
  constructor({ renderer, rig }) {
    this.renderer = renderer;
    this.rig = rig;
    this.speed = 2.0;
    this.turnSpeed = 2.2;
    this.tmp = { forward:0, strafe:0, turn:0 };

    this.renderer.xr.addEventListener('sessionstart', () => {
      log('[xr] sessionstart');
    });
  }

  update(dt) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    // Read gamepad axes from any XRInputSource with a gamepad
    let moveX = 0, moveY = 0, turnX = 0;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) continue;

      // Most controllers: axes[2],axes[3] = right stick; axes[0],axes[1] = left stick
      const a0 = gp.axes[0] ?? 0;
      const a1 = gp.axes[1] ?? 0;
      const a2 = gp.axes[2] ?? 0;
      const a3 = gp.axes[3] ?? 0;

      moveX += deadzone(a0);
      moveY += deadzone(a1);
      turnX += deadzone(a2);

      // If device only has one stick, use that for movement
      if (gp.axes.length < 4) {
        turnX += 0;
      }
    }

    // Apply
    const yaw = this.rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    const forward = -moveY;
    const strafe = moveX;

    const vx = (strafe * cos + forward * sin) * this.speed;
    const vz = (forward * cos - strafe * sin) * this.speed;

    this.rig.position.x += vx * dt;
    this.rig.position.z += vz * dt;

    this.rig.rotation.y -= turnX * this.turnSpeed * dt;
  }
}
