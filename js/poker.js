import { makeDeck, shuffle } from './cards.js';

// --- Basic hand evaluator (7-card -> best 5-card rank)
// Returns { score: number, name: string } higher is better.
// This evaluator is compact and reliable for demo play.
const RANK_VAL = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };
const SUIT_IDX = { "S":0,"H":1,"D":2,"C":3 };

function sortDesc(a,b){ return b-a; }

function eval7(cards) {
  // cards: [{r,s}...]
  const ranks = cards.map(c => RANK_VAL[c.r]).sort(sortDesc);
  const suits = cards.map(c => SUIT_IDX[c.s]);

  // counts by rank
  const count = new Map();
  for (const r of ranks) count.set(r, (count.get(r)||0)+1);

  // ranks unique sorted
  const uniq = Array.from(new Set(ranks)).sort(sortDesc);

  // flush?
  const suitCount = [0,0,0,0];
  for (const si of suits) suitCount[si]++;
  const flushSuit = suitCount.findIndex(n => n >= 5);

  let flushRanks = null;
  if (flushSuit !== -1) {
    flushRanks = cards.filter(c => SUIT_IDX[c.s]===flushSuit).map(c=>RANK_VAL[c.r]).sort(sortDesc);
  }

  // straight helper (Ace low)
  function bestStraight(rs) {
    const u = Array.from(new Set(rs)).sort(sortDesc);
    // wheel A-5
    if (u.includes(14)) u.push(1);
    for (let i=0;i<u.length-4;i++){
      const a = u[i];
      if (u[i+1]===a-1 && u[i+2]===a-2 && u[i+3]===a-3 && u[i+4]===a-4) {
        return a; // high card of straight
      }
    }
    return null;
  }

  const straightHigh = bestStraight(ranks);
  const straightFlushHigh = flushRanks ? bestStraight(flushRanks) : null;

  // groups
  const groups = Array.from(count.entries())
    .map(([r,n])=>({r,n}))
    .sort((A,B)=> (B.n - A.n) || (B.r - A.r));

  const isFour = groups[0]?.n===4;
  const isThree = groups[0]?.n===3;
  const isPair  = groups[0]?.n===2;

  // Straight flush
  if (straightFlushHigh) {
    const name = (straightFlushHigh===14) ? "Royal Flush" : "Straight Flush";
    return { score: 9e9 + straightFlushHigh*1e6, name };
  }

  // Four of a kind
  if (isFour) {
    const quad = groups[0].r;
    const kicker = uniq.find(r => r !== quad);
    return { score: 8e9 + quad*1e6 + kicker*1e3, name:"Four of a Kind" };
  }

  // Full house
  if (isThree) {
    const trips = groups[0].r;
    const pair = groups.find(g => g.n>=2 && g.r!==trips)?.r;
    if (pair) return { score: 7e9 + trips*1e6 + pair*1e3, name:"Full House" };
  }

  // Flush
  if (flushRanks) {
    const top5 = flushRanks.slice(0,5);
    const pack = top5[0]*1e8 + top5[1]*1e6 + top5[2]*1e4 + top5[3]*1e2 + top5[4];
    return { score: 6e9 + pack, name:"Flush" };
  }

  // Straight
  if (straightHigh) {
    return { score: 5e9 + straightHigh*1e6, name:"Straight" };
  }

  // Three of a kind
  if (isThree) {
    const trips = groups[0].r;
    const kickers = uniq.filter(r => r!==trips).slice(0,2);
    return { score: 4e9 + trips*1e6 + kickers[0]*1e3 + kickers[1], name:"Three of a Kind" };
  }

  // Two pair
  const pairs = groups.filter(g=>g.n===2).map(g=>g.r).sort(sortDesc);
  if (pairs.length>=2) {
    const [p1,p2] = pairs;
    const kicker = uniq.find(r => r!==p1 && r!==p2);
    return { score: 3e9 + p1*1e6 + p2*1e3 + kicker, name:"Two Pair" };
  }

  // One pair
  if (isPair) {
    const p = groups[0].r;
    const kickers = uniq.filter(r=>r!==p).slice(0,3);
    return { score: 2e9 + p*1e6 + kickers[0]*1e4 + kickers[1]*1e2 + kickers[2], name:"One Pair" };
  }

  // High card
  const top5 = uniq.slice(0,5);
  const pack = top5[0]*1e8 + top5[1]*1e6 + top5[2]*1e4 + top5[3]*1e2 + top5[4];
  return { score: 1e9 + pack, name:"High Card" };
}

