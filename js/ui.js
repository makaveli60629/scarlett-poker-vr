// /js/ui.js — Scarlett UI Hub (HARDENED) v2.0
export const UI = {
  init(ctx = {}) {
    const log = ctx.log || console.log;

    // Guarantee containers
    ctx.__ui = ctx.__ui || {};
    ctx.ui = ctx.ui || {};
    ctx.ui.__ui = ctx.ui.__ui || ctx.__ui;

    // Guarantee hub
    if (!ctx.__ui.hub) ctx.__ui.hub = {};
    if (!ctx.ui.hub) ctx.ui.hub = ctx.__ui.hub;

    // Minimal hub defaults so other modules can attach buttons/panels safely
    const hub = ctx.__ui.hub;
    hub.panels = hub.panels || [];
    hub.buttons = hub.buttons || [];
    hub.hotspots = hub.hotspots || [];

    // Expose for debugging
    window.__SCARLETT_UIHUB = hub;

    log("[ui] init ✅ hardened hub ready");
  }
};
