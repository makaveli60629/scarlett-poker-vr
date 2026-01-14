// /js/core/ui_sticks.js — Scarlett UI Sticks (FULL) v2.0
// ✅ Dual virtual sticks: Left=move, Right=look
// ✅ Works on Android + Quest Browser DOM Overlay
// ✅ Proper z-index + touch-action + pointer capture
// ✅ Toggle visibility (Signals: UI_STICKS_SHOW / UI_STICKS_HIDE / UI_STICKS_TOGGLE)

export const UISticks = (() => {
  const state = {
    el: null,
    left: null,
    right: null,
    visible: true,

    // axes
    lx: 0, ly: 0,
    rx: 0, ry: 0,

    // pointers
    lp: null,
    rp: null,

    // config
    dead: 0.08,
    max: 48,        // radius px for full deflection
    lookScale: 1.0,
    moveScale: 1.0,
    log: console.log
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function len(x, y) { return Math.sqrt(x*x + y*y); }

  function mkStick(id, side) {
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.style.position = "fixed";
    wrap.style.bottom = "14px";
    wrap.style[side] = "14px";
    wrap.style.width = "140px";
    wrap.style.height = "140px";
    wrap.style.borderRadius = "999px";
    wrap.style.background = "rgba(10,16,30,0.30)";
    wrap.style.border = "1px solid rgba(102,204,255,0.35)";
    wrap.style.backdropFilter = "blur(6px)";
    wrap.style.webkitBackdropFilter = "blur(6px)";
    wrap.style.touchAction = "none";
    wrap.style.pointerEvents = "auto";

    const ring = document.createElement("div");
    ring.style.position = "absolute";
    ring.style.inset = "14px";
    ring.style.borderRadius = "999px";
    ring.style.border = "1px solid rgba(255,255,255,0.10)";
    ring.style.background = "rgba(0,0,0,0.10)";
    wrap.appendChild(ring);

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "50%";
    knob.style.top = "50%";
    knob.style.width = "56px";
    knob.style.height = "56px";
    knob.style.marginLeft = "-28px";
    knob.style.marginTop = "-28px";
    knob.style.borderRadius = "999px";
    knob.style.background = "rgba(102,204,255,0.35)";
    knob.style.border = "1px solid rgba(255,255,255,0.15)";
    knob.style.boxShadow = "0 8px 22px rgba(0,0,0,0.35)";
    knob.style.touchAction = "none";
    wrap.appendChild(knob);

    return { wrap, knob };
  }

  function setKnob(st, dx, dy) {
    // dx,dy in px relative to center
    const r = state.max;
    const L = len(dx, dy);
    if (L > r) {
      dx = dx / L * r;
      dy = dy / L * r;
    }
    st.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function axesFromDelta(dx, dy) {
    // normalized [-1..1], with y positive UP for look stick,
    // but we’ll map move y so pushing up means forward (negative Z) later.
    const r = state.max;
    let x = clamp(dx / r, -1, 1);
    let y = clamp(dy / r, -1, 1);

    // deadzone
    const L = len(x, y);
    if (L < state.dead) return { x: 0, y: 0 };

    // rescale after deadzone (smooth)
    const t = (L - state.dead) / (1 - state.dead);
    const nx = (x / L) * t;
    const ny = (y / L) * t;
    return { x: nx, y: ny };
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  function bindStick(st, which /*"left"|"right"*/) {
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      st.wrap.setPointerCapture?.(e.pointerId);

      const c = centerOf(st.wrap);
      const dx = e.clientX - c.cx;
      const dy = e.clientY - c.cy;

      if (which === "left") state.lp = { id: e.pointerId, cx: c.cx, cy: c.cy };
      else state.rp = { id: e.pointerId, cx: c.cx, cy: c.cy };

      setKnob(st, dx, dy);

      const a = axesFromDelta(dx, dy);
      if (which === "left") { state.lx = a.x * state.moveScale; state.ly = a.y * state.moveScale; }
      else { state.rx = a.x * state.lookScale; state.ry = a.y * state.lookScale; }
    };

    const onMove = (e) => {
      if (which === "left") {
        if (!state.lp || e.pointerId !== state.lp.id) return;
        e.preventDefault();
        const dx = e.clientX - state.lp.cx;
        const dy = e.clientY - state.lp.cy;
        setKnob(st, dx, dy);
        const a = axesFromDelta(dx, dy);
        state.lx = a.x * state.moveScale;
        state.ly = a.y * state.moveScale;
      } else {
        if (!state.rp || e.pointerId !== state.rp.id) return;
        e.preventDefault();
        const dx = e.clientX - state.rp.cx;
        const dy = e.clientY - state.rp.cy;
        setKnob(st, dx, dy);
        const a = axesFromDelta(dx, dy);
        state.rx = a.x * state.lookScale;
        state.ry = a.y * state.lookScale;
      }
    };

    const onUp = (e) => {
      if (which === "left" && state.lp && e.pointerId === state.lp.id) {
        state.lp = null;
        state.lx = 0; state.ly = 0;
        setKnob(st, 0, 0);
      }
      if (which === "right" && state.rp && e.pointerId === state.rp.id) {
        state.rp = null;
        state.rx = 0; state.ry = 0;
        setKnob(st, 0, 0);
      }
    };

    st.wrap.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
  }

  function setVisible(v) {
    state.visible = !!v;
    if (state.el) state.el.style.display = state.visible ? "block" : "none";
    if (!state.visible) {
      state.lx = state.ly = state.rx = state.ry = 0;
      state.lp = state.rp = null;
    }
  }

  return {
    init({ Signals, log } = {}) {
      state.log = log || console.log;

      // container
      const el = document.createElement("div");
      el.id = "scarlett-sticks";
      el.style.position = "fixed";
      el.style.left = "0";
      el.style.top = "0";
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.pointerEvents = "none";           // only the sticks themselves capture
      el.style.zIndex = "999999";                // ABOVE everything
      el.style.touchAction = "none";
      document.body.appendChild(el);
      state.el = el;

      // sticks
      const L = mkStick("stick-left", "left");
      const R = mkStick("stick-right", "right");
      el.appendChild(L.wrap);
      el.appendChild(R.wrap);

      state.left = L;
      state.right = R;

      bindStick(L, "left");
      bindStick(R, "right");

      // signals
      Signals?.on?.("UI_STICKS_SHOW", () => setVisible(true));
      Signals?.on?.("UI_STICKS_HIDE", () => setVisible(false));
      Signals?.on?.("UI_STICKS_TOGGLE", () => setVisible(!state.visible));

      state.log?.("[sticks] enabled ✅");
      return {
        setVisible,
        getAxes() { return { lx: state.lx, ly: state.ly, rx: state.rx, ry: state.ry }; }
      };
    }
  };
})();