// --- Engine state
export class PokerEngine {
  constructor(opts={}) {
    this.maxSeats = opts.maxSeats ?? 6;

    this.smallBlind = opts.smallBlind ?? 1000;
    this.bigBlind = opts.bigBlind ?? 2000;
    this.ante = opts.ante ?? 250;

    this.seats = Array.from({length:this.maxSeats}, (_,i)=>({
      i,
      name: `Seat${i}`,
      isBot: i!==0,
      stack: opts.startStack ?? 100000,
      inHand: true,
      folded: false,
      bet: 0,
      cards: [],
      acted: false
    }));

    this.dealer = 0;
    this.turn = 0;
    this.street = "IDLE"; // PREFLOP/FLOP/TURN/RIVER/SHOWDOWN
    this.pot = 0;
    this.community = [];
    this.deck = [];
    this.actionLog = [];

    this.currentToCall = 0;
    this.handId = 0;

    // callbacks (set by main)
    this.onState = null; // (state)=>void
    this.onLog = null;   // (msg)=>void
  }

  log(msg){
    this.actionLog.push(msg);
    if (this.onLog) this.onLog(msg);
  }

  setSeatName(idx, name){ this.seats[idx].name = name; }

  startHand(){
    this.handId++;
    this.pot = 0;
    this.community = [];
    this.deck = shuffle(makeDeck());
    this.street = "PREFLOP";
    this.actionLog = [];

    // reset seats
    for (const s of this.seats) {
      s.inHand = s.stack > 0;
      s.folded = false;
      s.bet = 0;
      s.cards = [];
      s.acted = false;
    }

    // move dealer to next occupied
    this.dealer = this._nextActive(this.dealer);
    this.log(`--- Hand #${this.handId} --- Dealer: ${this.seats[this.dealer].name}`);

    // post antes
    for (const s of this.seats) {
      if (!s.inHand) continue;
      const a = Math.min(s.stack, this.ante);
      s.stack -= a;
      s.bet += a;
      this.pot += a;
    }

    // blinds
    const sb = this._nextActive(this.dealer);
    const bb = this._nextActive(sb);

    this._postBlind(sb, this.smallBlind, "SB");
    this._postBlind(bb, this.bigBlind, "BB");

    // deal 2 each
    for (let r=0;r<2;r++){
      for (let i=0;i<this.maxSeats;i++){
        const idx = (this.dealer + 1 + i) % this.maxSeats;
        const s = this.seats[idx];
        if (!s.inHand) continue;
        s.cards.push(this.deck.pop());
      }
    }

    // betting to call is BB (minus ante already included in bet)
    this.currentToCall = Math.max(...this.seats.map(s=>s.bet));
    for (const s of this.seats) s.acted = false;

    // first to act preflop: after BB
    this.turn = this._nextToAct(bb);
    this._emit();
  }

  _postBlind(idx, amt, label){
    const s = this.seats[idx];
    if (!s.inHand) return;
    const pay = Math.min(s.stack, amt);
    s.stack -= pay;
    s.bet += pay;
    this.pot += pay;
    this.log(`${s.name} posts ${label} ${pay}`);
  }

  _nextActive(fromIdx){
    for (let k=1;k<=this.maxSeats;k++){
      const i = (fromIdx + k) % this.maxSeats;
      if (this.seats[i].inHand) return i;
    }
    return fromIdx;
  }

