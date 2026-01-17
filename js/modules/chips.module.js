// /js/modules/chips.module.js
// Chip accounting: stacks, bets, pot, payout (FULL)

export default {
  id: 'chips.module.js',

  async init({ log }) {
    const seatCount = window.SCARLETT?.table?.data?.seats || 6;

    const state = {
      stacks: Array.from({ length: seatCount }, () => 1000),
      bets: Array.from({ length: seatCount }, () => 0),
      pot: 0
    };

    const api = {
      get: () => JSON.parse(JSON.stringify(state)),
      setStack: (seat, amt) => { state.stacks[seat] = Math.max(0, amt|0); },
      bet: (seat, amt) => {
        amt = Math.max(0, amt|0);
        const can = Math.min(state.stacks[seat], amt);
        state.stacks[seat] -= can;
        state.bets[seat] += can;
        return can;
      },
      toPot: () => {
        let moved = 0;
        for (let i = 0; i < seatCount; i++) {
          moved += state.bets[i];
          state.bets[i] = 0;
        }
        state.pot += moved;
        return moved;
      },
      payout: (seat, amt) => {
        amt = Math.max(0, amt|0);
        const pay = Math.min(state.pot, amt);
        state.pot -= pay;
        state.stacks[seat] += pay;
        return pay;
      },
      resetHand: () => {
        state.bets.fill(0);
        state.pot = 0;
      }
    };

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.chips = api;

    log?.('chips.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.chips?.bet;
    return { ok, note: ok ? 'chips ready' : 'chips missing' };
  }
};
