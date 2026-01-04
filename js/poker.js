import { makeDeck, shuffle } from './cards.js';

// ===== Hand evaluator (same as Update A) =====
const RANK_VAL = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };
const SUIT_IDX = { "S":0,"H":1,"D":2,"C":3 };

function sortDesc(a,b){ return b-a; }

function eval7(cards) {
  const ranks = cards.map(c => RANK_VAL[c.r]).sort(sortDesc);
  const suits = cards.map(c => SUIT_IDX[c.s]);

  const count = new Map();
  for (const r of ranks) count.set(r, (count.get(r)||0)+1);

  const uniq = Array.from(new Set(ranks)).sort(sortDesc);

  const suitCount = [0,0,0,0];
  for (const si of suits) suitCount[si]++;
  const flushSuit = suitCount.findIndex(n => n >= 5);

  let flushRanks = null;
  if (flushSuit !== -1) {
    flushRanks = cards.filter(c => SUIT_IDX[c.s]===flushSuit).map(c=>RANK_VAL[c.r]).sort(sortDesc);
  }

  function bestStraight(rs) {
    const u = Array.from(new Set(rs)).sort(sortDesc);
    if (u.includes(14)) u.push(1);
    for (let i=0;i<u.length-4;i++){
      const a = u[i];
      if (u[i+1]===a-1 && u[i+2]===a-2 && u[i+3]===a-3 && u[i+4]===a-4) return a;
    }
    return null;
  }

  const straightHigh = bestStraight(ranks);
  const straightFlushHigh = flushRanks ? bestStraight(flushRanks) : null;

  const groups = Array.from(count.entries())
    .map(([r,n])=>({r,n}))
    .sort((A,B)=> (B.n - A.n) || (B.r - A.r));

  const isFour = groups[0]?.n===4;
  const isThree = groups[0]?.n===3;
  const isPair  = groups[0]?.n===2;

  if (straightFlushHigh) {
    const name = (straightFlushHigh===14) ? "Royal Flush" : "Straight Flush";
    return { score: 9e9 + straightFlushHigh*1e6, name };
  }

  if (isFour) {
    const quad = groups[0].r;
    const kicker = uniq.find(r => r !== quad);
    return { score: 8e9 + quad*1e6 + kicker*1e3, name:"Four of a Kind" };
  }

  if (isThree) {
    const trips = groups[0].r;
    const pair = groups.find(g => g.n>=2 && g.r!==trips)?.r;
    if (pair) return { score: 7e9 + trips*1e6 + pair*1e3, name:"Full House" };
  }

  if (flushRanks) {
    const top5 = flushRanks.slice(0,5);
    const pack = top5[0]*1e8 + top5[1]*1e6 + top5[2]*1e4 + top5[3]*1e2 + top5[4];
    return { score: 6e9 + pack, name:"Flush" };
  }

  if (straightHigh) {
    return { score: 5e9 + straightHigh*1e6, name:"Straight" };
  }

  if (isThree) {
    const trips = groups[0].r;
    const kickers = uniq.filter(r => r!==trips).slice(0,2);
    return { score: 4e9 + trips*1e6 + kickers[0]*1e3 + kickers[1], name:"Three of a Kind" };
  }

  const pairs = groups.filter(g=>g.n===2).map(g=>g.r).sort(sortDesc);
  if (pairs.length>=2) {
    const [p1,p2] = pairs;
    const kicker = uniq.find(r => r!==p1 && r!==p2);
    return { score: 3e9 + p1*1e6 + p2*1e3 + kicker, name:"Two Pair" };
  }

  if (isPair) {
    const p = groups[0].r;
    const kickers = uniq.filter(r=>r!==p).slice(0,3);
    return { score: 2e9 + p*1e6 + kickers[0]*1e4 + kickers[1]*1e2 + kickers[2], name:"One Pair" };
  }

  const top5 = uniq.slice(0,5);
  const pack = top5[0]*1e8 + top5[1]*1e6 + top5[2]*1e4 + top5[3]*1e2 + top5[4];
  return { score: 1e9 + pack, name:"High Card" };
}

// ===== Engine =====
export class PokerEngine {
  constructor(opts={}) {
    this.maxSeats = opts.maxSeats ?? 6;

    this.smallBlind = opts.smallBlind ?? 1000;
    this.bigBlind   = opts.bigBlind   ?? 2000;
    this.ante       = opts.ante       ?? 250;

    this.startStack = opts.startStack ?? 200000;

    this.seats = Array.from({length:this.maxSeats}, (_,i)=>this._makeSeat(i));

    this.dealer = 0;
    this.turn = 0;
    this.street = "IDLE"; // PREFLOP/FLOP/TURN/RIVER/SHOWDOWN/IDLE

    this.community = [];
    this.deck = [];
    this.handId = 0;

    // Betting state
    this.currentBet = 0;      // highest street bet
    this.minRaiseTo = 0;      // minimum "to" amount for next raise
    this.lastAggressor = null; // seat index of last raise/bet
    this.actionLog = [];

    // Callbacks
    this.onState = null; // (publicState)=>void
    this.onLog = null;   // (msg)=>void
  }

