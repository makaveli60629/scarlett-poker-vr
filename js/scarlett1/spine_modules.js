// /js/scarlett1/spine_modules.js — Scarlett Module Loader (SAFE)
// Fixes: "Identifier 'init' has already been declared" by avoiding global init collisions.

export async function initModules(ctx) {
  const log = ctx?.log || console.log;
  const base = ctx?.base || "/scarlett-poker-vr/";

  const url = `${base}modules.json?v=${Date.now()}`;
  log(`[mods] loading ${url}`);

  let data = null;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`modules.json http ${r.status}`);
    data = await r.json();
    log("[mods] modules.json ✅");
  } catch (e) {
    log("[mods] modules.json FAILED ❌", e?.message || e);
    return { loaded: [], failed: ["modules.json"] };
  }

  const loaded = [];
  const failed = [];

  async function loadOne(entry, kind) {
    try {
      if (!entry || entry.enabled === false) return;
      const u = entry.url;
      if (typeof u !== "string") throw new Error(`${kind}.${entry.id}: url is not string`);
      log(`[mods] import ${u}`);
      const mod = await import(`${u}?v=${Date.now()}`);
      loaded.push(entry.id);

      // Convention: module can export init(ctx) or default(ctx)
      if (typeof mod.init === "function") {
        await mod.init(ctx);
        log(`[mods] ${kind}_${entry.id} init ✅`);
      } else if (typeof mod.default === "function") {
        await mod.default(ctx);
        log(`[mods] ${kind}_${entry.id} default() ✅`);
      } else {
        log(`[mods] ${kind}_${entry.id}: loaded (no init/default) (skip)`);
      }
    } catch (e) {
      failed.push(entry?.id || "unknown");
      log(`[mods] ${kind} FAILED ❌ ${entry?.id}`, e?.message || e);
    }
  }

  // Spines first (controls / platform)
  if (Array.isArray(data.spines)) {
    for (const s of data.spines) await loadOne(s, "spine");
  }

  // Addons second (world extras)
  if (Array.isArray(data.addons)) {
    for (const a of data.addons) await loadOne(a, "addon");
  }

  log(`[mods] done ✅ loaded=${loaded.length} failed=${failed.length}`);
  return { loaded, failed };
}
