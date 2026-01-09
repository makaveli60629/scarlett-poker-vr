// /js/poker.js — Scarlett PokerSim v1.0 (FULL)
// ✅ Fixes your import error: exports a named export "PokerSim"
// ✅ Runs real Texas Hold'em hands (6-max default)
// ✅ Emits events you can hook into visuals later (deal/flop/turn/river/showdown/winner)
// ✅ Evaluates real winning hands + returns the exact 5-card combo and which cards were used

export const PokerSim = (() => {
  // ---------- Utilities ----------
  const RANKS = "23456789TJQKA";
  const SUITS = "cdhs"; // clubs, diamonds, hearts, spades

  const rankValue = (rChar) => RANKS.indexOf(rChar) + 2; // 2..14
  const rankChar = (v) => RANKS[v - 2];

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nowSeed() {
    // stable-ish per reload but changes often
    return (Date.now() ^ (performance.now() * 1000)) >>> 0;
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeDeck() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
    return deck;
  }

  function cardRank(card) { return rankValue(card[0]); }
  function cardSuit(card) { return card[1]; }

  // ---------- 5-card evaluator ----------
  // Returns a comparable score array: higher is better.
  // category: 8 straight flush, 7 four, 6 full house, 5 flush, 4 straight, 3 trips, 2 two pair, 1 pair, 0 high
  function eval5(cards5) {
    const ranks = cards5.map(cardRank).sort((a, b) => b - a);
    const suits = cards5.map(cardSuit);

    // counts
    const count = new Map();
    for (const r of ranks) count.set(r, (count.get(r) || 0) + 1);

    // sort ranks by (count desc, rank desc)
    const groups = Array.from(count.entries())
      .map(([r, c]) => ({ r, c }))
      .sort((a, b) => (b.c - a.c) || (b.r - a.r));

    const isFlush = suits.every((s) => s === suits[0]);

    // straight (A2345 low)
    const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);
    let isStraight = false;
    let straightHigh = 0;

    if (uniq.length === 5) {
      const hi = uniq[0];
      const lo = uniq[4];
      if (hi - lo === 4) { isStraight = true; straightHigh = hi; }
      // wheel: A 5 4 3 2
      if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
        isStraight = true;
        straightHigh = 5;
      }
    }

    if (isStraight && isFlush) return [8, straightHigh];
    if (groups[0].c === 4) return [7, groups[0].r, groups[1].r];
    if (groups[0].c === 3 && groups[1].c === 2) return [6, groups[0].r, groups[1].r];
    if (isFlush) return [5, ...uniq];
    if (isStraight) return [4, straightHigh];
    if (groups[0].c === 3) {
      const kickers = groups.slice(1).map(g => g.r).sort((a, b) => b - a);
      return [3, groups[0].r, ...kickers];
    }
    if (groups[0].c === 2 && groups[1].c === 2) {
      const highPair = Math.max(groups[0].r, groups[1].r);
      const lowPair  = Math.min(groups[0].r, groups[1].r);
      const kicker = groups[2].r;
      return [2, highPair, lowPair, kicker];
    }
    if (groups[0].c === 2) {
      const pair = groups[0].r;
      const kickers = groups.slice(1).map(g => g.r).sort((a, b) => b - a);
      return [1, pair, ...kickers];
    }
    return [0, ...uniq];
  }

  function cmpScore(a, b) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  // choose best 5 out of 7 (brute force 21 combos)
  function bestOf7(sevenCards) {
    let bestScore = null;
    let bestIdx = null;

    // indices 0..6, choose 5
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 4; b++) {
        for (let c = b + 1; c < 5; c++) {
          for (let d = c + 1; d < 6; d++) {
            for (let e = d + 1; e < 7; e++) {
              const idx = [a, b, c, d, e];
              const hand5 = idx.map(i => sevenCards[i]);
              const score = eval5(hand5);
              if (!bestScore || cmpScore(score, bestScore) > 0) {
                bestScore = score;
                bestIdx = idx;
              }
            }
          }
        }
      }
    }

    const bestCards = bestIdx.map(i => sevenCards[i]);
    return { score: bestScore, idx: bestIdx, cards: bestCards };
  }

  function categoryName(cat) {
    return [
      "High Card",
      "One Pair",
      "Two Pair",
      "Three of a Kind",
      "Straight",
      "Flush",
      "Full House",
      "Four of a Kind",
      "Straight Flush",
    ][cat] || "Unknown";
  }

  // ---------- Engine ----------
  function create({ seats = 6, toyBetting = true, log = console.log, seed = null } = {}) {
    const rnd = mulberry32(seed ?? nowSeed());

    const listeners = new Map();
    const on = (name, fn) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn);
    };
    const emit = (name, payload) => {
      try { log?.(`[PokerSim] ${name}`); } catch {}
      const set = listeners.get(name);
      if (set) for (const fn of set) { try { fn(payload); } catch (e) { console.error(e); } }
    };

    // state
    const S = {
      seats,
      toyBetting,
      handNo: 0,

      dealer: 0,
      sb: 1,
      bb: 2,

      deck: [],
      community: [],
      hole: Array.from({ length: seats }, () => []),

      pot: 0,
      stacks: Array.from({ length: seats }, () => 10000),
      inHand: Array.from({ length: seats }, () => true),

      street: "idle", // preflop/flop/turn/river/showdown
      timer: 0,
      phase: 0,

      lastShowdown: null,
    };

    // simple timing sequence (seconds)
    const T = {
      dealHole: 1.1,
      toFlop: 1.5,
      toTurn: 1.5,
      toRiver: 1.5,
      toShow: 1.2,
      nextHand: 2.2,
    };

    function resetHand() {
      S.handNo += 1;
      S.street = "preflop";
      S.phase = 0;
      S.timer = 0;
      S.community.length = 0;
      for (let i = 0; i < S.seats; i++) S.hole[i] = [];
      S.inHand = Array.from({ length: S.seats }, () => true);
      S.pot = 0;

      S.deck = makeDeck();
      shuffle(S.deck, rnd);
    }

    function postBlinds() {
      // rotate dealer & blinds
      S.dealer = (S.dealer + 1) % S.seats;
      S.sb = (S.dealer + 1) % S.seats;
      S.bb = (S.dealer + 2) % S.seats;

      const small = 50;
      const big = 100;

      S.stacks[S.sb] = Math.max(0, S.stacks[S.sb] - small);
      S.stacks[S.bb] = Math.max(0, S.stacks[S.bb] - big);
      S.pot += small + big;

      emit("blinds", {
        dealer: S.dealer,
        sb: S.sb,
        bb: S.bb,
        small,
        big,
        pot: S.pot,
      });
    }

    function dealHole() {
      // 2 rounds
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < S.seats; i++) {
          const seat = (S.dealer + 1 + i) % S.seats; // start left of dealer
          if (!S.inHand[seat]) continue;
          S.hole[seat].push(S.deck.pop());
        }
      }
      emit("dealHole", {
        hole: S.hole.map(h => h.slice()),
        pot: S.pot,
        dealer: S.dealer
      });
    }

    function dealFlop() {
      S.deck.pop(); // burn
      S.community.push(S.deck.pop(), S.deck.pop(), S.deck.pop());
      S.street = "flop";
      emit("flop", { community: S.community.slice(), pot: S.pot });
    }

    function dealTurn() {
      S.deck.pop(); // burn
      S.community.push(S.deck.pop());
      S.street = "turn";
      emit("turn", { community: S.community.slice(), pot: S.pot });
    }

    function dealRiver() {
      S.deck.pop(); // burn
      S.community.push(S.deck.pop());
      S.street = "river";
      emit("river", { community: S.community.slice(), pot: S.pot });
    }

    function toyBetting() {
      // very simple pot growth for watchable sim
      if (!S.toyBetting) return;
      const add = 150 + ((rnd() * 350) | 0);
      S.pot += add;
      emit("pot", { pot: S.pot, add, street: S.street });
    }

    function showdown() {
      // evaluate all active seats
      const results = [];
      for (let s = 0; s < S.seats; s++) {
        if (!S.inHand[s]) continue;
        const seven = [...S.hole[s], ...S.community];
        const best = bestOf7(seven);

        // map best indices to "hole" vs "community" for UI highlighting
        // seven layout: [hole0, hole1, comm0, comm1, comm2, comm3, comm4]
        const holeIdx = [];
        const commIdx = [];
        for (const i of best.idx) {
          if (i === 0 || i === 1) holeIdx.push(i); // 0/1 in seven = hole
          else commIdx.push(i - 2); // 2..6 => community 0..4
        }

        results.push({
          seat: s,
          hole: S.hole[s].slice(),
          best5: best.cards.slice(),
          score: best.score.slice(),
          category: categoryName(best.score[0]),
          used: { holeIdx, commIdx },
        });
      }

      // determine winner(s)
      results.sort((a, b) => cmpScore(a.score, b.score)); // ascending
      const bestScore = results.length ? results[results.length - 1].score : [0];
      const winners = results.filter(r => cmpScore(r.score, bestScore) === 0);

      // split pot equally among winners (toy payout)
      const winAmt = winners.length ? Math.floor(S.pot / winners.length) : 0;
      for (const w of winners) S.stacks[w.seat] += winAmt;

      S.lastShowdown = { winners, results, pot: S.pot, winAmt };
      S.street = "showdown";

      emit("showdown", {
        community: S.community.slice(),
        results,
        winners,
        pot: S.pot,
        winAmt,
      });

      emit("winner", {
        winners: winners.map(w => ({
          seat: w.seat,
          category: w.category,
          best5: w.best5,
          used: w.used,
          hole: w.hole,
        })),
        pot: S.pot,
        winAmt,
      });
    }

    function startHand() {
      resetHand();
      postBlinds();
      emit("handStart", {
        handNo: S.handNo,
        dealer: S.dealer,
        sb: S.sb,
        bb: S.bb,
        stacks: S.stacks.slice(),
        pot: S.pot
      });
    }

    // deterministic phase machine
    function update(dt) {
      S.timer += dt;

      // If idle, do nothing until startHand called
      if (S.street === "idle") return;

      // preflop timeline
      if (S.street === "preflop") {
        if (S.phase === 0 && S.timer >= T.dealHole) {
          S.phase = 1;
          dealHole();
          toyBetting();
        }
        if (S.phase === 1 && S.timer >= T.dealHole + T.toFlop) {
          S.phase = 2;
          dealFlop();
          toyBetting();
        }
      }

      if (S.street === "flop") {
        if (S.timer >= T.dealHole + T.toFlop + T.toTurn) {
          dealTurn();
          toyBetting();
        }
      }

      if (S.street === "turn") {
        if (S.timer >= T.dealHole + T.toFlop + T.toTurn + T.toRiver) {
          dealRiver();
          toyBetting();
        }
      }

      if (S.street === "river") {
        if (S.timer >= T.dealHole + T.toFlop + T.toTurn + T.toRiver + T.toShow) {
          showdown();
        }
      }

      if (S.street === "showdown") {
        if (S.timer >= T.dealHole + T.toFlop + T.toTurn + T.toRiver + T.toShow + T.nextHand) {
          // next hand
          S.street = "idle";
          emit("handEnd", { handNo: S.handNo });
          startHand();
        }
      }
    }

    function getState() {
      return {
        handNo: S.handNo,
        dealer: S.dealer,
        sb: S.sb,
        bb: S.bb,
        pot: S.pot,
        street: S.street,
        community: S.community.slice(),
        hole: S.hole.map(h => h.slice()),
        stacks: S.stacks.slice(),
        lastShowdown: S.lastShowdown,
      };
    }

    // Start immediately for convenience if you want:
    // (but I leave it manual so you control it in main.js)
    // startHand();

    return {
      on,
      emit,
      startHand,
      update,
      getState,
    };
  }

  return { create };
})();
