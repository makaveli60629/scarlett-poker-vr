// /js/controls.js — ScarlettVR Controls v1
// Centralized XR locomotion + axis correction

export const Controls = {
  applyLocomotion(ctx, dt) {
    const { renderer, camera, player, deadzone, moveSpeed,
            diagonal45, diagonalAmount,
            snapTurnRad } = ctx;

    const session = renderer.xr.getSession?.();
    if (!session) return;

    const sources = Array.from(session.inputSources || []).filter(is => is?.gamepad);
    if (!sources.length) return;

    const rightSrc = sources.find(is => is.handedness === "right") || sources[0];
    const leftSrc  = sources.find(is => is.handedness === "left")  || sources[0];

    // Prefer right stick
    let move = this.readStick(rightSrc.gamepad, deadzone, "right");
    if (!move.active) move = this.readStick(leftSrc.gamepad, deadzone, "left");

    if (move.active) {
      const yaw = getHeadYaw(camera);
      const cos = Math.cos(yaw), sin = Math.sin(yaw);

      let x = move.x;
      let z = move.y;

      // 45° diagonal shaping (your signature movement)
      if (diagonal45 && x !== 0) {
        const sign = z !== 0 ? Math.sign(z) : -1;
        z += sign * Math.abs(x) * diagonalAmount;
        x *= (1.0 - 0.35);
        const len = Math.hypot(x, z);
        if (len > 1e-4) { x /= len; z /= len; }
      }

      const mx = x * cos - z * sin;
      const mz = x * sin + z * cos;

      player.position.x += mx * moveSpeed * dt;
      player.position.z += mz * moveSpeed * dt;
    }

    // Snap turn (right preferred)
    const turn = this.readTurn(rightSrc.gamepad || leftSrc.gamepad, deadzone);
    ctx.turnCooldown = Math.max(0, ctx.turnCooldown - dt);
    if (ctx.turnCooldown === 0 && turn.active) {
      const dir = turn.x > 0 ? -1 : 1;
      player.rotation.y += dir * snapTurnRad;
      ctx.turnCooldown = 0.22;
    }
  },

  readStick(gamepad, deadzone, handedness) {
    if (!gamepad) return { active: false, x: 0, y: 0 };
    const axes = gamepad.axes || [];

    const pairs = [];
    if (axes.length >= 2) pairs.push([0, 1]);
    if (axes.length >= 4) pairs.push([2, 3]);
    if (!pairs.length) return { active: false, x: 0, y: 0 };

    let best = pairs[0], bestMag = -1;
    for (const p of pairs) {
      const mag = Math.abs(axes[p[0]] || 0) + Math.abs(axes[p[1]] || 0);
      if (mag > bestMag) { bestMag = mag; best = p; }
    }

    let x = axes[best[0]] || 0;
    let y = axes[best[1]] || 0;

    if (Math.abs(x) < deadzone) x = 0;
    if (Math.abs(y) < deadzone) y = 0;

    // ✅ Axis correction (based on your exact report)
    if (handedness === "left") {
      x = -x;
      y = -y;
    } else if (handedness === "right") {
      y = -y;
    }

    return { active: !(x === 0 && y === 0), x, y };
  },

  readTurn(gamepad, deadzone) {
    if (!gamepad) return { active: false, x: 0 };
    const axes = gamepad.axes || [];

    let tx = 0;
    if (axes.length >= 3) tx = axes[2] || 0;
    else if (axes.length >= 1) tx = axes[0] || 0;

    if (Math.abs(tx) < deadzone) tx = 0;
    return { active: tx !== 0, x: tx };
  }
};

function getHeadYaw(camera) {
  const q = camera.quaternion;
  const t3 = +2.0 * (q.w * q.y + q.z * q.x);
  const t4 = +1.0 - 2.0 * (q.y * q.y + q.x * q.x);
  return Math.atan2(t3, t4);
    }
