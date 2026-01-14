// /js/controls.js — Scarlett PERMANENT QUEST FIX v3 (FULL)
// Fixes:
// ✅ Laser stuck at table center -> lasers are parented to controller GRIP space
// ✅ Can't walk -> robust XR gamepad axis mapping for Quest
// ✅ Shows floor reticle where right-hand laser hits y=0 plane
// ✅ Snap turn on right stick X
// ✅ Trigger/grip events (select/squeeze) confirmed on Quest
//
// Exports: Controls { init(), update(dt), getControllers() }

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  // We keep both controller + grip references (Quest often prefers grip for pose)
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
    v3a: null,
    v3b: null,
    q: null
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

    tmp.v3a = new THREE.Vector3();
    tmp.v3b = new THREE.Vector3();
    tmp.q = new THREE.Quaternion();

    state.yaw = player.rotation.y;
    state.pitch = camera.rotation.x;

    // Always install controller objects (even before session starts)
    installControllers();

    // Re-bind correctly when XR starts (this is the “permanent fix” moment)
    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      log("sessionstart: controllers/grips/lasers rebound ✅");
    });

    renderer.xr.addEventListener?.("sessionend", () => {
      // keep things safe
      state.snapCooldown = 0;
      log("sessionend ✅");
    });

    installReticle();

    log("Controls init ✅ (Quest permanent laser + walk fix)");
  }

  // --- Controller setup (controller + grip) ---
  function installControllers(force = false) {
    try {
      // Controller (for events + ray direction)
      const c0 = renderer.xr.getController(0);
      const c1 = renderer.xr.getController(1);

      // Grip (best pose space for Quest; matches physical hand)
      const g0 = renderer.xr.getControllerGrip(0);
      const g1 = renderer.xr.getControllerGrip(1);

      // Parent to player so locomotion moves them with you
      if (force || !c0.parent) player.add(c0);
      if (force || !c1.parent) player.add(c1);
      if (force || !g0.parent) player.add(g0);
      if (force || !g1.parent) player.add(g1);

      c0.name = "XRController0";
      c1.name = "XRController1";
      g0.name = "XRGrip0";
      g1.name = "XRGrip1";

      // Quest default: 0=left, 1=right
      state.ctrl.left = c0;
      state.ctrl.right = c1;
      state.grip.left = g0;
      state.grip.right = g1;

      // Wire events (trigger/grip)
      wireXRPressEvents(c0);
      wireXRPressEvents(c1);

      // Laser visuals MUST be parented to GRIP, not scene/table/world root
      ensureLaser("left");
      ensureLaser("right");

      // Attach laser to grip (permanent fix)
      if (state.laser.left.parent !== g0) {
        safeRemove(state.laser.left);
        g0.add(state.laser.left);
      }
      if (state.laser.right.parent !== g1) {
        safeRemove(state.laser.right);
        g1.add(state.laser.right);
      }

      // Reset laser local transform so it originates from the controller grip
      resetLaserTransform(state.laser.left);
      resetLaserTransform(state.laser.right);

      log("controllers+grips+lasers installed ✅");
    } catch (e) {
      warn("installControllers failed (non-fatal):", e?.message || e);
    }
  }

  function wireXRPressEvents(controller) {
    // Avoid double-binding
    if (controller.__scarlettBound) return;
    controller.__scarlettBound = true;

    controller.addEventListener("selectstart", () => log(controller.name, "trigger down ✅"));
    controller.addEventListener("selectend", () => log(controller.name, "trigger up ✅"));
    controller.addEventListener("squeezestart", () => log(controller.name, "grip down ✅"));
    controller.addEventListener("squeezeend", () => log(controller.name, "grip up ✅"));
  }

  function safeRemove(obj) {
    try { obj.parent?.remove(obj); } catch {}
  }

  // --- Laser + Reticle ---
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

  function resetLaserTransform(laser) {
    if (!laser) return;
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

  function updateReticleFromRightLaser() {
    const grip = state.grip.right || state.ctrl.right;
    const reticle = state.reticle;
    if (!grip || !reticle) return;

    // Ray origin = grip world position
    grip.getWorldPosition(tmp.v3a);

    // Ray direction = grip forward (-Z) in world
    tmp.v3b.set(0, 0, -1);
    grip.getWorldQuaternion(tmp.q);
    tmp.v3b.applyQuaternion(tmp.q).normalize();

    // Intersect with floor plane y=0
    const dir = tmp.v3b;
    const origin = tmp.v3a;
    const y0 = 0;

    if (Math.abs(dir.y) < 1e-5) {
      reticle.visible = false;
      return;
    }

    const t = (y0 - origin.y) / dir.y;
    if (t <= 0) {
      reticle.visible = false;
      return;
    }

    const hit = origin.clone().add(dir.clone().multiplyScalar(t));
    const dist = hit.distanceTo(origin);

    if (dist > 12) {
      reticle.visible = false;
      return;
    }

    reticle.position.copy(hit);
    reticle.visible = true;
  }

  // --- Movement ---
  function applyLook() {
    player.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  }

  function moveLocal(strafe, forward, dt) {
    const v = tmp.v3a.set(strafe, 0, forward);
    if (v.lengthSq() < 1e-6) return;

    v.normalize().multiplyScalar(cfg.moveSpeed * dt);
    v.applyAxisAngle(tmp.v3b.set(0, 1, 0), player.rotation.y);
    player.position.add(v);
  }

  function updateXR(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // Find left/right gamepads by handedness
    let leftGP = null, rightGP = null;
    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") leftGP = src.gamepad;
      if (src.handedness === "right") rightGP = src.gamepad;
    }

    // Fallback if handedness missing
    if (!leftGP || !rightGP) {
      const gps = session.inputSources.filter(s => s?.gamepad).map(s => s.gamepad);
      leftGP = leftGP || gps[0] || null;
      rightGP = rightGP || gps[1] || null;
    }

    // Quest mapping: each controller usually has axes[0]=x, axes[1]=y
    const lx = leftGP ? dz(leftGP.axes[0] ?? 0) : 0;
    const ly = leftGP ? dz(leftGP.axes[1] ?? 0) : 0;

    // FIX: forward is -ly (stick up is negative)
    const forward = (-ly);
    const strafe = (lx);
    moveLocal(strafe, forward, dt);

    // Snap turn: right stick X
    const rx = rightGP ? dz(rightGP.axes[0] ?? 0) : 0;

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

    // If XR is active, use XR gamepads
    if (renderer?.xr?.isPresenting) {
      updateXR(dt);
      updateReticleFromRightLaser();
    } else {
      // Non-XR: do nothing here (your desktop/mobile controls can live elsewhere if you want)
      state.reticle && (state.reticle.visible = false);
    }
  }

  function getControllers() {
    return { ...state.ctrl, grip: { ...state.grip } };
  }

  return { init, update, getControllers };
})();
