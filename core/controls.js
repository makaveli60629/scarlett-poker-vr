// /core/controls.js — Scarlett Controls (FULL)
// ✅ Android STIX overlay (visible)
// ✅ Android: left stick = move, right stick = turn, drag look (non-XR)
// ✅ XR: left stick = strafe, right stick = forward/back + turn (Quest friendly)
// ✅ Laser + Teleport ring using ctx.worldState.colliders

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz = 0.12) { return Math.abs(v) < dz ? 0 : v; }
function isMobileUA() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

const state = {
  isXR: false,

  // XR locomotion tuning
  locomotion: {
    speed: 3.25,
    strafeSpeed: 3.0,
    turnSpeed: 2.8,
    snapTurn: false,
    snapAngle: Math.PI / 6,
    snapCooldown: 220,
    lastSnapAt: 0,
    invertForward: false, // set true if forward/back reversed for you
  },

  // Teleport
  teleport: {
    active: true,
    ring: null,
    target: null,
    valid: false,
    lastAt: 0,
    cooldown: 220,
    raycaster: null,
  },

  // Android sticks
  android: {
    enabled: false,
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
    look: { yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 },
    ui: null,
  }
};

function makeLaser(THREE, color = 0x7fe7ff) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 14;
  line.name = "LaserLine";
  return line;
}

