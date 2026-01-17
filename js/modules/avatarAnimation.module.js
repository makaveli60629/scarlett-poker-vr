// /js/modules/avatarAnimation.module.js
// Idle/look-at + simple betting/check gesture hooks (FULL)

export default {
  id: 'avatarAnimation.module.js',

  async init({ log }) {
    // Event-driven: other systems can call SCARLETT.avatarAnim.play(seat, action)
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatarAnim = {
      play: (seat, action) => {
        // placeholder for more detailed rigs
        window.SCARLETT.avatarAnim.last = { seat, action, time: Date.now() };
      },
      last: null
    };
    log?.('avatarAnimation.module ✅');
  },

  update(dt) {
    // For now, the bots already breathe in avatars.module.js
  },

  test() {
    const ok = !!window.SCARLETT?.avatarAnim?.play;
    return { ok, note: ok ? 'avatar animation hooks ready' : 'missing avatar animation API' };
  }
};
