// /js/poker_simulation.js — Crash-safe placeholder poker loop
// This will later become your real poker engine.
// For now it just logs “rounds” and keeps everything stable.

export const PokerSimulation = {
  bots: null,
  world: null,
  t: 0,
  round: 0,

  init({ bots, world }) {
    this.bots = bots;
    this.world = world;
    this.t = 0;
    this.round = 0;
  },

  update(dt) {
    this.t += dt;
    if (this.t >= 15) {
      this.t = 0;
      this.round++;
      // future: deal cards, pot, betting, etc.
      // current: just keep heartbeat alive
      // console.log(`[Poker] Round ${this.round}`);
    }
  }
};
