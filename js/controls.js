// /js/controls.js — Scarlett PERMANENT QUEST FIX v4 (FULL)
// Fixes permanently:
// ✅ Laser stuck at table center -> lasers parented to controller GRIP space
// ✅ Green floor reticle from right hand (y=0)
// ✅ Movement works even when Quest axes are [0,1] OR [2,3]
// ✅ Snap turn on right stick X
// ✅ Trigger/grip events wired (select/squeeze)
// Export: Controls { init(), update(dt), getControllers() }

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const state = {
    ctrl: { left: null, right: null },
    grip: { left: null, right: null },
    laser: { left: null, right: null },
    reticle: null,
    yaw: 0,
    pitch: 0,
    snapCooldown: 0
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
    v: null
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
      log("sessionend ✅");
    });

    log("Controls init ✅ (v4)");
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

      // Parent to player rig so locomotion moves them with you
      if (force || !c0.parent) player.add(c0);
      if (force || !c1.parent) player.add(c1);
      if (force || !g0.parent) player.add(g0);
      if (force || !g1.parent) player.add(g1);

      // Quest default: 0=left, 1=right
      state.ctrl.left = c0;
      state.ctrl.right = c1;
      state.grip.left = g0;
      state.grip.right = g1;

      wireXRPressEvents(c0);
      wireXRPressEvents(c1);

      // Lasers must be on GRIP space
      ensureLaser("left");
      ensureLaser("right");

      attachLaserToGrip("left", g0);
      attachLaserToGrip("right", g1);

      log("controllers+grips+lasers installed ✅");
    } catch (e) {
      warn("installControllers failed (non-fatal):", e?.message || e);
    }
  }

  function wireXRPressEvents(controller) {
    if (controller.__scarlettBound) return;
    controller.__scarlettBound = true;

    controller.addEventListener("selectstart", () => log(controller.name, "trigger down ✅"));
    controller.addEventListener("selectend", () => log(controller.name, "trigger up ✅"));
    controller.addEventListener("squeezestart", () => log(controller.name, "grip down ✅"));
    controller.addEventListener("squeezeend", () => log(controller.name, "grip up ✅"));
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
    tmp.dir.set(0, 0, -1);
    grip.getWorldQuaternion(tmp.q);
    tmp.dir.applyQuaternion(tmp.q).normalize();

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

  // ---------------- Movement (PERMANENT axis fallback) ----------------
  function pickStickXY(gp) {
    if (!gp || !gp.axes) return { x: 0, y: 0 };
    const a = gp.axes;

    // candidate A
    const ax0 = a[0] ?? 0, ay0 = a[1] ?? 0;
    // candidate B
    const ax2 = a[2] ?? 0, ay3 = a[3] ?? 0;

    const magA = Math.abs(ax0) + Math.abs(ay0);
    const magB = Math.abs(ax2) + Math.abs(ay3);

    return (magB > magA) ? { x: ax2, y: ay3 } : { x: ax0, y: ay0 };
  }

  function applyLook() {
    player.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    camera.rotation.x = clamp(camera.rotation.x, -1.2, 1.2);
  }

  function moveLocal(strafe, forward, dt) {
    tmp.v.set(strafe, 0, forward);
    if (tmp.v.lengthSq() < 1e-6) return;

    tmp.v.normalize().multiplyScalar(cfg.moveSpeed * dt);
    tmp.v.applyAxisAngle(tmp.up, player.rotation.y);
    player.position.add(tmp.v);
  }

  function updateXR(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // find left/right gamepads
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

    // MOVE: left stick
    const L = pickStickXY(leftGP);
    const lx = dz(L.x);
    const ly = dz(L.y);

    // forward is -ly (stick up negative)
    moveLocal(lx, -ly, dt);

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

  return { init, update, getControllers };
})();
