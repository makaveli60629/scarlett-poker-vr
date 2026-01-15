// /js/scarlett1/spine_android.js — Android Touch Controls (FULL • SAFE)
// ✅ Runs ONLY when not in XR presenting
// ✅ Left pad: move (forward/back/strafe)
// ✅ Right pad: look yaw
// ✅ Never touches Oculus controller mapping

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeDiv(cssText = "") {
  const d = document.createElement("div");
  d.style.cssText = cssText;
  return d;
}

function normStick(dx, dy, radius) {
  const dist = Math.hypot(dx, dy);
  const k = dist > radius ? (radius / dist) : 1;
  return { x: dx * k / radius, y: dy * k / radius, dist };
}

export async function init(ctx) {
  const log = ctx?.log || ((...a) => console.log("[android]", ...a));

  if (!isAndroid()) {
    log("not Android — skip");
    return;
  }

  // Need renderer + camera + rig
  const renderer = ctx?.renderer;
  const camera = ctx?.camera;
  const rig = ctx?.rig || ctx?.playerRig || ctx?.player || null;

  if (!renderer || !camera || !rig) {
    log("missing ctx parts — renderer/camera/rig required (skip)");
    return;
  }

  // Don’t run inside XR
  const xr = renderer.xr;
  const isPresenting = () => !!(xr && xr.isPresenting);

  // UI container
  const root = makeDiv(`
    position:fixed; inset:0; z-index:999998;
    pointer-events:none;
  `);

  // Small chip label
  const chip = makeDiv(`
    position:fixed; left:16px; bottom:210px;
    padding:10px 12px;
    background:rgba(10,20,40,0.65);
    border:1px solid rgba(120,160,255,0.25);
    border-radius:14px;
    color:#eaf2ff;
    font:600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
    pointer-events:none;
  `);
  chip.textContent = "Android Controls";
  root.appendChild(chip);

  // Pads
  const padSize = 180;
  const knobSize = 70;

  function makePad(left, bottom) {
    const pad = makeDiv(`
      position:fixed; width:${padSize}px; height:${padSize}px;
      left:${left}px; bottom:${bottom}px;
      border-radius:28px;
      background:rgba(10,20,40,0.35);
      border:1px solid rgba(120,160,255,0.20);
      box-shadow:0 30px 80px rgba(0,0,0,0.40);
      pointer-events:auto;
      touch-action:none;
      user-select:none;
    `);

    const knob = makeDiv(`
      position:absolute; width:${knobSize}px; height:${knobSize}px;
      left:${(padSize - knobSize)/2}px; top:${(padSize - knobSize)/2}px;
      border-radius:22px;
      background:rgba(40,80,160,0.35);
      border:1px solid rgba(140,190,255,0.25);
      backdrop-filter: blur(4px);
      pointer-events:none;
    `);

    pad.appendChild(knob);
    root.appendChild(pad);
    return { pad, knob };
  }

  const leftPad = makePad(18, 18);
  const rightPad = makePad(window.innerWidth - padSize - 18, 18);

  // Keep right pad on resize
  function onResize() {
    rightPad.pad.style.left = `${window.innerWidth - padSize - 18}px`;
  }
  window.addEventListener("resize", onResize);

  const state = {
    move: { x: 0, y: 0, active: false, id: null, cx: 0, cy: 0 },
    look: { x: 0, y: 0, active: false, id: null, cx: 0, cy: 0 },
    yaw: 0
  };

  function padDown(which, e, padObj) {
    if (isPresenting()) return; // XR takes priority
    const t = e.changedTouches[0];
    const rect = padObj.pad.getBoundingClientRect();
    which.active = true;
    which.id = t.identifier;
    which.cx = rect.left + rect.width / 2;
    which.cy = rect.top + rect.height / 2;
    e.preventDefault();
  }

  function padMove(which, e, padObj) {
    if (!which.active) return;
    if (isPresenting()) return;

    let t = null;
    for (const tt of e.changedTouches) if (tt.identifier === which.id) t = tt;
    if (!t) return;

    const dx = t.clientX - which.cx;
    const dy = t.clientY - which.cy;
    const radius = (padSize / 2) - 12;

    const s = normStick(dx, dy, radius);
    which.x = clamp(s.x, -1, 1);
    which.y = clamp(s.y, -1, 1);

    // knob visual
    const kx = (which.x * radius) + (padSize - knobSize)/2;
    const ky = (which.y * radius) + (padSize - knobSize)/2;
    padObj.knob.style.left = `${kx}px`;
    padObj.knob.style.top = `${ky}px`;

    e.preventDefault();
  }

  function padUp(which, e, padObj) {
    let t = null;
    for (const tt of e.changedTouches) if (tt.identifier === which.id) t = tt;
    if (!t) return;

    which.active = false;
    which.id = null;
    which.x = 0;
    which.y = 0;

    padObj.knob.style.left = `${(padSize - knobSize)/2}px`;
    padObj.knob.style.top = `${(padSize - knobSize)/2}px`;

    e.preventDefault();
  }

  // Bind touch
  leftPad.pad.addEventListener("touchstart", (e) => padDown(state.move, e, leftPad), { passive:false });
  leftPad.pad.addEventListener("touchmove", (e) => padMove(state.move, e, leftPad), { passive:false });
  leftPad.pad.addEventListener("touchend", (e) => padUp(state.move, e, leftPad), { passive:false });
  leftPad.pad.addEventListener("touchcancel", (e) => padUp(state.move, e, leftPad), { passive:false });

  rightPad.pad.addEventListener("touchstart", (e) => padDown(state.look, e, rightPad), { passive:false });
  rightPad.pad.addEventListener("touchmove", (e) => padMove(state.look, e, rightPad), { passive:false });
  rightPad.pad.addEventListener("touchend", (e) => padUp(state.look, e, rightPad), { passive:false });
  rightPad.pad.addEventListener("touchcancel", (e) => padUp(state.look, e, rightPad), { passive:false });

  document.body.appendChild(root);

  // Movement parameters
  const MOVE_SPEED = 2.2;      // m/s
  const STRAFE_SPEED = 2.0;    // m/s
  const LOOK_SPEED = 1.6;      // radians/s

  // Tick hookup (works with whatever loop you have)
  // If ctx.addTick exists, use it; else patch into ctx.tickFns.
  const addTick =
    ctx.addTick ||
    ((fn) => {
      ctx.__tickFns = ctx.__tickFns || [];
      ctx.__tickFns.push(fn);
    });

  addTick((dt) => {
    if (isPresenting()) {
      // Hide pads while in XR (so they don't block anything)
      root.style.display = "none";
      return;
    }
    root.style.display = "block";

    const d = Math.max(0, Math.min(dt || 0.016, 0.05));

    // LOOK: yaw
    const lookX = state.look.x; // left/right on right pad
    state.yaw += (-lookX) * LOOK_SPEED * d;

    // Apply yaw to rig (rotate around Y)
    rig.rotation.y = state.yaw;

    // MOVE: local forward/strafe relative to yaw
    const mx = state.move.x;          // strafe
    const my = state.move.y;          // forward/back (up is negative dy on screen, but our y is normalized)
    // We want pushing UP to move forward -> y negative should become +forward
    const forward = -my;
    const strafe = mx;

    // direction in world
    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);

    const vx = (strafe * cos + forward * sin) * STRAFE_SPEED;
    const vz = (forward * cos - strafe * sin) * MOVE_SPEED;

    rig.position.x += vx * d;
    rig.position.z += vz * d;
  });

  log("Android controls ready ✅ (non-XR only)");
      }
