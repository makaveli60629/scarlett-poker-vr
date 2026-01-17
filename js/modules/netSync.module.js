// /js/modules/netSync.module.js
// Future multiplayer sync layer (WebSocket/WebRTC) — FULL stub + event bus

export default {
  id: 'netSync.module.js',

  async init({ log }) {
    window.SCARLETT = window.SCARLETT || {};

    const api = {
      connected: false,
      connect: async (opts = {}) => {
        // placeholder: implement WS/WRTC later
        api.connected = true;
        api.last = { type: 'connect', opts, time: Date.now() };
        return true;
      },
      disconnect: () => {
        api.connected = false;
        api.last = { type: 'disconnect', time: Date.now() };
      },
      send: (type, payload) => {
        // placeholder
        api.last = { type: 'send', msgType: type, payload, time: Date.now() };
      }
    };

    window.SCARLETT.net = api;
    log?.('netSync.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.net;
    return { ok, note: ok ? 'net layer ready (stub)' : 'net missing' };
  }
};
