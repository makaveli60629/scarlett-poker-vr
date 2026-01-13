// /js/bot_system.js — BotSystem v2.5 (FULL)
// ✅ Drives poker demo loop (deal/bet/reveal/winner)
// ✅ Respects global botsPaused/botsStep via tick dt being 0 in index.js
// ✅ Logs phases, never crashes if poker is missing

export const BotSystem = (() => {
  return {
    init(ctx, opt = {}) {
      const { THREE, log } = ctx;
      const state = {
        count: opt.count ?? 6,
        poker: opt.poker || null,
        seats: opt.seats || [],
        t: 0,
        phase: "idle",
        phaseT: 0,
        round: 0
      };

      log?.(`[bots] BotSystem v2.5 init ✅ bots=${state.count}`);

      function nextPhase(p) {
        state.phase = p;
        state.phaseT = 0;
        log?.(`[bots] ${p}`);
      }

      function startRound() {
        state.round++;
        if (state.poker?.resetRound) state.poker.resetRound();
        // deal 2 cards each
        if (state.poker?.dealToSeat) {
          for (let r = 0; r < 2; r++) {
            for (let i = 0; i < state.count; i++) state.poker.dealToSeat(i);
          }
          log?.("[bots] round start: dealt hole cards");
        }
        nextPhase("preflop");
      }

      function doBets(n = 6, amt = 25) {
        if (!state.poker?.bet) return;
        for (let i = 0; i < Math.min(n, state.count); i++) state.poker.bet(amt, i);
      }

      const api = {
        update(dt) {
          // if dt==0 (paused), do nothing
          if (!dt) return;
          state.t += dt;
          state.phaseT += dt;

          // If poker missing, just idle
          if (!state.poker) return;

          if (state.phase === "idle") {
            if (state.phaseT > 0.3) startRound();
          }

          if (state.phase === "preflop") {
            if (state.phaseT > 1.2) { doBets(state.count, 25); nextPhase("flop"); }
          }

          if (state.phase === "flop") {
            if (state.phaseT > 1.0) { state.poker?.revealCommunity?.(3); log?.("[bots] flop"); nextPhase("postflop"); }
          }

          if (state.phase === "postflop") {
            if (state.phaseT > 1.1) { doBets(state.count, 25); log?.("[bots] postflop bets"); nextPhase("turn"); }
          }

          if (state.phase === "turn") {
            if (state.phaseT > 1.0) { state.poker?.revealCommunity?.(4); log?.("[bots] turn"); nextPhase("river"); }
          }

          if (state.phase === "river") {
            if (state.phaseT > 1.0) { state.poker?.revealCommunity?.(5); log?.("[bots] river"); nextPhase("showdown"); }
          }

          if (state.phase === "showdown") {
            if (state.phaseT > 1.0) {
              const winner = (Math.random() * state.count) | 0;
              state.poker?.setWinner?.(winner);
              log?.(`[bots] showdown winner seat=${winner}`);
              nextPhase("idle");
            }
          }
        }
      };

      // kick off
      nextPhase("idle");
      return api;
    }
  };
})();
