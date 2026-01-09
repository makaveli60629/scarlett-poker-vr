// /js/controls.js — Scarlett Controls v4.2 (FULL / FIXED)
// ✅ Smooth move + strafe (left stick)
// ✅ Optional right-stick forward/back movement (requested)
// ✅ Snap turn (right stick X)
// ✅ Reads HUD flags (move/snap)
// ✅ Emits "scarlett-menu" ONCE per Y press (debounced)
// ✅ Mobile dock fallback (scarlett-touch)

export const Controls = (() => {
  function init({ THREE, renderer, camera, player, controllers, grips, log, world } = {}) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const Flags = () => (window.__SCARLETT_FLAGS || {});
    const S = {
      moveEnabled: !!(Flags().move ?? true),
      snapEnabled: !!(Flags().snap ?? true),

      speed: 2.2,
      rightMoveSpeed: 2.0,          // ✅ right-hand forward/back (slightly slower by default)
      snapAngle: THREE.MathUtils.degToRad(45), // ✅ your requested 45°
      deadzone: 0.18,

      snapCooldown: 0,
      touch: { f:0,b:0,l:0,r:0,turnL:0,turnR:0 },

      // menu debounce
      yWasDown: false,
      lastMenuT: 0,

      // if you want right-stick move always ON:
      rightStickMoveEnabled: true,
    };

    // HUD toggle events
    window.addEventListener("scarlett-toggle-move", (e) => { S.moveEnabled = !!e.detail; });
    window.addEventListener("scarlett-toggle-snap", (e) => { S.snapEnabled = !!e.detail; });
    window.addEventListener("scarlett-touch", (e) => { S.touch = e.detail || S.touch; });

    function getSession() {
      try { return renderer?.xr?.getSession?.() || null; } catch { return null; }
    }

    // Normalize deadzone
    function dz(v) {
      const a = Math.abs(v);
      if (a < S.deadzone) return 0;
      const sign = Math.sign(v);
      const t = (a - S.deadzone) / (1 - S.deadzone);
      return sign * t;
    }

    // Find XR input source by handedness
    function getSource(handedness) {
      const session = getSession();
      if (!session?.inputSources) return null;
      for (const src of session.inputSources) {
        if (!src?.gamepad) continue;
        if (src.handedness === handedness) return src;
      }
      return null;
    }

    // Quest mapping is typically:
    // Left stick:  axes[0], axes[1]
    // Right stick: axes[2], axes[3]
    // But some runtimes expose per-controller axes as [0],[1] only.
    function readStick(src, which) {
      // which: "left" or "right"
      const gp = src?.gamepad;
      if (!gp) return { x: 0, y: 0, buttons: [] };

      const axes = gp.axes || [];
      const buttons = gp.buttons || [];

      // If 4+ axes exist, use standard Quest mapping.
      if (axes.length >= 4) {
        if (which === "right") return { x: axes[2] || 0, y: axes[3] || 0, buttons };
        return { x: axes[0] || 0, y: axes[1] || 0, buttons };
      }

      // If only 2 axes exist on each controller, use [0],[1]
      return { x: axes[0] || 0, y: axes[1] || 0, buttons };
    }

    // Move relative to PLAYER yaw (stable)
    const fwd = new THREE.Vector3();
    const side = new THREE.Vector3();

    function moveLocal(strafeX, forwardY, speed, dt) {
      if (strafeX === 0 && forwardY === 0) return;

      fwd.set(0, 0, -1).applyQuaternion(player.quaternion);
      fwd.y = 0; fwd.normalize();

      side.set(1, 0, 0).applyQuaternion(player.quaternion);
      side.y = 0; side.normalize();

      player.position.addScaledVector(fwd, forwardY * speed * dt);
      player.position.addScaledVector(side, strafeX * speed * dt);
    }

    function snapTurn(xAxis) {
      S.snapCooldown = Math.max(0, S.snapCooldown - 0); // handled in update, keep simple here
      if (!S.snapEnabled) return;
      if (Math.abs(xAxis) < 0.75) return;
      if (S.snapCooldown > 0) return;

      // right stick: positive should turn right; adjust sign to feel natural
      player.rotation.y -= Math.sign(xAxis) * S.snapAngle;
      S.snapCooldown = 0.25;
    }

    function emitMenuOnce(nowSec, pressed) {
      // debounce + edge trigger
      if (pressed && !S.yWasDown) {
        // extra guard: avoid double-fire within 0.2s
        if ((nowSec - S.lastMenuT) > 0.20) {
          window.dispatchEvent(new Event("scarlett-menu"));
          S.lastMenuT = nowSec;
          L("[controls] scarlett-menu ✅");
        }
      }
      S.yWasDown = pressed;
    }

    L("[controls] ready ✅ (45° snap + left move + right move + debounced menu)");

    function update(dt) {
      // Keep rig on ground plane (world collision later)
      player.position.y = 0;

      // --- Mobile dock fallback (Android) ---
      if (!renderer?.xr?.isPresenting) {
        const f = (S.touch.f || 0) - (S.touch.b || 0);
        const r = (S.touch.r || 0) - (S.touch.l || 0);
        const turn = (S.touch.turnR || 0) - (S.touch.turnL || 0);

        // move
        moveLocal(r, f, S.speed, dt);

        // smooth turn on mobile
        player.rotation.y -= turn * 1.6 * dt;
        return;
      }

      // --- XR ---
      const leftSrc = getSource("left");
      const rightSrc = getSource("right");

      const left = readStick(leftSrc, "left");
      const right = readStick(rightSrc, "right");

      // movement (left stick)
      if (S.moveEnabled) {
        const lx = dz(left.x);
        const ly = dz(left.y);

        // forward is typically -Y
        moveLocal(lx, (-ly), S.speed, dt);

        // movement (right stick forward/back too — requested)
        if (S.rightStickMoveEnabled) {
          const ry = dz(right.y);
          if (Math.abs(ry) > 0) moveLocal(0, (-ry), S.rightMoveSpeed, dt);
        }
      }

      // snap turn (right stick X)
      S.snapCooldown = Math.max(0, S.snapCooldown - dt);
      snapTurn(dz(right.x));

      // Y button -> menu (debounced)
      // Quest mapping varies; Y is often left controller button[3]
      const buttons = left.buttons || [];
      const yPressed =
        !!buttons[3]?.pressed || // common "Y"
        !!buttons[4]?.pressed || // fallback
        !!buttons[5]?.pressed;   // fallback

      emitMenuOnce(performance.now() * 0.001, yPressed);
    }

    return { update };
  }

  return { init };
})();
