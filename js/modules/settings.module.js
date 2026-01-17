// /js/modules/settings.module.js
// Settings state + persistence (FULL)

export default {
  id: 'settings.module.js',

  async init({ log }) {
    const KEY = 'SCARLETT_SETTINGS_V1';
    const defaults = {
      volume: 0.55,
      snapTurn: 45,
      locomotion: 'smooth',
      comfortVignette: false
    };

    let state = defaults;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign({}, defaults, JSON.parse(raw));
    } catch (_) {}

    const save = () => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    };

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.settings = {
      get: () => ({ ...state }),
      set: (patch) => { state = Object.assign({}, state, patch || {}); save(); },
      reset: () => { state = { ...defaults }; save(); }
    };

    log?.('settings.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.settings?.get;
    return { ok, note: ok ? 'settings ready' : 'settings missing' };
  }
};
