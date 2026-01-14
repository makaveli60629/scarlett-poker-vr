// /js/core/persistence.js — ScarlettVR Prime 10.0 (FULL)
// Safe localStorage persistence with versioned key

const KEY = "scarlett_vr_prime_10";

export const Persistence = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  save(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj || {}));
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  }
};
