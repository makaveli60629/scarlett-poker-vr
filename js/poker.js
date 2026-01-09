// /js/poker.js — Scarlett PokerSim v1.1 (WATCH SET: 12 HANDS)
// ✅ Real 52-card deck + evaluation
// ✅ Emits: deal/action/blinds/showdown/state/finished
// ✅ Stops after maxHands so you can watch a full set

export const PokerSim = (() => {
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
        for (const fn of set) { try { fn(payload); } catch (e) { console.error(e); } }
      }
    };
  }

  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
  const SUITS = [0,1,2,3];
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

  function score5(cards5) {
    const rs = cards5.map(c => c.r).sort((a,b)=>b-a);
    const ss = cards5.map(c => c.s);

    const counts = new Map();
    for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);

    const groups = Array.from(counts.entries())
      .map(([rank, count]) => [count, rank])
      .sort((a,b)=> (b[0]-a[0]) || (b[1]-a[1]));

    const isFlush = ss.every(s => s === ss[0]);

    const uniq = Array.from(new Set(rs)).sort((a,b)=>b-a);
    let isStraight = false;
    let straightHigh = 0;

    if (uniq.length === 5) {
      const max = uniq[0], min = uniq[4];
      if (max - min === 4) { isStraight = true; straightHigh = max; }
      if (!isStraight && uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
        isStraight = true; straightHigh = 5;
      }
    }

    if (isFlush && isStraight) return { cat: 9, kickers: [straightHigh], cards: cards5 };
    if (groups[0][0] === 4) return { cat: 8, kickers: [groups[0][1], groups[1][1]], cards: cards5 };
    if (groups[0][0] === 3 && groups[1][0] === 2) return { cat: 7, kickers: [groups[0][1], groups[1][1]], cards: cards5 };
    if (isFlush) return { cat: 6, kickers: rs.slice(), cards: cards5 };
    if (isStraight) return { cat: 5, kickers: [straightHigh], cards: cards5 };
    if (groups[0][0] === 3) {
      const trips = groups[0][1];
      const kick = groups.slice(1).map(g => g[1]).sort((a,b)=>b-a);
      return { cat: 4, kickers: [trips, ...kick], cards: cards5 };
    }
    if (groups[0][0] === 2 && groups[1][0] === 2) {
      const highPair = Math.max(groups[0][1], groups[1][1]);
      const lowPair = Math.min(groups[0][1], groups[1][1]);
      const kicker = groups[2][1];
      return { cat: 3, kickers: [highPair, lowPair, kicker], cards: cards5 };
    }
    if (groups[0][0] === 2) {
      const pair = groups[0][1];
      const kick = groups.slice(1).map(g => g[1]).sort((a,b)=>b-a);
      return { cat: 2, kickers: [pair, ...kick], cards: cards5 };
    }
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

  function bestOf7(cards7) {
    let best = null, bestIdx = null;
    for (let a=0;a<3;a++){
      for (let b=a+1;b<4;b++){
        for (let c=b+1;c<5;c++){
          for (let d=c+1;d<6;d++){
            for (let e=d+1;e<7;e++){
              const five = [cards7[a], cards7[b], cards7[c], cards7[d], cards7[e]];
              const sc = score5(five);
              if (!best || compareScore(sc, best) > 0) { best = sc; bestIdx = [a,b,c,d,e]; }
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

  function create(opts = {}) {
    const log = opts.log || console.log;
    const E = makeEmitter();

    const S = {
      seats: Math.max(2, Math.min(9, opts.seats || 6)),
      smallBlind: opts.smallBlind ?? 5,
      bigBlind: opts.bigBlind ?? 10,
      startingStack: opts.startingStack ?? 1000,

      tDealHole: opts.tDealHole ?? 1.2,
      tFlop: opts.tFlop ?? 1.4,
      tTurn: opts.tTurn ?? 1.3,
      tRiver: opts.tRiver ?? 1.3,
      tShowdown: opts.tShowdown ?? 2.2,
      tNextHand: opts.tNextHand ?? 1.2,

      toyBetting: opts.toyBetting ?? true,
      maxHands: opts.maxHands ?? 12,

      phase: "IDLE",
      street: "PREFLOP",
      timer: 0,

      dealer: 0,
      deck: [],
      community: [],
      players: [],
      pot: 0,
      handsPlayed: 0,
      finished: false,
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

    function rotateDealer() { S.dealer = (S.dealer + 1) % S.seats; }
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

    function clearBets() { for (const p of S.players) p.bet = 0; }
    function activePlayers() { return S.players.filter(p => p.inHand && !p.folded); }

    function maybeToyBetting() {
      if (!S.toyBetting) return;
      const alive = activePlayers();
      if (alive.length <= 1) return;

      const who = alive[(Math.random() * alive.length) | 0];
      const doFold = Math.random() < 0.05;

      if (doFold && alive.length > 2) {
        who.folded = true;
        E.emit("action", { type:"FOLD", seat: who.seat, name: who.name, pot: S.pot });
      } else {
        const bump = 10 + ((Math.random()*18)|0);
        const amt = Math.min(who.stack, bump);
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

      S.deck = shuffle(makeDeck());
      postBlinds();

      for (let r=0;r<2;r++){
        for (let i=1;i<=S.seats;i++){
          const seat = (S.dealer + i) % S.seats;
          const p = S.players[seat];
          if (!p.inHand) continue;
          p.hole.push(drawOne());
        }
      }

      E.emit("deal", { type: "HOLE" });
    }

    function dealFlop() { burnOne(); S.community.push(drawOne(), drawOne(), drawOne()); E.emit("deal", { type:"FLOP", communityRaw: S.community.slice() }); }
    function dealTurn() { burnOne(); S.community.push(drawOne()); E.emit("deal", { type:"TURN", communityRaw: S.community.slice() }); }
    function dealRiver(){ burnOne(); S.community.push(drawOne()); E.emit("deal", { type:"RIVER", communityRaw: S.community.slice() }); }

    function earlyWinIfOneLeft() {
      const alive = activePlayers();
      if (alive.length === 1) {
        const w = alive[0];
        w.stack += S.pot;
        const payload = {
          winners: [{ seat: w.seat, name: w.name, amount: S.pot, handName: "—", best5: [] }],
          pot: S.pot
        };
        E.emit("showdown", payload);
        return true;
      }
      return false;
    }

    function showdown() {
      const alive = activePlayers();
      if (alive.length === 0) return;

      const results = [];
      for (const p of alive) {
        const cards7 = [...p.hole, ...S.community];
        const { score } = bestOf7(cards7);
        results.push({
          seat: p.seat,
          name: p.name,
          score,
          handName: catName(score.cat),
          best5: score.cards.map(cardToString),
          hole: p.hole.map(cardToString),
        });
      }

      let best = results[0];
      for (let i=1;i<results.length;i++) if (compareScore(results[i].score, best.score) > 0) best = results[i];
      const winners = results.filter(r => compareScore(r.score, best.score) === 0);

      const share = Math.floor(S.pot / winners.length);
      let remainder = S.pot - share * winners.length;
      for (const w of winners) {
        const add = share + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        S.players[w.seat].stack += add;
        w.amount = add;
      }

      E.emit("showdown", { winners, pot: S.pot });
    }

    function setPhase(phase, street, actionText) {
      S.phase = phase;
      if (street) S.street = street;
      S.timer = 0;
      E.emit("state", { phase: S.phase, street: S.street, pot: S.pot, actionText: actionText || "—" });
    }

    function startHand() {
      if (S.finished) return;

      resetPlayersIfNeeded();
      rotateDealer();
      dealHole();
      setPhase("HOLE", "PREFLOP", `HAND ${S.handsPlayed + 1} / ${S.maxHands}`);
      log(`[PokerSim] Hand ${S.handsPlayed + 1} start — dealer=${S.dealer+1}`);
    }

    function update(dt) {
      if (S.finished) return;
      if (S.phase === "IDLE") return;

      S.timer += dt;

      // light toy betting once per street
      if (S.toyBetting && S.timer > 0.45 && S.timer < 0.50) maybeToyBetting();

      if (S.phase === "HOLE" && S.timer >= S.tDealHole) {
        if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN", "END");
        clearBets(); dealFlop(); setPhase("FLOP", "FLOP", "FLOP");
      } else if (S.phase === "FLOP" && S.timer >= S.tFlop) {
        if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN", "END");
        clearBets(); dealTurn(); setPhase("TURN", "TURN", "TURN");
      } else if (S.phase === "TURN" && S.timer >= S.tTurn) {
        if (earlyWinIfOneLeft()) return setPhase("END", "SHOWDOWN", "END");
        clearBets(); dealRiver(); setPhase("RIVER", "RIVER", "RIVER");
      } else if (S.phase === "RIVER" && S.timer >= S.tRiver) {
        setPhase("SHOWDOWN", "SHOWDOWN", "SHOWDOWN");
        showdown();
      } else if (S.phase === "SHOWDOWN" && S.timer >= S.tShowdown) {
        setPhase("END", "SHOWDOWN", "NEXT");
      } else if (S.phase === "END" && S.timer >= S.tNextHand) {
        S.handsPlayed++;

        if (S.handsPlayed >= S.maxHands) {
          S.finished = true;
          E.emit("finished", { handsPlayed: S.handsPlayed });
          return;
        }
        startHand();
      }
    }

    return {
      on: E.on,
      startHand,
      update
    };
  }

  return { create };
})();
