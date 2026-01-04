// Very simple passive bots for Update A.
// NO cheating: they only use their own hole cards + public state.
// Update B/C will add better logic and raises.

const RANK_VAL = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };

function holeStrength(hole){
  // hole: [{r,s},{r,s}]
  const a = RANK_VAL[hole[0].r];
  const b = RANK_VAL[hole[1].r];
  const hi = Math.max(a,b);
  const lo = Math.min(a,b);
  const suited = hole[0].s === hole[1].s;

  const pair = (a===b);
  if (pair) return 100 + hi;              // pairs strongest
  let score = hi*4 + lo*2 + (suited ? 6 : 0);
  // small bonus for connectors
  if (Math.abs(a-b)===1) score += 4;
  if (Math.abs(a-b)===2) score += 2;
  return score;
}

export class BotController {
  constructor(engine, opts={}){
    this.engine = engine;
    this.thinkMin = opts.thinkMin ?? 0.7;
    this.thinkMax = opts.thinkMax ?? 1.6;

    this._cooldown = 0;
    this._pending = null; // {seatIdx, action}
  }

  update(dt){
    // If not in a hand, do nothing.
    const st = this.engine.getPublicState();
    if (st.street === "IDLE") return;

    // If it's not a bot's turn, do nothing.
    const turn = st.turn;
    if (turn === 0) return; // local player turn

    // Plan once per turn
    if (!this._pending || this._pending.seatIdx !== turn){
      const hole = this.engine.getSeatHoleCards(turn); // engine gives private hole cards for that seat
      const hs = holeStrength(hole);

      // Passive logic:
      // - Preflop: fold weak hands sometimes if facing a call
      // - Otherwise check/call
      const toCall = Math.max(0, st.currentToCall - st.seats[turn].bet);

      let action = "CALL";
      if (toCall > 0 && st.street === "PREFLOP") {
        // fold low strength occasionally
        if (hs < 42 && Math.random() < 0.55) action = "FOLD";
        else action = "CALL";
      } else {
        // postflop: almost always check/call; rare fold on random (keeps it realistic)
        if (toCall > 0 && Math.random() < 0.12) action = "FOLD";
        else action = "CALL";
      }

      this._pending = { seatIdx: turn, action };
      this._cooldown = this.thinkMin + Math.random()*(this.thinkMax - this.thinkMin);
    }

    this._cooldown -= dt;
    if (this._cooldown > 0) return;

    // Execute action
    const { seatIdx, action } = this._pending;
    this._pending = null;

    if (action === "FOLD") this.engine.actFold(seatIdx);
    else this.engine.actCheckOrCall(seatIdx);
  }
}
