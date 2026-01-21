// /js/scarlett1/index.js
// Minimal SCARLETT1 bridge so the module loader's "scarlett1/index" audit passes.
// It simply ensures the world export contract is satisfied.

import { initWorld } from "../world.js";

export function init(ctx = {}) {
  if (window.__scarlettWorldBuilt) {
    console.log('[scarlett1] world already built');
    return;
  }
  // ctx.scene is provided by app.js/module_loader.js
  const scene = ctx.scene || document.querySelector("a-scene");
  if (!scene) {
    console.warn("[scarlett1] no scene found");
    return;
  }
  try {
    initWorld(scene);
    window.__scarlettWorldBuilt = true;
    console.log("[scarlett1] init ✅");
  } catch (e) {
    console.error("[scarlett1] init error", e);
    throw e;
  }
}