  _makeSeat(i){
    return {
      i,
      name: `Seat${i}`,
      isBot: i !== 0,
      stack: this.startStack,
      inHand: true,
      folded: false,
      allIn: false,
      cards: [],
      streetBet: 0,   // bet in current betting round
      committed: 0,   // total committed this hand
      acted: false    // acted since last aggression
    };
  }

  setSeatName(idx, name){ this.seats[idx].name = name; }

  log(msg){
    this.actionLog.push(msg);
    if (this.onLog) this.onLog(msg);
  }

  // ===== Hand flow =====
  startHand(){
    this.handId++;
    this.street = "PREFLOP";
    this.community = [];
    this.deck = shuffle(makeDeck());
    this.actionLog = [];

    // reset seats
    for (const s of this.seats){
      if (s.stack <= 0){
        s.inHand = false;
        s.folded = true;
        s.allIn = true;
      } else {
        s.inHand = true;
        s.folded = false;
        s.allIn = false;
      }
      s.cards = [];
      s.streetBet = 0;
      s.committed = 0;
      s.acted = false;
    }

    this.dealer = this._nextActive(this.dealer);
    this.log(`--- Hand #${this.handId} --- Dealer: ${this.seats[this.dealer].name}`);

    // antes
    for (const s of this.seats){
      if (!this._isAlive(s)) continue;
      this._commit(s.i, Math.min(s.stack, this.ante), `ante`);
    }

    // blinds
    const sb = this._nextActive(this.dealer);
    const bb = this._nextActive(sb);
    this._commit(sb, Math.min(this.seats[sb].stack, this.smallBlind), "SB");
    this._commit(bb, Math.min(this.seats[bb].stack, this.bigBlind), "BB");

    // set betting state
    this.currentBet = Math.max(...this.seats.map(s=>s.streetBet));
    this.minRaiseTo = this.currentBet + this.bigBlind;
    this.lastAggressor = bb;

    // deal hole cards
    for (let r=0;r<2;r++){
      for (let k=1;k<=this.maxSeats;k++){
        const idx = (this.dealer + k) % this.maxSeats;
        const s = this.seats[idx];
        if (!this._isAlive(s)) continue;
        s.cards.push(this.deck.pop());
      }
    }

    // first to act preflop: after BB
    this.turn = this._nextToAct(bb);

    // reset acted flags for betting round
    for (const s of this.seats) s.acted = false;

    this._emit();
  }

  _isAlive(s){ return s.inHand && !s.folded && !s.allIn; }
  _isInHand(s){ return s.inHand && !s.folded; }

  _nextActive(fromIdx){
    for (let k=1;k<=this.maxSeats;k++){
      const i = (fromIdx + k) % this.maxSeats;
      if (this.seats[i].stack > 0) return i;
    }
    return fromIdx;
  }

  _nextToAct(fromIdx){
    for (let k=1;k<=this.maxSeats;k++){
      const i = (fromIdx + k) % this.maxSeats;
      const s = this.seats[i];
      if (this._isAlive(s)) return i;
      if (this._isInHand(s) && !s.allIn) return i; // safety
    }
    return fromIdx;
  }

  _commit(idx, amount, label){
    const s = this.seats[idx];
    if (amount <= 0 || !s.inHand || s.folded) return;

    const pay = Math.min(s.stack, amount);
    s.stack -= pay;
    s.streetBet += pay;
    s.committed += pay;

    if (s.stack <= 0) s.allIn = true;

    if (label) this.log(`${s.name} posts ${label} ${pay}`);
  }

  // ===== Action helpers =====
  isMyTurn(idx){ return this.turn === idx && this.street !== "IDLE"; }

  toCall(idx){
    const s = this.seats[idx];
    return Math.max(0, this.currentBet - s.streetBet);
  }

  canCheck(idx){
    const s = this.seats[idx];
    return this._isInHand(s) && !s.allIn && (this.currentBet === s.streetBet);
  }

  canBet(idx){
    const s = this.seats[idx];
    return this._isInHand(s) && !s.allIn && (this.currentBet === 0);
  }

  canRaise(idx){
    const s = this.seats[idx];
    return this._isInHand(s) && !s.allIn && (this.currentBet > 0) && (s.stack > this.toCall(idx));
  }

  // ===== Actions =====
  actFold(idx){
    if (!this.isMyTurn(idx)) return;
    const s = this.seats[idx];
    s.folded = true;
    s.acted = true;
    this.log(`${s.name} folds`);
    this._advance();
  }

