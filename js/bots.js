// Update B Bots: still "normal/passive" by default,
// but now can do small bets/raises sometimes.
// No cheating: bots only use their own hole cards + public state.

const RANK_VAL = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };

function holeStrength(hole){
  const a = RANK_VAL[hole[0].r];
  const b = RANK_VAL[hole[1].r];
  const hi = Math.max(a,b);
  const lo = Math.min(a,b);
  const suited = hole[0].s === hole[1].s;
  const pair = (a===b);
  if (pair) return 120 + hi; // pairs
  let score = hi*4 + lo*2 + (suited ? 6 : 0);
  if (Math.abs(a-b)===1) score += 4;
  if (Math.abs(a-b)===2) score += 2;
  return score;
}

export class BotController {
  constructor(engine, opts={}){
    this.engine = engine;
    this.thinkMin = opts.thinkMin ?? 0.8;
    this.thinkMax = opts.thinkMax ?? 1.7;

    // personality: keep it calm
    this.raiseChance = opts.raiseChance ?? 0.12; // low
    this.betChance   = opts.betChance   ?? 0.10; // low

    this._cooldown = 0;
    this._pending = null;
  }

  update(dt){
    const st = this.engine.getPublicState();
    if (st.street === "IDLE") return;

    const turn = st.turn;
    if (turn === 0) return; // you

    if (!this._pending || this._pending.seatIdx !== turn){
      const hole = this.engine.getSeatHoleCards(turn);
      const hs = holeStrength(hole);

      const seat = st.seats[turn];
      const toCall = Math.max(0, st.currentBet - seat.streetBet);

      let action = "CALL"; // default

      // Fold some trash preflop facing a call
      if (st.street === "PREFLOP" && toCall > 0 && hs < 44 && Math.random() < 0.55) {
        action = "FOLD";
      } else {
        // Sometimes bet when checked to
        if (st.currentBet === 0 && Math.random() < this.betChance && hs >= 55) {
          action = "BET";
        }
        // Sometimes raise when strong
        if (st.currentBet > 0 && Math.random() < this.raiseChance && hs >= 70) {
          action = "RAISE";
        }
        // Rare postflop fold facing a call (keeps it believable)
        if (st.street !== "PREFLOP" && toCall > 0 && Math.random() < 0.10 && hs < 52) {
          action = "FOLD";
        }
      }

      this._pending = { seatIdx: turn, action, hs };
      this._cooldown = this.thinkMin + Math.random()*(this.thinkMax - this.thinkMin);
    }

    this._cooldown -= dt;
    if (this._cooldown > 0) return;

    const { seatIdx, action } = this._pending;
    this._pending = null;

    if (action === "FOLD") return this.engine.actFold(seatIdx);

    // bet sizing: simple and safe
    const st2 = this.engine.getPublicState();
    const bb = 2000; // matches your default; you can wire this later if desired

    if (action === "BET") {
      // bet to 1bb or 2bb occasionally
      const toAmt = Math.random() < 0.7 ? bb : bb*2;
      return this.engine.actBetRaiseTo(seatIdx, toAmt);
    }

    if (action === "RAISE") {
      // raise to minRaiseTo (or small bump)
      const bump = (Math.random() < 0.6) ? 0 : bb; // sometimes tiny extra
      const toAmt = (st2.minRaiseTo || (st2.currentBet + bb)) + bump;
      return this.engine.actBetRaiseTo(seatIdx, toAmt);
    }

    // otherwise call/check
    const canCheck = (st2.currentBet === st2.seats[seatIdx].streetBet);
    if (canCheck) this.engine.actCheck(seatIdx);
    else this.engine.actCall(seatIdx);
  }
}