  _nextToAct(fromIdx){
    for (let k=1;k<=this.maxSeats;k++){
      const i = (fromIdx + k) % this.maxSeats;
      const s = this.seats[i];
      if (s.inHand && !s.folded) return i;
    }
    return fromIdx;
  }

  // --- Update A actions: fold / check / call only
  canCheck(idx){
    const s = this.seats[idx];
    return s.bet >= this.currentToCall;
  }

  callAmount(idx){
    const s = this.seats[idx];
    return Math.max(0, this.currentToCall - s.bet);
  }

  actFold(idx){
    const s = this.seats[idx];
    if (!this._isTurn(idx)) return;
    s.folded = true;
    s.acted = true;
    this.log(`${s.name} folds`);
    this._advanceAfterAction();
  }

  actCheckOrCall(idx){
    const s = this.seats[idx];
    if (!this._isTurn(idx)) return;

    const need = this.callAmount(idx);
    if (need <= 0) {
      s.acted = true;
      this.log(`${s.name} checks`);
    } else {
      const pay = Math.min(s.stack, need);
      s.stack -= pay;
      s.bet += pay;
      this.pot += pay;
      s.acted = true;
      this.log(`${s.name} calls ${pay}`);
    }
    this._advanceAfterAction();
  }

  _isTurn(idx){ return this.turn === idx && this.street !== "IDLE"; }

  _activeCount(){
    return this.seats.filter(s=>s.inHand && !s.folded).length;
  }

  _bettingDone(){
    // Betting round is done when:
    // - everyone remaining has acted
    // - and all remaining bets are equal to currentToCall (Update A no raises)
    for (const s of this.seats){
      if (!s.inHand || s.folded) continue;
      if (!s.acted) return false;
      if (s.bet !== this.currentToCall) return false;
    }
    return true;
  }

  _advanceAfterAction(){
    // If only one left, they win immediately
    if (this._activeCount() === 1) {
      const winner = this.seats.find(s=>s.inHand && !s.folded);
      this._award(winner.i, "Everyone folded");
      this.street = "IDLE";
      this._emit();
      return;
    }

    // advance turn
    this.turn = this._nextToAct(this.turn);

    // if betting done, advance street
    if (this._bettingDone()) {
      this._advanceStreet();
    }
    this._emit();
  }

  _advanceStreet(){
    // reset acted, keep currentToCall at max bet (which is equal)
    for (const s of this.seats) s.acted = false;

    // burn one
    this.deck.pop();

    if (this.street === "PREFLOP") {
      this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.street = "FLOP";
      this.log(`Flop dealt`);
    } else if (this.street === "FLOP") {
      this.community.push(this.deck.pop());
      this.street = "TURN";
      this.log(`Turn dealt`);
    } else if (this.street === "TURN") {
      this.community.push(this.deck.pop());
      this.street = "RIVER";
      this.log(`River dealt`);
    } else if (this.street === "RIVER") {
      this.street = "SHOWDOWN";
      this._showdown();
      return;
    }

    // set turn to first active left of dealer (postflop)
    this.turn = this._nextToAct(this.dealer);

    // currentToCall stays the max bet this round (equal). Update A: no raises.
    this.currentToCall = Math.max(...this.seats.map(s=>s.bet));
  }

  _showdown(){
    const alive = this.seats.filter(s=>s.inHand && !s.folded);

    let best = null;
    for (const s of alive){
      const seven = [...s.cards, ...this.community];
      const res = eval7(seven);
      if (!best || res.score > best.res.score) best = { seat:s, res };
      this.log(`${s.name} shows (${res.name})`);
    }

    this._award(best.seat.i, `Wins with ${best.res.name}`);
    this.street = "IDLE";
    this._emit();
  }

  _award(winnerIdx, reason){
    const w = this.seats[winnerIdx];
    // move all bets to pot already tracked, simple payout
    w.stack += this.pot;
    this.log(`${w.name} wins pot ${this.pot}. ${reason}`);
    this.pot = 0;
  }

  // External helper for bots
  getPublicState(){
    return {
      street: this.street
