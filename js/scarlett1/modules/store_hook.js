// /js/scarlett1/modules/store_hook.js — Scarlett Store Hook v1 (SAFE)
// Tries to load your store system without risking the spine/world.
// Usage: StoreHook.install({ THREE, DIAG, WORLD })

export const StoreHook = (() => {
  async function install({ THREE, DIAG, WORLD }) {
    const D = DIAG || console;
    const W = WORLD || window.__SCARLETT1__;
    if (!W?.scene || !W?.camera || !W?.rig) {
      D.warn("[store_hook] WORLD missing scene/camera/rig");
      return;
    }

    // Try common locations (you can add more later)
    const candidates = [
      `/scarlett-poker-vr/js/store.js?v=${Date.now()}`,
      `/scarlett-poker-vr/js/scarlett1/store.js?v=${Date.now()}`,
      `/scarlett-poker-vr/js/scarlett1/modules/store.js?v=${Date.now()}`
    ];

    let mod = null;
    for (const url of candidates) {
      try {
        mod = await import(url);
        D.log("[store_hook] store import ✅", url);
        break;
      } catch (e) {
        // ignore, try next
      }
    }

    if (!mod) {
      D.warn("[store_hook] store module not found (safe).");
      return;
    }

    // If your store module exposes StoreSystem.init(...)
    const StoreSystem = mod.StoreSystem || mod.default || null;
    if (!StoreSystem?.init) {
      D.warn("[store_hook] store module loaded but no StoreSystem.init found");
      return;
    }

    try {
      StoreSystem.init({
        THREE,
        scene: W.scene,
        world: W,
        player: W.rig,
        camera: W.camera,
        log: (...a) => D.log("[store]", ...a)
      });
      D.log("[store_hook] store init ✅");
    } catch (e) {
      D.warn("[store_hook] store init failed (safe)", e?.message || e);
    }
  }

  return { install };
})();
