// Scarlett Poker VR — Core Bridge (6.2)
// VR Layer -> /core layer connector with safe fallbacks.

export const CoreBridge = {
  core: {
    Engine: null,
    PokerEngine: null,
    TableGame: null,
    Economy: null,
    Inventory: null,
    Prestige: null,
    Controls: null,
    Avatar: null,
    WristHUD: null,
    Store: null,
    Currency: null,
    VrChip: null,
    LobbyEngine: null,
  },

  ready: false,

  async init() {
    // GitHub pages: use relative imports from /js to /core
    // If any import fails, keep the game running (VR layer still works).
    const safe = async (path) => {
      try { return await import(path); }
      catch (e) { console.warn(`[CoreBridge] Missing or failed import: ${path}`, e); return null; }
    };

    const Engine      = await safe("../core/engine.js");
    const PokerEngine = await safe("../core/poker-engine.js");
    const TableGame   = await safe("../core/table-game.js");
    const Economy     = await safe("../core/economy.js");
    const Inventory   = await safe("../core/inventory.js");
    const Prestige    = await safe("../core/prestige-engine.js");
    const Controls    = await safe("../core/controls.js");
    const Avatar      = await safe("../core/avatar.js");
    const WristHUD    = await safe("../core/wrist-hud.js");
    const Store       = await safe("../core/store.js");
    const Currency    = await safe("../core/currency.js");
    const VrChip      = await safe("../core/vr-chip.js");
    const LobbyEngine = await safe("../core/lobby-engine.js");

    // Some modules may export default or named exports — support both
    this.core.Engine      = Engine?.default      ?? Engine;
    this.core.PokerEngine = PokerEngine?.default ?? PokerEngine;
    this.core.TableGame   = TableGame?.default   ?? TableGame;
    this.core.Economy     = Economy?.default     ?? Economy;
    this.core.Inventory   = Inventory?.default   ?? Inventory;
    this.core.Prestige    = Prestige?.default    ?? Prestige;
    this.core.Controls    = Controls?.default    ?? Controls;
    this.core.Avatar      = Avatar?.default      ?? Avatar;
    this.core.WristHUD    = WristHUD?.default    ?? WristHUD;
    this.core.Store       = Store?.default       ?? Store;
    this.core.Currency    = Currency?.default    ?? Currency;
    this.core.VrChip      = VrChip?.default      ?? VrChip;
    this.core.LobbyEngine = LobbyEngine?.default ?? LobbyEngine;

    this.ready = true;
    console.log("[CoreBridge] READY", Object.keys(this.core).filter(k => !!this.core[k]));
  },

  // Convenience wrappers (do not assume your core API yet)
  tick(dt) {
    // If your engine exposes update/tick, call it.
    const e = this.core.Engine;
    try {
      if (e?.update) e.update(dt);
      else if (e?.tick) e.tick(dt);
    } catch (err) {
      console.warn("[CoreBridge] Engine tick error", err);
    }
  },

  onCrownTaken(payload) {
    // Push into inventory/prestige later if those APIs exist
    try {
      const inv = this.core.Inventory;
      if (inv?.addTrophy) inv.addTrophy(payload);
      if (inv?.awardCrown) inv.awardCrown(payload.to, payload.title);
    } catch (e) {}
  }
};
