// /js/touch_controls.js — Scarlett TouchControls v2.0 (FULL, Android-safe)
// ✅ Left joystick: move (WASD style)
// ✅ Right joystick: look (yaw player, pitch camera)
// ✅ Buttons: ENTER VR, DBG, HUD, TABLE, REBUILD, SAFE
// ✅ Uses PointerEvents (best on Android Chrome)
// ✅ Returns { moveX, moveY } from update(dt)

export const TouchControls = (() => {
  let THREE = null;
  let player = null;
  let camera = null;
  let log = console.log;
  let api = null;

  const st = {
    root: null,
    left: null,
    right: null,
    btns: null,

    // joystick state
    lActive: false,
    lId: null,
    lStartX: 0, lStartY: 0,
    lX: 0, lY: 0,

    rActive: false,
    rId: null,
    rStartX: 0, rStartY: 0,
    rDX: 0, rDY: 0,

    // output
    moveX: 0,
    moveY: 0,

    yaw: 0,
    pitch: 0,

    // tuning
    dead: 0.08,
    max: 42,          // pixels
    lookSpeed: 0.003  // radians per pixel
  };

  function safeLog(...a){ try{ log?.(...a);}catch(e){} }

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function norm(v){ return Math.abs(v) < st.dead ? 0 : v; }

  function mk(tag, cls, parent){
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    (parent || document.body).appendChild(el);
    return el;
  }

  function styleOnce() {
    if (document.getElementById("touchControlsStyle")) return;
    const css = `
#touchUI {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 9996;
}
.tcPad {
  position: absolute;
  width: 160px; height: 160px;
  border-radius: 999px;
  border: 1px solid rgba(127,231,255,.22);
  background: rgba(11,13,20,.35);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  pointer-events: auto;
  touch-action: none;
}
.tcKnob {
  position: absolute;
  left: 50%; top: 50%;
  width: 70px; height: 70px;
  margin-left: -35px; margin-top: -35px;
  border-radius: 999px;
  background: rgba(127,231,255,.22);
  border: 1px solid rgba(127,231,255,.25);
}
#tcLeft { left: 18px; bottom: 18px; }
#tcRight { right: 18px; bottom: 18px; }

#tcBtns {
  position: absolute;
  left: 50%; bottom: 18px;
  transform: translateX(-50%);
  display: flex; gap: 10px;
  pointer-events: auto;
  touch-action: none;
}
#tcBtns button{
  border: 1px solid rgba(127,231,255,.22);
  background: rgba(11,13,20,.78);
  color: #e8ecff;
  font-weight: 900;
  padding: 10px 12px;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  letter-spacing: .2px;
}
`;
    const s = document.createElement("style");
    s.id = "touchControlsStyle";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildUI() {
    styleOnce();

    // root
    const root = mk("div", "", document.body);
    root.id = "touchUI";
    st.root = root;

    // pads
    const left = mk("div", "tcPad", root);
    left.id = "tcLeft";
    const leftKnob = mk("div", "tcKnob", left);

    const right = mk("div", "tcPad", root);
    right.id = "tcRight";
    const rightKnob = mk("div", "tcKnob", right);

    st.left = { el: left, knob: leftKnob };
    st.right = { el: right, knob: rightKnob };

    // buttons
    const btns = mk("div", "", root);
    btns.id = "tcBtns";
    st.btns = btns;

    const makeBtn = (label, fn) => {
      const b = mk("button", "", btns);
      b.textContent = label;
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fn?.(); }, { passive: false });
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      return b;
    };

    makeBtn("ENTER VR", () => {
      // Click the three.js VRButton if present
      const vr = document.querySelector("button#VRButton, button.vr-button, button[title='Enter VR'], button");
      vr?.click?.();
    });

    makeBtn("DBG", () => api?.toggleDebug?.());
    makeBtn("HUD", () => api?.toggleHUD?.());
    makeBtn("TABLE", () => api?.gotoTable?.());
    makeBtn("REBUILD", () => api?.rebuild?.());
    makeBtn("SAFE", () => api?.safeMode?.());

    // left joystick events
    const onLDown = (e) => {
      e.preventDefault(); e.stopPropagation();
      st.lActive = true;
      st.lId = e.pointerId;
      st.left.el.setPointerCapture?.(e.pointerId);
      st.lStartX = e.clientX;
      st.lStartY = e.clientY;
      st.lX = 0; st.lY = 0;
    };

    const onLMove = (e) => {
      if (!st.lActive || e.pointerId !== st.lId) return;
      e.preventDefault(); e.stopPropagation();

      const dx = e.clientX - st.lStartX;
      const dy = e.clientY - st.lStartY;

      const nx = clamp(dx / st.max, -1, 1);
      const ny = clamp(dy / st.max, -1, 1);

      st.lX = nx;
      st.lY = ny;

      // move knob
      st.left.knob.style.transform = `translate(${nx * st.max * 0.35}px, ${ny * st.max * 0.35}px)`;
    };

    const onLUp = (e) => {
      if (e.pointerId !== st.lId) return;
      e.preventDefault(); e.stopPropagation();
      st.lActive = false; st.lId = null;
      st.lX = 0; st.lY = 0;
      st.left.knob.style.transform = `translate(0px, 0px)`;
    };

    left.addEventListener("pointerdown", onLDown, { passive: false });
    window.addEventListener("pointermove", onLMove, { passive: false });
    window.addEventListener("pointerup", onLUp, { passive: false });
    window.addEventListener("pointercancel", onLUp, { passive: false });

    // right look events
    const onRDown = (e) => {
      e.preventDefault(); e.stopPropagation();
      st.rActive = true;
      st.rId = e.pointerId;
      st.right.el.setPointerCapture?.(e.pointerId);
      st.rStartX = e.clientX;
      st.rStartY = e.clientY;
      st.rDX = 0; st.rDY = 0;
    };

    const onRMove = (e) => {
      if (!st.rActive || e.pointerId !== st.rId) return;
      e.preventDefault(); e.stopPropagation();

      const dx = e.clientX - st.rStartX;
      const dy = e.clientY - st.rStartY;

      const nx = clamp(dx / st.max, -1, 1);
      const ny = clamp(dy / st.max, -1, 1);

      st.rDX = nx;
      st.rDY = ny;

      st.right.knob.style.transform = `translate(${nx * st.max * 0.35}px, ${ny * st.max * 0.35}px)`;
    };

    const onRUp = (e) => {
      if (e.pointerId !== st.rId) return;
      e.preventDefault(); e.stopPropagation();
      st.rActive = false; st.rId = null;
      st.rDX = 0; st.rDY = 0;
      st.right.knob.style.transform = `translate(0px, 0px)`;
    };

    right.addEventListener("pointerdown", onRDown, { passive: false });
    window.addEventListener("pointermove", onRMove, { passive: false });
    window.addEventListener("pointerup", onRUp, { passive: false });
    window.addEventListener("pointercancel", onRUp, { passive: false });

    safeLog("[touch] UI built ✅");
  }

  return {
    init(ctx) {
      THREE = ctx.THREE;
      player = ctx.player;
      camera = ctx.camera;
      log = ctx.log || console.log;
      api = ctx.api || null;

      // IMPORTANT: kill browser touch scrolling/gestures
      document.documentElement.style.touchAction = "none";
      document.body.style.touchAction = "none";

      // initialize angles from current
      st.yaw = player?.rotation?.y || 0;
      st.pitch = camera?.rotation?.x || 0;

      // build
      try { st.root?.remove?.(); } catch(e){}
      buildUI();
    },

    update(dt) {
      // output movement
      st.moveX = norm(st.lX);
      st.moveY = norm(-st.lY); // invert: up on stick = forward (+)

      // apply look if using right stick
      if (player && camera) {
        st.yaw -= st.rDX * st.max * st.lookSpeed;
        st.pitch -= st.rDY * st.max * st.lookSpeed;
        st.pitch = clamp(st.pitch, -1.2, 1.2);

        player.rotation.y = st.yaw;
        camera.rotation.x = st.pitch;
      }

      return { moveX: st.moveX, moveY: st.moveY };
    }
  };
})();
