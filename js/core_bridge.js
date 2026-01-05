// Scarlett Poker VR — Core Bridge (6.2 NEXT STEP)
// VR Layer -> /core layer connector with safe fallbacks + API probing.

export const CoreBridge = {
  core: {},
  ready: false,
  api: {
    hasPoker: false,
    hasTable: false,
    hasEconomy: false,
    tickFn: null,
    decideFn: null,
    tableGetFn: null,
    tableApplyFn: null,
  },

  async init() {
    const safe = async (path) => {
      try { return await import(path); }
      catch (e) { console.warn(`[CoreBridge] Missing import: ${path}`, e); return null; }
    };

    // Import what you have
    const Engine      = await safe("../core/engine.js");
    const PokerEngine = await safe("../core/poker-engine.js");
    const TableGame   = await safe("../core/table-game.js");
    const Economy     = await safe("../core/economy.js");

    // Store modules (support default or named)
    this.core.Engine      = Engine?.default ?? Engine;
    this.core.PokerEngine = PokerEngine?.default ?? PokerEngine;
    this.core.TableGame   = TableGame?.default ?? TableGame;
    this.core.Economy     = Economy?.default ?? Economy;

    this.probeAPI();
    this.ready = true;

    console.log("[CoreBridge] READY api:", this.api);
  },

  probeAPI() {
    // ENGINE tick
    const e = this.core.Engine;
    this.api.tickFn =
      (typeof e?.update === "function" && ((dt) => e.update(dt))) ||
      (typeof e?.tick === "function"   && ((dt) => e.tick(dt))) ||
      null;

    // TABLE
    const t = this.core.TableGame;
    this.api.tableGetFn =
      (typeof t?.getState === "function" && (() => t.getState())) ||
      (typeof t?.state === "object" && (() => t.state)) ||
      null;

    this.api.tableApplyFn =
      (typeof t?.applyAction === "function" && ((action) => t.applyAction(action))) ||
      (typeof t?.dispatch === "function" && ((action) => t.dispatch(action))) ||
      null;

    // POKER decision
    const p = this.core.PokerEngine;
    this.api.decideFn =
      (typeof p?.decideAction === "function" && ((ctx) => p.decideAction(ctx))) ||
      (typeof p?.decide === "function" && ((ctx) => p.decide(ctx))) ||
      null;

    this.api.hasPoker = !!this.api.decideFn;
    this.api.hasTable = !!this.api.tableGetFn && !!this.api.tableApplyFn;

    // Economy optional
    const eco = this.core.Economy;
    this.api.hasEconomy = !!eco;
  },

  tick(dt) {
    try { this.api.tickFn?.(dt); } catch (e) { console.warn("[CoreBridge] tick error", e); }
  },

  // Called by BossBots when they need a move
  getTableState() {
    try { return this.api.tableGetFn?.() ?? null; } catch { return null; }
  },

  decideBossAction(ctx) {
    try {
      if (!this.api.decideFn) return null;
      return this.api.decideFn(ctx);
    } catch (e) {
      console.warn("[CoreBridge] decide error", e);
      return null;
    }
  },

  applyAction(action) {
    try { return this.api.tableApplyFn?.(action); } catch (e) {
      console.warn("[CoreBridge] applyAction error", e);
      return null;
    }
  }
};
