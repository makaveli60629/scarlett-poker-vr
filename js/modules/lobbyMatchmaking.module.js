// /js/modules/lobbyMatchmaking.module.js
// Matchmaking state machine (FULL stub)

export default {
  id: 'lobbyMatchmaking.module.js',

  async init({ log }) {
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.matchmaking = {
      state: 'idle',
      queue: async () => { window.SCARLETT.matchmaking.state = 'queued'; },
      cancel: async () => { window.SCARLETT.matchmaking.state = 'idle'; },
      joinTable: async (tableId) => { window.SCARLETT.matchmaking.state = `joined:${tableId}`; }
    };
    log?.('lobbyMatchmaking.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.matchmaking;
    return { ok, note: ok ? 'matchmaking ready (stub)' : 'matchmaking missing' };
  }
};
