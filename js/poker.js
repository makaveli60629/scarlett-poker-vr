// /js/poker.js — Scarlett PokerJS v1.0 (REAL DECK + REAL HAND EVAL + SHOWDOWN BEST5)
// Drop-in Texas Hold’em engine (6-max by default).
//
// What this does:
// ✅ Real 52-card deck, shuffle, deal 2 hole cards each
// ✅ Deal flop/turn/river in order
// ✅ Evaluate best 5-card hand out of 7 (brute force 21 combos, reliable)
// ✅ Determine winner(s) + the exact 5 cards used (for "show winning hand" UI)
// ✅ Simple timed state machine so you can WATCH hands play out
// ✅ Optional "toy betting" (random check/call/bet/fold) — safe + can be disabled
//
// What this does NOT do (yet):
// ❌ Side pots / all-in / split-pot chip distribution beyond simple splits
// ❌ Full poker AI
//
// Integration points you can use right now:
// - poker.on("state", (s)=>{})      // state changes
// - poker.on("deal", (payload)=>{}) // cards dealt (hole/community)
// - poker.on("showdown", (payload)=>{}) // winners + best5
// - poker.getPublicState()          // UI-friendly state snapshot
//
// Usage (in main.js):
//   import { PokerJS } from "./poker.js";
//   const poker = PokerJS.create({ seats: 6, log });
//   poker.startHand();
//   // in animation loop:
//   poker.update(dt);
//
// If you have a visual system (DealingMix), call it inside the events:
//   poker.on("deal", ({type, ...}) => dealing.applyDeal(...))
//   poker.on("showdown", (data)=> dealing.showWinners(data))

