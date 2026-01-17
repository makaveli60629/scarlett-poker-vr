// /js/modules/avatarCustomization.module.js
// Simple customization API (colors / name) (FULL)

export default {
  id: 'avatarCustomization.module.js',

  async init({ log }) {
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatarStyle = {
      setSeatName: (seat, name) => {
        window.SCARLETT.avatarStyle.names = window.SCARLETT.avatarStyle.names || {};
        window.SCARLETT.avatarStyle.names[seat] = String(name || '');
      },
      setSeatColor: (seat, hex) => {
        window.SCARLETT.avatarStyle.colors = window.SCARLETT.avatarStyle.colors || {};
        window.SCARLETT.avatarStyle.colors[seat] = hex;
      },
      names: {},
      colors: {}
    };
    log?.('avatarCustomization.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.avatarStyle?.setSeatName;
    return { ok, note: ok ? 'customization API ready' : 'customization missing' };
  }
};
