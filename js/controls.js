// /js/controls.js — Scarlett VR Poker Controls v2.0
// - Smooth move + snap turn
// - VR: movement works on LEFT stick, and ALSO on RIGHT stick (your request)
// - Snap turn default 45°
// - Enable toggles (from HUD)

export const Controls = {
  init({ THREE, renderer, camera, player, controllers, log = console.log, world }) {
    const state = {
      enabledMove: true,
      enabledSnap: true,
      moveSpeed: 1.9,
      sprintMult: 1.6,
      snapTurnDeg: 45,
      snapCooldown: 0.22,
      snapT: 0,

      // desktop
      yaw: 0,
      pitch: 0,
      pointerLocked: false,
      keys: Object.create(null),
      mouseSens: 0.0022,
      queuedSnap: 0,
    };

    const dzMove = 0.14;
    const dzSnap = 0.55;

    const canvas = renderer.domElement;

    function onKey(e, down) {
      state.keys[e.code] = down;
      if (down) {
        if (e.code === "KeyQ") state.queuedSnap = 1;
        if (e.code === "KeyE") state.queuedSnap = -1;
      }
    }
    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    canvas.addEventListener("click", () => {
      if (renderer.xr?.isPresenting) return;
      canvas.requestPointerLock?.();
    });
    document.addEventListener("pointerlockchange", () => { state.pointerLocked = (document.pointerLockElement === canvas); });
    document.addEventListener("mousemove", (e) => {
      if (!state.pointerLocked) return;
      state.yaw -= e.movementX * state.mouseSens;
      state.pitch -= e.movementY * state.mouseSens;
      const lim = Math.PI / 2 - 0.08;
      state.pitch = Math.max(-lim, Math.min(lim, state.pitch));
    });

    function getSession() { return renderer.xr?.getSession?.() || null; }
    function getSources() { return getSession()?.inputSources || []; }
    function getHandSource(handedness) {
      for (const s of getSources()) if (s.handedness === handedness) return s;
      return null;
    }

    function getStick(src) {
      const gp = src?.gamepad;
      if (!gp || !gp.axes) return { x: 0, y: 0 };

      if (gp.axes.length >= 4) {
        if (src.handedness === "right") return { x: gp.axes[2] || 0, y: gp.axes[3] || 0 };
        return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
      }
      return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
    }

    const tmpQ = new THREE.Quaternion();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const dir = new THREE.Vector3();

    function applyMove(strafeX, stickY, dt, sprint) {
      if (!state.enabledMove) return;

      const ax = Math.abs(strafeX) < dzMove ? 0 : strafeX;
      const ay = Math.abs(stickY) < dzMove ? 0 : stickY;
      if (ax === 0 && ay === 0) return;

      const forward = -ay;
      const strafe = ax;

      camera.getWorldQuaternion(tmpQ);
      fwd.set(0, 0, -1).applyQuaternion(tmpQ); fwd.y = 0; fwd.normalize();
      right.set(1, 0, 0).applyQuaternion(tmpQ); right.y = 0; right.normalize();

      dir.set(0, 0, 0).addScaledVector(fwd, forward).addScaledVector(right, strafe);
      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();

      const sp = state.moveSpeed * (sprint ? state.sprintMult : 1);
      const step = sp * dt;

      player.position.x += dir.x * step;
      player.position.z += dir.z * step;

      // clamp to room if world provides
      const hw = world?.room?.halfW ?? 12;
      const hd = world?.room?.halfD ?? 12;
      player.position.x = Math.max(-hw + 0.7, Math.min(hw - 0.7, player.position.x));
      player.position.z = Math.max(-hd + 0.7, Math.min(hd - 0.7, player.position.z));

      // keep out of rail radius (basic)
      if (world?.railRadius) {
        const cx = (world?.tableFocus?.x ?? 0);
        const cz = (world?.tableFocus?.z ?? -6.5);
        const dx = player.position.x - cx;
        const dz = player.position.z - cz;
        const rr = world.railRadius - 0.35;
        const d2 = dx*dx + dz*dz;
        if (d2 < rr*rr) {
          const d = Math.max(0.0001, Math.sqrt(d2));
          player.position.x = cx + (dx / d) * rr;
          player.position.z = cz + (dz / d) * rr;
        }
      }
    }

    function applySnapTurn(xAxis) {
      if (!state.enabledSnap) return;
      if (Math.abs(xAxis) < dzSnap) return;
      if (state.snapT > 0) return;

      const snapTurnRad = (state.snapTurnDeg * Math.PI) / 180;
      const sign = xAxis > 0 ? -1 : 1;
      player.rotation.y += sign * snapTurnRad;
      state.yaw = player.rotation.y;
      state.snapT = state.snapCooldown;
    }

    function setSnapDeg(d) { state.snapTurnDeg = Math.max(10, Math.min(90, d)); }
    function setMoveEnabled(v) { state.enabledMove = !!v; }
    function setSnapEnabled(v) { state.enabledSnap = !!v; }

    log("[controls] ready ✅ (move + snap) snap=" + state.snapTurnDeg);

    return {
      setSnapDeg,
      setMoveEnabled,
      setSnapEnabled,
      update(dt) {
        state.snapT = Math.max(0, state.snapT - dt);

        const isXR = renderer.xr?.isPresenting;

        if (isXR) {
          // VR: move (LEFT preferred, RIGHT fallback), snap (RIGHT X)
          const left = getHandSource("left");
          const rightSrc = getHandSource("right");

          const mvL = getStick(left);
          const mvR = getStick(rightSrc);

          // if left not working, right also moves you (your request)
          const useX = (Math.abs(mvL.x) > dzMove || Math.abs(mvL.y) > dzMove) ? mvL.x : mvR.x;
          const useY = (Math.abs(mvL.x) > dzMove || Math.abs(mvL.y) > dzMove) ? mvL.y : mvR.y;

          applyMove(useX, useY, dt, false);

          // snap always from right stick
          applySnapTurn(mvR.x);
          return;
        }

        // Desktop
        player.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        const k = state.keys;
        const forward = (k["KeyW"] ? 1 : 0) + (k["KeyS"] ? -1 : 0);
        const strafe = (k["KeyD"] ? 1 : 0) + (k["KeyA"] ? -1 : 0);
        const sprint = !!k["ShiftLeft"] || !!k["ShiftRight"];

        if (forward !== 0 || strafe !== 0) applyMove(strafe, -forward, dt, sprint);

        if (state.queuedSnap !== 0 && state.snapT <= 0) {
          const snapTurnRad = (state.snapTurnDeg * Math.PI) / 180;
          player.rotation.y += state.queuedSnap * snapTurnRad;
          state.yaw = player.rotation.y;
          state.queuedSnap = 0;
          state.snapT = state.snapCooldown;
        }
      }
    };
  }
};
