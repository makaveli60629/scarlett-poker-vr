// /js/core/persistence.js — Prime 10.0 (FULL)
// Saves dev flags + last room + bot speed.

export const Persistence = (() => {
  const KEY = "scarlett_prime_10";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state || {})); } catch {}
  }

  return { load, save };
})();
