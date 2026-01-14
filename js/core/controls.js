// /js/core/controls.js — Scarlett CORE Controls (FINAL) v1.0 (FULL)
// Single source of truth for Quest controllers + lasers + reticle + movement.
// ✅ Reticle always hits floor (fixes “only shows when pointing up”)
// ✅ Left stick: strafe + forward/back (auto-flip if headset reports inverted Y)
// ✅ Right stick: X = snap turn (45°), Y = forward/back fallback
// ✅ Lasers stable (no “parked rays”, no up-only behavior)
// ✅ Diagnostics: getPadDebug(), getButtonDebug()

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const cfg = {
    moveSpeed: 2.35,
    deadzone: 0.08,
    snapDeg: 45,
    snapCooldownSec: 0.22,
    laserLength: 8.0,
    maxReticleDist: 18.0,
    reticleY: 0.02
  };

  const state = {
    ctrl: { left: null, right: null },
    grip: { left: null, right: null },
    laser: { left: null, right: null },
    reticle: null,

    yaw: 0,
    snapCooldown: 0,

    // movement Y invert auto-calibration
    moveFlipY: 1,
    moveCalibrated: false,
    calibAccum: 0,

    gp: { left: null, right: null },

    btn: {
      left: { trigger: false, grip: false },
      right: { trigger: false, grip: false }
    }
  };

  const tmp = {
    o: null,
    q: null,
    dir: null,
    v: null,
    move: null,
    up: null
  };

  const dz = (v) => (Math.abs(v) < cfg.deadzone ? 0 : v);

  function init(ctx) {
    THREE = ctx.THREE;
    renderer = ctx.renderer;
    scene = ctx.scene;
    camera = ctx.camera;
    player = ctx.player;

    log = ctx.log || log;
    warn = ctx.warn || warn;
    err = ctx.err || err;

    tmp.o = new THREE.Vector3();
    tmp.q = new THREE.Quaternion();
    tmp.dir = new THREE.Vector3();
    tmp.v = new THREE.Vector3();
    tmp.move = new THREE.Vector3();
    tmp.up = new THREE.Vector3(0, 1, 0);

    state.yaw = player.rotation.y;

    installReticle();
    installControllers(true);

    // Rebind on XR start (Quest sometimes swaps inputSources)
    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      state.moveCalibrated = false;
      state.calibAccum = 0;
      log("[core/controls] sessionstart: rebound ✅");
    });

    log("[core/controls] init ✅");
  }

  function bindEvents(side, obj) {
    if (!obj || obj.__scarlettBound) return;
    obj.__scarlettBound = true;

    obj.addEventListener("selectstart", () => (state.btn[side].trigger = true));
    obj.addEventListener("selectend", () => (state.btn[side].trigger = false));
    obj.addEventListener("squeezestart", () => (state.btn[side].grip = true));
    obj.addEventListener("squeezeend", () => (state.btn[side].grip = false));
  }

  function installControllers(force) {
    try {
      const c0 = renderer.xr.getController(0);
      const c1 = renderer.xr.getController(1);
      const g0 = renderer.xr.getControllerGrip(0);
      const g1 = renderer.xr.getControllerGrip(1);

      if (force || !c0.parent) player.add(c0);
      if (force || !c1.parent) player.add(c1);
      if (force || !g0.parent) player.add(g0);
      if (force || !g1.parent) player.add(g1);

      state.ctrl.left = c0;
      state.ctrl.right = c1;
      state.grip.left = g0;
      state.grip.right = g1;

      bindEvents("left", c0);
      bindEvents("right", c1);
      bindEvents("left", g0);
      bindEvents("right", g1);

      ensureLaser("left");
      ensureLaser("right");
      attachLaser("left", g0 || c0);
      attachLaser("right", g1 || c1);

      log("[core/controls] controllers + lasers ✅");
    } catch (e) {
      warn("[core/controls] installControllers failed:", e?.message || e);
    }
  }

  function ensureLaser(side) {
    if (state.laser[side]) return;

    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00aaff });
    const line = new THREE.Line(geom, mat);
    line.name = `LASER_${side.toUpperCase()}`;
    line.scale.z = cfg.laserLength;
    state.laser[side] = line;
  }

  function attachLaser(side, parentObj) {
    const laser = state.laser[side];
    if (!laser || !parentObj) return;

    if (laser.parent !== parentObj) {
      try {
        laser.parent?.remove(laser);
      } catch {}
      parentObj.add(laser);
    }

    laser.position.set(0, 0, 0);
    laser.rotation.set(0, 0, 0);
    laser.scale.z = cfg.laserLength;

    // Visual forward bias so it "feels" like a pointer from the controller
    // (reticle math is independent and robust)
    laser.rotation.x = -Math.PI / 2;
  }

  function installReticle() {
    const g = new THREE.RingGeometry(0.06, 0.085, 24);
    const m = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const r = new THREE.Mesh(g, m);
    r.name = "FLOOR_RETICLE";
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    state.reticle = r;
    scene.add(r);
  }

  function refreshGamepads() {
    const s = renderer.xr.getSession?.();
    state.gp.left = null;
    state.gp.right = null;
    if (!s) return;

    for (const src of s.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") state.gp.left = src.gamepad;
      if (src.handedness === "right") state.gp.right = src.gamepad;
    }

    // fallback if handedness missing
    if (!state.gp.left || !state.gp.right) {
      const gps = s.inputSources.filter((x) => x?.gamepad).map((x) => x.gamepad);
      state.gp.left = state.gp.left || gps[0] || null;
      state.gp.right = state.gp.right || gps[1] || null;
    }
  }

  function readButtonsFallback() {
    const L = state.gp.left,
      R = state.gp.right;

    if (L?.buttons) {
      state.btn.left.trigger = state.btn.left.trigger || !!L.buttons[0]?.pressed;
      state.btn.left.grip = state.btn.left.grip || !!L.buttons[1]?.pressed;
    }
    if (R?.buttons) {
      state.btn.right.trigger = state.btn.right.trigger || !!R.buttons[0]?.pressed;
      state.btn.right.grip = state.btn.right.grip || !!R.buttons[1]?.pressed;
    }
  }

  function pickStick(gp) {
    if (!gp || !gp.axes) return { x: 0, y: 0 };
    const a = gp.axes;

    // Candidate pairs: (0,1) and (2,3). Choose the stronger one.
    const ax0 = a[0] ?? 0,
      ay0 = a[1] ?? 0;
    const ax2 = a[2] ?? 0,
      ay3 = a[3] ?? 0;
    const magA = Math.abs(ax0) + Math.abs(ay0);
    const magB = Math.abs(ax2) + Math.abs(ay3);
    return magB > magA ? { x: ax2, y: ay3 } : { x: ax0, y: ay0 };
  }

  // ✅ Reticle ray always points DOWN so it always intersects the floor.
  function updateReticle() {
    const r = state.reticle;
    if (!r) return;

    // Prefer RIGHT grip/controller for aiming
    const aim = state.grip.right || state.ctrl.right || state.grip.left || state.ctrl.left;
    if (!aim) {
      r.visible = false;
      return;
    }

    aim.getWorldPosition(tmp.o);
    aim.getWorldQuaternion(tmp.q);

    // start with controller forward (-Z)
    tmp.dir.set(0, 0, -1).applyQuaternion(tmp.q).normalize();

    // If it's pointing up, flip it. This fixes “reticle only shows when pointing up”.
    if (tmp.dir.y > 0) tmp.dir.multiplyScalar(-1);

    // If it's almost flat, don't show
    if (Math.abs(tmp.dir.y) < 1e-4) {
      r.visible = false;
      return;
    }

    // Intersect with floor plane y=0
    const t = (0 - tmp.o.y) / tmp.dir.y;
    if (t <= 0) {
      r.visible = false;
      return;
    }

    tmp.v.copy(tmp.o).addScaledVector(tmp.dir, t);
    const dist = tmp.v.distanceTo(tmp.o);
    if (dist > cfg.maxReticleDist) {
      r.visible = false;
      return;
    }

    r.position.set(tmp.v.x, cfg.reticleY, tmp.v.z);
    r.visible = true;
  }

  function move(dt) {
    if (!renderer.xr.isPresenting) return;

    refreshGamepads();
    readButtonsFallback();

    const LS = pickStick(state.gp.left);
    const RS = pickStick(state.gp.right);

    const lx = dz(LS.x);
    const ly = dz(LS.y);

    const rx = dz(RS.x);
    const ry = dz(RS.y);

    // Auto-calibrate Y sign based on first strong push
    if (!state.moveCalibrated) {
      state.calibAccum += Math.abs(ly) + Math.abs(ry);
      const testY = Math.abs(ly) >= Math.abs(ry) ? ly : ry;

      if (Math.abs(testY) > 0.35 && state.calibAccum > 0.6) {
        // Many controllers report "forward" as negative Y; if we see positive first, flip.
        state.moveFlipY = testY > 0 ? -1 : 1;
        state.moveCalibrated = true;
        log(`[core/controls] move calibrated ✅ flipY=${state.moveFlipY}`);
      }
    }

    // Forward/back: primarily left Y, fallback to right Y if left is weak
    let forward = (-ly) * state.moveFlipY;
    if (Math.abs(forward) < 0.10 && Math.abs(ry) > 0.12) {
      forward = (-ry) * state.moveFlipY;
    }

    // Build movement vector (strafe + forward)
    tmp.move.set(lx, 0, forward);
    const L = tmp.move.length();
    if (L > 0.001) {
      tmp.move.multiplyScalar((cfg.moveSpeed * dt) / L);
      tmp.move.applyAxisAngle(tmp.up, player.rotation.y);
      player.position.add(tmp.move);
    }

    // Snap turn with right X (45°)
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (Math.abs(rx) > 0.65 && state.snapCooldown <= 0) {
      const dir = rx > 0 ? -1 : 1;
      state.yaw += dir * (cfg.snapDeg * Math.PI / 180);
      player.rotation.y = state.yaw;
      state.snapCooldown = cfg.snapCooldownSec;
    }
  }

  function update(dt) {
    dt = Math.max(0, Math.min(0.05, dt || 0.016));

    if (renderer.xr.isPresenting) {
      move(dt);
      updateReticle();
    } else {
      if (state.reticle) state.reticle.visible = false;
    }
  }

  function getPadDebug() {
    const L = state.gp.left ? "L" : "-";
    const R = state.gp.right ? "R" : "-";
    return `pad:${L}${R} flipY:${state.moveFlipY}${state.moveCalibrated ? "*" : ""}`;
  }

  function getButtonDebug() {
    const lt = state.btn.left.trigger ? "T" : "-";
    const lg = state.btn.left.grip ? "G" : "-";
    const rt = state.btn.right.trigger ? "T" : "-";
    const rg = state.btn.right.grip ? "G" : "-";
    return `btns:L[${lt}${lg}] R[${rt}${rg}]`;
  }

  return { init, update, getPadDebug, getButtonDebug };
})();
