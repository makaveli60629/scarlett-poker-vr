// /js/systems/bot_system.js — Prime 10.0 (FULL)
// Schedules bots. Listens to GAME_STATE and decides when it's bot's turn.
// Emits BOT_ACTION only (never calls rules directly).

import { PokerBot } from "./bot_ai.js";

export const BotSystem = (() => {
  function init({ Signals, manifest, log }) {
    const seats = manifest.get("poker.seats") ?? 6;

    const bots = [];
    for (let i=0;i<seats;i++){
      bots.push(new PokerBot(`Bot${i}`, i, 0.35 + (i/seats)*0.4));
    }

    const state = {
      lastGameState: null,
      thinkT: 0,
      thinkDelay: 0.35
    };

    function onGameState(p) {
      state.lastGameState = p?.state || null;
    }

    function update(dt) {
      if (!dt) return;
      const gs = state.lastGameState;
      if (!gs) return;

      state.thinkT += dt;
      if (state.thinkT < state.thinkDelay) return;
      state.thinkT = 0;

      const turn = gs.turn|0;
      if (!gs.inHand?.[turn]) return;

      const bot = bots[turn];
      if (!bot) return;

      const decision = bot.decide(gs);
      Signals.emit("BOT_ACTION", { seat: turn, action: decision.action, amount: decision.amount || 0 });
    }

    Signals.on("GAME_STATE", onGameState);

    log?.("[bots] BotSystem Prime 10.0 init ✅");
    return { update };
  }

  return { init };
})();
