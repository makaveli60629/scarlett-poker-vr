// /js/systems/bot_ai.js — Prime 10.0 (FULL)

export class PokerBot {
  constructor(name, seat, aggression = 0.5) {
    this.name = name;
    this.seat = seat;
    this.aggression = Math.max(0, Math.min(1, aggression));
  }

  decide(gameState) {
    const r = Math.random();
    if (r < 0.10) return { action: "FOLD" };
    if (r < (0.65 - this.aggression * 0.25)) return { action: "CALL" };
    return { action: "RAISE", amount: gameState?.minRaise ?? 25 };
  }
}
