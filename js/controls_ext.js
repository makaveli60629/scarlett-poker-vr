// /js/controls_ext.js — ScarlettVR Controls Extension v1.1 (NO core import)
// ✅ Fixes: left stick reversed (invert X+Y), right stick forward/back reversed (invert Y)
// ✅ Adds: 45° diagonal shaping + snap turn
// ✅ Does NOT depend on /core exports (prevents your current error)

export const ControlsExt = {
  applyLocomotion(ctx, dt) {
    const { renderer, camera, player, deadzone, moveSpeed, diagonal45, diagonalAmount, snapTurnRad } = ctx;

    const session = renderer.xr.getSession?.();
    if (!session) return;

    const sources = Array.from(session.inputSources || []).filter(s => s?.gamepad);
    if (!sources.length) return;

    const right = sources.find(s => s.handedness === "right") || sources[0];
    const left  = sources.find(s => s.handedness === "left")  || sources[0];

    // Prefer right stick; fallback left stick
    let move = readStick(right.gamepad, deadzone, "right");
    if (!move.active) move = readStick(left.gamepad, deadzone, "left");

    if (move.active) {
      const yaw = getHeadYaw(camera);
      const cos = Math.cos(yaw), sin = Math.sin(yaw);

      let x = move.x;
      let z = move.y;

      // 45° diagonal shaping
      if (diagonal45 && x !== 0) {
        const sign = z !== 0 ? Math.sign(z) : 1;
        z += sign * Math.abs(x) * diagonalAmount;
        x *= 0.65;
        const len = Math.hypot(x, z);
        if (len > 1e-4) { x /= len; z /= len; }
      }

      // head-relative movement
      const mx = x * cos - z * sin;
      const mz = x * sin + z * cos;

      player.position.x += mx * moveSpeed * dt;
      player.position.z += mz * moveSpeed * dt;
    }

    // Snap turn
    const turn = readTurn(right.gamepad || left.gamepad, deadzone);
    ctx.turnCooldown = Math.max(0, ctx.turnCooldown - dt);
    if (ctx.turnCooldown === 0 && turn.active) {
      player.rotation.y += (turn.x > 0 ? -1 : 1) * snapTurnRad;
      ctx.turnCooldown = 0.22;
    }
  }
};

function readStick(gamepad, deadzone, hand) {
  if (!gamepad) return { active: false, x: 0, y: 0 };
  const a = gamepad.axes || [];

  // Pick best axis pair (0/1 or 2/3)
  const pairs = [];
  if (a.length >= 2) pairs.push([0, 1]);
  if (a.length >= 4) pairs.push([2, 3]);
  if (!pairs.length) return { active: false, x: 0, y: 0 };

  let best = pairs[0], bestMag = -1;
  for (const p of pairs) {
    const mag = Math.abs(a[p[0]] || 0) + Math.abs(a[p[1]] || 0);
    if (mag > bestMag) { bestMag = mag; best = p; }
  }

  let x = a[best[0]] || 0;
  let y = a[best[1]] || 0;

  if (Math.abs(x) < deadzone) x = 0;
  if (Math.abs(y) < deadzone) y = 0;

  // ✅ Your exact corrections
  if (hand === "left") { x = -x; y = -y; }
  if (hand === "right") { y = -y; }

  return { active: (x !== 0 || y !== 0), x, y };
}

function readTurn(gamepad, deadzone) {
  if (!gamepad) return { active: false, x: 0 };
  const a = gamepad.axes || [];

  let tx = 0;
  if (a.length >= 3) tx = a[2] || 0;
  else if (a.length >= 1) tx = a[0] || 0;

  if (Math.abs(tx) < deadzone) tx = 0;
  return { active: tx !== 0, x: tx };
}

function getHeadYaw(camera) {
  const q = camera.quaternion;
  return Math.atan2(
    2 * (q.w*q.y + q.z*q.x),
    1 - 2 * (q.y*q.y + q.x*q.x)
  );
    }
