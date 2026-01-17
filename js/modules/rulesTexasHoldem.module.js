// /js/modules/rulesTexasHoldem.module.js
// Texas Hold'em hand evaluation (FULL, compact)
// Returns best hand rank among 7 cards.

const RANK_ORDER = '23456789TJQKA';
const rankVal = (r) => RANK_ORDER.indexOf(r);

function parse(card) {
  return { r: card[0], s: card[1], v: rankVal(card[0]) };
}

function countsBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function sortDesc(vals) { return vals.slice().sort((a,b)=>b-a); }

function isStraight(valsDesc) {
  const uniq = [...new Set(valsDesc)].sort((a,b)=>b-a);
  // wheel A-5
  const hasA = uniq.includes(12);
  const low = hasA ? uniq.concat([ -1 ]) : uniq;
  for (let i = 0; i < low.length; i++) {
    let run = 1;
    let prev = low[i];
    for (let j = i+1; j < low.length; j++) {
      const v = low[j];
      if (v === prev) continue;
      if (v === prev - 1) { run++; prev = v; }
      else break;
      if (run >= 5) {
        const high = low[i] === 12 && prev === -1 ? 3 : low[i];
        return { ok: true, high };
      }
    }
  }
  return { ok: false, high: -1 };
}

function best5From7(cards) {
  const c = cards.map(parse);
  const bySuit = new Map();
  for (const x of c) {
    if (!bySuit.has(x.s)) bySuit.set(x.s, []);
    bySuit.get(x.s).push(x);
  }

  const valsDesc = sortDesc(c.map(x => x.v));
  const straight = isStraight(valsDesc);

  // flush + straight flush
  let flushSuit = null;
  for (const [s, arr] of bySuit.entries()) {
    if (arr.length >= 5) { flushSuit = s; break; }
  }

  if (flushSuit) {
    const fvals = sortDesc(bySuit.get(flushSuit).map(x => x.v));
    const sf = isStraight(fvals);
    if (sf.ok) {
      // 8 = straight flush
      return { rank: 8, high: sf.high };
    }
  }

  // groups
  const byRank = countsBy(c, x => x.v);
  const groups = [...byRank.entries()].map(([v,n]) => ({ v: Number(v), n }))
    .sort((a,b)=> (b.n - a.n) || (b.v - a.v));

  const top = groups[0];
  const second = groups[1];

  if (top?.n === 4) return { rank: 7, high: top.v };
  if (top?.n === 3 && second?.n >= 2) return { rank: 6, high: top.v };

  if (flushSuit) {
    const fvals = sortDesc(bySuit.get(flushSuit).map(x => x.v)).slice(0,5);
    return { rank: 5, high: fvals[0] };
  }

  if (straight.ok) return { rank: 4, high: straight.high };

  if (top?.n === 3) return { rank: 3, high: top.v };
  if (top?.n === 2 && second?.n === 2) return { rank: 2, high: Math.max(top.v, second.v) };
  if (top?.n === 2) return { rank: 1, high: top.v };

  return { rank: 0, high: valsDesc[0] };
}

export default {
  id: 'rulesTexasHoldem.module.js',

  async init({ log }) {
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.rules = {
      eval: (cards7) => best5From7(cards7),
      rankName: (rank) => (
        ['High Card','Pair','Two Pair','Trips','Straight','Flush','Full House','Quads','Straight Flush'][rank] || 'Unknown'
      )
    };
    log?.('rulesTexasHoldem.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.rules?.eval;
    return { ok, note: ok ? 'rules ready' : 'rules missing' };
  }
};
