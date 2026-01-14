// /js/core/controls.js — Scarlett CORE Controls (FULL) v2.0
// Single source of truth for Quest controller locomotion + XR select signals.
// ✅ Uses XR gamepads (Quest Touch) for movement + snap turn
// ✅ Auto-fixes “forward/backwards inverted” (calibrates once)
// ✅ Right stick: snap turn 45° (X). Right stick Y can be optional forward fallback
// ✅ Emits Signals "XR_SELECT" on trigger (selectstart/selectend)
// ✅ Provides debug strings for HUD: getPadDebug(), getButtonDebug()
// ✅ DOES NOT create lasers (keep lasers/rays in core/xr_hands.js if you want)
//
// Usage (index.js):
//   import { Controls } from "./core/controls.js";
//   Controls.init({ THREE, renderer, camera, player, Signals, log });
//   in loop: Controls.update(dt);

export const Controls = (() => {
  let THREE, renderer, camera, player, Signals;
  let log = console.log, warn = console.warn;

  const cfg = {
    deadzoneMove: 0.12,
    deadzoneTurn: 0.18,
    speedXR: 1.65,
    speed2D: 2.35,
    snapDeg: 45,
    snapThreshold: 0.65,
    snapCooldownSec: 0.22,

    // If left stick Y is dead on your right controller, allow right Y to move
    allowRightYForwardFallback: true
  };

  const state = {
    inXR: false,

    // stick axes
    lx: 0, ly: 0,
    rx: 0, ry: 0,

    // buttons
    btn: {
      left:  { trigger:false, grip:false },
      right: { trigger:false, grip:false }
    },

    // calibration: forward sign
    moveFlipY: 1,
    moveCalibrated: false,
    calibScore: 0,

    // snap
    yaw: 0,
    snapCooldown: 0,

    // cached refs
    ctrl: [null, null],
    grip: [null, null],
    gp: { left:null, right:null },

    // temps
    vForward: null,
    vRight: null,
    vMove: null,
    vUp: null
  };

  const dz = (v, d) => (Math.abs(v) < d ? 0 : v);

  function emit(name, payload) {
    try { Signals?.emit?.(name, payload); } catch {}
  }

  function init(ctx) {
    THREE = ctx.THREE;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;

    Signals = ctx.Signals || ctx.signals || null;
    log = ctx.log || log;
    warn = ctx.warn || warn;

    state.vForward = new THREE.Vector3();
    state.vRight   = new THREE.Vector3();
    state.vMove    = new THREE.Vector3();
    state.vUp      = new THREE.Vector3(0,1,0);

    state.yaw = player.rotation.y || 0;

    bindXRControllers();
    renderer?.xr?.addEventListener?.("sessionstart", () => {
      bindXRControllers();
      state.moveCalibrated = false;
      state.calibScore = 0;
      log("[core/controls] sessionstart: rebound ✅");
    });

    log("[core/controls] init ✅ v2.0");
    return api;
  }

  function bindXRControllers() {
    try {
      state.ctrl[0] = renderer.xr.getController(0);
      state.ctrl[1] = renderer.xr.getController(1);
      state.grip[0] = renderer.xr.getControllerGrip(0);
      state.grip[1] = renderer.xr.getControllerGrip(1);

      // Parent to player so transforms follow rig
      for (let i = 0; i < 2; i++) {
        if (state.ctrl[i] && !state.ctrl[i].parent) player.add(state.ctrl[i]);
        if (state.grip[i] && !state.grip[i].parent) player.add(state.grip[i]);
      }

      // Ensure events only bound once
      bindSelectEvents(state.ctrl[0], 0);
      bindSelectEvents(state.ctrl[1], 1);

      log("[core/controls] controllers bound ✅");
    } catch (e) {
      warn("[core/controls] bindXRControllers failed:", e?.message || e);
    }
  }

  function bindSelectEvents(ctrl, idx) {
    if (!ctrl || ctrl.__scarlettSelectBound) return;
    ctrl.__scarlettSelectBound = true;

    const hand = idx === 0 ? "left" : "right";

    ctrl.addEventListener("selectstart", () => {
      state.btn[hand].trigger = true;
      emit("XR_SELECT", { hand, index: idx, down: true });
    });

    ctrl.addEventListener("selectend", () => {
      state.btn[hand].trigger = false;
      emit("XR_SELECT", { hand, index: idx, down: false });
    });

    ctrl.addEventListener("squeezestart", () => {
      state.btn[hand].grip = true;
    });

    ctrl.addEventListener("squeezeend", () => {
      state.btn[hand].grip = false;
    });
  }

  function refreshGamepads() {
    state.gp.left = null;
    state.gp.right = null;

    const s = renderer?.xr?.getSession?.();
    if (!s) return;

    for (const src of s.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") state.gp.left = src.gamepad;
      if (src.handedness === "right") state.gp.right = src.gamepad;
    }

    // fallback: first 2 gamepads
    if (!state.gp.left || !state.gp.right) {
      const gps = s.inputSources.filter(x => x?.gamepad).map(x => x.gamepad);
      state.gp.left = state.gp.left || gps[0] || null;
      state.gp.right = state.gp.right || gps[1] || null;
    }
  }

  function pickStickXY(gp) {
    if (!gp || !gp.axes) return { x: 0, y: 0 };
    const a = gp.axes;

    // Some browsers map thumbstick to (0,1); some to (2,3).
    const ax0 = a[0] ?? 0, ay0 = a[1] ?? 0;
    const ax2 = a[2] ?? 0, ay3 = a[3] ?? 0;

    const magA = Math.abs(ax0) + Math.abs(ay0);
    const magB = Math.abs(ax2) + Math.abs(ay3);

    return (magB > magA) ? { x: ax2, y: ay3 } : { x: ax0, y: ay0 };
  }

  function readAxes() {
    refreshGamepads();

    const L = pickStickXY(state.gp.left);
    const R = pickStickXY(state.gp.right);

    state.lx = L.x || 0;
    state.ly = L.y || 0;
    state.rx = R.x || 0;
    state.ry = R.y || 0;
  }

  function autoCalibrateForwardSign() {
    // We watch the first strong push on either stick Y and set flip accordingly.
    // Many controllers report forward as negative Y; we want forward movement when pushing up.
    const yCandidate = Math.abs(state.ly) >= Math.abs(state.ry) ? state.ly : state.ry;

    state.calibScore += Math.abs(state.ly) + Math.abs(state.ry);

    if (!state.moveCalibrated && Math.abs(yCandidate) > 0.35 && state.calibScore > 0.6) {
      // If the first strong push is positive, that means "up" is positive -> flip to make forward positive.
      // If first strong push is negative, keep as-is.
      state.moveFlipY = (yCandidate > 0) ? -1 : 1;
      state.moveCalibrated = true;
      log(`[core/controls] calibrated ✅ flipY=${state.moveFlipY}`);
    }
  }

  function applyMovement(dt) {
    // Move relative to camera (ground plane)
    const inXR = state.inXR;

    const lx = dz(state.lx, cfg.deadzoneMove);
    const ly = dz(state.ly, cfg.deadzoneMove);

    const ry = dz(state.ry, cfg.deadzoneMove);

    // Forward/back: primarily left Y, fallback to right Y if left is weak
    let forward = (-ly) * state.moveFlipY;
    if (cfg.allowRightYForwardFallback && Math.abs(forward) < 0.10 && Math.abs(ry) > 0.12) {
      forward = (-ry) * state.moveFlipY;
    }

    // Strafe: left X
    const strafe = lx;

    state.vForward.set(0,0,-1).applyQuaternion(camera.quaternion);
    state.vForward.y = 0; state.vForward.normalize();

    state.vRight.set(1,0,0).applyQuaternion(camera.quaternion);
    state.vRight.y = 0; state.vRight.normalize();

    state.vMove.set(0,0,0);
    state.vMove.addScaledVector(state.vForward, forward);
    state.vMove.addScaledVector(state.vRight, strafe);

    const L = state.vMove.length();
    if (L > 0.001) {
      state.vMove.multiplyScalar(1 / L);
      const speed = inXR ? cfg.speedXR : cfg.speed2D;
      player.position.addScaledVector(state.vMove, speed * dt);
    }
  }

  function applySnapTurn(dt) {
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);

    const rx = dz(state.rx, cfg.deadzoneTurn);

    if (state.snapCooldown > 0) return;

    if (rx > cfg.snapThreshold) {
      state.yaw -= (cfg.snapDeg * Math.PI / 180);
      player.rotation.y = state.yaw;
      state.snapCooldown = cfg.snapCooldownSec;
    } else if (rx < -cfg.snapThreshold) {
      state.yaw += (cfg.snapDeg * Math.PI / 180);
      player.rotation.y = state.yaw;
      state.snapCooldown = cfg.snapCooldownSec;
    }
  }

  function update(dt) {
    dt = Math.max(0, Math.min(0.05, dt || 0.016));
    state.inXR = !!renderer?.xr?.isPresenting;

    // If not in XR, let Android sticks handle movement (core/ui_sticks.js)
    // We still keep snap/move off when not presenting.
    if (!state.inXR) return;

    readAxes();
    autoCalibrateForwardSign();
    applySnapTurn(dt);
    applyMovement(dt);
  }

  function getPadDebug() {
    const L = state.gp.left ? "L" : "-";
    const R = state.gp.right ? "R" : "-";
    return `pad:${L}${R} lx:${state.lx.toFixed(2)} ly:${state.ly.toFixed(2)} rx:${state.rx.toFixed(2)} ry:${state.ry.toFixed(2)} flipY:${state.moveFlipY}${state.moveCalibrated ? "*" : ""}`;
  }

  function getButtonDebug() {
    const lt = state.btn.left.trigger ? "T" : "-";
    const lg = state.btn.left.grip ? "G" : "-";
    const rt = state.btn.right.trigger ? "T" : "-";
    const rg = state.btn.right.grip ? "G" : "-";
    return `btns:L[${lt}${lg}] R[${rt}${rg}]`;
  }

  const api = {
    init,
    update,
    getPadDebug,
    getButtonDebug,

    // optional knobs
    setSpeedXR(v){ cfg.speedXR = Math.max(0.1, Number(v)||cfg.speedXR); },
    setDeadzone(v){ cfg.deadzoneMove = Math.max(0.01, Math.min(0.4, Number(v)||cfg.deadzoneMove)); }
  };

  return api;
})();
