// /js/poker_simulation.js — Watchable Poker Loop 9.0
// - Reveals community cards over time (flop/turn/river)
// - Randomly transfers chips and updates bot tags
// - Keeps the scene alive and understandable

export const PokerSimulation = {
  t: 0,
  phase: 0, // 0 pre, 1 flop, 2 turn, 3 river, 4 showdown
  pot: 0,

  init({ THREE, world, bots, log = console.log }) {
    this.THREE = THREE;
    this.world = world;
    this.bots = bots;
    this.log = log;

    this.t = 0;
    this.phase = 0;
    this.pot = 0;

    // ensure cards start hidden
    if (world.cards?.setRevealedCount) world.cards.setRevealedCount(0);
  },

  update(dt) {
    this.t += dt;

    // pulse hover cards
    if (this.world?.cards?.setPulse) this.world.cards.setPulse(this.t);

    // every ~2 seconds advance action
    if (this.t < 2.0) return;
    this.t = 0;

    if (this.phase === 0) {
      // new hand: reset pot
      this.pot = 0;
      if (this.world.cards?.setRevealedCount) this.world.cards.setRevealedCount(0);
      this._randomBetting();
      this.phase = 1;
      return;
    }

    if (this.phase === 1) {
      // flop
      if (this.world.cards?.setRevealedCount) this.world.cards.setRevealedCount(3);
      this._randomBetting();
      this.phase = 2;
      return;
    }

    if (this.phase === 2) {
      // turn
      if (this.world.cards?.setRevealedCount) this.world.cards.setRevealedCount(4);
      this._randomBetting();
      this.phase = 3;
      return;
    }

    if (this.phase === 3) {
      // river
      if (this.world.cards?.setRevealedCount) this.world.cards.setRevealedCount(5);
      this._randomBetting();
      this.phase = 4;
      return;
    }

    if (this.phase === 4) {
      // showdown: pick a winner among seated
      const seated = (this.bots?.bots || []).filter(b => b.userData?.bot?.seated);
      if (seated.length) {
        const w = seated[Math.floor(Math.random() * seated.length)];
        const id = w.userData.bot.id;

        // award pot
        w.userData.bot.stack += this.pot;
        if (this.bots?.setBotStack) this.bots.setBotStack(id, w.userData.bot.stack);

        this.log(`[Poker] Winner bot ${id} wins ${this.pot}`);
      }
      this.phase = 0;
    }
  },

  _randomBetting() {
    const seated = (this.bots?.bots || []).filter(b => b.userData?.bot?.seated);
    if (seated.length < 2) return;

    // choose 2-4 bettors
    const n = Math.min(seated.length, 2 + Math.floor(Math.random() * 3));
    const bettors = shuffle(seated).slice(0, n);

    for (const b of bettors) {
      const d = b.userData.bot;
      const bet = Math.min(d.stack, 50 + Math.floor(Math.random() * 150));
      d.stack -= bet;
      this.pot += bet;
      if (this.bots?.setBotStack) this.bots.setBotStack(d.id, d.stack);
    }
  }
};

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
