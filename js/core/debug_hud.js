// /js/core/debug_hud.js — Prime 10.0 (FULL)
// HUD hooks + perf + safe logging. Uses existing index.html HUD elements.

export const DebugHUD = (() => {
  const out = [];
  let frames = 0;
  let lastFpsT = performance.now();
  let lastFps = 0;

  function log(line) {
    const msg = String(line);
    out.push(msg);
    if (out.length > 260) out.splice(0, out.length - 260);
    console.log(msg);
    if (typeof window.__HTML_LOG === "function") {
      try { window.__HTML_LOG(msg); } catch {}
    }
  }

  function setHealth(s) { window.SCARLETT_UI?.setHealth?.(s); }
  function setRoom(s)   { window.SCARLETT_UI?.setRoom?.(s); }
  function setPos(s)    { window.SCARLETT_UI?.setPos?.(s); }
  function setXR(s)     { window.SCARLETT_UI?.setXR?.(s); }
  function setBots(s)   { window.SCARLETT_UI?.setBots?.(s); }
  function status(s)    { if (typeof window.__SET_BOOT_STATUS === "function") window.__SET_BOOT_STATUS(s); }

  function perfTick() {
    const t = performance.now();
    frames++;
    if (t - lastFpsT > 500) {
      lastFps = Math.round(frames * 1000 / (t - lastFpsT));
      frames = 0;
      lastFpsT = t;
      window.SCARLETT_UI?.setPerf?.(`fps: ${lastFps}`);
    }
  }

  function dump(obj) {
    try { log(`[dump] ${JSON.stringify(obj)}`); }
    catch { log("[dump] failed"); }
  }

  return { log, status, setHealth, setRoom, setPos, setXR, setBots, perfTick, dump };
})();
