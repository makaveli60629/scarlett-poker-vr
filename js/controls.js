// /js/controls.js — Scarlett Controls v3.0
// - Smooth move + strafe (left stick X/Y)
// - Snap turn (right stick X)
// - Y button toggles "watch menu" event (handled in hands.js)
// - Works with Android dock via scarlett-touch events

export const Controls = (() => {
  function init({ THREE, renderer, camera, player, log, world } = {}) {
    const state = {
      move: true,
      snap: true,
      speed: 2.1,
      snapAngle: Math.PI / 6,
      snapCooldown: 0,
      touch: { f:0,b:0,l:0,r:0,turnL:0,turnR:0 }
    };

    // flags from your HUD
    const flags = window.__SCARLETT_FLAGS || { move:true, snap:true };
    state.move = !!flags.move;
    state.snap = !!flags.snap;

    window.addEventListener("scarlett-toggle-move", (e) => state.move = !!e.detail);
    window.addEventListener("scarlett-toggle-snap", (e) => state.snap = !!e.detail);

    window.addEventListener("scarlett-touch", (e) => {
      state.touch = Object.assign(state.touch, e.detail || {});
    });

    // read XR gamepads
    function getXRGamepads() {
      const s = renderer.xr.getSession?.();
      if (!s) return [];
      const gps = [];
      for (const src of s.inputSources) {
        if (src && src.gamepad) gps.push({ handedness: src.handedness, gamepad: src.gamepad });
      }
      return gps;
    }

    function forwardVector() {
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      fwd.y = 0; fwd.normalize();
      return fwd;
    }
    function rightVector() {
      const r = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      r.y = 0; r.normalize();
      return r;
    }

    let lastYDown = false;

    function update(dt) {
      const gps = getXRGamepads();

      // Left stick = move/strafe
      let lx = 0, ly = 0;
      // Right stick x = snap
      let rx = 0;

      // Y button = menu toggle (left controller)
      let yDown = false;

      for (const g of gps) {
        const gp = g.gamepad;
        if (!gp) continue;

        // Standard: axes[0], axes[1] = left stick; axes[2], axes[3] = right stick
        if (g.handedness === "left") {
          lx = gp.axes?.[0] ?? 0;
          ly = gp.axes?.[1] ?? 0;

          // Oculus: Y usually buttons[3]
          yDown = !!gp.buttons?.[3]?.pressed;
        }
        if (g.handedness === "right") {
          rx = gp.axes?.[2] ?? 0;
        }
      }

      // Y toggle (edge)
      if (yDown && !lastYDown) {
        window.dispatchEvent(new Event("scarlett-toggle-watchmenu"));
      }
      lastYDown = yDown;

      // Snap turn
      if (state.snap) {
        state.snapCooldown = Math.max(0, state.snapCooldown - dt);
        if (state.snapCooldown <= 0) {
          if (rx > 0.75) {
            player.rotation.y -= state.snapAngle;
            state.snapCooldown = 0.20;
          } else if (rx < -0.75) {
            player.rotation.y += state.snapAngle;
            state.snapCooldown = 0.20;
          }
        }
      }

      // Move
      if (state.move) {
        // include Android dock
        const t = state.touch;
        let mx = lx;
        let mz = ly;

        if (t.l) mx -= 0.85;
        if (t.r) mx += 0.85;
        if (t.f) mz -= 0.85;
        if (t.b) mz += 0.85;

        // deadzone
        const dz = 0.12;
        if (Math.abs(mx) < dz) mx = 0;
        if (Math.abs(mz) < dz) mz = 0;

        if (mx || mz) {
          const fwd = forwardVector();
          const right = rightVector();

          // NOTE: stick forward is negative Z in axes (ly)
          const move = new THREE.Vector3();
          move.addScaledVector(fwd, -mz);
          move.addScaledVector(right, mx);
          move.normalize().multiplyScalar(state.speed * dt);

          // apply, keep on floor
          player.position.add(move);
          player.position.y = 0;
        }
      }

      // Android dock snap turn buttons
      if (state.touch.turnL) player.rotation.y += state.snapAngle * dt * 4.0;
      if (state.touch.turnR) player.rotation.y -= state.snapAngle * dt * 4.0;
    }

    return { update };
  }

  return { init };
})();
