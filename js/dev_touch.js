// /js/dev_touch.js — Android / Mobile DEV Joysticks
// Returns move vector {x,y} and turn scalar

export function createDevTouch({ rootEl, moveEl, moveStickEl, turnEl, turnStickEl }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const enabled = isMobile; // show on mobile automatically

  if (!rootEl) return { enabled:false, getMove:()=>({x:0,y:0}), getTurn:()=>0 };

  rootEl.style.display = enabled ? "flex" : "none";

  const move = { x:0, y:0 };
  const turn = { x:0 };

  const bindJoy = (wrap, stick, out, mode) => {
    let active = false;
    let origin = { x:0, y:0 };
    let current = { x:0, y:0 };
    const maxR = 52;

    const setStick = (dx, dy) => {
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    const onDown = (e) => {
      active = true;
      const t = e.touches ? e.touches[0] : e;
      const r = wrap.getBoundingClientRect();
      origin.x = r.left + r.width/2;
      origin.y = r.top + r.height/2;
      current.x = t.clientX;
      current.y = t.clientY;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!active) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - origin.x;
      const dy = t.clientY - origin.y;
      const len = Math.hypot(dx, dy);
      const k = len > maxR ? (maxR / len) : 1;
      const sx = dx * k;
      const sy = dy * k;

      setStick(sx, sy);

      // normalize -1..1
      const nx = sx / maxR;
      const ny = sy / maxR;

      if (mode === "move") {
        out.x = nx;
        out.y = ny;
      } else if (mode === "turn") {
        out.x = nx; // turn uses x only
      }
      e.preventDefault();
    };

    const onUp = (e) => {
      active = false;
      out.x = 0;
      if (mode === "move") out.y = 0;
      setStick(0,0);
      e.preventDefault();
    };

    wrap.addEventListener("touchstart", onDown, { passive:false });
    wrap.addEventListener("touchmove", onMove, { passive:false });
    wrap.addEventListener("touchend", onUp, { passive:false });
    wrap.addEventListener("touchcancel", onUp, { passive:false });
  };

  bindJoy(moveEl, moveStickEl, move, "move");
  bindJoy(turnEl, turnStickEl, turn, "turn");

  return {
    enabled,
    getMove: () => ({ x: move.x, y: move.y }),
    getTurn: () => turn.x,
  };
}
