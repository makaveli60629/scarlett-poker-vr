// /js/controls.js — Scarlett Controls v4.0 (FULL)
// ✅ Smooth move + strafe (left stick X/Y)
// ✅ Snap turn (right stick X)
// ✅ Reads HUD flags (move/snap)
// ✅ Emits "scarlett-menu" on Y (or Oculus menu fallback)

export const Controls = (() => {
  function init({ THREE, renderer, camera, player, controllers, grips, log, world } = {}) {
    const S = {
      moveEnabled: !!(window.__SCARLETT_FLAGS?.move ?? true),
      snapEnabled: !!(window.__SCARLETT_FLAGS?.snap ?? true),
      speed: 2.2,
      snapAngle: THREE.MathUtils.degToRad(30),
      deadzone: 0.18,
      snapCooldown: 0,
      touch: { f:0,b:0,l:0,r:0,turnL:0,turnR:0 },
    };

    window.addEventListener("scarlett-toggle-move", (e) => { S.moveEnabled = !!e.detail; });
    window.addEventListener("scarlett-toggle-snap", (e) => { S.snapEnabled = !!e.detail; });
    window.addEventListener("scarlett-touch", (e) => { S.touch = e.detail || S.touch; });

    function getSession() { return renderer.xr.getSession?.(); }

    function readGamepadAxes(handednessWanted) {
      const session = getSession();
      if (!session) return null;
      for (const src of session.inputSources) {
        if (!src?.gamepad) continue;
        if (handednessWanted && src.handedness !== handednessWanted) continue;
        const axes = src.gamepad.axes || [];
        const buttons = src.gamepad.buttons || [];
        return { axes, buttons, handedness: src.handedness };
      }
      return null;
    }

    function dz(v) {
      const a = Math.abs(v);
      if (a < S.deadzone) return 0;
      const sign = Math.sign(v);
      const t = (a - S.deadzone) / (1 - S.deadzone);
      return sign * t;
    }

    function update(dt) {
      // clamp to floor always
      player.position.y = 0;

      // --- Mobile dock fallback ---
      if (!renderer.xr.isPresenting) {
        // use touch state only
        const f = S.touch.f - S.touch.b;
        const r = S.touch.r - S.touch.l;
        const turn = S.touch.turnR - S.touch.turnL;

        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
        const side = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);

        player.position.addScaledVector(fwd, f * S.speed * dt);
        player.position.addScaledVector(side, r * S.speed * dt);
        player.rotation.y -= turn * 1.6 * dt;
        return;
      }

      // --- XR stick move ---
      const left = readGamepadAxes("left");
      const right = readGamepadAxes("right");

      // Smooth move/strafe
      if (S.moveEnabled && left?.axes?.length >= 2) {
        const x = dz(left.axes[2] ?? left.axes[0] ?? 0);  // sometimes axes[2]/[3] on Quest
        const y = dz(left.axes[3] ?? left.axes[1] ?? 0);

        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
        const side = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);

        player.position.addScaledVector(fwd, (-y) * S.speed * dt);
        player.position.addScaledVector(side, (x) * S.speed * dt);
      }

      // Snap turn
      S.snapCooldown = Math.max(0, S.snapCooldown - dt);
      if (S.snapEnabled && right?.axes?.length >= 2) {
        const rx = dz(right.axes[2] ?? right.axes[0] ?? 0);
        if (Math.abs(rx) > 0.75 && S.snapCooldown <= 0) {
          player.rotation.y -= Math.sign(rx) * S.snapAngle;
          S.snapCooldown = 0.25;
        }
      }

      // Y button -> menu event
      // Quest: buttons[3] or [4] varies; we check a few
      if (left?.buttons?.length) {
        const yPressed =
          !!left.buttons[3]?.pressed ||
          !!left.buttons[4]?.pressed ||
          !!left.buttons[5]?.pressed;

        if (yPressed) window.dispatchEvent(new Event("scarlett-menu"));
      }
    }

    return { update };
  }

  return { init };
})();
