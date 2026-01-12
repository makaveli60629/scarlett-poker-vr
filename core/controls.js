// /core/controls.js — Controls v4
// ✅ Android dual-stick VISIBLE + working
// ✅ Desktop WASD + mouse-look
// ✅ XR locomotion (simple gamepad axes)
// ✅ No HUD tilt (HUD is DOM-fixed in index.html)

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz = 0.12) { return Math.abs(v) < dz ? 0 : v; }

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getXRInputSource(renderer, handedness) {
  const sess = renderer.xr.getSession();
  const sources = sess?.inputSources || [];
  for (const s of sources) if (s?.handedness === handedness) return s;
  return null;
}

function getGamepadAxes(renderer, handedness) {
  const src = getXRInputSource(renderer, handedness);
  const gp = src?.gamepad;
  const a = gp?.axes || [];
  if (!a.length) return { x: 0, y: 0 };
  // Quest usually uses 2/3
  if (a.length >= 4) return { x: a[2] ?? 0, y: a[3] ?? 0 };
  return { x: a[0] ?? 0, y: a[1] ?? 0 };
}

function yawQuatFromCamera(THREE, camera) {
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return out;
}

function createStick(el, onMove) {
  const nub = el.querySelector(".nub");
  const baseRect = () => el.getBoundingClientRect();

  const state = { id: null, ax: 0, ay: 0, active: false };

  function setNub(px, py) {
    nub.style.transform = `translate(${px}px, ${py}px)`;
  }

  function end() {
    state.id = null;
    state.active = false;
    state.ax = 0; state.ay = 0;
    setNub(0, 0);
    onMove(0, 0, false);
  }

  el.addEventListener("pointerdown", (e) => {
    state.id = e.pointerId;
    state.active = true;
    el.setPointerCapture?.(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!state.active || e.pointerId !== state.id) return;
    const r = baseRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // max travel radius
    const maxR = r.width * 0.32;
    const dist = Math.hypot(dx, dy);
    const k = dist > maxR ? (maxR / dist) : 1;

    const mx = dx * k;
    const my = dy * k;

    // normalized axes [-1..1]
    const ax = clamp(mx / maxR, -1, 1);
    const ay = clamp(my / maxR, -1, 1);

    state.ax = ax;
    state.ay = ay;

    setNub(mx, my);
    onMove(ax, ay, true);
  });

  el.addEventListener("pointerup", (e) => {
    if (e.pointerId !== state.id) return;
    end();
  });
  el.addEventListener("pointercancel", end);

  return state;
}

export function installControls(ctx) {
  const { THREE, renderer, camera, player, log } = ctx;

  ctx.__controls = {
    isXR: false,

    // movement params
    moveSpeed: 3.2,
    strafeSpeed: 3.0,
    turnSpeed: 2.6,

    // android stick state
    stickL: { x: 0, y: 0, active: false },
    stickR: { x: 0, y: 0, active: false },

    // desktop
    keys: new Set(),
    mouseDown: false,
    yaw: 0,
    pitch: 0,
  };

  // XR session flags
  renderer.xr.addEventListener("sessionstart", () => {
    ctx.__controls.isXR = true;
    log?.("[xr] sessionstart ✅");
  });
  renderer.xr.addEventListener("sessionend", () => {
    ctx.__controls.isXR = false;
    log?.("[xr] sessionend ✅");
  });

  // Desktop WASD
  window.addEventListener("keydown", (e) => ctx.__controls.keys.add(e.code));
  window.addEventListener("keyup", (e) => ctx.__controls.keys.delete(e.code));

  // Desktop mouse look
  window.addEventListener("mousedown", () => (ctx.__controls.mouseDown = true));
  window.addEventListener("mouseup", () => (ctx.__controls.mouseDown = false));
  window.addEventListener("mousemove", (e) => {
    if (ctx.__controls.isXR) return;
    if (!ctx.__controls.mouseDown) return;
    ctx.__controls.yaw -= e.movementX * 0.004;
    ctx.__controls.pitch -= e.movementY * 0.003;
    ctx.__controls.pitch = clamp(ctx.__controls.pitch, -1.1, 1.1);
    camera.rotation.set(ctx.__controls.pitch, ctx.__controls.yaw, 0, "YXZ");
  });

  // Android sticks (visible only on mobile via CSS)
  const elL = document.getElementById("stickL");
  const elR = document.getElementById("stickR");

  if (isMobileUA() && elL && elR) {
    createStick(elL, (x, y, active) => {
      ctx.__controls.stickL.x = x;
      ctx.__controls.stickL.y = y;
      ctx.__controls.stickL.active = active;
    });

    createStick(elR, (x, y, active) => {
      ctx.__controls.stickR.x = x;
      ctx.__controls.stickR.y = y;
      ctx.__controls.stickR.active = active;
    });

    log?.("[android] sticks ready ✅ (MOVE + LOOK)");
  } else {
    log?.("[controls] desktop mode ✅ (WASD + mouse look)");
  }

  // Add simple lasers for XR (optional)
  function makeLaser(color = 0x7fe7ff) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 12;
    return line;
  }
  if (ctx.controllers?.left && ctx.controllers?.right) {
    ctx.controllers.left.add(makeLaser(0x7fe7ff));
    ctx.controllers.right.add(makeLaser(0xff2d7a));
    log?.("[xr] lasers ready ✅");
  }
}

