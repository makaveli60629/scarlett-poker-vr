// /js/controls.js — Scarlett Controls v2.0
// - Left stick: forward/back + strafe
// - Right stick: snap turn
// - Y button: toggle left-wrist menu
// - Works with your HUD flags + touch dock events

export const Controls = {
  init({ THREE, renderer, camera, player, controllers, grips, log, world }) {
    const state = {
      moveSpeed: 2.2,
      strafeSpeed: 2.0,
      snapAngle: Math.PI / 6, // 30 deg
      snapCooldown: 0,
      axes: { lx: 0, ly: 0, rx: 0, ry: 0 },
      touch: { f:0,b:0,l:0,r:0,turnL:0,turnR:0 },
      menuOpen: false,
    };

    // HUD toggles
    const flags = window.__SCARLETT_FLAGS || { move:true, snap:true, teleport:true, hands:true };

    window.addEventListener("scarlett-touch", (e) => {
      state.touch = e?.detail || state.touch;
    });

    // Y toggles menu (Quest: "ybutton" on left controller)
    function onSessionStart() {
      const session = renderer.xr.getSession();
      if (!session) return;

      session.addEventListener("selectstart", (ev) => {
        // keep select for teleport etc, not hijacking here
      });

      session.addEventListener("inputsourceschange", () => {
        // no-op
      });

      log?.("[controls] session start ✅");
    }

    renderer.xr.addEventListener?.("sessionstart", onSessionStart);

    function pollGamepads() {
      state.axes.lx = 0; state.axes.ly = 0; state.axes.rx = 0; state.axes.ry = 0;

      const session = renderer.xr.getSession();
      if (!session) return;

      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;

        const ax = gp.axes || [];
        const buttons = gp.buttons || [];

        // Quest controllers: left stick is usually axes[2],[3] for left; right stick axes[0],[1] for right (varies)
        // We’ll detect by handedness and map safely.
        if (src.handedness === "left") {
          state.axes.lx = ax[2] ?? ax[0] ?? 0;
          state.axes.ly = ax[3] ?? ax[1] ?? 0;

          // Y button is typically buttons[3] on left (varies). We'll check common indices.
          const yPressed = !!(buttons[3]?.pressed || buttons[4]?.pressed);
          if (yPressed && !state._yLatch) {
            state._yLatch = true;
            state.menuOpen = !state.menuOpen;
            window.dispatchEvent(new CustomEvent("scarlett-menu", { detail: state.menuOpen }));
            log?.("[controls] menu=" + state.menuOpen);
          }
          if (!yPressed) state._yLatch = false;
        }

        if (src.handedness === "right") {
          state.axes.rx = ax[2] ?? ax[0] ?? 0;
          state.axes.ry = ax[3] ?? ax[1] ?? 0;
        }
      }
    }

    function movePlayer(dt) {
      if (!flags.move) return;

      // combine XR stick + touch dock
      const lx = state.axes.lx + (state.touch.r ? 1 : 0) - (state.touch.l ? 1 : 0);
      const ly = state.axes.ly + (state.touch.b ? 1 : 0) - (state.touch.f ? 1 : 0);

      // deadzone
      const dx = Math.abs(lx) < 0.12 ? 0 : lx;
      const dy = Math.abs(ly) < 0.12 ? 0 : ly;

      if (!dx && !dy) return;

      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
      forward.y = 0; forward.normalize();

      const right = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);
      right.y = 0; right.normalize();

      const speedF = state.moveSpeed * dt * (-dy);   // stick up is negative
      const speedS = state.strafeSpeed * dt * (dx);

      player.position.addScaledVector(forward, speedF);
      player.position.addScaledVector(right, speedS);
    }

    function snapTurn(dt) {
      if (!flags.snap) return;

      state.snapCooldown = Math.max(0, state.snapCooldown - dt);

      const rx = state.axes.rx + (state.touch.turnR ? 1 : 0) - (state.touch.turnL ? 1 : 0);

      if (state.snapCooldown > 0) return;
      if (Math.abs(rx) < 0.65) return;

      const dir = rx > 0 ? -1 : 1;
      player.rotation.y += dir * state.snapAngle;
      state.snapCooldown = 0.22;
    }

    return {
      update(dt) {
        pollGamepads();
        movePlayer(dt);
        snapTurn(dt);
      }
    };
  }
};
