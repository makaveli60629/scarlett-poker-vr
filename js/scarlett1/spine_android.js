// /js/scarlett1/spine_android.js — Android Touch Sticks (FULL, SAFE) v1.0
// ✅ Touch move joystick (left) + look pad (right)
// ✅ Does NOT interfere with Quest XR (auto-hides while XR presenting)
// ✅ Works even if no other modules exist
// Usage: import { initAndroid } from "./spine_android.js"; initAndroid({ renderer, camera, rig, diagLog });

export function initAndroid(ctx = {}) {
  const diagLog = ctx.diagLog || ((...a) => console.log("[android]", ...a));
  const renderer = ctx.renderer;
  const camera = ctx.camera;
  const rig = ctx.rig;

  if (!renderer || !camera || !rig) {
    diagLog("initAndroid: missing { renderer, camera, rig }");
    return { ok: false };
  }

  // Only enable on touch devices / Android-like
  const ua = navigator.userAgent || "";
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  const isAndroidish = /Android|Mobile|SamsungBrowser|Chrome\/\d+\.\d+\.\d+\.\d+ Mobile/i.test(ua);

  if (!isTouch || !isAndroidish) {
    diagLog("initAndroid: not a touch mobile browser (skipping)");
    return { ok: false, skipped: true };
  }

  // ---------- DOM ----------
  const root = document.createElement("div");
  root.id = "scarlett_android_controls";
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 999998;
    pointer-events: none; user-select: none;
  `;

  // Toggle button (top-left, small)
  const toggle = document.createElement("button");
  toggle.textContent = "Controls";
  toggle.style.cssText = `
    position: fixed; left: 12px; top: 12px; z-index: 999999;
    padding: 10px 12px; border-radius: 14px;
    background: rgba(40,60,120,0.55);
    color: #eaf2ff; border: 1px solid rgba(120,160,255,0.25);
    font-weight: 900;
    pointer-events: auto;
  `;

  let enabled = true;
  toggle.onclick = () => {
    enabled = !enabled;
    leftWrap.style.display = enabled ? "block" : "none";
    rightWrap.style.display = enabled ? "block" : "none";
    diagLog(enabled ? "controls ON" : "controls OFF");
  };

  // Left stick (move)
  const leftWrap = document.createElement("div");
  leftWrap.style.cssText = `
    position: fixed; left: 18px; bottom: 18px;
    width: 180px; height: 180px;
    border-radius: 26px;
    background: rgba(10,12,24,0.20);
    border: 1px solid rgba(120,160,255,0.18);
    backdrop-filter: blur(6px);
    pointer-events: auto;
    touch-action: none;
  `;

  const leftBase = document.createElement("div");
  leftBase.style.cssText = `
    position: absolute; inset: 18px;
    border-radius: 999px;
    background: rgba(70,90,160,0.18);
    border: 1px solid rgba(120,160,255,0.18);
  `;
  const leftKnob = document.createElement("div");
  leftKnob.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    width: 70px; height: 70px;
    transform: translate(-50%,-50%);
    border-radius: 999px;
    background: rgba(70,90,160,0.55);
    border: 1px solid rgba(160,200,255,0.35);
  `;
  leftWrap.appendChild(leftBase);
  leftWrap.appendChild(leftKnob);

  // Right pad (look)
  const rightWrap = document.createElement("div");
  rightWrap.style.cssText = `
    position: fixed; right: 18px; bottom: 18px;
    width: 220px; height: 220px;
    border-radius: 26px;
    background: rgba(10,12,24,0.12);
    border: 1px solid rgba(120,160,255,0.12);
    pointer-events: auto;
    touch-action: none;
  `;

  const rightLabel = document.createElement("div");
  rightLabel.textContent = "LOOK";
  rightLabel.style.cssText = `
    position: absolute; left: 16px; top: 12px;
    color: rgba(220,235,255,0.85);
    font-weight: 900; letter-spacing: 0.12em;
    font-size: 12px;
  `;
  rightWrap.appendChild(rightLabel);

  document.body.appendChild(root);
  document.body.appendChild(toggle);
  document.body.appendChild(leftWrap);
  document.body.appendChild(rightWrap);

  // ---------- State ----------
  const state = {
    moveX: 0, // left/right
    moveY: 0, // forward/back (stick up = forward)
    yaw: 0,
    pitch: 0,
    lookActive: false,
    moveActive: false,
    lastT: performance.now(),
  };

  // ---------- Helpers ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hideIfXR() {
    const presenting = !!(renderer.xr && renderer.xr.isPresenting);
    // Hide UI during XR so it doesn't mess with Quest
    const show = enabled && !presenting;
    leftWrap.style.display = show ? "block" : "none";
    rightWrap.style.display = show ? "block" : "none";
    toggle.style.display = show ? "block" : "block"; // keep toggle visible
  }

  // ---------- Move stick events ----------
  let moveOrigin = null;

  leftWrap.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    leftWrap.setPointerCapture(e.pointerId);
    state.moveActive = true;
    moveOrigin = { x: e.clientX, y: e.clientY };
  });

  leftWrap.addEventListener("pointermove", (e) => {
    if (!enabled || !state.moveActive || !moveOrigin) return;

    const dx = e.clientX - moveOrigin.x;
    const dy = e.clientY - moveOrigin.y;

    const max = 55; // pixels for full tilt
    const nx = clamp(dx / max, -1, 1);
    const ny = clamp(dy / max, -1, 1);

    // Stick: up = forward (negative dy)
    state.moveX = nx;
    state.moveY = -ny;

    const knobX = nx * 45;
    const knobY = ny * 45;
    leftKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  });

  function endMove() {
    state.moveActive = false;
    moveOrigin = null;
    state.moveX = 0;
    state.moveY = 0;
    leftKnob.style.transform = `translate(-50%,-50%)`;
  }

  leftWrap.addEventListener("pointerup", endMove);
  leftWrap.addEventListener("pointercancel", endMove);

  // ---------- Look pad events ----------
  let lookOrigin = null;

  rightWrap.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    rightWrap.setPointerCapture(e.pointerId);
    state.lookActive = true;
    lookOrigin = { x: e.clientX, y: e.clientY };
  });

  rightWrap.addEventListener("pointermove", (e) => {
    if (!enabled || !state.lookActive || !lookOrigin) return;

    const dx = e.clientX - lookOrigin.x;
    const dy = e.clientY - lookOrigin.y;

    lookOrigin.x = e.clientX;
    lookOrigin.y = e.clientY;

    const sensitivity = 0.0032;
    state.yaw   -= dx * sensitivity;
    state.pitch -= dy * sensitivity;
    state.pitch = clamp(state.pitch, -1.2, 1.2); // keep sane
  });

  function endLook() {
    state.lookActive = false;
    lookOrigin = null;
  }

  rightWrap.addEventListener("pointerup", endLook);
  rightWrap.addEventListener("pointercancel", endLook);

  // ---------- Main loop ----------
  function step(now) {
    const dt = Math.min(0.05, (now - state.lastT) / 1000);
    state.lastT = now;

    hideIfXR();

    // Only apply when NOT XR presenting
    if (enabled && !(renderer.xr && renderer.xr.isPresenting)) {
      // Apply look
      rig.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;

      // Move in direction of rig yaw (where you're looking)
      const speed = 2.2; // m/s
      const strafe = state.moveX * speed * dt;
      const forward = state.moveY * speed * dt;

      if (Math.abs(strafe) > 0.0001 || Math.abs(forward) > 0.0001) {
        const yaw = rig.rotation.y;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);

        // forward/back in yaw direction
        rig.position.x += (sin * forward) + (cos * strafe);
        rig.position.z += (cos * forward) - (sin * strafe);
      }
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
  diagLog("Android sticks READY ✅");

  return {
    ok: true,
    setEnabled(v) { enabled = !!v; },
  };
      }
