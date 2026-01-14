// /js/core/controls.js — ScarlettVR CORE Controls v1.0 (FULL)
// ✅ Quest controllers supported (XR controllers)
// ✅ Left stick: move/strafe (forward/back correct)
// ✅ Right stick: snap turn 45° (works reliably)
// ✅ Laser rays: always forward (-Z), fixes "pointing up" bug
// ✅ Reticle: green ring only when ray hits floor plane (y=0)
// ✅ Trigger/grip listeners included
// ✅ Debug helpers for HUD

export const Controls = (() => {
  let THREE, renderer, camera, player;

  const state = {
    enabled: true,

    // locomotion
    moveSpeed: 2.0,       // meters/sec in XR
    strafeSpeed: 2.0,
    deadzone: 0.18,

    // turning
    snapAngle: Math.PI / 4,   // 45°
    snapCooldown: 0.22,
    _snapTimer: 0,

    // input
    pads: { left: null, right: null },
    axes: { lx: 0, ly: 0, rx: 0, ry: 0 },
    btns: {
      left: { trigger: 0, squeeze: 0 },
      right: { trigger: 0, squeeze: 0 }
    },

    // visuals
    controllers: [],
    rays: [],
    reticles: []
  };

  // ---------- helpers ----------
  const clampDeadzone = (v, dz) => (Math.abs(v) < dz ? 0 : v);

  function getGamepadByHand(handedness) {
    const session = renderer?.xr?.getSession?.();
    if (!session) return null;

    for (const src of session.inputSources || []) {
      if (src && src.handedness === handedness && src.gamepad) return src.gamepad;
    }
    return null;
  }

  function makeRay() {
    // Ray points down -Z in controller local space.
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.6)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_RAY";
    return line;
  }

  function makeReticle() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.09, 36),
      new THREE.MeshBasicMaterial({
        color: 0x4cff4c,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.name = "XR_RETICLE";
    return ring;
  }

  function worldRayFromController(ctrl) {
    // Controller forward is -Z.
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    ctrl.getWorldPosition(origin);
    dir.applyQuaternion(ctrl.getWorldQuaternion(new THREE.Quaternion())).normalize();

    return { origin, dir };
  }

  function intersectFloorPlane(origin, dir, y = 0) {
    // Ray/plane intersection for plane y = constant.
    // origin + t*dir, solve for y.
    const denom = dir.y;
    if (Math.abs(denom) < 1e-5) return null;

    const t = (y - origin.y) / denom;
    if (t <= 0) return null;

    return origin.clone().addScaledVector(dir, t);
  }

  function forwardOnFloor() {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0;
    const len = fwd.length();
    if (len < 1e-6) return new THREE.Vector3(0, 0, -1);
    return fwd.multiplyScalar(1 / len);
  }

  function rightOnFloor() {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    const len = right.length();
    if (len < 1e-6) return new THREE.Vector3(1, 0, 0);
    return right.multiplyScalar(1 / len);
  }

  // ---------- init ----------
  function init(ctx) {
    THREE = ctx.THREE;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;

    // Create 2 controllers (0,1) and attach rays.
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);

    c0.name = "XR_CONTROLLER_0";
    c1.name = "XR_CONTROLLER_1";

    const ray0 = makeRay();
    const ray1 = makeRay();
    c0.add(ray0);
    c1.add(ray1);

    const ret0 = makeReticle();
    const ret1 = makeReticle();

    // reticles are world-space objects (not parented to controllers)
    player.parent?.add?.(ret0) || ctx.scene?.add?.(ret0);
    player.parent?.add?.(ret1) || ctx.scene?.add?.(ret1);

    // Basic button events (will work on Quest)
    c0.addEventListener("selectstart", () => (state.btns.left.trigger = 1));
    c0.addEventListener("selectend", () => (state.btns.left.trigger = 0));
    c1.addEventListener("selectstart", () => (state.btns.right.trigger = 1));
    c1.addEventListener("selectend", () => (state.btns.right.trigger = 0));

    c0.addEventListener("squeezestart", () => (state.btns.left.squeeze = 1));
    c0.addEventListener("squeezeend", () => (state.btns.left.squeeze = 0));
    c1.addEventListener("squeezestart", () => (state.btns.right.squeeze = 1));
    c1.addEventListener("squeezeend", () => (state.btns.right.squeeze = 0));

    // Add to player rig
    player.add(c0);
    player.add(c1);

    state.controllers = [c0, c1];
    state.rays = [ray0, ray1];
    state.reticles = [ret0, ret1];

    // If your rig scale is weird, keep the controllers normal size
    c0.scale.set(1, 1, 1);
    c1.scale.set(1, 1, 1);

    console.log("[core/controls] init ✅");
  }

  // ---------- update ----------
  function update(dt) {
    if (!state.enabled) return;

    // Pull gamepads each frame (Quest updates inputSources live)
    state.pads.left = getGamepadByHand("left");
    state.pads.right = getGamepadByHand("right");

    // Read axes safely
    const lp = state.pads.left;
    const rp = state.pads.right;

    // Standard mapping:
    // left stick: axes[0]=x, axes[1]=y
    // right stick: axes[2]=x, axes[3]=y (sometimes also [0],[1] depending device)
    let lx = lp?.axes?.[0] ?? 0;
    let ly = lp?.axes?.[1] ?? 0;

    let rx = rp?.axes?.[2] ?? rp?.axes?.[0] ?? 0;
    let ry = rp?.axes?.[3] ?? rp?.axes?.[1] ?? 0;

    // Deadzone
    lx = clampDeadzone(lx, state.deadzone);
    ly = clampDeadzone(ly, state.deadzone);
    rx = clampDeadzone(rx, state.deadzone);
    ry = clampDeadzone(ry, state.deadzone);

    // IMPORTANT FIX:
    // In WebXR, pushing stick "up" usually gives negative Y.
    // Forward must be (-ly), NOT (ly).
    state.axes.lx = lx;
    state.axes.ly = ly;
    state.axes.rx = rx;
    state.axes.ry = ry;

    // ---- locomotion (left stick) ----
    // forward/back
    const fwd = forwardOnFloor();
    const right = rightOnFloor();

    // forward amount: -ly (fixes your inverted forward/back)
    const forwardAmt = -ly;
    const strafeAmt = lx;

    if (Math.abs(forwardAmt) > 0 || Math.abs(strafeAmt) > 0) {
      player.position.addScaledVector(fwd, forwardAmt * state.moveSpeed * dt);
      player.position.addScaledVector(right, strafeAmt * state.strafeSpeed * dt);
    }

    // ---- snap turn (right stick X) ----
    state._snapTimer = Math.max(0, state._snapTimer - dt);
    if (state._snapTimer <= 0) {
      if (rx > 0.65) {
        player.rotation.y -= state.snapAngle;
        state._snapTimer = state.snapCooldown;
      } else if (rx < -0.65) {
        player.rotation.y += state.snapAngle;
        state._snapTimer = state.snapCooldown;
      }
    }

    // ---- lasers + reticle ----
    for (let i = 0; i < state.controllers.length; i++) {
      const ctrl = state.controllers[i];
      const ret = state.reticles[i];

      const { origin, dir } = worldRayFromController(ctrl);
      const hit = intersectFloorPlane(origin, dir, 0);

      if (hit) {
        ret.visible = true;
        ret.position.set(hit.x, 0.02, hit.z);
      } else {
        ret.visible = false;
      }
    }
  }

  function getPadDebug() {
    const L = state.pads.left;
    const R = state.pads.right;
    return `pads: L:${!!L} R:${!!R} axes: lx:${state.axes.lx.toFixed(2)} ly:${state.axes.ly.toFixed(2)} rx:${state.axes.rx.toFixed(2)} ry:${state.axes.ry.toFixed(2)}`;
  }

  function getButtonDebug() {
    return `btns: LT:${state.btns.left.trigger} LG:${state.btns.left.squeeze} RT:${state.btns.right.trigger} RG:${state.btns.right.squeeze}`;
  }

  return {
    init,
    update,
    getPadDebug,
    getButtonDebug
  };
})();
