// /js/ui_sticks.js — Android Touch Sticks v1 (FULL)
// Provides axes: lx, ly (move) and rx, ry (look)

export const UISticks = (() => {
  const ax = { lx:0, ly:0, rx:0, ry:0 };
  let log = console.log;

  let rootEl, lZone, rZone, lNub, rNub;
  let enabled = false;

  const isMobile = () =>
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints || 0) > 1;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setNub(nub, x, y) {
    if (!nub) return;
    nub.style.transform = `translate(${x}px, ${y}px)`;
  }

  function bindZone(zone, nub, which) {
    if (!zone) return;

    let activeId = null;
    let cx = 0, cy = 0, rad = 1;

    const rectInfo = () => {
      const r = zone.getBoundingClientRect();
      cx = r.left + r.width/2;
      cy = r.top + r.height/2;
      rad = Math.max(40, Math.min(r.width, r.height) * 0.38);
    };

    const start = (e) => {
      rectInfo();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      activeId = t.identifier ?? "mouse";
      move(e);
    };

    const move = (e) => {
      if (activeId === null) return;
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = touches.find(tt => (tt.identifier ?? "mouse") === activeId);
      if (!t) return;

      const dx = clamp((t.clientX - cx) / rad, -1, 1);
      const dy = clamp((t.clientY - cy) / rad, -1, 1);

      if (which === "L") { ax.lx = dx; ax.ly = dy; }
      if (which === "R") { ax.rx = dx; ax.ry = dy; }

      setNub(nub, dx * rad * 0.55, dy * rad * 0.55);
      e.preventDefault?.();
    };

    const end = (e) => {
      if (activeId === null) return;
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const hit = touches.find(tt => (tt.identifier ?? "mouse") === activeId);
      if (!hit) return;

      activeId = null;
      if (which === "L") { ax.lx = 0; ax.ly = 0; }
      if (which === "R") { ax.rx = 0; ax.ry = 0; }
      setNub(nub, 0, 0);
      e.preventDefault?.();
    };

    zone.addEventListener("touchstart", start, { passive:false });
    zone.addEventListener("touchmove", move, { passive:false });
    zone.addEventListener("touchend", end, { passive:false });
    zone.addEventListener("touchcancel", end, { passive:false });

    // optional mouse testing
    zone.addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
  }

  function init({ leftZoneId, rightZoneId, leftNubId, rightNubId, touchRootId, log: L }) {
    log = L || log;
    rootEl = document.getElementById(touchRootId);
    lZone = document.getElementById(leftZoneId);
    rZone = document.getElementById(rightZoneId);
    lNub = document.getElementById(leftNubId);
    rNub = document.getElementById(rightNubId);

    enabled = isMobile();

    if (rootEl) rootEl.style.pointerEvents = enabled ? "auto" : "none";
    if (rootEl) rootEl.style.display = enabled ? "block" : "none";

    if (enabled) {
      bindZone(lZone, lNub, "L");
      bindZone(rZone, rNub, "R");
      log("[ui] touch sticks enabled ✅");
    } else {
      log("[ui] touch sticks disabled (not mobile) ✅");
    }
  }

  function getAxes() {
    return { ...ax };
  }

  return { init, getAxes };
})();
