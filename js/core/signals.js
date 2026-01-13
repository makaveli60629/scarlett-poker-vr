// /js/core/signals.js — ScarlettVR Prime 10.0 (FULL)
// Global event bus. Systems must ONLY communicate via Signals.emit/on/off.

export const Signals = (() => {
  const map = new Map();

  function on(name, fn) {
    if (!map.has(name)) map.set(name, new Set());
    map.get(name).add(fn);
    return () => off(name, fn);
  }

  function off(name, fn) {
    const set = map.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) map.delete(name);
  }

  function emit(name, payload = {}) {
    const set = map.get(name);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (e) {
        // Bus must never crash the app
        console.warn("[Signals] listener error", name, e);
      }
    }
  }

  function clear() { map.clear(); }

  return { on, off, emit, clear };
})();
