// /js/scarlett1/spine_modules.js — SAFE MODULE LOADER v1.0
// ✅ No duplicate "init" declarations
// ✅ Exposes window.__SCARLETT_MODULES_INIT__ for world.js to call
// ✅ Loads /modules.json and imports each module
// ✅ If module exports init(), it runs it
// ✅ Failures do NOT break boot/world

export async function initModules(ctx = {}) {
  const log = ctx.log || console.log;

  const base = (location.pathname.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/");
  const url = `${base}modules.json?v=${Date.now()}`;

  let cfg = null;
  try {
    log(`[mods] loading ${url}`);
    const r = await fetch(url, { cache: "no-store" });
    cfg = await r.json();
    log("[mods] modules.json OK ✅");
  } catch (e) {
    log("[mods] modules.json FAILED (skip):", e?.message || e);
    return { loaded: 0, failed: 0 };
  }

  const list = Array.isArray(cfg?.modules) ? cfg.modules : [];
  let loaded = 0, failed = 0;

  for (const entry of list) {
    const modUrl = (typeof entry === "string") ? entry : entry?.url;
    const name = (typeof entry === "object" && entry?.name) ? entry.name : modUrl;

    if (!modUrl || typeof modUrl !== "string") continue;

    try {
      log(`[mods] import ${modUrl}`);
      const mod = await import(modUrl + (modUrl.includes("?") ? "&" : "?") + "v=" + Date.now());
      loaded++;

      if (mod && typeof mod.init === "function") {
        await mod.init(ctx);
        log(`[mods] ${name}: init ✅`);
      } else {
        log(`[mods] ${name}: loaded (no init)`);
      }
    } catch (e) {
      failed++;
      log(`[mods] ${name}: FAIL`, e?.message || e);
    }
  }

  log(`[mods] done ✅ loaded=${loaded} failed=${failed}`);
  return { loaded, failed };
}

// Expose SAFE hook for world.js (optional)
if (typeof window !== "undefined") {
  window.__SCARLETT_MODULES_INIT__ = async (ctx) => {
    return initModules(ctx);
  };
}
