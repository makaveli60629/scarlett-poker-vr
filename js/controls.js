// /js/controls.js — Scarlett VR Poker Controls v10.7 (WIRED)
// - Smooth move (left stick) + Snap turn (right stick)
// - Desktop fallback (WASD + mouse look + Q/E snap)
// - Android dock support via "scarlett-touch" events
// - Listens to HUD toggles: scarlett-toggle-move, scarlett-toggle-snap

export const Controls = {
  init({ THREE, renderer, camera, player, log, world } = {}) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const state = {
      enabled: true,
      moveEnabled: true,
      snapEnabled: true,

      moveSpeed: 1.9,
      sprintMult: 1.6,
      snapTurnDeg: 35,
      snapCooldown: 0.22,
      snapT: 0,

      // desktop look
      yaw: 0,
      pitch: 0,
      pointerLocked: false,
      keys: Object.create(null),
      mouseSens: 0.0022,
      queuedSnap: 0,

      // Android/touch dock
      touch: { f:0, b:0, l:0, r:0, turnL:0, turnR:0 },
      touchActiveAt: 0,
    };

    // apply initial HUD flags if present
    try {
      const f = window.__SCARLETT_FLAGS;
      if (f) {
        state.moveEnabled = !!f.move;
        state.snapEnabled = !!f.snap;
      }
    } catch {}

    const snapTurnRad = (state.snapTurnDeg * Math.PI) / 180;

    // ---------- Desktop controls ----------
    const canvas = renderer?.domElement;

    function onKey(e, down) {
      state.keys[e.code] = down;
      if (down) {
        if (e.code === "KeyQ") state.queuedSnap = 1;
        if (e.code === "KeyE") state.queuedSnap = -1;
      }
    }

    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    canvas?.addEventListener("click", () => {
      if (renderer?.xr?.isPresenting) return;
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

    // ---------- HUD toggle listeners ----------
    window.addEventListener("scarlett-toggle-move", (e) => {
      state.moveEnabled = !!e?.detail;
      L("[controls] moveEnabled=", state.moveEnabled);
    });

    window.addEventListener("scarlett-toggle-snap", (e) => {
      state.snapEnabled = !!e?.detail;
      L("[controls] snapEnabled=", state.snapEnabled);
    });

    // ---------- Android dock listener ----------
    window.addEventListener("scarlett-touch", (e) => {
      if (!e?.detail) return;
      state.touch = {
        f: +e.detail.f || 0,
        b: +e.detail.b || 0,
        l: +e.detail.l || 0,
        r: +e.detail.r || 0,
        turnL: +e.detail.turnL || 0,
        turnR: +e.detail.turnR || 0,
      };
      state.touchActiveAt = performance.now();
    });

    // ---------- XR helpers ----------
    function getSession() {
      return renderer?.xr?.getSession?.() || null;
    }
    function getSources() {
      return getSession()?.inputSources || [];
    }
    function getHandSource(handedness) {
      const sources = getSources();
      for (const s of sources) if (s.handedness === handedness) return s;
      return null;
    }

    // Quest mappings differ across runtimes.
    // We handle both common cases:
    // Case A: each controller has its own gamepad with axes[0,1]
    // Case B: axes[0,1] left + axes[2,3] right
    function getStick(src, handedness) {
      const gp = src?.gamepad;
      if (!gp || !gp.axes) return { x: 0, y: 0 };

      const a = gp.axes;
      if (a.length >= 4) {
        // Some runtimes put both sticks in one GP
        if (handedness === "right") {
          // prefer [2,3], fallback [0,1]
          return { x: a[2] ?? a[0] ?? 0, y: a[3] ?? a[1] ?? 0 };
        } else {
          return { x: a[0] ?? 0, y: a[1] ?? 0 };
        }
      }
      return { x: a[0] || 0, y: a[1] || 0 };
    }

    // ---------- Movement math ----------
    const tmpQ = new THREE.Quaternion();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const dir = new THREE.Vector3();

    function applyMove(strafeX, stickY, dt, sprint) {
      if (!state.moveEnabled) return;

      const dz = 0.14;
      const ax = Math.abs(strafeX) < dz ? 0 : strafeX;
      const ay = Math.abs(stickY) < dz ? 0 : stickY;
      if (ax === 0 && ay === 0) return;

      const forward = -ay; // stick forward usually negative
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

      // optional world clamp if present
      try {
        const c = world?.roomClamp;
        if (c) {
          player.position.x = Math.max(c.minX, Math.min(c.maxX, player.position.x));
          player.position.z = Math.max(c.minZ, Math.min(c.maxZ, player.position.z));
        }
      } catch {}
    }

    function applySnapTurn(xAxis) {
      if (!state.snapEnabled) return;

      const dz = 0.55;
      if (Math.abs(xAxis) < dz) return;
      if (state.snapT > 0) return;

      const sign = xAxis > 0 ? -1 : 1;
      player.rotation.y += sign * snapTurnRad;
      state.yaw = player.rotation.y;
      state.snapT = state.snapCooldown;
    }

    L("[controls] ready ✅ (move/snap wired)");

    return {
      setMoveEnabled(v) { state.moveEnabled = !!v; },
      setSnapEnabled(v) { state.snapEnabled = !!v; },
      setEnabled(v) { state.enabled = !!v; },

      update(dt) {
        if (!state.enabled) return;
        state.snapT = Math.max(0, state.snapT - dt);

        const isXR = renderer?.xr?.isPresenting;

        if (isXR) {
          // VR: left stick = move, right stick = snap turn
          const leftSrc = getHandSource("left");
          const rightSrc = getHandSource("right");

          const mv = getStick(leftSrc, "left");
          applyMove(mv.x, mv.y, dt, false);

          const tr = getStick(rightSrc, "right");
          applySnapTurn(tr.x);

          return;
        }

        // Desktop / Android:
        // yaw on player, pitch on camera
        player.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        // If Android dock is active recently, use it
        const recentlyTouched = (performance.now() - state.touchActiveAt) < 250;

        if (recentlyTouched) {
          const forward = (state.touch.f ? 1 : 0) + (state.touch.b ? -1 : 0);
          const strafe  = (state.touch.r ? 1 : 0) + (state.touch.l ? -1 : 0);

          if (forward !== 0 || strafe !== 0) {
            applyMove(strafe, -forward, dt, false);
          }

          // smooth turn buttons act like snap pulses
          if (state.touch.turnL) applySnapTurn(-1);
          if (state.touch.turnR) applySnapTurn( 1);

          return;
        }

        // Desktop keys
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
