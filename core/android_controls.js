// /core/android_controls.js — Android (2D) Touch Controls v1.0
// ✅ Touch joystick (move) + look drag area
// ✅ ONLY active when renderer.xr.isPresenting === false
// ✅ Does not interfere with Oculus XR controls

export const AndroidControls = (() => {
  const dead = 0.08;

  const S = {
    enabled: true,
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    renderer: null,
    player: null,
    cameraPitch: null,
    log: console.log,
    setHUDVisible: null,

    // UI
    ui: null,
    joyBase: null,
    joyStick: null,
    lookPad: null,

    // Joystick
    joyActive: false,
    joyId: null,
    joyCenter: { x: 0, y: 0 },
    joyVec: { x: 0, y: 0 }, // [-1..1]

    // Look drag
    lookActive: false,
    lookId: null,
    lookLast: { x: 0, y: 0 },
    yaw: 0,
    pitch: 0,

    // Tunables
    moveSpeed: 2.4,
    lookSpeed: 0.0032,
    pitchClamp: 1.15
  };

  function setEnabled(v) {
    S.enabled = !!v;
    if (S.ui) S.ui.style.display = (S.enabled && S.isMobile) ? "block" : "none";
    if (!S.enabled) {
      S.joyActive = false;
      S.lookActive = false;
      S.joyVec.x = 0; S.joyVec.y = 0;
    }
  }

  function init({ renderer, player, cameraPitch, setHUDVisible, log }) {
    S.renderer = renderer;
    S.player = player;
    S.cameraPitch = cameraPitch;
    S.setHUDVisible = setHUDVisible;
    S.log = log || console.log;

    ensureUI();
    setEnabled(true);

    return { setEnabled, update };
  }

  function ensureUI() {
    if (!S.isMobile) return;
    if (S.ui) return;

    const ui = document.createElement("div");
    ui.id = "androidControls";
    ui.style.position = "fixed";
    ui.style.left = "0";
    ui.style.top = "0";
    ui.style.width = "100vw";
    ui.style.height = "100vh";
    ui.style.pointerEvents = "none";
    ui.style.zIndex = "9998";
    ui.style.touchAction = "none";
    document.body.appendChild(ui);

    // Left joystick base
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.left = "6vw";
    base.style.bottom = "10vh";
    base.style.width = "22vmin";
    base.style.height = "22vmin";
    base.style.borderRadius = "999px";
    base.style.background = "rgba(20,30,50,0.20)";
    base.style.border = "1px solid rgba(102,204,255,0.22)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";
    ui.appendChild(base);

    const stick = document.createElement("div");
    stick.style.position = "absolute";
    stick.style.left = "50%";
    stick.style.top = "50%";
    stick.style.transform = "translate(-50%,-50%)";
    stick.style.width = "10vmin";
    stick.style.height = "10vmin";
    stick.style.borderRadius = "999px";
    stick.style.background = "rgba(102,204,255,0.22)";
    stick.style.border = "1px solid rgba(102,204,255,0.32)";
    stick.style.pointerEvents = "none";
    base.appendChild(stick);

    // Look area (right side)
    const look = document.createElement("div");
    look.style.position = "absolute";
    look.style.right = "0";
    look.style.top = "0";
    look.style.width = "55vw";
    look.style.height = "100vh";
    look.style.pointerEvents = "auto";
    look.style.touchAction = "none";
    look.style.background = "rgba(0,0,0,0)";
    ui.appendChild(look);

    // Buttons
    const btnBar = document.createElement("div");
    btnBar.style.position = "absolute";
    btnBar.style.right = "2vw";
    btnBar.style.bottom = "10vh";
    btnBar.style.display = "flex";
    btnBar.style.flexDirection = "column";
    btnBar.style.gap = "10px";
    btnBar.style.pointerEvents = "auto";
    ui.appendChild(btnBar);

    const mkBtn = (label, onClick) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(102,204,255,0.32)";
      b.style.background = "rgba(10,16,32,0.55)";
      b.style.color = "rgba(230,245,255,0.95)";
      b.style.fontWeight = "800";
      b.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
      b.style.backdropFilter = "blur(6px)";
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); });
      return b;
    };

    btnBar.appendChild(mkBtn("HUD OFF", () => S.setHUDVisible?.(false)));
    btnBar.appendChild(mkBtn("HUD ON",  () => S.setHUDVisible?.(true)));
    btnBar.appendChild(mkBtn("RECENTER", () => {
      S.player.position.set(0, 0, 0);
      S.yaw = 0; S.pitch = 0;
      S.player.rotation.y = 0;
      S.cameraPitch.rotation.x = 0;
      S.log?.("[android] recenter ✅");
    }));

    // Joystick handlers
    base.addEventListener("pointerdown", (e) => {
      if (!S.enabled || S.renderer.xr.isPresenting) return;
      S.joyActive = true;
      S.joyId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      const r = base.getBoundingClientRect();
      S.joyCenter.x = r.left + r.width / 2;
      S.joyCenter.y = r.top + r.height / 2;
      updateJoyFromPointer(e.clientX, e.clientY, r.width * 0.38);
    });

    base.addEventListener("pointermove", (e) => {
      if (!S.joyActive || e.pointerId !== S.joyId) return;
      const r = base.getBoundingClientRect();
      updateJoyFromPointer(e.clientX, e.clientY, r.width * 0.38);
    });

    function joyReset() {
      S.joyActive = false;
      S.joyId = null;
      S.joyVec.x = 0; S.joyVec.y = 0;
      stick.style.left = "50%";
      stick.style.top = "50%";
    }

    base.addEventListener("pointerup", (e) => { if (e.pointerId === S.joyId) joyReset(); });
    base.addEventListener("pointercancel", joyReset);

    function updateJoyFromPointer(px, py, maxR) {
      const dx = px - S.joyCenter.x;
      const dy = py - S.joyCenter.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const mag = Math.min(1, d / maxR);
      S.joyVec.x = nx * mag;
      S.joyVec.y = ny * mag;

      stick.style.left = `${50 + (S.joyVec.x * 35)}%`;
      stick.style.top = `${50 + (S.joyVec.y * 35)}%`;
    }

    // Look handlers
    look.addEventListener("pointerdown", (e) => {
      if (!S.enabled || S.renderer.xr.isPresenting) return;
      S.lookActive = true;
      S.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      S.lookLast.x = e.clientX;
      S.lookLast.y = e.clientY;
    });

    look.addEventListener("pointermove", (e) => {
      if (!S.lookActive || e.pointerId !== S.lookId) return;
      const dx = e.clientX - S.lookLast.x;
      const dy = e.clientY - S.lookLast.y;
      S.lookLast.x = e.clientX;
      S.lookLast.y = e.clientY;

      S.yaw -= dx * S.lookSpeed;
      S.pitch -= dy * S.lookSpeed;
      S.pitch = Math.max(-S.pitchClamp, Math.min(S.pitchClamp, S.pitch));

      S.player.rotation.y = S.yaw;
      S.cameraPitch.rotation.x = S.pitch;
    });

    look.addEventListener("pointerup", (e) => { if (e.pointerId === S.lookId) { S.lookActive = false; S.lookId = null; }});
    look.addEventListener("pointercancel", () => { S.lookActive = false; S.lookId = null; });

    S.ui = ui;
    S.joyBase = base;
    S.joyStick = stick;
    S.lookPad = look;

    S.log?.("[android] touch UI ready ✅");
  }

  function update(dt) {
    if (!S.enabled) return;
    if (!S.isMobile) return;
    if (S.renderer.xr.isPresenting) return;

    // joyVec: x=strafe, y=screen dy (down positive)
    const forward = -S.joyVec.y;
    const strafe = S.joyVec.x;

    const f = Math.abs(forward) < dead ? 0 : forward;
    const s = Math.abs(strafe) < dead ? 0 : strafe;
    if (f === 0 && s === 0) return;

    const yaw = S.player.rotation.y;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);

    const speed = S.moveSpeed;
    S.player.position.x += (s * cos + f * sin) * speed * dt;
    S.player.position.z += (f * cos - s * sin) * speed * dt;
  }

  return { init };
})();