function ensureTeleportRing(ctx) {
  if (state.teleport.ring) return;
  const { THREE, scene } = ctx;

  const g = new THREE.RingGeometry(0.22, 0.30, 28);
  const m = new THREE.MeshBasicMaterial({
    color: 0x7fe7ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.name = "TeleportRing";
  scene.add(ring);
  state.teleport.ring = ring;
}

function getXRInputSource(ctx, handedness) {
  const sess = ctx.renderer.xr.getSession();
  const sources = (sess && sess.inputSources) ? sess.inputSources : [];
  for (const s of sources) if (s && s.handedness === handedness) return s;
  return null;
}

function getGamepadAxes(ctx, handedness) {
  const src = getXRInputSource(ctx, handedness);
  const gp = src ? src.gamepad : null;
  const a = gp ? gp.axes : null;
  if (!a || !a.length) return { x: 0, y: 0 };

  // Quest often uses axes[2], axes[3]
  if (a.length >= 4) return { x: a[2] ?? 0, y: a[3] ?? 0 };
  return { x: a[0] ?? 0, y: a[1] ?? 0 };
}

function getYawQuat(ctx) {
  const { THREE, camera } = ctx;
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return out;
}

function computeTeleportTarget(ctx, fromObj) {
  const t = state.teleport;
  t.valid = false;
  t.target = null;
  if (!fromObj) return;

  const { THREE, camera } = ctx;
  const origin = fromObj.getWorldPosition(new THREE.Vector3());
  const dir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(fromObj.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();

  t.raycaster.set(origin, dir);
  t.raycaster.far = 30;

  const colliders = (ctx.worldState && ctx.worldState.colliders) ? ctx.worldState.colliders : [];
  const hits = t.raycaster.intersectObjects(colliders, true);
  if (!hits || hits.length === 0) return;

  const hit = hits[0];
  const n = hit.face && hit.face.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    : null;

  // reject walls/steep slopes
  if (n && n.y < 0.45) return;

  t.valid = true;
  t.target = hit.point.clone();
}

function showTeleportRing(ctx) {
  ensureTeleportRing(ctx);
  const t = state.teleport;

  if (!t.valid || !t.target) {
    if (t.ring) t.ring.visible = false;
    return;
  }
  t.ring.visible = true;
  t.ring.position.copy(t.target);
  t.ring.position.y += 0.02;
}

function doTeleport(ctx) {
  const t = state.teleport;
  const now = performance.now();
  if (now - t.lastAt < t.cooldown) return;
  if (!t.valid || !t.target) return;

  const camWorld = ctx.camera.getWorldPosition(new ctx.THREE.Vector3());
  const delta = t.target.clone().sub(camWorld);
  delta.y = 0;

  ctx.player.position.add(delta);
  t.lastAt = now;
}

function updateTeleportAim(ctx) {
  const t = state.teleport;
  if (!t.active) return;

  // don’t teleport if seated
  if (window.__SEATED_MODE) {
    if (t.ring) t.ring.visible = false;
    return;
  }

  const c = ctx.controllers.right || ctx.controllers.left;
  if (!c) return;

  computeTeleportTarget(ctx, c);
  showTeleportRing(ctx);
}

function attachControllers(ctx) {
  const { renderer, player, controllers, lasers, THREE } = ctx;

  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);

  controllers.left = c0;
  controllers.right = c1;

  lasers.left = makeLaser(THREE, 0x7fe7ff);
  lasers.right = makeLaser(THREE, 0xff2d7a);

  c0.add(lasers.left);
  c1.add(lasers.right);

  // Important: parent controllers to player so teleport/move keeps lasers with you
  player.add(c0);
  player.add(c1);

  // teleport on selectstart
  c0.addEventListener("selectstart", () => { if (state.teleport.valid) doTeleport(ctx); });
  c1.addEventListener("selectstart", () => { if (state.teleport.valid) doTeleport(ctx); });

  ctx.log && ctx.log("[controls] controllers ready ✅");
}

function installXRHooks(ctx) {
  ctx.renderer.xr.addEventListener("sessionstart", () => {
    state.isXR = true;
    ctx.log && ctx.log("[xr] sessionstart ✅");
  });
  ctx.renderer.xr.addEventListener("sessionend", () => {
    state.isXR = false;
    ctx.log && ctx.log("[xr] sessionend ✅");
  });
}

function installAndroidSticks(ctx) {
  if (!isMobileUA()) return;

  state.android.enabled = true;

  // UI container
  const ui = document.createElement("div");
  ui.id = "stix-ui";
  ui.style.position = "fixed";
  ui.style.left = "0";
  ui.style.right = "0";
  ui.style.top = "0";
  ui.style.bottom = "0";
  ui.style.pointerEvents = "none";
  ui.style.zIndex = "9998";
  document.body.appendChild(ui);

  // helper to make a stick
  const makeStick = (side) => {
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.bottom = "18px";
    wrap.style.width = "160px";
    wrap.style.height = "160px";
    wrap.style.borderRadius = "999px";
    wrap.style.border = "1px solid rgba(255,255,255,0.20)";
    wrap.style.background = "rgba(10,12,18,0.30)";
    wrap.style.backdropFilter = "blur(6px)";
    wrap.style.pointerEvents = "auto";
    wrap.style.touchAction = "none";

    if (side === "left") wrap.style.left = "18px";
    else wrap.style.right = "18px";

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "50%";
    knob.style.top = "50%";
    knob.style.width = "70px";
    knob.style.height = "70px";
    knob.style.borderRadius = "999px";
    knob.style.transform = "translate(-50%,-50%)";
    knob.style.border = "1px solid rgba(255,255,255,0.35)";
    knob.style.background = "rgba(127,231,255,0.18)";

    const label = document.createElement("div");
    label.textContent = side === "left" ? "MOVE" : "TURN";
    label.style.position = "absolute";
    label.style.top = "-22px";
    label.style.left = "0";
    label.style.right = "0";
    label.style.textAlign = "center";
    label.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    label.style.fontSize = "12px";
    label.style.color = "rgba(255,255,255,0.75)";
    label.style.pointerEvents = "none";

    wrap.appendChild(label);
    wrap.appendChild(knob);
    ui.appendChild(wrap);

    const data = side === "left" ? state.android.left : state.android.right;
    let active = false;
    let startX = 0, startY = 0;

    const setKnob = (dx, dy) => {
      const max = 52;
      const nx = clamp(dx / max, -1, 1);
      const ny = clamp(dy / max, -1, 1);

      data.x = nx;
      data.y = ny;

      const px = nx * max;
      const py = ny * max;
      knob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    };

    wrap.addEventListener("pointerdown", (e) => {
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      wrap.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setKnob(dx, dy);
    });

    const end = () => {
      active = false;
      data.x = 0; data.y = 0;
      knob.style.transform = "translate(-50%,-50%)";
    };

    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("pointerleave", () => { if (active) end(); });
  };

  makeStick("left");
  makeStick("right");

  // Drag-look anywhere not on sticks (only when NOT in XR)
  const el = ctx.renderer.domElement;
  el.style.touchAction = "none";

  el.addEventListener("pointerdown", (e) => {
    if (state.isXR) return;
    // ignore if starting inside stick areas (rough)
    const x = e.clientX;
    const y = e.clientY;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const inLeft = x < 220 && y > h - 220;
    const inRight = x > w - 220 && y > h - 220;
    if (inLeft || inRight) return;

    state.android.look.dragging = true;
    state.android.look.lastX = e.clientX;
    state.android.look.lastY = e.clientY;
  });

  window.addEventListener("pointerup", () => {
    state.android.look.dragging = false;
  });

  window.addEventListener("pointermove", (e) => {
    if (state.isXR) return;
    if (!state.android.look.dragging) return;

    const dx = e.clientX - state.android.look.lastX;
    const dy = e.clientY - state.android.look.lastY;
    state.android.look.lastX = e.clientX;
    state.android.look.lastY = e.clientY;

    state.android.look.yaw -= dx * 0.004;
    state.android.look.pitch -= dy * 0.003;
    state.android.look.pitch = clamp(state.android.look.pitch, -1.1, 1.1);

    ctx.camera.rotation.set(state.android.look.pitch, state.android.look.yaw, 0, "YXZ");
  });

  state.android.ui = ui;
  ctx.log && ctx.log("[android] STIX controls ready ✅");
}

export function installControls(ctx) {
  // raycaster for teleport
  state.teleport.raycaster = new ctx.THREE.Raycaster();

  installXRHooks(ctx);
  attachControllers(ctx);
  ensureTeleportRing(ctx);
  installAndroidSticks(ctx);
}

export function updateControls(ctx, dt) {
  // do nothing if seated mode
  if (window.__SEATED_MODE) {
    if (state.teleport.ring) state.teleport.ring.visible = false;
    return;
  }

  // always update teleport aim in XR (and it’s okay if colliders empty)
  if (state.isXR) updateTeleportAim(ctx);

  // Movement source
  let moveX = 0, moveZ = 0, turn = 0;

  if (state.isXR) {
    // XR: left = strafe, right = forward/back + turn
    const L = getGamepadAxes(ctx, "left");
    const R = getGamepadAxes(ctx, "right");

    const lx = deadzone(L.x, 0.15);
    const ly = deadzone(L.y, 0.15);
    const rx = deadzone(R.x, 0.15);
    const ry = deadzone(R.y, 0.15);

    moveX = lx * state.locomotion.strafeSpeed;

    // forward/back: many setups want inverted sign
    const forwardRaw = state.locomotion.invertForward ? (ry) : (-ry);
    moveZ = forwardRaw * state.locomotion.speed;

    // turn on right x
    turn = -rx * state.locomotion.turnSpeed;
  } else if (state.android.enabled) {
    // Android: left stick moves (x strafe, y forward)
    const ax = deadzone(state.android.left.x, 0.10);
    const ay = deadzone(state.android.left.y, 0.10);

    // Android: up on stick should move forward => negative y means up (depends on touch)
    // We built it so down is positive dy, so ay negative is up.
    moveX = ax * 3.0;
    moveZ = (-ay) * 3.2;

    // Android: right stick turns (x)
    const rx = deadzone(state.android.right.x, 0.10);
    turn = -rx * 2.6;
  }

  // apply movement in camera yaw space
  const yawQ = getYawQuat(ctx);
  const dir = new ctx.THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);
  ctx.player.position.addScaledVector(dir, dt);

  // apply turning
  if (Math.abs(turn) > 0.0001) {
    if (state.locomotion.snapTurn && state.isXR) {
      const now = performance.now();
      if (Math.abs(turn) > 0.7 && now - state.locomotion.lastSnapAt > state.locomotion.snapCooldown) {
        const sgn = turn > 0 ? 1 : -1;
        ctx.player.rotation.y += sgn * state.locomotion.snapAngle;
        state.locomotion.lastSnapAt = now;
      }
    } else {
      ctx.player.rotation.y += turn * dt;
    }
  }
                                                }
