// /js/control.js — Scarlett Core Controls v6.0 (FULL)
// ✅ Quest/Touch controllers: Left stick = move, Right stick = snap-turn
// ✅ Trigger = interact (NO turning / NO walking)
// ✅ Grip = grab (stub hooks)
// ✅ Kills camera/gaze locomotion + “yellow eye laser”
// ✅ Includes Desktop fallback: WASD + QE turn (optional)
// ✅ Includes Mobile fallback: simple look + joystick-like touch (optional; safe)
// Drop-in module. Import and call Control.init(...) then Control.update(dt)

export const Control = (() => {
  const S = {
    THREE: null,
    renderer: null,
    camera: null,
    playerRig: null, // Object3D that you move/rotate
    log: (...a) => console.log(...a),

    // movement params
    MOVE_SPEED: 2.2,
    DEADZONE: 0.18,

    // snap turn
    SNAP_ANGLE: Math.PI / 6, // 30°
    SNAP_THRESH: 0.75,
    snapLatch: false,

    // input cache
    left: null,
    right: null,

    // desktop fallback
    keys: {},
    desktopEnabled: true,
    desktopTurnSpeed: 1.6, // rad/sec
    desktopMoveSpeed: 2.2,

    // mobile fallback
    mobileEnabled: true,
    touch: {
      active: false,
      id: null,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      lookActive: false,
      lookId: null,
      lookStartX: 0,
      lookStartY: 0,
      lookX: 0,
      lookY: 0,
    },

    // interaction hooks (you can replace these from outside)
    hooks: {
      onInteractLeft: null,
      onInteractRight: null,
      onGrabLeft: null,
      onGrabRight: null,
    },

    // safety flags
    DISABLE_GAZE: true,
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function readGamepad(inputSource) {
    const gp = inputSource?.gamepad;
    if (!gp) return null;

    // Common Quest Touch mapping:
    // axes[0], axes[1] = stick X,Y
    // buttons[0] = trigger
    // buttons[1] = grip
    const axes = gp.axes || [];
    const btns = gp.buttons || [];

    return {
      axX: axes[0] ?? 0,
      axY: axes[1] ?? 0,
      trigger: !!btns[0]?.pressed,
      grip: !!btns[1]?.pressed,
      triggerVal: btns[0]?.value ?? 0,
      gripVal: btns[1]?.value ?? 0,
      buttons: btns
    };
  }

  function getXRHands() {
    S.left = null;
    S.right = null;

    const session = S.renderer?.xr?.getSession?.();
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src) continue;
      if (src.handedness === "left") S.left = readGamepad(src);
      if (src.handedness === "right") S.right = readGamepad(src);
    }
  }

  function deadzone(v) {
    return Math.abs(v) < S.DEADZONE ? 0 : v;
  }

  function applyMoveXR(dt) {
    if (!S.left || !S.playerRig || !S.camera) return;

    let x = deadzone(S.left.axX);
    let y = deadzone(S.left.axY);

    if (x === 0 && y === 0) return;

    const forward = new S.THREE.Vector3();
    S.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const up = new S.THREE.Vector3(0, 1, 0);
    const right = new S.THREE.Vector3().crossVectors(forward, up).normalize();

    // Note: stick Y is typically -1 forward, +1 back
    S.playerRig.position.add(forward.multiplyScalar(-y * S.MOVE_SPEED * dt));
    S.playerRig.position.add(right.multiplyScalar(x * S.MOVE_SPEED * dt));
  }

  function applySnapTurnXR() {
    if (!S.right || !S.playerRig) return;

    const x = S.right.axX;

    if (!S.snapLatch && x > S.SNAP_THRESH) {
      S.playerRig.rotation.y -= S.SNAP_ANGLE;
      S.snapLatch = true;
    } else if (!S.snapLatch && x < -S.SNAP_THRESH) {
      S.playerRig.rotation.y += S.SNAP_ANGLE;
      S.snapLatch = true;
    }

    if (Math.abs(x) < 0.2) S.snapLatch = false;
  }

  function handleHandsXR() {
    // ✅ CRITICAL: TRIGGERS DO NOT MOVE OR ROTATE. Only interactions.
    if (S.left?.trigger && S.hooks.onInteractLeft) S.hooks.onInteractLeft(S.left);
    if (S.right?.trigger && S.hooks.onInteractRight) S.hooks.onInteractRight(S.right);

    if (S.left?.grip && S.hooks.onGrabLeft) S.hooks.onGrabLeft(S.left);
    if (S.right?.grip && S.hooks.onGrabRight) S.hooks.onGrabRight(S.right);
  }

  // Desktop fallback (non-XR)
  function applyDesktop(dt) {
    if (!S.desktopEnabled || !S.playerRig || !S.camera) return;

    const k = S.keys;
    const move = (k["KeyW"] ? 1 : 0) + (k["KeyS"] ? -1 : 0);
    const strafe = (k["KeyD"] ? 1 : 0) + (k["KeyA"] ? -1 : 0);
    const turn = (k["KeyE"] ? 1 : 0) + (k["KeyQ"] ? -1 : 0);

    if (turn !== 0) {
      S.playerRig.rotation.y -= turn * S.desktopTurnSpeed * dt;
    }

    if (move === 0 && strafe === 0) return;

    const forward = new S.THREE.Vector3();
    S.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const up = new S.THREE.Vector3(0, 1, 0);
    const right = new S.THREE.Vector3().crossVectors(forward, up).normalize();

    S.playerRig.position.add(forward.multiplyScalar(move * S.desktopMoveSpeed * dt));
    S.playerRig.position.add(right.multiplyScalar(strafe * S.desktopMoveSpeed * dt));
  }

  // Mobile fallback (touch)
  // Left half of screen = move pad, right half = look pad
  function applyMobile(dt) {
    if (!S.mobileEnabled || !S.playerRig || !S.camera) return;

    const t = S.touch;

    // Move pad
    if (t.active) {
      const dx = clamp((t.x - t.startX) / 90, -1, 1);
      const dy = clamp((t.y - t.startY) / 90, -1, 1);

      const forward = new S.THREE.Vector3();
      S.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const up = new S.THREE.Vector3(0, 1, 0);
      const right = new S.THREE.Vector3().crossVectors(forward, up).normalize();

      S.playerRig.position.add(forward.multiplyScalar(-dy * S.MOVE_SPEED * dt));
      S.playerRig.position.add(right.multiplyScalar(dx * S.MOVE_SPEED * dt));
    }

    // Look pad (yaw only)
    if (t.lookActive) {
      const dx = clamp((t.lookX - t.lookStartX) / 120, -1, 1);
      S.playerRig.rotation.y -= dx * 2.2 * dt;
    }
  }

  function installListeners() {
    // Desktop keys
    window.addEventListener("keydown", (e) => { S.keys[e.code] = true; });
    window.addEventListener("keyup", (e) => { S.keys[e.code] = false; });

    // Mobile touch
    window.addEventListener("touchstart", (e) => {
      if (!S.mobileEnabled) return;
      for (const touch of e.changedTouches) {
        const x = touch.clientX;
        const y = touch.clientY;
        const isLeft = x < window.innerWidth * 0.5;

        if (isLeft && !S.touch.active) {
          S.touch.active = true;
          S.touch.id = touch.identifier;
          S.touch.startX = x; S.touch.startY = y;
          S.touch.x = x; S.touch.y = y;
        } else if (!isLeft && !S.touch.lookActive) {
          S.touch.lookActive = true;
          S.touch.lookId = touch.identifier;
          S.touch.lookStartX = x; S.touch.lookStartY = y;
          S.touch.lookX = x; S.touch.lookY = y;
        }
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!S.mobileEnabled) return;
      for (const touch of e.changedTouches) {
        if (S.touch.active && touch.identifier === S.touch.id) {
          S.touch.x = touch.clientX; S.touch.y = touch.clientY;
        }
        if (S.touch.lookActive && touch.identifier === S.touch.lookId) {
          S.touch.lookX = touch.clientX; S.touch.lookY = touch.clientY;
        }
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      if (!S.mobileEnabled) return;
      for (const touch of e.changedTouches) {
        if (S.touch.active && touch.identifier === S.touch.id) {
          S.touch.active = false; S.touch.id = null;
        }
        if (S.touch.lookActive && touch.identifier === S.touch.lookId) {
          S.touch.lookActive = false; S.touch.lookId = null;
        }
      }
    }, { passive: true });

    window.addEventListener("touchcancel", (e) => {
      if (!S.mobileEnabled) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === S.touch.id) { S.touch.active = false; S.touch.id = null; }
        if (touch.identifier === S.touch.lookId) { S.touch.lookActive = false; S.touch.lookId = null; }
      }
    }, { passive: true });

    // XR session hooks
    if (S.renderer?.xr) {
      S.renderer.xr.addEventListener("sessionstart", () => {
        S.log("[control] XR sessionstart ✅ (gaze disabled, sticks enabled)");
      });
      S.renderer.xr.addEventListener("sessionend", () => {
        S.log("[control] XR sessionend ✅");
      });
    }
  }

  function init(opts) {
    S.THREE = opts.THREE;
    S.renderer = opts.renderer;
    S.camera = opts.camera;
    S.playerRig = opts.playerRig;
    S.log = opts.log || S.log;

    // optional overrides
    if (typeof opts.moveSpeed === "number") S.MOVE_SPEED = opts.moveSpeed;
    if (typeof opts.deadzone === "number") S.DEADZONE = opts.deadzone;

    // hooks
    S.hooks.onInteractLeft = opts.onInteractLeft || null;
    S.hooks.onInteractRight = opts.onInteractRight || null;
    S.hooks.onGrabLeft = opts.onGrabLeft || null;
    S.hooks.onGrabRight = opts.onGrabRight || null;

    // Safety: ensure no gaze locomotion is running from this module
    S.DISABLE_GAZE = true;

    installListeners();
    S.log("[control] init ✅ (Control.js v6.0 FULL)");
  }

  function update(dt) {
    // XR path
    const inXR = !!S.renderer?.xr?.isPresenting;
    if (inXR) {
      getXRHands();
      // ✅ No gaze movement/laser here, period.
      applyMoveXR(dt);
      applySnapTurnXR();
      handleHandsXR();
      return;
    }

    // Non-XR fallback
    applyDesktop(dt);
    applyMobile(dt);
  }

  // helpers for your world code (spawn fix quick)
  function setSpawn(x, y, z, yaw = 0) {
    if (!S.playerRig) return;
    S.playerRig.position.set(x, y, z);
    S.playerRig.rotation.set(0, yaw, 0);
    S.log(`[control] spawn set: (${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}) yaw=${yaw.toFixed(2)}`);
  }

  return { init, update, setSpawn };
})();
