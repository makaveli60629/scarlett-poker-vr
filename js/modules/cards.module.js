// /js/modules/cards.module.js
// Deck / shuffle / deal utilities (FULL)

const SUITS = ['S','H','D','C'];
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  return deck;
}

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export default {
  id: 'cards.module.js',

  async init({ log }) {
    const state = {
      deck: shuffleInPlace(makeDeck()),
      discard: [],
      seed: null
    };

    const api = {
      newDeck: () => { state.deck = shuffleInPlace(makeDeck()); state.discard = []; },
      draw: () => {
        const c = state.deck.pop();
        if (!c) return null;
        return c;
      },
      burn: () => {
        const c = api.draw();
        if (c) state.discard.push(c);
        return c;
      },
      deal: (n) => {
        const out = [];
        for (let i = 0; i < n; i++) out.push(api.draw());
        return out;
      },
      state: () => ({ deckCount: state.deck.length, discardCount: state.discard.length })
    };

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.cards = api;

    log?.('cards.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.cards?.draw;
    return { ok, note: ok ? 'deck ready' : 'deck missing' };
  }
};
