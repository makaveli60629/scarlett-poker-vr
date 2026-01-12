// /core/controls.js — Scarlett Controls v6 (QUEST FIXED) FULL
// ✅ Quest: left stick = strafe/forward, right stick = turn (and optional snap turn)
// ✅ Auto-detect axes layout (0/1 vs 2/3)
// ✅ Finds XR inputSources by handedness (reliable)
// ✅ Moves correct rig (playerRig/player/camera parent)
// ✅ Android sticks still work in flat mode
// ✅ Hides DOM HUD/sticks during XR to avoid overlap

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deadzone = (v, dz = 0.12) => (Math.abs(v) < dz ? 0 : v);

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function ensureSticksUI() {
  if (document.getElementById("sticks")) return;

  const wrap = document.createElement("div");
  wrap.id = "sticks";
  wrap.style.position = "fixed";
  wrap.style.left = "0";
  wrap.style.right = "0";
  wrap.style.bottom = "0";
  wrap.style.height = "45vh";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "9998";

  const mk = (side) => {
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.bottom = "18px";
    base.style.width = "150px";
    base.style.height = "150px";
    base.style.borderRadius = "999px";
    base.style.border = "1px solid rgba(255,255,255,0.18)";
    base.style.background = "rgba(0,0,0,0.22)";
    base.style.backdropFilter = "blur(6px)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";
    base.style.userSelect = "none";
    base.style.left = side === "L" ? "18px" : "";
    base.style.right = side === "R" ? "18px" : "";

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "62px";
    nub.style.height = "62px";
    nub.style.marginLeft = "-31px";
    nub.style.marginTop = "-31px";
    nub.style.borderRadius = "999px";
    nub.style.border = "1px solid rgba(255,255,255,0.22)";
    nub.style.background = "rgba(127,231,255,0.14)";
    nub.style.pointerEvents = "none";
    base.appendChild(nub);

    const label = document.createElement("div");
    label.textContent = side === "L" ? "MOVE" : "LOOK";
    label.style.position = "absolute";
    label.style.left = "0";
    label.style.right = "0";
    label.style.top = "-22px";
    label.style.textAlign = "center";
    label.style.font = "700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    label.style.color = "rgba(232,236,255,0.85)";
    base.appendChild(label);

    wrap.appendChild(base);
    return { base, nub };
  };

  const L = mk("L");
  const R = mk("R");
  document.body.appendChild(wrap);
  return { wrap, L, R };
}

function getMoveRig(ctx) {
  return ctx.playerRig || ctx.player || ctx.camera?.parent || ctx.camera;
}

function getXRSession(renderer) {
  try { return renderer?.xr?.getSession?.() || null; } catch { return null; }
}

function findInputSources(renderer) {
  const sess = getXRSession(renderer);
  const srcs = sess?.inputSources || [];
  let left = null, right = null;
  for (const s of srcs) {
    if (s?.handedness === "left") left = s;
    if (s?.handedness === "right") right = s;
  }
  return { left, right };
}

function readAxesSmart(gamepad) {
  const a = gamepad?.axes || [];
  if (!a || a.length < 2) return { x: 0, y: 0 };

  // Choose the pair with the most “energy” so it works across runtimes
  const p01 = { x: a[0] ?? 0, y: a[1] ?? 0, e: Math.abs(a[0] ?? 0) + Math.abs(a[1] ?? 0) };
  const p23 = { x: a[2] ?? 0, y: a[3] ?? 0, e: Math.abs(a[2] ?? 0) + Math.abs(a[3] ?? 0) };

  // If 2/3 exists and is more active, use it; else use 0/1
  if (a.length >= 4 && p23.e > p01.e + 0.01) return { x: p23.x, y: p23.y };
  return { x: p01.x, y: p01.y };
}

