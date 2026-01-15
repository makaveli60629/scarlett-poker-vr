// /js/android_controls.js — Scarlett Android Debug Controls (FULL • SAFE)
// Runs ONLY when NOT in XR presenting. Touch joystick + drag-look.
// Exports: AndroidControls.init(ctx), AndroidControls.update(dt)

export const AndroidControls = (() => {
  const S = {
    enabled: false,
    THREE: null,
    renderer: null,
    camera: null,
    rig: null,
    log: console.log,

    // input
    joyDown: false,
    joyId: null,
    joyCenter: { x: 0, y: 0 },
    joyVec: { x: 0, y: 0 }, // -1..1
    lookDown: false,
    lookId: null,
    lookPrev: { x: 0, y: 0 },

    // tuning
    moveSpeed: 1.7,      // meters/sec
    strafeSpeed: 1.4,
    lookSpeed: 0.0022,   // radians per pixel

    // yaw/pitch
    yaw: 0,
    pitch: 0,

    // dom
    ui: null,
    joyPad: null,
    joyKnob: null
  };

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function isOculusBrowser() {
    const ua = navigator.userAgent || "";
    return ua.includes("OculusBrowser") || ua.includes("Quest");
  }

  function safeLog(...a) { try { S.log("[android]", ...a); } catch {} }

  function buildUI() {
    if (S.ui) return;

    const wrap = document.createElement("div");
    wrap.id = "scarlett_android_ui";
    wrap.style.cssText = `
      position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 999998;
    `;

    // Left joystick pad
    const pad = document.createElement("div");
    pad.style.cssText = `
      position: fixed; left: 18px; bottom: 18px;
      width: 180px; height: 180px; border-radius: 999px;
      background: rgba(40,60,120,0.18);
      border: 1px solid rgba(120,160,255,0.28);
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
      pointer-events: auto; touch-action: none;
    `;

    const knob = document.createElement("div");
    knob.style.cssText = `
      position: absolute; left: 50%; top: 50%;
      width: 74px; height: 74px; border-radius: 999px;
      transform: translate(-50%,-50%);
      background: rgba(120,160,255,0.22);
      border: 1px solid rgba(160,200,255,0.35);
    `;

    pad.appendChild(knob);
    wrap.appendChild(pad);

    S.ui = wrap;
    S.joyPad = pad;
    S.joyKnob = knob;

    document.body.appendChild(wrap);

    // Joystick touch handlers
    pad.addEventListener("pointerdown", (e) => {
      S.joyDown = true;
      S.joyId = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      S.joyCenter.x = e.clientX;
      S.joyCenter.y = e.clientY;
      S.joyVec.x = 0; S.joyVec.y = 0;
    });

    pad.addEventListener("pointermove", (e) => {
      if (!S.joyDown || e.pointerId !== S.joyId) return;
      const dx = e.clientX - S.joyCenter.x;
      const dy = e.clientY - S.joyCenter.y;
      const max = 64;
      const nx = Math.max(-1, Math.min(1, dx / max));
      const ny = Math.max(-1, Math.min(1, dy / max));
      S.joyVec.x = nx;
      S.joyVec.y = ny;

      const kx = nx * 46;
      const ky = ny * 46;
      S.joyKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    });

    function joyUp(e) {
      if (e.pointerId !== S.joyId) return;
      S.joyDown = false;
      S.joyId = null;
      S.joyVec.x = 0; S.joyVec.y = 0;
      S.joyKnob.style.transform = `translate(-50%,-50%)`;
    }
    pad.addEventListener("pointerup", joyUp);
    pad.addEventListener("pointercancel", joyUp);

    // Look drag on the rest of the screen (except joystick area)
    window.addEventListener("pointerdown", (e) => {
      // ignore if it started on joystick
      if (e.target === pad || pad.contains(e.target)) return;
      // only one look pointer
      S.lookDown = true;
      S.lookId = e.pointerId;
      S.lookPrev.x = e.clientX;
      S.lookPrev.y = e.clientY;
    }, { passive: true });

    window.addEventListener("pointermove", (e) => {
      if (!S.lookDown || e.pointerId !== S.lookId) return;
      const dx = e.clientX - S.lookPrev.x;
      const dy = e.clientY - S.lookPrev.y;
      S.lookPrev.x = e.clientX;
      S.lookPrev.y = e.clientY;

      S.yaw -= dx * S.lookSpeed;
      S.pitch -= dy * S.lookSpeed;
      const lim = Math.PI / 2.2;
      S.pitch = Math.max(-lim, Math.min(lim, S.pitch));
    }, { passive: true });

    function lookUp(e) {
      if (e.pointerId !== S.lookId) return;
      S.lookDown = false;
      S.lookId = null;
    }
    window.addEventListener("pointerup", lookUp, { passive: true });
    window.addEventListener("pointercancel", lookUp, { passive: true });
  }

  function applyLook() {
    if (!S.camera) return;

    // apply yaw to rig so "body" turns, apply pitch to camera
    if (S.rig) S.rig.rotation.y = S.yaw;
    S.camera.rotation.x = S.pitch;
  }

  function applyMove(dt) {
    if (!S.rig || !S.camera || !S.THREE) return;

    // NEVER move when XR presenting
    if (S.renderer?.xr?.isPresenting) return;

    // joystick: y forward (up is negative)
    const forward = -S.joyVec.y;
    const strafe = S.joyVec.x;

    const dead = 0.07;
    const f = Math.abs(forward) < dead ? 0 : forward;
    const s = Math.abs(strafe) < dead ? 0 : strafe;
    if (f === 0 && s === 0) return;

    const speedF = S.moveSpeed * dt;
    const speedS = S.strafeSpeed * dt;

    const yaw = S.rig.rotation.y;

    // forward vector from yaw
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    // move in XZ
    const dx = (sin * f * speedF) + (cos * s * speedS);
    const dz = (cos * f * speedF) - (sin * s * speedS);

    S.rig.position.x += dx;
    S.rig.position.z += dz;
  }

  function init(opts = {}) {
    S.THREE = opts.THREE || window.THREE || null;
    S.renderer = opts.renderer || null;
    S.camera = opts.camera || null;
    S.rig = opts.rig || null;
    S.log = opts.log || console.log;

    // Don’t run on Quest/OculusBrowser for “Android debug”
    // (Quest should use XR controls)
    if (isOculusBrowser()) {
      safeLog("Quest/OculusBrowser detected — AndroidControls disabled.");
      S.enabled = false;
      return;
    }

    if (!isTouchDevice()) {
      safeLog("No touch device — AndroidControls disabled.");
      S.enabled = false;
      return;
    }

    buildUI();
    S.enabled = true;

    safeLog("AndroidControls ready ✅");
  }

  function update(dt) {
    if (!S.enabled) return;
    applyLook();
    applyMove(dt);
  }

  return { init, update };
})();
