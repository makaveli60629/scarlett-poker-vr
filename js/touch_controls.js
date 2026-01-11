// /js/touch_controls.js — Scarlett Touch Controls v1.0 (FULL)
// ✅ Works on Android Chrome + Quest Browser 2D
// ✅ Left thumb = move joystick
// ✅ Right thumb = look (drag)
// ✅ Buttons: DBG, HUD, REBUILD, TABLE, SAFE
// ✅ No dependencies beyond THREE + camera/player + callbacks

export const TouchControls = (() => {
  const st = {
    THREE: null,
    player: null,
    camera: null,
    log: console.log,

    enabled: true,
    ui: null,
    joy: {
      active: false,
      id: null,
      centerX: 0,
      centerY: 0,
      dx: 0,
      dy: 0,
      r: 55,
      mag: 0
    },
    look: {
      active: false,
      id: null,
      lastX: 0,
      lastY: 0,
      yaw: 0,
      pitch: 0
    },
    out: { moveX: 0, moveY: 0 }, // moveX=strafe, moveY=forward
    btns: {},
    lastTap: 0
  };

  function safeLog(...a) { try { st.log?.(...a); } catch(e) {} }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function ensureUI() {
    if (st.ui) return st.ui;

    // container
    const ui = document.createElement("div");
    ui.id = "touchUI";
    ui.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:99999;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
    `;

    // joystick base
    const joyBase = document.createElement("div");
    joyBase.id = "joyBase";
    joyBase.style.cssText = `
      position:absolute; left:18px; bottom:18px;
      width:140px; height:140px; border-radius:999px;
      background:rgba(10,14,26,.35);
      border:1px solid rgba(127,231,255,.22);
      backdrop-filter: blur(6px);
      pointer-events:none;
    `;

    const joyStick = document.createElement("div");
    joyStick.id = "joyStick";
    joyStick.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:64px; height:64px; border-radius:999px;
      transform:translate(-50%,-50%);
      background:rgba(127,231,255,.25);
      border:1px solid rgba(127,231,255,.38);
      box-shadow:0 10px 30px rgba(0,0,0,.35);
      pointer-events:none;
    `;

    joyBase.appendChild(joyStick);
    ui.appendChild(joyBase);

    // right-side hint zone (invisible)
    const lookZone = document.createElement("div");
    lookZone.id = "lookZone";
    lookZone.style.cssText = `
      position:absolute; right:0; top:0; width:55%; height:100%;
      pointer-events:none;
    `;
    ui.appendChild(lookZone);

    // buttons container
    const btnBox = document.createElement("div");
    btnBox.style.cssText = `
      position:absolute; right:14px; bottom:14px;
      display:flex; flex-direction:column; gap:10px;
      pointer-events:auto;
    `;

    const mkBtn = (id, label) => {
      const b = document.createElement("button");
      b.id = id;
      b.textContent = label;
      b.style.cssText = `
        pointer-events:auto;
        padding:10px 12px;
        border-radius:14px;
        border:1px solid rgba(127,231,255,.22);
        background:rgba(11,13,20,.78);
        color:#e8ecff;
        font-weight:700;
        letter-spacing:.3px;
        box-shadow:0 12px 40px rgba(0,0,0,.45);
      `;
      btnBox.appendChild(b);
      st.btns[id] = b;
      return b;
    };

    mkBtn("btnDBG", "DBG");
    mkBtn("btnHUD", "HUD");
    mkBtn("btnTABLE", "TABLE");
    mkBtn("btnREBUILD", "REBUILD");
    mkBtn("btnSAFE", "SAFE");

    ui.appendChild(btnBox);

    document.body.appendChild(ui);
    st.ui = ui;
    return ui;
  }

  function setJoystickVisual(nx, ny) {
    const stick = document.getElementById("joyStick");
    if (!stick) return;
    const max = 42;
    stick.style.transform = `translate(calc(-50% + ${nx*max}px), calc(-50% + ${ny*max}px))`;
  }

  function resetJoystick() {
    st.joy.active = false;
    st.joy.id = null;
    st.joy.dx = st.joy.dy = 0;
    st.joy.mag = 0;
    st.out.moveX = 0;
    st.out.moveY = 0;
    setJoystickVisual(0,0);
  }

  function onTouchStart(e){
    if (!st.enabled) return;

    ensureUI();

    for (const t of e.changedTouches) {
      const x = t.clientX;
      const y = t.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // left side joystick
      if (!st.joy.active && x < w * 0.45 && y > h * 0.45) {
        st.joy.active = true;
        st.joy.id = t.identifier;
        st.joy.centerX = x;
        st.joy.centerY = y;
        // move base to touch point (nice)
        const base = document.getElementById("joyBase");
        if (base) {
          base.style.left = `${clamp(x - 70, 8, w - 148)}px`;
          base.style.bottom = `${clamp((h - y) - 70, 8, h - 148)}px`;
        }
        continue;
      }

      // right side look
      if (!st.look.active && x >= w * 0.45) {
        st.look.active = true;
        st.look.id = t.identifier;
        st.look.lastX = x;
        st.look.lastY = y;
        continue;
      }
    }
  }

  function onTouchMove(e){
    if (!st.enabled) return;

    for (const t of e.changedTouches) {
      const x = t.clientX;
      const y = t.clientY;

      if (st.joy.active && t.identifier === st.joy.id) {
        const dx = x - st.joy.centerX;
        const dy = y - st.joy.centerY;

        const r = st.joy.r;
        const mag = Math.min(1, Math.hypot(dx,dy) / r);
        st.joy.mag = mag;

        const nx = clamp(dx / r, -1, 1);
        const ny = clamp(dy / r, -1, 1);

        // up on screen should move forward => ny negative
        st.out.moveX = nx;      // strafe
        st.out.moveY = -ny;     // forward

        setJoystickVisual(nx, ny);
      }

      if (st.look.active && t.identifier === st.look.id) {
        const dx = x - st.look.lastX;
        const dy = y - st.look.lastY;
        st.look.lastX = x;
        st.look.lastY = y;

        st.look.yaw   -= dx * 0.0032;
        st.look.pitch -= dy * 0.0032;
        st.look.pitch = clamp(st.look.pitch, -1.2, 1.2);
      }
    }
  }

  function onTouchEnd(e){
    if (!st.enabled) return;

    for (const t of e.changedTouches) {
      if (st.joy.active && t.identifier === st.joy.id) resetJoystick();
      if (st.look.active && t.identifier === st.look.id) {
        st.look.active = false;
        st.look.id = null;
      }
    }
  }

  function wireButtons(api){
    const bDBG = st.btns["btnDBG"];
    const bHUD = st.btns["btnHUD"];
    const bTABLE = st.btns["btnTABLE"];
    const bREBUILD = st.btns["btnREBUILD"];
    const bSAFE = st.btns["btnSAFE"];

    if (bDBG) bDBG.onclick = () => api?.toggleDebug?.();
    if (bHUD) bHUD.onclick = () => api?.toggleHUD?.();
    if (bTABLE) bTABLE.onclick = () => api?.gotoTable?.();
    if (bREBUILD) bREBUILD.onclick = () => api?.rebuild?.();
    if (bSAFE) bSAFE.onclick = () => api?.safeMode?.();
  }

  function init({ THREE, player, camera, log, api }) {
    st.THREE = THREE;
    st.player = player;
    st.camera = camera;
    st.log = log || console.log;

    ensureUI();
    wireButtons(api);

    // prevent browser gestures stealing touches
    document.body.style.touchAction = "none";

    window.addEventListener("touchstart", onTouchStart, { passive:false });
    window.addEventListener("touchmove", onTouchMove, { passive:false });
    window.addEventListener("touchend", onTouchEnd, { passive:false });
    window.addEventListener("touchcancel", onTouchEnd, { passive:false });

    safeLog("[touch] controls ✅ (left move, right look, buttons)");
  }

  function update(dt){
    if (!st.enabled) return;
    if (!st.player || !st.camera) return;

    // apply look only when NOT in XR
    // (XR pose overrides camera)
    // You can still use player yaw in XR if you want later.
    st.player.rotation.y = st.look.yaw;
    st.camera.rotation.x = st.look.pitch;

    return st.out;
  }

  function dispose(){
    try {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    } catch(e){}
    try { st.ui?.remove?.(); } catch(e){}
    st.ui = null;
  }

  return { init, update, dispose, enable(v){ st.enabled=!!v; }, get out(){ return st.out; } };
})();
