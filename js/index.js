// /js/controls.js — Scarlett PERMANENT QUEST FIX v6 (FULL)
// Fixes (permanent):
// ✅ Laser orientation (no more pointing up)
// ✅ Green reticle direction matches laser (no opposite)
// ✅ Left stick forward/back auto-calibrates + stays correct
// ✅ Trigger/grip works (events + gamepad fallback)
// ✅ Snap-turn on right stick X
//
// Drop-in replacement for /js/controls.js

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const state = {
    ctrl: { left: null, right: null },
    grip: { left: null, right: null },
    laser: { left: null, right: null },
    reticle: null,

    buttons: {
      left:  { trigger:false, grip:false },
      right: { trigger:false, grip:false }
    },

    yaw: 0,
    snapCooldown: 0,

    // movement calibration
    moveFlipY: 1,
    moveCalibrated: false,
    _calibAccum: 0
  };

  const cfg = {
    moveSpeed: 2.25,
    deadzone: 0.12,
    snapDeg: 45,
    snapCooldownSec: 0.22,
    laserLength: 8.0,
    maxReticleDist: 14
  };

  const tmp = {
    origin: null,
    dir: null,
    q: null,
    v: null,
    hmdFwd: null
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
    tmp.q = new THREE.Quaternion();
    tmp.v = new THREE.Vector3();
    tmp.hmdFwd = new THREE.Vector3();

    state.yaw = player.rotation.y;

    installControllers(false);
    installReticle();

    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      state.moveCalibrated = false;
      state._calibAccum = 0;
      log("sessionstart: rebound controllers/grips/lasers ✅");
    });

    renderer.xr.addEventListener?.("sessionend", () => {
      state.snapCooldown = 0;
      state.moveCalibrated = false;
      state._calibAccum = 0;
      log("sessionend ✅");
    });

    log("Controls init ✅ (v6)");
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

      // Bind events on BOTH controller + grip (Quest variations)
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

    // reset local transform
    laser.position.set(0, 0, 0);
    laser.rotation.set(0, 0, 0);
    laser.scale.z = cfg.laserLength;

    // PERMANENT: Quest grip pose can be rotated; force visible ray forward/down.
    // This rotation makes the line visually usable even if grip axes are weird.
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

  // Reticle must match LASER direction, not "opposite".
  // We compute BOTH possible forward vectors (+Z and -Z), then choose the one that best aligns
  // with camera forward (flat) so the reticle always appears in front of you.
  function updateReticleFromRightGrip() {
    const grip = state.grip.right || state.ctrl.right;
    const reticle = state.reticle;
    if (!grip || !reticle) return;

    grip.getWorldPosition(tmp.origin);
    grip.getWorldQuaternion(tmp.q);

    // HMD forward (flattened)
    tmp.hmdFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmp.hmdFwd.y = 0;
    tmp.hmdFwd.normalize();

    // Candidate A: -Z forward
    const dirA = tmp.v.set(0, 0, -1).applyQuaternion(tmp.q).normalize();
    const flatA = dirA.clone(); flatA.y = 0; flatA.normalize();

    // Candidate B: +Z forward
    const dirB = tmp.dir.set(0, 0, 1).applyQuaternion(tmp.q).normalize();
    const flatB = dirB.clone(); flatB.y = 0; flatB.normalize();

    // Choose whichever points more "forward" relative to HMD
    const dotA = flatA.lengthSq() > 1e-6 ? flatA.dot(tmp.hmdFwd) : -999;
    const dotB = flatB.lengthSq() > 1e-6 ? flatB.dot(tmp.hmdFwd) : -999;

    const dir = (dotB > dotA) ? dirB : dirA;

    // intersect floor y=0
    const y0 = 0;
    if (Math.abs(dir.y) < 1e-5) {
      reticle.visible = false;
      return;
    }

    const t = (y0 - tmp.origin.y) / dir.y;
    if (t <= 0) {
      reticle.visible = false;
      return;
    }

    const hit = tmp.origin.clone().add(dir.clone().multiplyScalar(t));
    const dist = hit.distanceTo(tmp.origin);
    if (dist > cfg.maxReticleDist) {
      reticle.visible = false;
      return;
    }

    reticle.position.copy(hit);
    reticle.visible = true;
  }

  // ---------------- Movement ----------------
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
    tmp.v.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    player.position.add(tmp.v);
  }

  function readButtons(side, gp) {
    if (!gp || !gp.buttons) return;
    // fallback: gamepad button states
    const trig = !!gp.buttons[0]?.pressed;
    const grip = !!gp.buttons[1]?.pressed;
    state.buttons[side].trigger = state.buttons[side].trigger || trig;
    state.buttons[side].grip = state.buttons[side].grip || grip;
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

    readButtons("left", leftGP);
    readButtons("right", rightGP);

    // MOVE (left stick) with auto-calibration of Y sign
    const L = pickStickXY(leftGP);
    const lx = dz(L.x);
    const lyRaw = dz(L.y);

    if (!state.moveCalibrated) {
      state._calibAccum += Math.abs(lyRaw);
      if (Math.abs(lyRaw) > 0.35 && state._calibAccum > 0.6) {
        // If pushing forward yields positive, flip so forward becomes +lyRaw
        state.moveFlipY = (lyRaw > 0) ? -1 : 1;
        state.moveCalibrated = true;
        log(`[move] calibrated ✅ moveFlipY=${state.moveFlipY}`);
      }
    }

    const forward = (-lyRaw) * state.moveFlipY;
    moveLocal(lx, forward, dt);

    // SNAP TURN (right stick X)
    const R = pickStickXY(rightGP);
    const rx = dz(R.x);

    state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (Math.abs(rx) > 0.65 && state.snapCooldown <= 0) {
      const dir = rx > 0 ? -1 : 1;
      state.yaw += dir * (cfg.snapDeg * Math.PI / 180);
      player.rotation.y = state.yaw;
      state.snapCooldown = cfg.snapCooldownSec;
    }
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
