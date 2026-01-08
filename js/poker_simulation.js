// /js/poker_simulation.js — Watchable Poker Loop (simple, visible, stable)
// ✅ NO imports — uses injected bots/world.

export const PokerSimulation = {
  ui: null,
  t: 0,
  seatTurn: 0,
  pot: 0,
  phase: "preflop",
  timer: 0,

  init({ bots, world }) {
    this.t = 0;
    this.seatTurn = 0;
    this.pot = 0;
    this.phase = "preflop";
    this.timer = 0;

    // world.pokerView is created in world.js
    this.ui = world?.pokerUI || null;

    // kick off
    this.pot = 150;
    this._setAction("Dealer shuffles…");
    if (bots?.setTurn) bots.setTurn(this.seatTurn);
  },

  update(dt) {
    this.t += dt;
    this.timer += dt;

    // each action every ~3 seconds
    if (this.timer >= 3.2) {
      this.timer = 0;

      const actionRoll = Math.random();
      let action = "checks";
      let amt = 0;

      if (actionRoll < 0.25) { action = "calls"; amt = 50 + Math.floor(Math.random()*3)*50; }
      else if (actionRoll < 0.50) { action = "raises"; amt = 100 + Math.floor(Math.random()*6)*50; }
      else if (actionRoll < 0.65) { action = "folds"; amt = 0; }
      else { action = "checks"; amt = 0; }

      if (amt) this.pot += amt;

      // phase advance every full table rotation
      if (this.seatTurn === 5) {
        if (this.phase === "preflop") this.phase = "flop";
        else if (this.phase === "flop") this.phase = "turn";
        else if (this.phase === "turn") this.phase = "river";
        else if (this.phase === "river") this.phase = "showdown";
        else this.phase = "preflop";
      }

      // showdown winner
      if (this.phase === "showdown") {
        const winner = 1 + Math.floor(Math.random() * 6);
        this._setAction(`BOT ${winner} WINS! (Pot ${this.pot})`);
        this.pot = 150;
        this.phase = "preflop";
      } else {
        const seatHuman = this.seatTurn + 1;
        if (amt) this._setAction(`BOT ${seatHuman} ${action} ${amt} • ${this.phase.toUpperCase()}`);
        else this._setAction(`BOT ${seatHuman} ${action} • ${this.phase.toUpperCase()}`);
      }

      // next seat
      this.seatTurn = (this.seatTurn + 1) % 6;

      // highlight turn ring
      if (world?.bots?.setTurn) world.bots.setTurn(this.seatTurn);

      // update pot text
      if (world?.setPotText) world.setPotText(`POT: ${this.pot}`);
    }
  },

  _setAction(text) {
    if (this.ui?.setLine) this.ui.setLine(text);
  }
};
