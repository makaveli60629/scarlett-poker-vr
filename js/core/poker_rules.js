// /js/core/poker_rules.js — ScarlettVR Prime 10.0 (FULL)
// Lightweight Texas Hold'em round state machine for demo play.
// Real hand evaluation can be added later; this focuses on flow + events.

export const PokerRules = (() => {
  const STREETS = ["PREFLOP", "FLOP", "TURN", "RIVER", "SHOWDOWN"];

  return {
    init({ Signals, manifest, log }) {
      const state = {
        street: "PREFLOP",
        handId: 0,
        seed: 0,
        pot: 0,
        button: 0,
        players: Array.from({ length: 6 }).map((_, i) => ({
          seat: i,
          stack: 1000,
          inHand: true,
          bet: 0
        }))
      };

      function resetHand(seed = Date.now()) {
        state.handId++;
        state.seed = seed;
        state.street = "PREFLOP";
        state.pot = 0;
        state.players.forEach(p => { p.inHand = true; p.bet = 0; });
        Signals.emit("POKER_RESET", { handId: state.handId, seed });
        Signals.emit("POKER_STREET", { street: state.street });
        log?.(`[rules] reset hand=${state.handId} seed=${seed}`);
      }

      function nextStreet() {
        const idx = STREETS.indexOf(state.street);
        if (idx < 0) return;
        const next = STREETS[Math.min(idx + 1, STREETS.length - 1)];
        state.street = next;
        Signals.emit("POKER_STREET", { street: state.street });
        log?.(`[rules] street=${state.street}`);

        if (state.street === "SHOWDOWN") {
          // pick winner seat naïvely (demo)
          const alive = state.players.filter(p => p.inHand);
          const winner = alive[(Math.random() * alive.length) | 0]?.seat ?? 0;
          Signals.emit("POKER_WINNER", { seat: winner });
          log?.(`[rules] winner seat=${winner}`);
        }
      }

      function addToPot(seat, amount) {
        const p = state.players[seat | 0];
        if (!p || !p.inHand) return;
        const a = Math.max(0, amount | 0);
        const pay = Math.min(p.stack, a);
        p.stack -= pay;
        p.bet += pay;
        state.pot += pay;
        Signals.emit("POKER_BET", { seat: p.seat, amount: pay, pot: state.pot });
      }

      Signals.on("GAME_INIT", (p) => {
        resetHand(p?.seed ?? Date.now());
        // start dealing (system handles visuals)
        Signals.emit("POKER_DEAL", { seatCount: state.players.length });
      });

      Signals.on("RULES_NEXT", () => nextStreet());
      Signals.on("RULES_BET", (p) => addToPot(p?.seat ?? 0, p?.amount ?? 0));

      log?.("[rules] PokerRules Prime 10.0 init ✅");

      return {
        state,
        resetHand,
        nextStreet,
        bet: addToPot
      };
    }
  };
})();
