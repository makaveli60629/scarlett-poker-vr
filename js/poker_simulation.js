// js/poker_simulation.js — Patch 6.7 FULL (Boss-only Crown integration)
// If you already have poker_simulation.js, REPLACE IT with this version.
// This drives:
// - BossBots-only play
// - Leaderboard updates
// - CrownSystem winner declarations

export const PokerSimulation = {
  t: 0,
  nextHandIn: 6.0,
  minHand: 4.5,
  maxHand: 8.5,

  bossBots: null,
  leaderboard: null,
  crown: null,
  toast: null,

  // simple scoreboard
  scores: {},

  init(scene, camera, BossBots, Leaderboard, toast, CrownSystem) {
    this.bossBots = BossBots || null;
    this.leaderboard = Leaderboard || null;
    this.crown = CrownSystem || null;
    this.toast = toast || null;

    // Seed boss roster if exists
    const list = this._bossList();
    for (const b of list) this.scores[b.name] = this.scores[b.name] || 0;

    this._pushBoard();
  },

  _bossList() {
    if (Array.isArray(this.bossBots)) return this.bossBots;
    if (this.bossBots?.list) return this.bossBots.list();
    if (Array.isArray(this.bossBots?.bots)) return this.bossBots.bots;

    // fallback
    return [
      { id: "boss_0", name: "Boss Alpha" },
      { id: "boss_1", name: "Boss Beta" },
      { id: "boss_2", name: "Boss Gamma" },
      { id: "boss_3", name: "Boss Delta" },
      { id: "boss_4", name: "Boss Omega" }
    ];
  },

  _pickWinner() {
    const list = this._bossList();
    if (list.length === 0) return null;

    // Weighted aggressiveness: Omega/Gamma more likely
    const weights = list.map((b) => {
      const n = (b.name || "").toLowerCase();
      if (n.includes("omega")) return 1.8;
      if (n.includes("gamma")) return 1.35;
      if (n.includes("alpha")) return 1.15;
      return 1.0;
    });

    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  },

  _pushBoard() {
    if (!this.leaderboard) return;

    // Top 8 bosses by points
    const rows = Object.entries(this.scores)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 8);

    const holder = this.crown?.data?.holder?.name || "None";

    this.leaderboard.update(0, null, {
      title: "BOSS SHOWDOWN",
      rows,
      footer: `Crown Holder: ${holder} • Boss table is spectator-only`
    });
  },

  update(dt) {
    this.t += dt;
    this.nextHandIn -= dt;

    if (this.nextHandIn <= 0) {
      this.nextHandIn = this.minHand + Math.random() * (this.maxHand - this.minHand);

      const winner = this._pickWinner();
      if (!winner) return;

      // add points
      const gain = 50 + Math.floor(Math.random() * 140);
      this.scores[winner.name] = (this.scores[winner.name] || 0) + gain;

      // Sometimes award crown from boss-only hands (rare-ish)
      if (this.crown && Math.random() < 0.18) {
        this.crown.declareWinner(winner, "Boss Table");
        this.toast?.(`Crown taken by ${winner.name}!`);
      } else {
        this.toast?.(`${winner.name} wins +${gain}`);
      }

      this._pushBoard();
    }
  }
};