  actCheck(idx){
    if (!this.isMyTurn(idx)) return;
    if (!this.canCheck(idx)) return;
    const s = this.seats[idx];
    s.acted = true;
    this.log(`${s.name} checks`);
    this._advance();
  }

  actCall(idx){
    if (!this.isMyTurn(idx)) return;
    const s = this.seats[idx];
    const need = this.toCall(idx);
    if (need <= 0) return this.actCheck(idx);

    const pay = Math.min(s.stack, need);
    s.stack -= pay;
    s.streetBet += pay;
    s.committed += pay;
    if (s.stack <= 0) s.allIn = true;

    s.acted = true;
    this.log(`${s.name} calls ${pay}${s.allIn ? " (ALL-IN)" : ""}`);
    this._advance();
  }

  // Bet or raise "to" amount
  actBetRaiseTo(idx, toAmount){
    if (!this.isMyTurn(idx)) return;
    const s = this.seats[idx];
    if (!this._isInHand(s) || s.allIn) return;

    // normalize
    toAmount = Math.max(0, Math.floor(toAmount));

    if (this.currentBet === 0) {
      // BET
      const minBet = this.bigBlind;
      const betTo = Math.max(minBet, toAmount);
      const add = betTo - s.streetBet;
      if (add <= 0) return;

      const pay = Math.min(s.stack, add);
      s.stack -= pay;
      s.streetBet += pay;
      s.committed += pay;
      if (s.stack <= 0) s.allIn = true;

      this.currentBet = s.streetBet;

      // set min raise to: current + bet size (no-limit)
      const betSize = this.currentBet;
      this.minRaiseTo = this.currentBet + betSize;

      this.lastAggressor = idx;
      this._resetActedAfterAggression(idx);

      this.log(`${s.name} bets to ${this.currentBet}${s.allIn ? " (ALL-IN)" : ""}`);
      this._advance();
      return;
    }

    // RAISE
    const callNeed = this.toCall(idx);
    const minTo = Math.max(this.minRaiseTo, this.currentBet + 1); // strict safety
    const raiseTo = Math.max(minTo, toAmount);

    // required additional
    const add = raiseTo - s.streetBet;
    if (add <= callNeed) return; // not a real raise

    const pay = Math.min(s.stack, add);
    s.stack -= pay;
    s.streetBet += pay;
    s.committed += pay;
    if (s.stack <= 0) s.allIn = true;

    const prevBet = this.currentBet;
    this.currentBet = Math.max(this.currentBet, s.streetBet);

    // raise size = newBet - prevBet
    const raiseSize = this.currentBet - prevBet;
    this.minRaiseTo = this.currentBet + raiseSize;

    this.lastAggressor = idx;
    this._resetActedAfterAggression(idx);

    this.log(`${s.name} raises to ${this.currentBet}${s.allIn ? " (ALL-IN)" : ""}`);
    this._advance();
  }

  _resetActedAfterAggression(aggressorIdx){
    for (const s of this.seats){
      if (!this._isInHand(s) || s.allIn) continue;
      s.acted = false;
    }
    this.seats[aggressorIdx].acted = true;
  }

  // ===== Betting round completion =====
  _activeCount(){
    return this.seats.filter(s => this._isInHand(s) && !s.folded).length;
  }

  _bettingDone(){
    // done if: every remaining player either
    // - is all-in, OR
    // - has acted and matched currentBet
    for (const s of this.seats){
      if (!this._isInHand(s) || s.folded) continue;
      if (s.allIn) continue;
      if (!s.acted) return false;
      if (s.streetBet !== this.currentBet) return false;
    }
    return true;
  }

  // ===== Advance turn/street =====
  _advance(){
    // if only one left
    const alive = this.seats.filter(s => this._isInHand(s) && !s.folded);
    if (alive.length === 1){
      const w = alive[0];
      const pot = this._totalCommitted();
      w.stack += pot;
      this.log(`${w.name} wins ${pot} (everyone folded)`);
      this._endHand();
      return;
    }

    // move to next actor
    this.turn = this._nextToAct(this.turn);

    // if betting done, next street
    if (this._bettingDone()){
      this._nextStreet();
    }

    this._emit();
  }

  _totalCommitted(){
    return this.seats.reduce((a,s)=>a+s.committed, 0);
  }

  _clearStreetBets(){
    for (const s of this.seats) s.streetBet = 0;
    this.currentBet = 0;
    this.minRaiseTo = this.bigBlind;
    this.lastAggressor = null;
    for (const s of this.seats){
      if (!this._isInHand(s) || s.folded || s.allIn) continue;
      s.acted = false;
    }
  }

  _burn(){ this.deck.pop(); }

