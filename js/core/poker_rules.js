// /js/systems/poker_rules.js — Prime 10.0 (FULL)
// Pure logic state machine. No rendering. Emits GAME_STATE + deal/reveal/bet requests.
// Driven by Signals (BOT_ACTION, GAME_INIT, GAME_RESET).

export const PokerRules = (() => {
  const STREETS = ["PREFLOP", "FLOP", "TURN", "RIVER", "SHOWDOWN"];

  function init({ Signals, manifest, log }) {
    const seats = manifest.get("poker.seats") ?? 6;

    const state = {
      seats,
      street: "PREFLOP",
      dealer: 0,
      turn: 0,
      pot: 0,
      toCall: 0,
      stacks: Array(seats).fill(1000),
      inHand: Array(seats).fill(true),
      acted: Array(seats).fill(false),
      communityUpTo: 0,
      round: 0,
      minRaise: 25
    };

    function emitState() {
      Signals.emit("GAME_STATE", { state: { ...state, stacks:[...state.stacks], inHand:[...state.inHand] } });
    }

    function resetRound() {
      state.round++;
      state.street = "PREFLOP";
      state.pot = 0;
      state.toCall = 25;
      state.inHand.fill(true);
      state.acted.fill(false);
      state.communityUpTo = 0;
      state.turn = (state.dealer + 1) % state.seats;

      // ask visuals to reset
      Signals.emit("GAME_RESET", {});
      // deal 2 to each
      for (let s = 0; s < state.seats; s++) Signals.emit("DEAL_REQUEST", { toSeat: s, count: 2 });

      Signals.emit("UI_MESSAGE", { text: `New hand #${state.round}`, level:"info" });
      emitState();
    }

    function nextActive(from) {
      for (let i=1;i<=state.seats;i++){
        const k = (from + i) % state.seats;
        if (state.inHand[k]) return k;
      }
      return from;
    }

    function allActedOrFolded() {
      for (let i=0;i<state.seats;i++){
        if (!state.inHand[i]) continue;
        if (!state.acted[i]) return false;
      }
      return true;
    }

    function advanceStreet() {
      const idx = STREETS.indexOf(state.street);
      const next = STREETS[Math.min(idx + 1, STREETS.length - 1)];
      state.street = next;
      state.acted.fill(false);
      state.toCall = 0;

      if (next === "FLOP") { state.communityUpTo = 3; Signals.emit("REVEAL_REQUEST", { street:"FLOP" }); }
      if (next === "TURN") { state.communityUpTo = 4; Signals.emit("REVEAL_REQUEST", { street:"TURN" }); }
      if (next === "RIVER") { state.communityUpTo = 5; Signals.emit("REVEAL_REQUEST", { street:"RIVER" }); }

      if (next === "SHOWDOWN") {
        const winner = pickWinner();
        Signals.emit("WINNER", { seat: winner, pot: state.pot });
        Signals.emit("UI_MESSAGE", { text:`Winner: seat ${winner}`, level:"info" });
        // start new hand shortly (bots will keep flow)
        return;
      }

      state.turn = nextActive(state.dealer);
      emitState();
    }

    function pickWinner() {
      // placeholder winner selection among active seats
      const alive = [];
      for (let i=0;i<state.seats;i++) if (state.inHand[i]) alive.push(i);
      if (!alive.length) return 0;
      return alive[(Math.random() * alive.length) | 0];
    }

    function applyAction(seat, action, amount = 0) {
      if (!state.inHand[seat]) return;
      if (action === "FOLD") {
        state.inHand[seat] = false;
        state.acted[seat] = true;
      } else if (action === "CHECK") {
        state.acted[seat] = true;
      } else if (action === "CALL") {
        const pay = Math.min(state.toCall, state.stacks[seat]);
        state.stacks[seat] -= pay;
        state.pot += pay;
        Signals.emit("BET_REQUEST", { seat, amount: pay });
        state.acted[seat] = true;
      } else if (action === "RAISE") {
        const raiseTo = Math.max(state.minRaise, amount|0);
        state.toCall = raiseTo;
        const pay = Math.min(raiseTo, state.stacks[seat]);
        state.stacks[seat] -= pay;
        state.pot += pay;
        Signals.emit("BET_REQUEST", { seat, amount: pay });
        // reset acted for others
        for (let i=0;i<state.seats;i++) if (i!==seat && state.inHand[i]) state.acted[i] = false;
        state.acted[seat] = true;
      }

      state.turn = nextActive(seat);
      if (allActedOrFolded()) advanceStreet();
      emitState();
    }

    Signals.on("GAME_INIT", resetRound);
    Signals.on("GAME_RESET", () => { /* visuals reset already handled */ });

    Signals.on("BOT_ACTION", (p) => {
      applyAction(p.seat|0, String(p.action||"CHECK"), p.amount|0);
    });

    // Manual UI actions (optional)
    Signals.on("UI_CLICK", (p) => {
      if (p?.id === "NEW_HAND") resetRound();
    });

    log?.("[rules] PokerRules Prime 10.0 init ✅");
    return { state, resetRound };
  }

  return { init };
})();
