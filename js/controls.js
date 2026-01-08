// /js/controls.js — Scarlett VR Poker Controls v2.0 (PERMANENT FIX)
// - Fixes Quest left-stick not moving (axes length often 2, not 4)
// - Snap turn on right stick (robust across mappings)
// - Adds Action + Recenter buttons (dispatches events main.js/world.js can listen for)
// - Adds room clamp to stop walking through walls (uses world.roomClamp)
// - Desktop fallback unchanged

export const Controls = {
  init({ THREE, renderer, camera, player, controllers, log, world }) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const state = {
      enabled: true,
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

      // VR button edge detection
      lastButtons: {
        left: [],
        right: []
      }
    };

    const snapTurnRad = (state.snapTurnDeg * Math.PI) / 180;

    // ---------------- DESKTOP CONTROLS ----------------
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

    // ---------------- XR HELPERS ----------------
    function getSession() {
      return renderer.xr?.getSession?.() || null;
    }

    function getSources() {
      return getSession()?.inputSources || [];
    }

    function getHandSource(handedness) {
      for (const s of getSources()) if (s && s.handedness === handedness) return s;
      return null;
    }

    // IMPORTANT FIX:
    // Each XR inputSource has its own gamepad.
    // Quest controllers typically expose axes as [x,y] (length 2) for that controller.
    // Some runtimes expose length 4; we handle both.
    function getStick(src, prefer = "primary") {
      const gp = src?.gamepad;
      const axes = gp?.axes;
      if (!gp || !axes || axes.length < 2) return { x: 0, y: 0 };

      // If axes length is 2, it's almost always the stick for that controller.
      if (axes.length === 2) return { x: axes[0] || 0, y: axes[1] || 0 };

      // If length >= 4, some runtimes pack extra axes.
      // But safest is:
      // - "primary" -> [0,1]
      // - "secondary" -> [2,3]
      if (prefer === "secondary" && axes.length >= 4) {
        return { x: axes[2] || 0, y: axes[3] || 0 };
      }
      return { x: axes[0] || 0, y: axes[1] || 0 };
    }

    function getButtons(src) {
      const gp = src?.gamepad;
      return gp?.buttons || null;
    }

    function buttonPressedEdge(handedness, idx) {
      const src = getHandSource(handedness);
      const btns = getButtons(src);
      if (!btns || !btns[idx]) return false;

      const prevArr = (handedness === "left") ? state.lastButtons.left : state.lastButtons.right;
      const prev = !!prevArr[idx];
      const now = !!btns[idx].pressed;

      prevArr[idx] = now;
      return now && !prev; // rising edge
    }

    // ---------------- MOVEMENT MATH ----------------
    const tmpQ = new THREE.Quaternion();
    const fwd = new THREE.Vector3();
    const rightV = new THREE.Vector3();
    const dir = new THREE.Vector3();

    function applyMove(strafeX, stickY, dt, sprint) {
      const dz = 0.14;
      const ax = Math.abs(strafeX) < dz ? 0 : strafeX;
      const ay = Math.abs(stickY) < dz ? 0 : stickY;
      if (ax === 0 && ay === 0) return;

      // stickY forward usually negative
      const forward = -ay;
      const strafe = ax;

      camera.getWorldQuaternion(tmpQ);

      fwd.set(0, 0, -1).applyQuaternion(tmpQ);
      fwd.y = 0; fwd.normalize();

      rightV.set(1, 0, 0).applyQuaternion(tmpQ);
      rightV.y = 0; rightV.normalize();

      dir.set(0, 0, 0)
        .addScaledVector(fwd, forward)
        .addScaledVector(rightV, strafe);

      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();

      const sp = state.moveSpeed * (sprint ? state.sprintMult : 1);
      const step = sp * dt;

      player.position.x += dir.x * step;
      player.position.z += dir.z * step;

      // Room clamp = "solid walls" (prevents walking through)
      if (world?.roomClamp) {
        player.position.x = Math.max(world.roomClamp.minX, Math.min(world.roomClamp.maxX, player.position.x));
        player.position.z = Math.max(world.roomClamp.minZ, Math.min(world.roomClamp.maxZ, player.position.z));
      }
    }

    function applySnapTurn(xAxis) {
      const dz = 0.55;
      if (Math.abs(xAxis) < dz) return;
      if (state.snapT > 0) return;

      const sign = xAxis > 0 ? -1 : 1;
      player.rotation.y += sign * snapTurnRad;
      state.snapT = state.snapCooldown;
    }

    // ---------------- BUTTON MAP (Quest typical) ----------------
    // Most common WebXR gamepad button indices:
    // 0 = trigger, 1 = squeeze (grip), 3 = primary (A on right, X on left), 4 = secondary (B on right, Y on left)
    //
    // We use:
    // - ACTION: right primary (A) OR left primary (X) OR right trigger
    // - RECENTER: right secondary (B) OR left secondary (Y)
    function handleVrButtons() {
      // Action
      const action =
        buttonPressedEdge("right", 3) || // A
        buttonPressedEdge("left", 3)  || // X
        buttonPressedEdge("right", 0);   // trigger press

      if (action) window.dispatchEvent(new Event("scarlett-action"));

      // Recenter
      const recenter =
        buttonPressedEdge("right", 4) || // B
        buttonPressedEdge("left", 4);    // Y

      if (recenter) window.dispatchEvent(new Event("scarlett-recenter"));
    }

    L("[controls] ready ✅ (left-stick fix + snap + action/recenter + clamp)");

    return {
      update(dt) {
        if (!state.enabled) return;
        state.snapT = Math.max(0, state.snapT - dt);

        const isXR = renderer.xr?.isPresenting;

        if (isXR) {
          const leftSrc = getHandSource("left");
          const rightSrc = getHandSource("right");

          // If hand-tracking only, sources may exist but have no gamepad — safe.
          // Movement: left stick. If left stick missing, fallback to right stick.
          let mv = getStick(leftSrc, "primary");
          if (mv.x === 0 && mv.y === 0) mv = getStick(rightSrc, "primary");

          // Sprint (optional): squeeze on left hand if present
          const leftBtns = getButtons(leftSrc);
          const sprint = !!leftBtns?.[1]?.pressed;

          applyMove(mv.x, mv.y, dt, sprint);

          // Snap turn: right stick x
          // Many runtimes report right stick as axes[0,1] for the right controller.
          const tr = getStick(rightSrc, "primary");
          applySnapTurn(tr.x);

          handleVrButtons();
          return;
        }

        // Desktop:
        player.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        const k = state.keys;
        const forward = (k["KeyW"] ? 1 : 0) + (k["KeyS"] ? -1 : 0);
        const strafe  = (k["KeyD"] ? 1 : 0) + (k["KeyA"] ? -1 : 0);
        const sprint = !!k["ShiftLeft"] || !!k["ShiftRight"];

        if (forward !== 0 || strafe !== 0) {
          applyMove(strafe, -forward, dt, sprint);
        }

        // clamp on desktop too
        if (world?.roomClamp) {
          player.position.x = Math.max(world.roomClamp.minX, Math.min(world.roomClamp.maxX, player.position.x));
          player.position.z = Math.max(world.roomClamp.minZ, Math.min(world.roomClamp.maxZ, player.position.z));
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
