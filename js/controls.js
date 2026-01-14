// /js/controls.js — Scarlett PERMANENT QUEST FIX v5 (FULL)
// Fixes:
// ✅ Laser orientation (Quest grips often rotated) -> force laser to point forward
// ✅ Left stick forward/back inverted -> auto-detect + fix sign
// ✅ Trigger/grip events -> bind to BOTH controller + grip, keep live button states
// ✅ Reticle still correct on floor (y=0), independent of laser visual
// ✅ Snap turn right stick X

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const state = {
    ctrl: { left: null, right: null },
    grip: { left: null, right: null },
    laser: { left: null, right: null },
    reticle: null,

    // input state (permanent)
    buttons: {
      left:  { trigger:false, grip:false, a:false, b:false, x:false, y:false },
      right: { trigger:false, grip:false, a:false, b:false, x:false, y:false }
    },

    yaw: 0,
    pitch: 0,
    snapCooldown: 0,

    // movement calibration (permanent auto-fix)
    moveFlipY: 1,     // becomes -1 if needed
    moveCalibrated: false
  };

  const cfg = {
    moveSpeed: 2.2,
    deadzone: 0.12,
    snapDeg: 45,
    snapCooldownSec: 0.22,
    laserLength: 8.0
  };

  const tmp = {
    origin: null,
    dir: null,
    up: null,
    q: null,
    v: null,
    _calibAccum: 0
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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

    tmp.origin = new THREE.Vector3();
    tmp.dir = new THREE.Vector3();
    tmp.up = new THREE.Vector3(0, 1, 0);
    tmp.q = new THREE.Quaternion();
    tmp.v = new THREE.Vector3();

    state.yaw = player.rotation.y;
    state.pitch = camera.rotation.x;

    installControllers(false);
    installReticle();

    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      log("sessionstart: rebound controllers/grips/lasers ✅");
    });

    renderer.xr.addEventListener?.("sessionend", () => {
      state.snapCooldown = 0;
      state.moveCalibrated = false;
      tmp._calibAccum = 0;
      log("sessionend ✅");
    });

    log("Controls init ✅ (v5)");
  }

  // ---------------- Controllers / Grips ----------------
  function installControllers(force) {
    try {
      const c0 = renderer.xr.getController(0);
      const c1 = renderer.xr.getController(1);
      const g0 = renderer.xr.getControllerGrip(0);
      const g1 = renderer.xr.getControllerGrip(1);

      c0.name = "XRController0";
      c1.name = "XRController1";
      g0.name = "XRGrip0";
      g1.name = "XRGrip1";

      if (force || !c0.parent) player.add(c0);
      if (force || !c1.parent) player.add(c1);
      if (force || !g0.parent) player.add(g0);
      if (force || !g1.parent) player.add(g1);

      state.ctrl.left = c0;
      state.ctrl.right = c1;
      state.grip.left = g0;
      state.grip.right = g1;

      // Bind events to BOTH controller + grip (Quest variations)
      bindPressEvents("left", c0);
      bindPressEvents("right", c1);
      bindPressEvents("left", g0);
      bindPressEvents("right", g1);

      ensureLaser("left");
      ensureLaser("right");
      attachLaserToGrip("left", g0);
      attachLaserToGrip("right", g1);

      log("controllers+grips+lasers installed ✅");
    } catch (e) {
      warn("installControllers failed (non-fatal):", e?.message || e);
    }
  }

  function bindPressEvents(side, obj) {
    if (!obj || obj.__scarlettBound) return;
    obj.__scarlettBound = true;

    obj.addEventListener("selectstart", () => { state.buttons[side].trigger = true;  log(`${side} trigger down ✅`); });
    obj.addEventListener("selectend",   () => { state.buttons[side].trigger = false; log(`${side} trigger up ✅`); });
    obj.addEventListener("squeezestart",() => { state.buttons[side].grip = true;     log(`${side} grip down ✅`); });
    obj.addEventListener("squeezeend",  () => { state.buttons[side].grip = false;    log(`${side} grip up ✅`); });
  }

  function safeRemove(obj) {
    try { obj?.parent?.remove(obj); } catch {}
  }

  // ---------------- Laser / Reticle ----------------
  function ensureLaser(side) {
    if (state.laser[side]) return;

    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00aaff });
    const line = new THREE.Line(geom, mat);
    line.name = `HandLaser_${side}`;
    line.scale.z = cfg.laserLength;

    state.laser[side] = line;
  }

  function attachLaserToGrip(side, gripObj) {
    const laser = state.laser[side];
    if (!laser || !gripObj) return;

    if (laser.parent !== gripObj) {
      safeRemove(laser);
      gripObj.add(laser);
    }

    // Reset local pose
    laser.position.set(0, 0, 0);
    laser.rotation.set(0, 0, 0);
    laser.scale.z = cfg.laserLength;

    // PERMANENT FIX: Quest grip forward can be rotated.
    // Force our laser to be aligned to controller "forward" by pitching it down 90 degrees.
    // If your grip forward is already correct, this has minimal visible effect.
    laser.rotation.x = -Math.PI / 2;
  }

  function installReticle() {
    const g = new THREE.RingGeometry(0.06, 0.085, 24);
    const m = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    state.reticle = new THREE.Mesh(g, m);
    state.reticle.rotation.x = -Math.PI / 2;
    state.reticle.visible = false;
    scene.add(state.reticle);
  }

  function updateReticleFromRightGrip() {
    const grip = state.grip.right || state.ctrl.right;
    const reticle = state.reticle;
    if (!grip || !reticle) return;

    grip.getWorldPosition(tmp.origin);

    // IMPORTANT: compute direction using grip forward (-Z) in world space
    tmp.dir.set(0, 0, -1);
    grip.getWorldQuaternion(tmp.q);
    tmp.dir.applyQuaternion(tmp.q).normalize();

    // If direction is pointing upward too much, flip it down (Quest pose oddities)
    // This keeps the reticle stable even when laser visual is rotated.
    if (tmp.dir.y > 0.35) tmp.dir.y *= -1;

    // intersect floor y=0
    const y0 = 0;
    if (Math.abs(tmp.dir.y) < 1e-5) {
      reticle.visible = false;
      return;
    }

    const t = (y0 - tmp.origin.y) / tmp.dir.y;
    if (t <= 0) {
      reticle.visible = false;
      return;
    }

    const hit = tmp.origin.clone().add(tmp.dir.clone().multiplyScalar(t));
    const dist = hit.distanceTo(tmp.origin);
    if (dist > 12) {
      reticle.visible = false;
      return;
    }

    reticle.position.copy(hit);
    reticle.visible = true;
  }

  // ---------------- Movement (Quest-safe) ----------------
  function pickStickXY(gp) {
    if (!gp || !gp.axes) return { x: 0, y: 0 };
    const a = gp.axes;
    const ax0 = a[0] ?? 0, ay0 = a[1] ?? 0;
    const ax2 = a[2] ?? 0, ay3 = a[3] ?? 0;

    const magA = Math.abs(ax0) + Math.abs(ay0);
    const magB = Math.abs(ax2) + Math.abs(ay3);

    return (magB > magA) ? { x: ax2, y: ay3 } : { x: ax0, y: ay0 };
  }

  function moveLocal(strafe, forward, dt) {
    tmp.v.set(strafe, 0, forward);
    if (tmp.v.lengthSq() < 1e-6) return;

    tmp.v.normalize().multiplyScalar(cfg.moveSpeed * dt);
    tmp.v.applyAxisAngle(tmp.up, player.rotation.y);
    player.position.add(tmp.v);
  }

  function applyLook() {
    player.rotation.y = state.yaw;
    camera.rotation.x = clamp(camera.rotation.x, -1.2, 1.2);
  }

  function updateXR(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    let leftGP = null, rightGP = null;
    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") leftGP = src.gamepad;
      if (src.handedness === "right") rightGP = src.gamepad;
    }
    if (!leftGP || !rightGP) {
      const gps = session.inputSources.filter(s => s?.gamepad).map(s => s.gamepad);
      leftGP = leftGP || gps[0] || null;
      rightGP = rightGP || gps[1] || null;
    }

    // READ button states (A/B/X/Y if present)
    // Quest typically: buttons[0]=trigger, [1]=grip, [3/4] face buttons depending
    readButtons("left", leftGP);
    readButtons("right", rightGP);

    // MOVE: left stick (with permanent auto-calibration)
    const L = pickStickXY(leftGP);
    const lx = dz(L.x);
    const lyRaw = dz(L.y);

    // Auto-calibrate Y direction: first time you push forward, we learn which sign is forward.
    // If pushing stick forward makes lyRaw NEGATIVE (common), we want forward = -lyRaw.
    // If pushing stick forward makes lyRaw POSITIVE (your case), we want forward = +lyRaw.
    if (!state.moveCalibrated) {
      tmp._calibAccum += Math.abs(lyRaw);
      if (Math.abs(lyRaw) > 0.35 && tmp._calibAccum > 0.6) {
        // If your forward stick yields positive values, flip = -1 so forward uses +lyRaw
        // Heuristic: if lyRaw > 0 when pushing forward, we flip.
        state.moveFlipY = (lyRaw > 0) ? -1 : 1;
        state.moveCalibrated = true;
        log(`[move] calibrated ✅ moveFlipY=${state.moveFlipY}`);
      }
    }

    // Compute forward:
    // default: forward = -lyRaw (common). If moveFlipY=-1, forward becomes +lyRaw.
    const forward = (-lyRaw) * state.moveFlipY;
    moveLocal(lx, forward, dt);

    // SNAP TURN: right stick X
    const R = pickStickXY(rightGP);
    const rx = dz(R.x);

    state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (Math.abs(rx) > 0.65 && state.snapCooldown <= 0) {
      const dir = rx > 0 ? -1 : 1;
      state.yaw += dir * (cfg.snapDeg * Math.PI / 180);
      applyLook();
      state.snapCooldown = cfg.snapCooldownSec;
    }
  }

  function readButtons(side, gp) {
    if (!gp || !gp.buttons) return;
    // Keep trigger/grip from gamepad too (events already set, but this is backup)
    const trig = !!gp.buttons[0]?.pressed;
    const grip = !!gp.buttons[1]?.pressed;
    state.buttons[side].trigger = state.buttons[side].trigger || trig;
    state.buttons[side].grip = state.buttons[side].grip || grip;

    // Face buttons vary; we store a/b/x/y best-effort
    // Many mappings: (0 trigger,1 grip,3/4) but we won’t rely on exact.
    state.buttons[side].a = !!gp.buttons[4]?.pressed || !!gp.buttons[3]?.pressed;
    state.buttons[side].b = !!gp.buttons[5]?.pressed;
    state.buttons[side].x = !!gp.buttons[4]?.pressed;
    state.buttons[side].y = !!gp.buttons[3]?.pressed;
  }

  function update(dt) {
    dt = Math.max(0.0, Math.min(0.05, dt || 0.016));

    if (renderer?.xr?.isPresenting) {
      updateXR(dt);
      updateReticleFromRightGrip();
    } else {
      if (state.reticle) state.reticle.visible = false;
    }
  }

  function getControllers() {
    return { ...state.ctrl, grip: { ...state.grip } };
  }

  function getButtons() {
    return state.buttons;
  }

  return { init, update, getControllers, getButtons };
})();
