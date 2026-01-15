// /js/scarlett1/modules/controls_remap.js — Scarlett Controls Remap v1
// Drop-in module. No renderer.setAnimationLoop. Uses world.addFrameHook.
// Mapping:
// RIGHT stick Y = forward/back
// RIGHT stick X = snap turn 45°
// LEFT stick X = strafe
// Trigger = teleport (already handled by spine_xr selectstart)
// Y button = menu toggle (buttons[3])

export function install({ THREE, DIAG, WORLD }) {
  const D = DIAG || console;
  const W = WORLD || window.__SCARLETT1__;
  if (!W || !W.renderer || !W.rig || !W.player || !W.addFrameHook) {
    D.warn("[controls_remap] missing WORLD rig/player/addFrameHook");
    return;
  }

  const { renderer, rig, player, addFrameHook } = W;

  const DEAD = 0.18;
  const MOVE_SPEED = 1.35;      // slow but responsive
  const STRAFE_SPEED = 1.15;    // slow strafe

  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.30;
  let turnCD = 0;

  let prevY = false;

  function getXRGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return [];
    const out = [];
    for (const src of s.inputSources) {
      if (src?.gamepad) out.push(src.gamepad);
    }
    return out;
  }

  function axis(v) {
    return Math.abs(v) > DEAD ? v : 0;
  }

  function applyForward(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    rig.position.add(fwd.multiplyScalar(amt * MOVE_SPEED * dt));
  }

  function applyStrafe(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    rig.position.add(right.multiplyScalar(amt * STRAFE_SPEED * dt));
  }

  function snapTurn(dir) {
    const yaw = (player.yaw ?? rig.rotation.y ?? 0) + dir * TURN_ANGLE;
    player.yaw = yaw;
    rig.rotation.y = yaw;
  }

  addFrameHook(({ dt }) => {
    if (!renderer.xr.isPresenting) return;

    const gps = getXRGamepads();
    if (!gps.length) return;

    // Heuristic: gp[0]=left, gp[1]=right on Quest
    const gpL = gps[0];
    const gpR = gps[gps.length > 1 ? 1 : 0];

    // RIGHT stick: forward/back on Y (axes[3] often), but varies.
    // We'll try common layouts:
    // - If axes length >= 4: right stick is axes[2], axes[3]
    // - Else: treat axes[0], axes[1] as primary
    let rX = 0, rY = 0;
    if (gpR.axes?.length >= 4) {
      rX = gpR.axes[2] || 0;
      rY = gpR.axes[3] || 0;
    } else if (gpR.axes?.length >= 2) {
      rX = gpR.axes[0] || 0;
      rY = gpR.axes[1] || 0;
    }

    // LEFT stick: strafe only on X
    let lX = 0;
    if (gpL.axes?.length >= 2) lX = gpL.axes[0] || 0;

    // Apply forward/back (invert Y so forward is negative)
    const fwdAmt = axis(-rY);
    if (fwdAmt) applyForward(dt, fwdAmt);

    // Strafe from left stick X
    const strafeAmt = axis(lX);
    if (strafeAmt) applyStrafe(dt, strafeAmt);

    // Snap turn from right stick X
    const turnAmt = axis(rX);
    turnCD -= dt;
    if (turnCD <= 0 && turnAmt !== 0) {
      // If direction feels reversed, swap the sign here
      snapTurn(turnAmt > 0 ? -1 : 1);
      turnCD = TURN_COOLDOWN;
    }

    // Y menu toggle (buttons[3]) on LEFT controller
    const yDown = !!gpL.buttons?.[3]?.pressed;
    if (yDown && !prevY) {
      // If spine_xr created the menu toggle, it may listen elsewhere.
      // We expose a global hook so spine_xr can respond.
      window.__SCARLETT_MENU_TOGGLE__?.();
      D.log("[controls_remap] Y menu toggle");
    }
    prevY = yDown;
  });

  D.log("[controls_remap] installed ✅");
}
