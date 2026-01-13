// /js/core/ui_sticks.js — Prime 10.0 (FULL, mobile joysticks)
// Left stick = move (lx, ly) | Right stick = look (rx, ry)
// Safe: if DOM missing, returns zeros.

export const UISticks = (() => {
  let state = {
    lx: 0, ly: 0,
    rx: 0, ry: 0,
    enabled: true
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function makeStick(id, side) {
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.style.position = "fixed";
    wrap.style.bottom = "18px";
    wrap.style[side] = "18px";
    wrap.style.width = "160px";
    wrap.style.height = "160px";
    wrap.style.borderRadius = "999px";
    wrap.style.background = "rgba(0,0,0,0.25)";
    wrap.style.border = "2px solid rgba(102,204,255,0.35)";
    wrap.style.backdropFilter = "blur(6px)";
    wrap.style.zIndex = "9999";
    wrap.style.touchAction = "none";
    wrap.style.userSelect = "none";

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "50%";
    knob.style.top = "50%";
    knob.style.transform = "translate(-50%,-50%)";
    knob.style.width = "72px";
    knob.style.height = "72px";
    knob.style.borderRadius = "999px";
    knob.style.background = "rgba(255,211,107,0.22)";
    knob.style.border = "2px solid rgba(255,211,107,0.45)";
    knob.style.boxShadow = "0 0 18px rgba(102,204,255,0.18)";
    wrap.appendChild(knob);

    document.body.appendChild(wrap);

    const stick = {
      wrap, knob,
      active: false,
      pid: null,
      cx: 0, cy: 0,
      x: 0, y: 0
    };

    const radius = 54;

    const setKnob = (x, y) => {
      stick.x = clamp(x, -1, 1);
      stick.y = clamp(y, -1, 1);
      const px = stick.x * radius;
      const py = stick.y * radius;
      knob.style.transform = `translate(${px}px, ${py}px) translate(-50%,-50%)`;
    };

    const begin = (e) => {
      if (!state.enabled) return;
      stick.active = true;
      stick.pid = e.pointerId;
      wrap.setPointerCapture?.(e.pointerId);
      const r = wrap.getBoundingClientRect();
      stick.cx = r.left + r.width / 2;
      stick.cy = r.top + r.height / 2;
      move(e);
    };

    const move = (e) => {
      if (!stick.active || stick.pid !== e.pointerId) return;
      const dx = (e.clientX - stick.cx) / radius;
      const dy = (e.clientY - stick.cy) / radius;

      // deadzone
      const mag = Math.hypot(dx, dy);
      let nx = dx, ny = dy;
      if (mag > 1) { nx /= mag; ny /= mag; }
      if (mag < 0.08) { nx = 0; ny = 0; }

      setKnob(nx, ny);

      if (side === "left") {
        state.lx = nx;
        state.ly = ny;
      } else {
        state.rx = nx;
        state.ry = ny;
      }
    };

    const end = (e) => {
      if (stick.pid !== e.pointerId) return;
      stick.active = false;
      stick.pid = null;
      setKnob(0, 0);
      if (side === "left") { state.lx = 0; state.ly = 0; }
      else { state.rx = 0; state.ry = 0; }
    };

    wrap.addEventListener("pointerdown", begin);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    return stick;
  }

  return {
    init({ Signals, log }) {
      try {
        // Avoid duplicates on hot reload
        document.getElementById("stickL")?.remove?.();
        document.getElementById("stickR")?.remove?.();

        makeStick("stickL", "left");
        makeStick("stickR", "right");

        log?.("[sticks] enabled ✅");

        // Optional toggle via signal
        Signals?.on?.("STICKS_ENABLE", (p) => {
          state.enabled = p?.enabled !== false;
          log?.(`[sticks] enabled=${state.enabled}`);
        });

        return {
          getAxes() { return { lx: state.lx, ly: state.ly, rx: state.rx, ry: state.ry }; }
        };
      } catch (e) {
        log?.(`[sticks] init failed ⚠️ ${e?.message || String(e)}`);
        return { getAxes() { return { lx:0, ly:0, rx:0, ry:0 }; } };
      }
    }
  };
})();
