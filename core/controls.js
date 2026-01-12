// /core/controls.js — Scarlett Controls v5 (FULL)
// ✅ Android dual sticks (MOVE + LOOK) in flat mode
// ✅ Moves the CORRECT rig (playerRig/player/camera parent fallback)
// ✅ HUD + sticks auto-hide in XR (no overlap)
// ✅ No teleport ring shown unless you explicitly enable it later

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deadzone = (v, dz = 0.12) => (Math.abs(v) < dz ? 0 : v);

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

  const stickBase = (side) => {
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.bottom = "18px";
    base.style.width = "150px";
    base.style.height = "150px";
    base.style.borderRadius = "999px";
    base.style.border = "1px solid rgba(255,255,255,0.18)";
    base.style.background = "rgba(0,0,0,0.20)";
    base.style.backdropFilter = "blur(6px)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";
    base.style.userSelect = "none";
    base.style.webkitUserSelect = "none";
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

  const L = stickBase("L");
  const R = stickBase("R");
  document.body.appendChild(wrap);
  return { wrap, L, R };
}

function getMoveRig(ctx) {
  // Move the thing that actually carries the camera.
  // Priority: ctx.playerRig -> ctx.player -> camera.parent -> ctx.camera
  return ctx.playerRig || ctx.player || ctx.camera?.parent || ctx.camera;
}

export function installControls(ctx) {
  const { renderer, log } = ctx;

  ctx.__controls = {
    isXR: false,
    mobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    L: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },
    R: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },
    yaw: 0,
    pitch: 0,
    moveSpeed: 3.4,
    strafeSpeed: 3.1,
  };

  const sticksUI = ctx.__controls.mobile ? ensureSticksUI() : null;

  // Hide DOM UI in XR (prevents overlap)
  const hud = document.getElementById("hud");
  const sticks = document.getElementById("sticks");
  function setUIForXR(isXR) {
    if (hud) hud.style.display = isXR ? "none" : "";
    if (sticks) sticks.style.display = isXR ? "none" : "";
  }

  renderer.xr.addEventListener("sessionstart", () => {
    ctx.__controls.isXR = true;
    setUIForXR(true);
    log?.("[xr] sessionstart ✅ (UI hidden)");
  });

  renderer.xr.addEventListener("sessionend", () => {
    ctx.__controls.isXR = false;
    setUIForXR(false);
    log?.("[xr] sessionend ✅ (UI restored)");
  });

  setUIForXR(false);

  // Android sticks input
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

        state.x = nx;
        state.y = ny;

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

    log?.("[android] sticks ready ✅ (MOVE + LOOK)");
  }
}

export function updateControls(ctx, dt) {
  const C = ctx.__controls;
  if (!C) return;

  // Flat mode only
  if (!C.isXR && C.mobile) {
    const rig = getMoveRig(ctx);
    if (!rig) return;

    const lx = deadzone(C.L.x, 0.12);
    const ly = deadzone(C.L.y, 0.12);
    const rx = deadzone(C.R.x, 0.12);
    const ry = deadzone(C.R.y, 0.12);

    // LOOK
    C.yaw -= rx * 2.3 * dt;
    C.pitch -= ry * 1.8 * dt;
    C.pitch = clamp(C.pitch, -1.1, 1.1);

    // Apply yaw to rig (so movement matches), pitch to camera
    rig.rotation.y = C.yaw;
    if (ctx.camera) ctx.camera.rotation.x = C.pitch;

    // MOVE relative to rig yaw
    const forward = -ly * C.moveSpeed;
    const strafe = lx * C.strafeSpeed;

    const sin = Math.sin(rig.rotation.y);
    const cos = Math.cos(rig.rotation.y);

    // forward along -Z in local space
    const dx = (strafe * cos) + (forward * sin);
    const dz = (-strafe * sin) + (forward * cos);

    rig.position.x += dx * dt;
    rig.position.z += dz * dt;
  }

  // diagnostics hook (from logger)
  ctx.log?.diag?.(ctx, dt);
                               }
