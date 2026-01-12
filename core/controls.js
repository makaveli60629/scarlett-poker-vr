// /core/controls.js — Scarlett Controls v7 (QUEST CONTROLLERS FIX) FULL
// ✅ Shows controllers/lasers in XR (sessionstart attaches rays)
// ✅ Logs XR inputSources so we KNOW if Quest sees controllers
// ✅ Reads sticks from either axes [0/1] or [2/3]
// ✅ Moves correct rig

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deadzone = (v, dz = 0.12) => (Math.abs(v) < dz ? 0 : v);

function getMoveRig(ctx) {
  return ctx.playerRig || ctx.player || ctx.camera?.parent || ctx.camera;
}

function getSession(renderer) {
  try { return renderer?.xr?.getSession?.() || null; } catch { return null; }
}

function readAxesSmart(gp) {
  const a = gp?.axes || [];
  if (a.length < 2) return { x: 0, y: 0 };

  const p01 = { x: a[0] ?? 0, y: a[1] ?? 0, e: Math.abs(a[0] ?? 0) + Math.abs(a[1] ?? 0) };
  const p23 = { x: a[2] ?? 0, y: a[3] ?? 0, e: Math.abs(a[2] ?? 0) + Math.abs(a[3] ?? 0) };

  if (a.length >= 4 && p23.e > p01.e + 0.01) return { x: p23.x, y: p23.y };
  return { x: p01.x, y: p01.y };
}

function makeLaser(THREE, color) {
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

export function installControls(ctx) {
  const { THREE, renderer, log } = ctx;

  ctx.__controls = {
    isXR: false,
    moveSpeed: 3.25,
    strafeSpeed: 3.0,
    turnSpeed: 2.6,

    snapTurn: true,
    snapAngle: Math.PI / 6,
    snapCooldown: 220,
    lastSnapAt: 0,

    laserL: null,
    laserR: null,

    lastBeat: 0,
  };

  const hud = document.getElementById("hud");
  const sticks = document.getElementById("sticks");
  const setUIForXR = (isXR) => {
    if (hud) hud.style.display = isXR ? "none" : "";
    if (sticks) sticks.style.display = isXR ? "none" : "";
  };

  renderer.xr.addEventListener("sessionstart", () => {
    ctx.__controls.isXR = true;
    setUIForXR(true);
    log?.("[xr] sessionstart ✅");

    // Attach lasers to controllers 0/1 (Quest standard)
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);

    // Parent to rig so they follow you
    const rig = getMoveRig(ctx);
    if (rig) { rig.add(c0); rig.add(c1); }

    ctx.__controls.laserL = makeLaser(THREE, 0x7fe7ff);
    ctx.__controls.laserR = makeLaser(THREE, 0xff2d7a);
    c0.add(ctx.__controls.laserL);
    c1.add(ctx.__controls.laserR);

    // Log inputSources list (this is the KEY debug)
    const sess = getSession(renderer);
    const srcs = sess?.inputSources || [];
    log?.(`[xr] inputSources=${srcs.length}`);
    srcs.forEach((s, i) => {
      log?.(`[xr] src#${i} hand=${s.handedness} gp=${!!s.gamepad} axes=${s.gamepad?.axes?.length || 0}`);
    });
  });

  renderer.xr.addEventListener("sessionend", () => {
    ctx.__controls.isXR = false;
    setUIForXR(false);
    log?.("[xr] sessionend ✅");
  });

  setUIForXR(false);
}

export function updateControls(ctx, dt) {
  const C = ctx.__controls;
  if (!C) return;

  if (!C.isXR) { ctx.log?.diag?.(ctx, dt); return; }

  const rig = getMoveRig(ctx);
  if (!rig) return;

  const sess = getSession(ctx.renderer);
  const srcs = sess?.inputSources || [];

  let left = null, right = null;
  for (const s of srcs) {
    if (s?.handedness === "left") left = s;
    if (s?.handedness === "right") right = s;
  }

  const LA = readAxesSmart(left?.gamepad);
  const RA = readAxesSmart(right?.gamepad);

  const lx = deadzone(LA.x, 0.15);
  const ly = deadzone(LA.y, 0.15);
  const rx = deadzone(RA.x, 0.15);

  const forward = -ly * C.moveSpeed;
  const strafe = lx * C.strafeSpeed;

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const dx = (strafe * cos) + (forward * sin);
  const dz = (-strafe * sin) + (forward * cos);

  rig.position.x += dx * dt;
  rig.position.z += dz * dt;

  if (C.snapTurn) {
    const now = performance.now();
    if (Math.abs(rx) > 0.70 && (now - C.lastSnapAt) > C.snapCooldown) {
      rig.rotation.y += (rx > 0 ? -1 : 1) * C.snapAngle;
      C.lastSnapAt = now;
    }
  } else {
    rig.rotation.y += (-rx * C.turnSpeed) * dt;
  }

  // Heartbeat so we know sticks are being read
  const t = performance.now();
  if (t - C.lastBeat > 1200) {
    C.lastBeat = t;
    ctx.log?.(`[xr] axes L=(${LA.x.toFixed(2)},${LA.y.toFixed(2)}) R=(${RA.x.toFixed(2)},${RA.y.toFixed(2)})`);
  }

  ctx.log?.diag?.(ctx, dt);
}