  _nextStreet(){
    // if all remaining players are all-in, deal out to river then showdown immediately
    const anyCanAct = this.seats.some(s => this._isInHand(s) && !s.folded && !s.allIn);
    const dealOut = !anyCanAct;

    // collect street bets (already counted in committed), just reset street state
    this._clearStreetBets();

    // burn + deal
    if (this.street === "PREFLOP"){
      this._burn();
      this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.street = "FLOP";
      this.log(`Flop`);
    } else if (this.street === "FLOP"){
      this._burn();
      this.community.push(this.deck.pop());
      this.street = "TURN";
      this.log(`Turn`);
    } else if (this.street === "TURN"){
      this._burn();
      this.community.push(this.deck.pop());
      this.street = "RIVER";
      this.log(`River`);
    } else if (this.street === "RIVER"){
      this.street = "SHOWDOWN";
      this._showdown();
      return;
    }

    // postflop first to act = left of dealer
    this.turn = this._nextToAct(this.dealer);

    // if nobody can act (all-in) keep auto-dealing until showdown
    if (dealOut){
      this._emit();
      // chain deal to river then showdown
      while (this.street !== "SHOWDOWN" && this.street !== "IDLE"){
        if (this.street === "RIVER"){
          this.street = "SHOWDOWN";
          this._showdown();
          return;
        }
        this._nextStreet();
        return;
      }
    }
  }

  // ===== Side pots + showdown =====
  _showdown(){
    const contenders = this.seats.filter(s => this._isInHand(s) && !s.folded);

    // compute hand results
    const results = new Map();
    for (const s of contenders){
      const res = eval7([...s.cards, ...this.community]);
      results.set(s.i, res);
      this.log(`${s.name} shows (${res.name})`);
    }

    // Build pots from committed amounts (side pots)
    const pots = buildSidePots(this.seats);

    // Pay each pot to best eligible hand(s)
    for (const p of pots){
      const eligible = p.eligible.filter(i => {
        const s = this.seats[i];
        return s && this._isInHand(s) && !s.folded;
      });
      if (eligible.length === 0) continue;

      let bestScore = -Infinity;
      for (const i of eligible){
        bestScore = Math.max(bestScore, results.get(i)?.score ?? -Infinity);
      }
      const winners = eligible.filter(i => (results.get(i)?.score ?? -Infinity) === bestScore);

      const share = Math.floor(p.amount / winners.length);
      let remainder = p.amount - share*winners.length;

      for (const i of winners){
        this.seats[i].stack += share;
      }
      // remainder chip goes to first winner (simple)
      if (remainder > 0) this.seats[winners[0]].stack += remainder;

      const names = winners.map(i => this.seats[i].name).join(", ");
      const handName = results.get(winners[0])?.name ?? "Best Hand";
      this.log(`${names} win pot ${p.amount} (${handName})`);
    }

    this._endHand();
  }

  _endHand(){
    this.street = "IDLE";
    // reset committed for clarity (optional)
    for (const s of this.seats){
      s.committed = 0;
      s.streetBet = 0;
      s.allIn = false;
      s.folded = false;
      s.inHand = s.stack > 0;
      s.acted = false;
      s.cards = [];
    }
    this._emit();
  }

  // ===== State exposure =====
  getPublicState(){
    return {
      street: this.street,
      dealer: this.dealer,
      turn: this.turn,
      community: this.community.slice(),
      currentBet: this.currentBet,
      minRaiseTo: this.minRaiseTo,
      seats: this.seats.map(s=>({
        i:s.i, name:s.name, isBot:s.isBot,
        stack:s.stack,
        inHand:s.inHand, folded:s.folded, allIn:s.allIn,
        streetBet:s.streetBet,
        committed:s.committed,
        cardsCount:s.cards.length
      }))
    };
  }

  getSeatHoleCards(idx){ return this.seats[idx].cards.slice(); }

  _emit(){
    if (this.onState) this.onState(this.getPublicState());
  }
}

// ===== Side pot builder =====
// seats: [{committed, ...}]
// returns [{amount, eligible:[seatIdx...]}] in order from main pot outward
function buildSidePots(seats){
  // gather (idx, committed) for anyone who committed > 0
  const contrib = seats
    .map(s => ({ i:s.i, c:Math.max(0, Math.floor(s.committed || 0)) }))
    .filter(x => x.c > 0)
    .sort((a,b)=>a.c-b.c);

  if (contrib.length === 0) return [];

  let remaining = contrib.map(x=>({ ...x }));
  const pots = [];

  while (remaining.length > 0){
    const level = remaining[0].c;
    const eligible = remaining.map(x=>x.i);

    const amount = level * remaining.length;
    pots.push({ amount, eligible });

    // subtract level from all, drop zeros
    remaining = remaining
      .map(x=>({ i:x.i, c:x.c - level }))
      .filter(x=>x.c > 0)
      .sort((a,b)=>a.c-b.c);
  }

  return pots;
}
