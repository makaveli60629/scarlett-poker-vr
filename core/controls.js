// /core/controls.js — FULL XR + ANDROID STICKS (no fragile imports)
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz=0.12){ return Math.abs(v) < dz ? 0 : v; }

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// XR helpers (safe)
function getXRInputSource(renderer, handedness) {
  const sess = renderer?.xr?.getSession?.();
  const sources = sess?.inputSources || [];
  for (const s of sources) if (s?.handedness === handedness) return s;
  return null;
}

function getGamepadAxes(renderer, handedness) {
  const src = getXRInputSource(renderer, handedness);
  const gp = src?.gamepad;
  const a = gp?.axes || [];
  if (!a.length) return { x: 0, y: 0 };
  if (a.length >= 4) return { x: a[2] ?? 0, y: a[3] ?? 0 };
  return { x: a[0] ?? 0, y: a[1] ?? 0 };
}

// Touch sticks
function createStick(el, onChange){
  const nub = el.querySelector(".nub");
  const state = { active:false, id:null, cx:0, cy:0, x:0, y:0 };

  const setNub = (x,y) => {
    nub.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    state.x = 0; state.y = 0;
    nub.style.transform = `translate(-50%, -50%)`;
    onChange(0,0);
  };

  el.addEventListener("pointerdown", (e) => {
    state.active = true;
    state.id = e.pointerId;
    const r = el.getBoundingClientRect();
    state.cx = r.left + r.width/2;
    state.cy = r.top + r.height/2;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!state.active || e.pointerId !== state.id) return;
    const dx = e.clientX - state.cx;
    const dy = e.clientY - state.cy;
    const max = 52;
    const nx = clamp(dx, -max, max);
    const ny = clamp(dy, -max, max);
    const x = nx / max;
    const y = ny / max;
    state.x = x; state.y = y;

    // move nub inside circle
    nub.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    onChange(x, y);
  });

  el.addEventListener("pointerup", (e) => {
    if (e.pointerId !== state.id) return;
    state.active = false;
    state.id = null;
    reset();
  });

  el.addEventListener("pointercancel", () => {
    state.active = false;
    state.id = null;
    reset();
  });

  return { state, reset };
}

export function installControls(ctx) {
  const { THREE, renderer, player, camera, log } = ctx;

  ctx.isXR = false;
  renderer.xr.addEventListener("sessionstart", () => { ctx.isXR = true; log?.("[xr] sessionstart ✅"); });
  renderer.xr.addEventListener("sessionend", () => { ctx.isXR = false; log?.("[xr] sessionend ✅"); });

  // controller objects exist even on mobile; harmless
  ctx.controllers = {
    left: renderer.xr.getController(0),
    right: renderer.xr.getController(1),
  };
  player.add(ctx.controllers.left);
  player.add(ctx.controllers.right);

  // locomotion state
  ctx.locomotion = {
    speed: 3.0,
    strafe: 2.7,
    turnSpeed: 2.6,
    snapTurn: false,
    snapAngle: Math.PI / 6,
    snapCooldown: 220,
    lastSnapAt: 0,
  };

  // android stick state
  ctx.android = {
    enabled: isMobileUA(),
    left: { x:0, y:0 },
    right: { x:0, y:0 },
  };

  if (ctx.android.enabled) {
    const ui = document.getElementById("touchUI");
    const hint = document.getElementById("touchHint");
    ui?.classList.remove("hidden");
    hint?.classList.remove("hidden");

    const stickL = document.getElementById("stickLeft");
    const stickR = document.getElementById("stickRight");

    createStick(stickL, (x,y)=> { ctx.android.left.x = x; ctx.android.left.y = y; });
    createStick(stickR, (x,y)=> { ctx.android.right.x = x; ctx.android.right.y = y; });

    log?.("[android] sticks UI ✅");
  } else {
    log?.("[android] sticks UI (off) — not mobile");
  }

  // prevent HUD tilt (your request): lock camera roll always
  camera.rotation.order = "YXZ";
  ctx.__lockNoRoll = true;

  log?.("[controls] installed ✅");
}

function getYawQuat(THREE, camera) {
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
  return out;
}

export function updateControls(ctx, dt) {
  const { THREE, player, camera, renderer } = ctx;
  if (!player || !camera) return;

  // lock roll
  if (ctx.__lockNoRoll) camera.rotation.z = 0;

  // DO NOT move player when seated mode is set by world/table system
  if (window.__SEATED_MODE) return;

  let strafe = 0;
  let forward = 0;
  let turnX = 0;

  if (ctx.isXR) {
    const L = getGamepadAxes(renderer, "left");
    const R = getGamepadAxes(renderer, "right");

    const lx = deadzone(L.x, 0.15);
    const ry = deadzone(R.y, 0.15);
    const rx = deadzone(R.x, 0.15);

    strafe = lx;
    forward = ry;       // forward/back corrected
    turnX = -rx;        // turn
  } else if (ctx.android?.enabled) {
    // touch sticks: left = strafe, right = move+turn
    strafe = ctx.android.left.x;
    forward = -ctx.android.right.y;
    turnX = ctx.android.right.x;
  }

  // move
  const moveZ = forward * ctx.locomotion.speed;
  const moveX = strafe * ctx.locomotion.strafe;

  const yawQ = getYawQuat(THREE, camera);
  const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);
  player.position.addScaledVector(dir, dt);

  // turn
  const turn = turnX * ctx.locomotion.turnSpeed;
  player.rotation.y += turn * dt;
}
