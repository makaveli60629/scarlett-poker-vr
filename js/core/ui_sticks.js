// /js/core/ui_sticks.js — Prime 10.0 (FULL)
// Dual-stick on-screen joystick for Android diagnostics.
// Left = move (lx,ly), Right = look (rx,ry). Values in [-1..1].

export const UISticks = (() => {
  function init({ Signals, log }) {
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

    const state = {
      lx: 0, ly: 0,
      rx: 0, ry: 0,
      active: isTouch
    };

    // minimal overlay
    const wrap = document.createElement("div");
    wrap.id = "sticks";
    wrap.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:9998;
    `;
    document.body.appendChild(wrap);

    function makeStick(side) {
      const stick = document.createElement("div");
      stick.style.cssText = `
        position:absolute; bottom:14px; ${side === "left" ? "left:14px" : "right:14px"};
        width:140px; height:140px; border-radius:999px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.16);
        pointer-events:auto; touch-action:none;
      `;
      const knob = document.createElement("div");
      knob.style.cssText = `
        position:absolute; left:50%; top:50%;
        width:56px; height:56px; margin-left:-28px; margin-top:-28px;
        border-radius:999px;
        background:rgba(255,255,255,0.18);
        border:1px solid rgba(255,255,255,0.22);
      `;
      stick.appendChild(knob);
      wrap.appendChild(stick);
      return { stick, knob };
    }

    const L = makeStick("left");
    const R = makeStick("right");

    function bind(st, setAxes) {
      let down = false;
      let originX = 0, originY = 0;

      const max = 46; // knob travel radius

      function setKnob(dx, dy) {
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
        st.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        setAxes(dx / max, dy / max);
      }

      st.stick.addEventListener("pointerdown", (e) => {
        down = true;
        originX = e.clientX;
        originY = e.clientY;
        setKnob(0, 0);
        st.stick.setPointerCapture?.(e.pointerId);
      });

      st.stick.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - originX;
        const dy = e.clientY - originY;
        setKnob(dx, dy);
      });

      st.stick.addEventListener("pointerup", () => {
        down = false;
        st.knob.style.transform = `translate(0px, 0px)`;
        setAxes(0, 0);
      });
    }

    bind(L, (x, y) => { state.lx = x; state.ly = y; });
    bind(R, (x, y) => { state.rx = x; state.ry = y; });

    // quick enable/disable via Signals if you want later
    Signals?.on?.("UI_STICKS", (p) => {
      const on = !!p?.on;
      wrap.style.display = on ? "block" : "none";
      state.active = on;
    });

    // default: show on touch devices
    wrap.style.display = isTouch ? "block" : "none";

    log?.(`[sticks] ${isTouch ? "enabled" : "disabled"} ✅`);

    return {
      getAxes() {
        return state.active ? state : { lx:0, ly:0, rx:0, ry:0, active:false };
      }
    };
  }

  return { init };
})();
