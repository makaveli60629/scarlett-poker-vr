// /core/controls.js — ScarlettVR Core Controls (XR) v1.0
// This file is intentionally self-contained and exports BOTH:
//   - named export: Controls
//   - default export: Controls
// So imports like: import { Controls } from "../core/controls.js" work.
// ✅ XR gamepad locomotion + snap turn
// ✅ Does not depend on other modules

export const Controls = (() => {
  const S = {
    deadzone: 0.14,
    moveSpeed: 2.9,
    snapTurnRad: Math.PI / 6, // 30deg
    snapCooldown: 0.22,
    _turnTimer: 0
  };

  function setTuning({ deadzone, moveSpeed, snapTurnRad, snapCooldown } = {}) {
    if (typeof deadzone === "number") S.deadzone = deadzone;
    if (typeof moveSpeed === "number") S.moveSpeed = moveSpeed;
    if (typeof snapTurnRad === "number") S.snapTurnRad = snapTurnRad;
    if (typeof snapCooldown === "number") S.snapCooldown = snapCooldown;
  }

  function _dz(v) { return Math.abs(v) < S.deadzone ? 0 : v; }

  function applyLocomotion(ctx, dt) {
    // ctx expects: renderer, player, controllers, camera (optional), diagonal45 (optional)
    const { renderer, player, controllers } = ctx;
    if (!renderer?.xr?.isPresenting) return;

    // Try both controllers; prefer right for move
    const srcR = controllers?.c1?.inputSource?.gamepad || controllers?.c1?.gamepad || null;
    const srcL = controllers?.c0?.inputSource?.gamepad || controllers?.c0?.gamepad || null;

    // On Quest: axes typically: [x,y] on stick; sometimes reversed in older builds
    const gp = srcR || srcL;
    if (!gp || !gp.axes) return;

    // Move stick: usually axes[2]/[3] or [0]/[1] depending on browser
    const ax = gp.axes;
    const candidates = [
      { x: ax[2], y: ax[3] },
      { x: ax[0], y: ax[1] },
    ];

    // pick pair with bigger magnitude
    let best = candidates[0];
    let bestMag = (best.x*best.x + best.y*best.y);
    for (const c of candidates) {
      const m = (c.x*c.x + c.y*c.y);
      if (m > bestMag) { best = c; bestMag = m; }
    }

    // Invert forward/back to match expected: up on stick = forward
    let mx = _dz(best.x);
    let my = _dz(best.y);
    let forward = -my;
    let strafe = mx;

    // Optional 45-degree quantize
    if (ctx.diagonal45) {
      const ang = Math.atan2(forward, strafe);
      const step = Math.PI / 4;
      const snapped = Math.round(ang / step) * step;
      const mag = Math.min(1, Math.hypot(forward, strafe));
      forward = Math.sin(snapped) * mag;
      strafe = Math.cos(snapped) * mag;
    }

    // Movement in yaw space
    const yaw = player.rotation.y;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    player.position.x += (strafe * cos + forward * sin) * S.moveSpeed * dt;
    player.position.z += (forward * cos - strafe * sin) * S.moveSpeed * dt;

    // Snap turn (use left stick if available)
    const gpTurn = srcL || gp;
    if (gpTurn?.axes?.length) {
      let tx = _dz(gpTurn.axes[2] ?? gpTurn.axes[0] ?? 0);
      // if move stick uses [2]/[3], turn could be [0]/[1] on some configs
      if (Math.abs(tx) < 0.01) tx = _dz(gpTurn.axes[0] ?? 0);

      S._turnTimer = Math.max(0, S._turnTimer - dt);
      if (S._turnTimer === 0 && Math.abs(tx) > 0.65) {
        player.rotation.y += (tx > 0 ? -S.snapTurnRad : S.snapTurnRad);
        S._turnTimer = S.snapCooldown;
      }
    }
  }

  return { setTuning, applyLocomotion };
})();

export default Controls;
