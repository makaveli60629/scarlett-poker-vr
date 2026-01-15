// /js/scarlett1/spine_android.js — Scarlett Android Touch Controls (FULL)
// Works on mobile Chrome so you can debug without Quest.
// DOES NOT break Quest: it auto-disables when an XR session is active.

export async function init(ctx) {
  const log = ctx?.log || console.log;

  // Only on touch/mobile
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) {
    log("[android] not touch device (skip)");
    return;
  }

  // Avoid double init
  if (window.__SCARLETT_ANDROID_READY) {
    log("[android] already ready (skip)");
    return;
  }
  window.__SCARLETT_ANDROID_READY = true;

  // We need player + camera pivot references from world
  const player = ctx.player;
  const camera = ctx.camera;
  const cameraPitch = ctx.cameraPitch || ctx.camera; // fallback

  if (!player || !camera) {
    log("[android] missing player/camera (skip)");
    return;
  }

  // ===== UI ROOT =====
  const ui = document.createElement("div");
  ui.id = "scarlett_android_ui";
  ui.style.cssText = `
    position:fixed; inset:0; z-index:999998;
    pointer-events:none;
    user-select:none; -webkit-user-select:none;
  `;
  document.body.appendChild(ui);

  // ===== LEFT JOY (move) =====
  const base = document.createElement("div");
  base.style.cssText = `
    position:absolute; left:6vw; bottom:10vh;
    width:22vmin; height:22vmin; border-radius:999px;
    background:rgba(20,30,50,0.20);
    border:1px solid rgba(102,204,255,0.22);
    pointer-events:auto; touch-action:none;
  `;
  ui.appendChild(base);

  const stick = document.createElement("div");
  stick.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:10vmin; height:10vmin; border-radius:999px;
    transform:translate(-50%,-50%);
    background:rgba(60,120,255,0.35);
    border:1px solid rgba(140,200,255,0.35);
    box-shadow:0 10px 30px rgba(0,0,0,0.35);
  `;
  base.appendChild(stick);

  // ===== RIGHT PAD (look) =====
  const look = document.createElement("div");
  look.style.cssText = `
    position:absolute; right:6vw; bottom:10vh;
    width:28vmin; height:18vmin; border-radius:18px;
    background:rgba(20,30,50,0.16);
    border:1px solid rgba(102,204,255,0.18);
    pointer-events:auto; touch-action:none;
  `;
  ui.appendChild(look);

  const lookLbl = document.createElement("div");
  lookLbl.textContent = "LOOK";
  lookLbl.style.cssText = `
    position:absolute; left:12px; top:10px;
    font:700 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
    letter-spacing:0.14em; color:rgba(180,220,255,0.65);
    pointer-events:none;
  `;
  look.appendChild(lookLbl);

  // ===== STATE =====
  const S = {
    // stick
    moveId: null,
    moveActive: false,
    moveX: 0,
    moveY: 0,

    // look
    lookId: null,
    lookActive: false,
    lastLX: 0,
    lastLY: 0,
    yaw: player.rotation.y || 0,
    pitch: 0,

    // tuning
    dead: 0.08,
    moveSpeed: 2.0,
    lookSpeed: 0.008,
    pitchClamp: Math.PI / 3,

    // xr guard
    xrActive: false
  };

  // XR guard (disable touch UI while XR session running)
  const renderer = ctx.renderer;
  function updateXRFlag() {
    const sess = renderer?.xr?.getSession?.();
    S.xrActive = !!sess;
    ui.style.display = S.xrActive ? "none" : "block";
  }
  updateXRFlag();

  // ===== INPUT HELPERS =====
  function setStickVisual(nx, ny) {
    const r = 0.45; // max radius proportion
    const dx = nx * (base.clientWidth * r);
    const dy = ny * (base.clientHeight * r);
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function joyFromEvent(e) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  // Move joystick
  base.addEventListener("pointerdown", (e) => {
    if (S.xrActive) return;
    base.setPointerCapture(e.pointerId);
    S.moveId = e.pointerId;
    S.moveActive = true;
    const { dx, dy } = joyFromEvent(e);
    S.moveX = dx;
    S.moveY = dy;
    setStickVisual(dx, dy);
  });

  base.addEventListener("pointermove", (e) => {
    if (S.xrActive) return;
    if (!S.moveActive || e.pointerId !== S.moveId) return;
    const { dx, dy } = joyFromEvent(e);
    S.moveX = dx;
    S.moveY = dy;
    setStickVisual(dx, dy);
  });

  function endMove(e) {
    if (e && S.moveId !== null && e.pointerId !== S.moveId) return;
    S.moveActive = false;
    S.moveId = null;
    S.moveX = 0;
    S.moveY = 0;
    setStickVisual(0, 0);
  }
  base.addEventListener("pointerup", endMove);
  base.addEventListener("pointercancel", endMove);

  // Look pad
  look.addEventListener("pointerdown", (e) => {
    if (S.xrActive) return;
    look.setPointerCapture(e.pointerId);
    S.lookId = e.pointerId;
    S.lookActive = true;
    S.lastLX = e.clientX;
    S.lastLY = e.clientY;
  });

  look.addEventListener("pointermove", (e) => {
    if (S.xrActive) return;
    if (!S.lookActive || e.pointerId !== S.lookId) return;
    const dx = e.clientX - S.lastLX;
    const dy = e.clientY - S.lastLY;
    S.lastLX = e.clientX;
    S.lastLY = e.clientY;

    S.yaw -= dx * S.lookSpeed;
    S.pitch -= dy * S.lookSpeed;
    S.pitch = Math.max(-S.pitchClamp, Math.min(S.pitchClamp, S.pitch));

    player.rotation.y = S.yaw;
    if (cameraPitch) cameraPitch.rotation.x = S.pitch;
  });

  function endLook(e) {
    if (e && S.lookId !== null && e.pointerId !== S.lookId) return;
    S.lookActive = false;
    S.lookId = null;
  }
  look.addEventListener("pointerup", endLook);
  look.addEventListener("pointercancel", endLook);

  // ===== PER-FRAME MOVE =====
  function tick(dt) {
    updateXRFlag();
    if (S.xrActive) return;

    const forward = -S.moveY;
    const strafe = S.moveX;

    const dead = S.dead;
    const f = Math.abs(forward) < dead ? 0 : forward;
    const s = Math.abs(strafe) < dead ? 0 : strafe;
    if (f === 0 && s === 0) return;

    // Move relative to player yaw
    const yaw = player.rotation.y;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);

    const speed = S.moveSpeed;
    player.position.x += (s * cos + f * sin) * speed * dt;
    player.position.z += (f * cos - s * sin) * speed * dt;
  }

  // Hook into world loop (preferred)
  if (typeof ctx.addUpdate === "function") {
    ctx.addUpdate((dt) => tick(dt));
  } else {
    // Fallback: RAF loop
    let last = performance.now();
    function raf() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  log("Android sticks READY ✅");
      }
