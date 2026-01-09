// /js/controls.js — Scarlett Controls v4.2 (FULL, STABLE)
// ✅ Left stick smooth move + strafe
// ✅ Right stick snap turn (45° by default)
// ✅ Optional: Right stick forward/back can also move (toggle)
// ✅ Mobile dock support via "scarlett-touch"
// ✅ Reads HUD flags: window.__SCARLETT_FLAGS.move / snap
// ✅ Emits "scarlett-menu" on Y press (edge-trigger, no spam)

export const Controls = (() => {
  function init({ THREE, renderer, camera, player, controllers, grips, log, world } = {}) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const S = {
      moveEnabled: !!(window.__SCARLETT_FLAGS?.move ?? true),
      snapEnabled: !!(window.__SCARLETT_FLAGS?.snap ?? true),

      // movement feel
      speed: 2.2,              // m/s
      deadzone: 0.18,

      // snap feel
      snapAngleDeg: 45,
      snapAngle: THREE?.MathUtils?.degToRad ? THREE.MathUtils.degToRad(45) : (Math.PI / 4),
      snapCooldown: 0,
      snapCooldownTime: 0.25,

      // optional: allow right stick forward/back to move too
      rightStickMoveEnabled: true,

      // mobile dock
      touch: { f:0,b:0,l:0,r:0,turnL:0,turnR:0 },

      // menu latch
      yLatch: false,
    };

    // live update from HUD
    window.addEventListener("scarlett-toggle-move", (e) => { S.moveEnabled = !!e.detail; });
    window.addEventListener("scarlett-toggle-snap", (e) => { S.snapEnabled = !!e.detail; });
    window.addEventListener("scarlett-touch", (e) => { S.touch = e.detail || S.touch; });

    // Let HUD or other systems change snap angle if needed
    window.addEventListener("scarlett-snap-angle", (e) => {
      const deg = Number(e?.detail);
      if (!Number.isFinite(deg) || deg <= 0) return;
      S.snapAngleDeg = deg;
      S.snapAngle = THREE.MathUtils.degToRad(deg);
      L("[controls] snap angle set:", deg);
    });

    function getSession() {
      try { return renderer?.xr?.getSession?.() || null; } catch { return null; }
    }

    // Find gamepad for a handedness
    function getSource(handednessWanted) {
      const session = getSession();
      if (!session) return null;
      const sources = session.inputSources || [];
      for (const src of sources) {
        if (!src?.gamepad) continue;
        if (handednessWanted && src.handedness !== handednessWanted) continue;
        return src;
      }
      return null;
    }

    // Normalize deadzone with rescale so it feels analog
    function dz(v) {
      const a = Math.abs(v);
      if (a < S.deadzone) return 0;
      const sign = Math.sign(v);
      const t = (a - S.deadzone) / (1 - S.deadzone);
      return sign * Math.min(1, Math.max(0, t));
    }

    // Quest sometimes reports left stick on axes[2]/[3] or [0]/[1]
    function readStick(src, prefer = "left") {
      if (!src?.gamepad) return { x: 0, y: 0, buttons: [] };
      const axes = src.gamepad.axes || [];
      const buttons = src.gamepad.buttons || [];

      // If we have 4 axes, common layout:
      // left: 0,1 and right: 2,3
      // BUT some browsers swap; so we try both.
      let x = 0, y = 0;

      if (axes.length >= 4) {
        if (prefer === "left") {
          x = axes[0] ?? 0;
          y = axes[1] ?? 0;
          // fallback if zeros:
          if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) {
            x = axes[2] ?? 0;
            y = axes[3] ?? 0;
          }
        } else {
          x = axes[2] ?? 0;
          y = axes[3] ?? 0;
          if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) {
            x = axes[0] ?? 0;
            y = axes[1] ?? 0;
          }
        }
      } else {
        x = axes[0] ?? 0;
        y = axes[1] ?? 0;
      }

      return { x, y, buttons, axes };
    }

    // Reused vectors to avoid GC stutter
    const fwd = new THREE.Vector3();
    const side = new THREE.Vector3();

    function moveByAxes(ax, ay, dt) {
      // ay forward is typically negative on sticks
      const x = dz(ax);
      const y = dz(ay);

      if (x === 0 && y === 0) return;

      // Movement direction is based on PLAYER orientation (not head),
      // which feels stable for VR locomotion.
      fwd.set(0, 0, -1).applyQuaternion(player.quaternion);
      side.set(1, 0, 0).applyQuaternion(player.quaternion);

      // flatten Y
      fwd.y = 0; side.y = 0;
      fwd.normalize(); side.normalize();

      const step = S.speed * dt;

      // forward/back
      player.position.addScaledVector(fwd, (-y) * step);
      // strafe
      player.position.addScaledVector(side, (x) * step);
    }

    function snapTurnByAxis(rx, dt) {
      if (!S.snapEnabled) return;
      S.snapCooldown = Math.max(0, S.snapCooldown - dt);

      const x = dz(rx);
      if (Math.abs(x) < 0.75) return;
      if (S.snapCooldown > 0) return;

      // Right stick right = turn right (negative rot) usually feels correct
      player.rotation.y -= Math.sign(x) * S.snapAngle;
      S.snapCooldown = S.snapCooldownTime;
    }

    function emitMenuFromY(buttons) {
      // Y varies by platform; we check a range.
      const pressed =
        !!buttons?.[3]?.pressed ||
        !!buttons?.[4]?.pressed ||
        !!buttons?.[5]?.pressed;

      if (pressed && !S.yLatch) {
        S.yLatch = true;
        window.dispatchEvent(new Event("scarlett-menu"));
        L("[controls] menu event (Y) ✅");
      }
      if (!pressed) S.yLatch = false;
    }

    function updateDesktopFromTouch(dt) {
      // Mobile dock fallback (Android)
      const f = (S.touch.f || 0) - (S.touch.b || 0);
      const r = (S.touch.r || 0) - (S.touch.l || 0);
      const turn = (S.touch.turnR || 0) - (S.touch.turnL || 0);

      fwd.set(0, 0, -1).applyQuaternion(player.quaternion);
      side.set(1, 0, 0).applyQuaternion(player.quaternion);
      fwd.y = 0; side.y = 0;
      fwd.normalize(); side.normalize();

      player.position.addScaledVector(fwd, f * S.speed * dt);
      player.position.addScaledVector(side, r * S.speed * dt);

      // smooth turn on mobile
      player.rotation.y -= turn * 1.6 * dt;
    }

    L("[controls] ready ✅ (left move + right snap + Y menu)");

    return {
      setRightStickMoveEnabled(v) { S.rightStickMoveEnabled = !!v; },
      setSpeed(v) { if (Number.isFinite(v)) S.speed = Math.max(0.2, v); },
      setSnapAngleDeg(deg) {
        if (!Number.isFinite(deg) || deg <= 0) return;
        S.snapAngleDeg = deg;
        S.snapAngle = THREE.MathUtils.degToRad(deg);
      },

      update(dt) {
        if (!dt || dt <= 0) return;

        // Always keep player on floor for lobby mode
        player.position.y = 0;

        // If not in XR: use mobile dock only (your index dock)
        if (!renderer?.xr?.isPresenting) {
          updateDesktopFromTouch(dt);
          return;
        }

        const leftSrc = getSource("left");
        const rightSrc = getSource("right");

        const left = readStick(leftSrc, "left");
        const right = readStick(rightSrc, "right");

        // movement
        if (S.moveEnabled) {
          // left stick drives movement
          moveByAxes(left.x, left.y, dt);

          // optional: right stick forward/back ALSO moves (your request)
          if (S.rightStickMoveEnabled) {
            // only use right Y for forward/back, but DO NOT strafe from it
            const ry = dz(right.y);
            if (Math.abs(ry) > 0) moveByAxes(0, ry, dt);
          }
        }

        // snap
        snapTurnByAxis(right.x, dt);

        // menu on Y (left controller)
        emitMenuFromY(left.buttons);
      }
    };
  }

  return { init };
})();
