/**
 * Multiplayer sync hooks (client-side bridge).
 * This module does NOT implement a server; it provides a stable API + events to plug one in.
 */
export function createNetHooks({ roomId='lobby', playerId='local' } = {}) {
  const listeners = new Map();

  function on(type, fn) {
    const arr = listeners.get(type) || [];
    arr.push(fn);
    listeners.set(type, arr);
    return () => off(type, fn);
  }

  function off(type, fn) {
    const arr = listeners.get(type) || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
    listeners.set(type, arr);
  }

  function emit(type, payload) {
    (listeners.get(type) || []).forEach(fn => { try { fn(payload); } catch(e) {} });
    window.dispatchEvent(new CustomEvent('scarlett:net_emit', { detail: { roomId, playerId, type, payload } }));
  }

  return { roomId, playerId, on, off, emit };
}
