// /js/poker_simulation.js — Crash-safe placeholder poker loop (FIXED)
// Works even if update/tick is called unbound (no `this` reliance).

export const PokerSimulation = {
  // state
  bots: null,
  world: null,
  t: 0,
  round: 0,

  // accept ANY init signature your world uses
  init(args = {}) {
    // args may be: { bots, world } OR { THREE, scene, getSeats, tableFocus, world, log }
    const world = args.world || null;

    // Try to discover bots from common places
    const bots =
      args.bots ||
      world?.bots ||
      world?.Bots ||
      world?.botSystem ||
      null;

    this.bots = bots;
    this.world = world;
    this.t = 0;
    this.round = 0;

    // optional debug
    if (args.log) args.log("[PokerSimulation] init ✅");
  },

  // IMPORTANT: do NOT use `this` inside tick/update if it might be called unbound.
  // So we reference the object directly.
  update(dt = 0) {
    PokerSimulation.t += dt;

    if (PokerSimulation.t >= 15) {
      PokerSimulation.t = 0;
      PokerSimulation.round++;

      // future: deal cards, pot, betting, etc.
      // for now: heartbeat only (safe)
      // console.log(`[Poker] Round ${PokerSimulation.round}`);
    }
  },

  // Some code uses tick() instead of update()
  tick(dt = 0) {
    PokerSimulation.update(dt);
  },
};