export function installControls(ctx) {
  const { renderer, log } = ctx;

  ctx.__controls = {
    isXR: false,
    mobile: isMobileUA(),

    // Android sticks
    L: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },
    R: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },

    // Look state
    yaw: 0,
    pitch: 0,

    // Speeds
    moveSpeed: 3.25,
    strafeSpeed: 3.0,
    turnSpeed: 2.6,

    // Snap turn
    snapTurn: true,
    snapAngle: Math.PI / 6,     // 30°
    snapCooldown: 220,
    lastSnapAt: 0,

    // Debug
    lastXRRead: 0,
  };

  // Hide DOM UI in XR
  const hud = document.getElementById("hud");
  const sticks = document.getElementById("sticks");
  const setUIForXR = (isXR) => {
    if (hud) hud.style.display = isXR ? "none" : "";
    if (sticks) sticks.style.display = isXR ? "none" : "";
  };

  renderer.xr.addEventListener("sessionstart", () => {
    ctx.__controls.isXR = true;
    setUIForXR(true);
    log?.("[xr] sessionstart ✅ (Quest controls active)");
  });

  renderer.xr.addEventListener("sessionend", () => {
    ctx.__controls.isXR = false;
    setUIForXR(false);
    log?.("[xr] sessionend ✅");
  });

  // Android sticks
  const sticksUI = ctx.__controls.mobile ? ensureSticksUI() : null;
  if (sticksUI) {
    const bindStick = (stickObj, state) => {
      const base = stickObj.base;
      const nub = stickObj.nub;
      const radius = 55;

      const onDown = (e) => {
        if (ctx.__controls.isXR) return;
        state.active = true;
        state.id = e.pointerId;
        base.setPointerCapture(e.pointerId);
        state.sx = e.clientX;
        state.sy = e.clientY;
        state.x = 0; state.y = 0;
      };

      const onMove = (e) => {
        if (!state.active || e.pointerId !== state.id) return;
        const dx = e.clientX - state.sx;
        const dy = e.clientY - state.sy;
        const nx = clamp(dx / radius, -1, 1);
        const ny = clamp(dy / radius, -1, 1);
        state.x = nx; state.y = ny;
        nub.style.transform = `translate(${nx * radius}px, ${ny * radius}px)`;
      };

      const onUp = (e) => {
        if (e.pointerId !== state.id) return;
        state.active = false;
        state.id = null;
        state.x = 0; state.y = 0;
        nub.style.transform = `translate(0px, 0px)`;
      };

      base.addEventListener("pointerdown", onDown);
      base.addEventListener("pointermove", onMove);
      base.addEventListener("pointerup", onUp);
      base.addEventListener("pointercancel", onUp);
      base.addEventListener("pointerleave", onUp);
    };

    bindStick(sticksUI.L, ctx.__controls.L);
    bindStick(sticksUI.R, ctx.__controls.R);
    log?.("[android] sticks ready ✅");
  }

  setUIForXR(false);
}

export function updateControls(ctx, dt) {
  const C = ctx.__controls;
  if (!C) return;

  // Respect seated lock if you use it elsewhere
  if (window.__SEATED_MODE) return;

  const rig = getMoveRig(ctx);
  if (!rig) return;

  // --- XR (Quest) locomotion ---
  if (C.isXR) {
    const { renderer, camera, log } = ctx;
    const { left, right } = findInputSources(renderer);

    const LA = readAxesSmart(left?.gamepad);
    const RA = readAxesSmart(right?.gamepad);

    // Left stick move
    const lx = deadzone(LA.x, 0.15);
    const ly = deadzone(LA.y, 0.15);

    // Right stick turn
    const rx = deadzone(RA.x, 0.15);

    const forward = -ly * C.moveSpeed;
    const strafe  =  lx * C.strafeSpeed;

    // Movement relative to *camera yaw* (so it feels natural)
    // Compute yaw from camera quaternion without depending on THREE helpers here:
    const yaw = rig.rotation.y; // keep rig yaw as source of truth
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    const dx = (strafe * cos) + (forward * sin);
    const dz = (-strafe * sin) + (forward * cos);

    rig.position.x += dx * dt;
    rig.position.z += dz * dt;

    // Turning (snap by default; feels better in VR)
    if (C.snapTurn) {
      const now = performance.now();
      if (Math.abs(rx) > 0.70 && (now - C.lastSnapAt) > C.snapCooldown) {
        rig.rotation.y += (rx > 0 ? -1 : 1) * C.snapAngle;
        C.lastSnapAt = now;
      }
    } else {
      rig.rotation.y += (-rx * C.turnSpeed) * dt;
    }

    // Log a tiny heartbeat sometimes so we know sticks are being read
    const t = performance.now();
    if (t - C.lastXRRead > 1500) {
      C.lastXRRead = t;
      log?.(`[xr] axes L=(${LA.x.toFixed(2)},${LA.y.toFixed(2)}) R=(${RA.x.toFixed(2)},${RA.y.toFixed(2)})`);
    }

    ctx.log?.diag?.(ctx, dt);
    return;
  }

  // --- Flat Android locomotion ---
  if (!C.isXR && C.mobile) {
    const lx = deadzone(C.L.x, 0.12);
    const ly = deadzone(C.L.y, 0.12);
    const rx = deadzone(C.R.x, 0.12);
    const ry = deadzone(C.R.y, 0.12);

    C.yaw -= rx * 2.3 * dt;
    C.pitch -= ry * 1.8 * dt;
    C.pitch = clamp(C.pitch, -1.1, 1.1);

    rig.rotation.y = C.yaw;
    if (ctx.camera) ctx.camera.rotation.x = C.pitch;

    const forward = -ly * C.moveSpeed;
    const strafe  =  lx * C.strafeSpeed;

    const sin = Math.sin(rig.rotation.y);
    const cos = Math.cos(rig.rotation.y);

    const dx = (strafe * cos) + (forward * sin);
    const dz = (-strafe * sin) + (forward * cos);

    rig.position.x += dx * dt;
    rig.position.z += dz * dt;

    ctx.log?.diag?.(ctx, dt);
  }
    }