export const PokerJS = (() => {
  // ---------- Event Emitter ----------
  function makeEmitter() {
    const map = new Map();
    return {
      on(type, fn) {
        if (!map.has(type)) map.set(type, new Set());
        map.get(type).add(fn);
        return () => map.get(type)?.delete(fn);
      },
      emit(type, payload) {
        const set = map.get(type);
        if (!set) return;
        for (const fn of set) {
          try { fn(payload); } catch (e) { console.error(e); }
        }
      }
    };
  }

  // ---------- Card Helpers ----------
  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14]; // 11=J,12=Q,13=K,14=A
  const SUITS = [0,1,2,3]; // 0=♠ 1=♥ 2=♦ 3=♣ (any mapping is fine if consistent)
  const SUIT_CH = ["♠","♥","♦","♣"];
  const RANK_CH = { 11:"J", 12:"Q", 13:"K", 14:"A" };

  function cardToString(c) {
    const r = RANK_CH[c.r] || String(c.r);
    const s = SUIT_CH[c.s] || "?";
    return r + s;
  }

  function makeDeck() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
    return deck;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- 5-card Hand Scoring ----------
  // Score format: { cat, kickers: number[], ranks: number[], cards: [c1..c5] }
  // cat higher = better
  // Categories:
  // 9 Straight Flush
  // 8 Four of a Kind
  // 7 Full House
  // 6 Flush
  // 5 Straight
  // 4 Three of a Kind
  // 3 Two Pair
  // 2 One Pair
  // 1 High Card
  //
  // Comparison: cat, then kickers lexicographically
  function score5(cards5) {
    // ranks sorted desc
    const rs = cards5.map(c => c.r).sort((a,b)=>b-a);
    const ss = cards5.map(c => c.s);

    // counts by rank
    const counts = new Map();
    for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);

    // groups: [count, rank] sorted by count desc, then rank desc
    const groups = Array.from(counts.entries())
      .map(([rank, count]) => [count, rank])
      .sort((a,b)=> (b[0]-a[0]) || (b[1]-a[1]));

    const isFlush = ss.every(s => s === ss[0]);

    // straight detection (handle wheel A-5)
    const uniq = Array.from(new Set(rs)).sort((a,b)=>b-a);
    let isStraight = false;
    let straightHigh = 0;

    if (uniq.length === 5) {
      const max = uniq[0], min = uniq[4];
      if (max - min === 4) { isStraight = true; straightHigh = max; }
      // wheel: A,5,4,3,2 => treat high as 5
      if (!isStraight && uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
        isStraight = true; straightHigh = 5;
      }
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return { cat: 9, kickers: [straightHigh], cards: cards5 };
    }

    // Four of a kind
    if (groups[0][0] === 4) {
      const quadRank = groups[0][1];
      const kicker = groups[1][1];
      return { cat: 8, kickers: [quadRank, kicker], cards: cards5 };
    }

    // Full house
    if (groups[0][0] === 3 && groups[1][0] === 2) {
      return { cat: 7, kickers: [groups[0][1], groups[1][1]], cards: cards5 };
    }

    // Flush
    if (isFlush) {
      return { cat: 6, kickers: rs.slice(), cards: cards5 };
    }

    // Straight
    if (isStraight) {
      return { cat: 5, kickers: [straightHigh], cards: cards5 };
    }

    // Trips
    if (groups[0][0] === 3) {
      const trips = groups[0][1];
      const kick = groups.slice(1).map(g => g[1]).sort((a,b)=>b-a);
      return { cat: 4, kickers: [trips, ...kick], cards: cards5 };
    }

    // Two Pair
    if (groups[0][0] === 2 && groups[1][0] === 2) {
      const highPair = Math.max(groups[0][1], groups[1][1]);
      const lowPair = Math.min(groups[0][1], groups[1][1]);
      const kicker = groups[2][1];
      return { cat: 3, kickers: [highPair, lowPair, kicker], cards: cards5 };
    }

    // One Pair
    if (groups[0][0] === 2) {
      const pair = groups[0][1];
      const kick = groups.slice(1).map(g => g[1]).sort((a,b)=>b-a);
      return { cat: 2, kickers: [pair, ...kick], cards: cards5 };
    }

    // High Card
    return { cat: 1, kickers: rs.slice(), cards: cards5 };
  }

  function compareScore(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const n = Math.max(a.kickers.length, b.kickers.length);
    for (let i=0;i<n;i++){
      const da = a.kickers[i] || 0;
      const db = b.kickers[i] || 0;
      if (da !== db) return da - db;
    }
    return 0;
  }

  // best of 7: brute force all 21 combos of 5
  function bestOf7(cards7) {
    let best = null;
    let bestIdx = null;

    // indices 0..6 choose 5
    for (let a=0;a<3;a++){
      for (let b=a+1;b<4;b++){
        for (let c=b+1;c<5;c++){
          for (let d=c+1;d<6;d++){
            for (let e=d+1;e<7;e++){
              const five = [cards7[a], cards7[b], cards7[c], cards7[d], cards7[e]];
              const sc = score5(five);
              if (!best || compareScore(sc, best) > 0) {
                best = sc;
                bestIdx = [a,b,c,d,e];
              }
            }
          }
        }
      }
    }
    return { score: best, usedIdx: bestIdx };
  }

  function catName(cat) {
    switch (cat) {
      case 9: return "STRAIGHT FLUSH";
      case 8: return "FOUR OF A KIND";
      case 7: return "FULL HOUSE";
      case 6: return "FLUSH";
      case 5: return "STRAIGHT";
      case 4: return "THREE OF A KIND";
      case 3: return "TWO PAIR";
      case 2: return "ONE PAIR";
      default: return "HIGH CARD";
    }
  }

  // ---------- Engine ----------
  function create(opts = {}) {
    const log = opts.log || console.log;
    const E = makeEmitter();

    const S = {
      seats: Math.max(2, Math.min(9, opts.seats || 6)),
      smallBlind: opts.smallBlind ?? 5,
      bigBlind: opts.bigBlind ?? 10,
      startingStack: opts.startingStack ?? 1000,

      // phase timing (seconds)
      tDealHole: opts.tDealHole ?? 1.2,
      tFlop: opts.tFlop ?? 1.4,
      tTurn: opts.tTurn ?? 1.3,
      tRiver: opts.tRiver ?? 1.3,
      tShowdown: opts.tShowdown ?? 2.2,
      tNextHand: opts.tNextHand ?? 1.2,

      // optional toy betting
      toyBetting: opts.toyBetting ?? true,

      // runtime
      phase: "IDLE",         // IDLE, HOLE, FLOP, TURN, RIVER, SHOWDOWN, END
      street: "PREFLOP",     // PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
      timer: 0,

      dealer: 0,
      action: 0,

      deck: [],
      community: [],
      players: [], // {seat, stack, inHand, folded, hole:[c,c], bet, name}

      pot: 0,
      lastWinners: null
    };

    function resetPlayersIfNeeded() {
      if (S.players.length !== S.seats) {
        S.players = [];
        for (let i=0;i<S.seats;i++){
          S.players.push({
            seat: i,
            name: opts.names?.[i] || `BOT ${i+1}`,
            stack: S.startingStack,
            inHand: true,
            folded: false,
            hole: [],
            bet: 0
          });
        }
      }
    }

    function rotateDealer() {
      S.dealer = (S.dealer + 1) % S.seats;
    }

    function burnOne() { S.deck.pop(); }
    function drawOne() { return S.deck.pop(); }

    function postBlinds() {
      const sb = (S.dealer + 1) % S.seats;
      const bb = (S.dealer + 2) % S.seats;
      const pSB = S.players[sb];
      const pBB = S.players[bb];

      const a = Math.min(pSB.stack, S.smallBlind);
      const b = Math.min(pBB.stack, S.bigBlind);

      pSB.stack -= a; pSB.bet += a; S.pot += a;
      pBB.stack -= b; pBB.bet += b; S.pot += b;

      E.emit("blinds", { sb, bb, small: a, big: b, pot: S.pot });
    }

    function clearBets() {
      for (const p of S.players) p.bet = 0;
    }

    function activePlayers() {
      return S.players.filter(p => p.inHand && !p.folded);
    }

    function maybeToyBetting(streetName) {
      if (!S.toyBetting) return;

      // simple: sometimes someone folds, sometimes someone "bets"
      // (this is visual spice, not poker-accurate betting)
      const alive = activePlayers();
      if (alive.length <= 1) return;

      // on each street, random small pot increment
      const bump = [10, 15, 20, 25][Math.min(3, ["PREFLOP","FLOP","TURN","RIVER"].indexOf(streetName))] || 10;
      const who = alive[(Math.random() * alive.length) | 0];
      const doFold = Math.random() < 0.06; // rare folds

      if (doFold && alive.length > 2) {
        who.folded = true;
        E.emit("action", { type:"FOLD", seat: who.seat, name: who.name, pot: S.pot });
      } else {
        const amt = Math.min(who.stack, bump + ((Math.random()*bump)|0));
        who.stack -= amt;
        who.bet += amt;
        S.pot += amt;
        E.emit("action", { type:"BET", seat: who.seat, name: who.name, amount: amt, pot: S.pot });
      }
    }

    function dealHole() {
      for (const p of S.players) {
        p.inHand = (p.stack > 0);
        p.folded = false;
        p.hole = [];
        p.bet = 0;
      }
      S.community = [];
      S.pot = 0;
      S.lastWinners = null;

      S.deck = shuffle(makeDeck());

      postBlinds();

      // deal 2 rounds starting left of dealer
      for (let r=0;r<2;r++){
        for (let i=1;i<=S.seats;i++){
          const seat = (S.dealer + i) % S.seats;
          const p = S.players[seat];
          if (!p.inHand) continue;
          p.hole.push(drawOne());
        }
      }

      E.emit("deal", {
        type: "HOLE",
        players: S.players.map(p => ({ seat: p.seat, name: p.name, hole: p.hole.slice(), inHand: p.inHand }))
      });
    }

    function dealFlop() {
      burnOne();
      S.community.push(drawOne(), drawOne(), drawOne());
      E.emit("deal", { type:"FLOP", community: S.community.slice() });
    }

    function dealTurn() {
      burnOne();
      S.community.push(drawOne());
      E.emit("deal", { type:"TURN", community: S.community.slice() });
    }

    function dealRiver() {
      burnOne();
      S.community.push(drawOne());
      E.emit("deal", { type:"RIVER", community: S.community.slice() });
    }

    function earlyWinIfOneLeft() {
      const alive = activePlayers();
      if (alive.length === 1) {
        const w = alive[0];
        w.stack += S.pot;
        const payload = {
          winners: [{
            seat: w.seat,
            name: w.name,
            amount: S.pot,
            reason: "EVERYONE FOLDED",
            handName: "—",
            best5: [],
            used: { holeIdx: [], commIdx: [] }
          }],
          pot: S.pot,
          community: S.community.slice()
        };
        S.lastWinners = payload;
        E.emit("showdown", payload);
        return true;
      }
      return false;
    }

    function showdown() {
      const alive = activePlayers();
      if (alive.length === 0) return;

      // compute best hands
      const results = [];
      for (const p of alive) {
        const cards7 = [...p.hole, ...S.community];
        const { score, usedIdx } = bestOf7(cards7);

        // Map usedIdx into hole/community indexes
        const holeIdx = [];
        const commIdx = [];
        for (const idx of usedIdx) {
          if (idx < 2) holeIdx.push(idx);
          else commIdx.push(idx - 2);
        }

        results.push({
          seat: p.seat,
          name: p.name,
          score,
          handName: catName(score.cat),
          used: { holeIdx, commIdx },
          best5: score.cards.map(cardToString),
          hole: p.hole.slice()
        });
      }

      // determine top score
      let best = results[0];
      for (let i=1;i<results.length;i++){
        if (compareScore(results[i].score, best.score) > 0) best = results[i];
      }

      // winners = all tied with best
      const winners = results.filter(r => compareScore(r.score, best.score) === 0);

      // split pot
      const share = Math.floor(S.pot / winners.length);
      let remainder = S.pot - share * winners.length;

      for (const w of winners) {
        const p = S.players[w.seat];
        const add = share + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        p.stack += add;
        w.amount = add;
      }

      const payload = {
        winners: winners.map(w => ({
          seat: w.seat,
          name: w.name,
          amount: w.amount,
          handName: w.handName,
          best5: w.best5,
          used: w.used,
          hole: w.hole.map(cardToString)
        })),
        pot: S.pot,
        community: S.community.map(cardToString),
        communityRaw: S.community.slice(),
        results // full detail if you want it
      };

      S.lastWinners = payload;
      E.emit("showdown", payload);
    }

    function setPhase(phase, street) {
      S.phase = phase;
      if (street) S.street = street;
      S.timer = 0;
      E.emit("state", { phase: S.phase, street: S.street, pot: S.pot });
    }

    function startHand() {
      resetPlayersIfNeeded();
      rotateDealer();
      dealHole();
      setPhase("HOLE", "PREFLOP");
      log(`[PokerJS] Hand start — dealer=${S.dealer+1}`);
    }

    function update(dt) {
      if (S.phase === "IDLE") return;
      S.timer += dt;

      // On each street, allow a tiny toy betting spice once early in the street
      // (kept safe so it can't spam)
      if (S.toyBetting && S.timer > 0.35 && S.timer < 0.40) {
        maybeToyBetting(S.street);
        // If folds ended hand, go to END quickly
        if (earlyWinIfOneLeft()) setPhase("END", "SHOWDOWN");
      }

      if (S.phase === "HOLE") {
        if (S.timer >= S.tDealHole) {
          if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN");
          clearBets();
          dealFlop();
          setPhase("FLOP", "FLOP");
        }
      } else if (S.phase === "FLOP") {
        if (S.timer >= S.tFlop) {
          if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN");
          clearBets();
          dealTurn();
          setPhase("TURN", "TURN");
        }
      } else if (S.phase === "TURN") {
        if (S.timer >= S.tTurn) {
          if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN");
          clearBets();
          dealRiver();
          setPhase("RIVER", "RIVER");
        }
      } else if (S.phase === "RIVER") {
        if (S.timer >= S.tRiver) {
          setPhase("SHOWDOWN", "SHOWDOWN");
          showdown();
        }
      } else if (S.phase === "SHOWDOWN") {
        if (S.timer >= S.tShowdown) {
          setPhase("END", "SHOWDOWN");
        }
      } else if (S.phase === "END") {
        if (S.timer >= S.tNextHand) {
          startHand();
        }
      }
    }

    function getPublicState() {
      return {
        phase: S.phase,
        street: S.street,
        dealer: S.dealer,
        pot: S.pot,
        community: S.community.map(cardToString),
        players: S.players.map(p => ({
          seat: p.seat,
          name: p.name,
          stack: p.stack,
          inHand: p.inHand,
          folded: p.folded,
          hole: p.hole.map(cardToString) // you can hide this for non-debug UI
        })),
        lastWinners: S.lastWinners
      };
    }

    // For UI where you want to hide hole cards until showdown:
    function getMaskedState() {
      return {
        phase: S.phase,
        street: S.street,
        dealer: S.dealer,
        pot: S.pot,
        community: S.community.map(cardToString),
        players: S.players.map(p => ({
          seat: p.seat,
          name: p.name,
          stack: p.stack,
          inHand: p.inHand,
          folded: p.folded,
          hole: (S.phase === "SHOWDOWN" || S.phase === "END") ? p.hole.map(cardToString) : ["??","??"]
        })),
        lastWinners: S.lastWinners
      };
    }

    return {
      on: E.on,
      emit: E.emit,

      startHand,
      update,

      getPublicState,
      getMaskedState,

      // Debug helpers
      _debug: {
        cardToString,
        bestOf7,
        score5,
        compareScore
      }
    };
  }

  return { create };
})();
