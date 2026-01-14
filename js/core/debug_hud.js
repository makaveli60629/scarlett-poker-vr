// /js/core/debug_hud.js — ScarlettVR Prime 10.0 (FULL)
// HUD log + status + performance tick hooks
// Writes to #hud-log and window.__HUD_SET if present

export const DebugHUD = (() => {
  const buf = [];
  const MAX = 220;

  const getEl = () => document.getElementById("hud-log");

  function write(line) {
    buf.push(line);
    if (buf.length > MAX) buf.shift();
    const el = getEl();
    if (el) el.textContent = buf.join("\n");
  }

  function ts() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // perf
  let lastT = performance.now();
  let acc = 0, frames = 0;
  let fps = 0;

  return {
    log(m) {
      const line = `[${ts()}] ${String(m)}`;
      console.log(line);
      write(line);
    },

    setRoom(room) {
      try { window.__HUD_SET?.("room", room); } catch {}
    },

    setPos(pos) {
      try { window.__HUD_SET?.("pos", pos); } catch {}
    },

    setXR(xr) {
      try { window.__HUD_SET?.("xr", xr); } catch {}
    },

    setStatus(text) {
      try { window.__SET_BOOT_STATUS?.(text); } catch {}
    },

    perfTick() {
      const t = performance.now();
      const dt = Math.min(0.25, (t - lastT) / 1000);
      lastT = t;
      acc += dt;
      frames++;

      if (acc >= 0.6) {
        fps = Math.round(frames / acc);
        frames = 0;
        acc = 0;
      }

      // optionally show fps in footer via pos/xr labels
      // (keep light; no DOM spam)
    },

    dump() {
      return buf.slice();
    }
  };
})();
