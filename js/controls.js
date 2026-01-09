// /js/controls.js — Scarlett Controls v2.0
// - 45° snap-turn
// - Right stick ALSO moves (same as left)
// - Y button toggles in-hand menu (dispatches event)
// - Desktop WASD + mouse look kept

export const Controls = {
  init({ THREE, renderer, camera, player, controllers, log, world }) {
    const state = {
      enabled: true,
      moveSpeed: 1.9,
      sprintMult: 1.6,
      snapTurnDeg: 45,          // ✅ 45 degrees
      snapCooldown: 0.22,
      snapT: 0,

      yaw: 0,
      pitch: 0,
      pointerLocked: false,
      keys: Object.create(null),
      mouseSens: 0.0022,
      queuedSnap: 0,

      menuHeld: false,
      lastMenuToggle: 0,
    };

    const snapTurnRad = (state.snapTurnDeg * Math.PI) / 180;
    const canvas = renderer.domElement;

    function onKey(e, down) {
      state.keys[e.code] = down;
      if (down) {
        if (e.code === "KeyQ") state.queuedSnap = 1;
        if (e.code === "KeyE") state.queuedSnap = -1;
        if (e.code === "KeyM") window.dispatchEvent(new Event("scarlett-toggle-menu"));
      }
    }

    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    canvas.addEventListener("click", () => {
      if (renderer.xr?.isPresenting) return;
      canvas.requestPointerLock?.();
    });

    document.addEventListener("pointerlockchange", () => {
      state.pointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener("mousemove", (e) => {
      if (!state.pointerLocked) return;
      state.yaw -= e.movementX * state.mouseSens;
      state.pitch -= e.movementY * state.mouseSens;
      const lim = Math.PI / 2 - 0.08;
      state.pitch = Math.max(-lim, Math.min(lim, state.pitch));
    });

    function getSession() {
      return renderer.xr?.getSession?.() || null;
    }

    function getSources() {
      return getSession()?.inputSources || [];
    }

    function getHandSource(handedness) {
      for (const s of getSources()) if (s.handedness === handedness) return s;
      return null;
    }

    function getStick(src) {
      const gp = src?.gamepad;
      if (!gp || !gp.axes) return { x: 0, y: 0 };
      // Quest common mapping:
      // Left: axes[0], axes[1]
      // Right: axes[2], axes[3]
      if (gp.axes.length >= 4) {
        if (src.handedness === "right") return { x: gp.axes[2] || 0, y: gp.axes[3] || 0 };
        return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
      }
      return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
    }

    function getButton(src, index) {
      const gp = src?.gamepad;
      const b = gp?.buttons?.[index];
      return !!b?.pressed;
    }

    const tmpQ = new THREE.Quaternion();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const dir = new THREE.Vector3();

    function applyMove(strafeX, stickY, dt, sprint) {
      const dz = 0.14;
      const ax = Math.abs(strafeX) < dz ? 0 : strafeX;
      const ay = Math.abs(stickY) < dz ? 0 : stickY;
      if (ax === 0 && ay === 0) return;

      const forward = -ay;
      const strafe = ax;

      camera.getWorldQuaternion(tmpQ);

      fwd.set(0, 0, -1).applyQuaternion(tmpQ);
      fwd.y = 0; fwd.normalize();

      right.set(1, 0, 0).applyQuaternion(tmpQ);
      right.y = 0; right.normalize();

      dir.set(0, 0, 0)
        .addScaledVector(fwd, forward)
        .addScaledVector(right, strafe);

      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();

      const sp = state.moveSpeed * (sprint ? state.sprintMult : 1);
      const step = sp * dt;

      player.position.x += dir.x * step;
      player.position.z += dir.z * step;
    }

    function applySnapTurn(xAxis) {
      const dz = 0.55;
      if (Math.abs(xAxis) < dz) return;
      if (state.snapT > 0) return;

      const sign = xAxis > 0 ? -1 : 1;
      player.rotation.y += sign * snapTurnRad;
      state.snapT = state.snapCooldown;
    }

    log?.("[controls] ready ✅ (45° snap + right-stick move + menu)");

    return {
      update(dt) {
        if (!state.enabled) return;
        state.snapT = Math.max(0, state.snapT - dt);

        const isXR = renderer.xr?.isPresenting;
        if (isXR) {
          const left = getHandSource("left");
          const rightSrc = getHandSource("right");

          // ✅ Move with BOTH sticks (adds together)
          const mvL = getStick(left);
          const mvR = getStick(rightSrc);
          applyMove(mvL.x + mvR.x, mvL.y + mvR.y, dt, false);

          // ✅ Snap with right stick X
          const tr = getStick(rightSrc);
          applySnapTurn(tr.x);

          // ✅ Y button menu toggle (Quest often maps Y = button index 3 on left)
          const now = performance.now() * 0.001;
          const yPressed = getButton(left, 3);
          if (yPressed && (now - state.lastMenuToggle) > 0.45) {
            state.lastMenuToggle = now;
            window.dispatchEvent(new Event("scarlett-toggle-menu"));
          }
          return;
        }

        // Desktop
        player.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        const k = state.keys;
        const forward = (k["KeyW"] ? 1 : 0) + (k["KeyS"] ? -1 : 0);
        const strafe = (k["KeyD"] ? 1 : 0) + (k["KeyA"] ? -1 : 0);
        const sprint = !!k["ShiftLeft"] || !!k["ShiftRight"];

        if (forward !== 0 || strafe !== 0) {
          applyMove(strafe, -forward, dt, sprint);
        }

        if (state.queuedSnap !== 0 && state.snapT <= 0) {
          player.rotation.y += state.queuedSnap * snapTurnRad;
          state.yaw = player.rotation.y;
          state.queuedSnap = 0;
          state.snapT = state.snapCooldown;
        }
      }
    };
  }
};