export function updateControls(ctx, dt) {
  const { THREE, camera, player, renderer } = ctx;
  const c = ctx.__controls;
  if (!c) return;

  // XR locomotion (if in session)
  if (c.isXR) {
    const L = getGamepadAxes(renderer, "left");
    const R = getGamepadAxes(renderer, "right");

    const lx = deadzone(L.x, 0.15);
    const ly = deadzone(L.y, 0.15);
    const rx = deadzone(R.x, 0.15);
    const ry = deadzone(R.y, 0.15);

    const forward = ry; // forward/back
    const strafe = lx;  // strafe

    const yawQ = yawQuatFromCamera(THREE, camera);
    const dir = new THREE.Vector3(
      strafe * c.strafeSpeed,
      0,
      forward * c.moveSpeed
    ).applyQuaternion(yawQ);

    player.position.addScaledVector(dir, dt);
    player.rotation.y += (-rx * c.turnSpeed) * dt;
    return;
  }

  // Android sticks (if active)
  if (isMobileUA()) {
    const lx = deadzone(c.stickL.x, 0.10);
    const ly = deadzone(c.stickL.y, 0.10);
    const rx = deadzone(c.stickR.x, 0.10);
    const ry = deadzone(c.stickR.y, 0.10);

    // Move: left stick (up = forward)
    const forward = -ly;
    const strafe = lx;

    // Look: right stick (x = yaw, y = pitch)
    c.yaw -= rx * 2.2 * dt;
    c.pitch -= ry * 1.6 * dt;
    c.pitch = clamp(c.pitch, -1.1, 1.1);
    camera.rotation.set(c.pitch, c.yaw, 0, "YXZ");

    const yawQ = yawQuatFromCamera(THREE, camera);
    const dir = new THREE.Vector3(
      strafe * c.strafeSpeed,
      0,
      forward * c.moveSpeed
    ).applyQuaternion(yawQ);

    player.position.addScaledVector(dir, dt);
    return;
  }

  // Desktop WASD
  let forward = 0, strafe = 0;
  if (c.keys.has("KeyW")) forward += 1;
  if (c.keys.has("KeyS")) forward -= 1;
  if (c.keys.has("KeyA")) strafe -= 1;
  if (c.keys.has("KeyD")) strafe += 1;

  const yawQ = yawQuatFromCamera(THREE, camera);
  const dir = new THREE.Vector3(
    strafe * c.strafeSpeed,
    0,
    forward * c.moveSpeed
  ).applyQuaternion(yawQ);

  player.position.addScaledVector(dir, dt);
      }
