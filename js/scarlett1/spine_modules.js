// js/scarlett1/spine_modules.js — Safe Module Loader (FULL • PERMANENT)
// Usage: ModulesSpine.load({ base, log })

export const ModulesSpine = (() => {
  async function load(ctx = {}) {
    const base = ctx.base || "/";
    const log = ctx.log || console.log;

    try {
      const url = `${base}modules.json?v=${Date.now()}`;
      log(`[mods] loading ${url}`);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`modules.json HTTP ${res.status}`);
      const j = await res.json();

      const profile = j?.profiles?.[j?.activeProfile];
      if (!profile) {
        log("[mods] no active profile, skipping");
        return [];
      }

      const mods = profile.modules || [];
      const loaded = [];

      for (const m of mods) {
        try {
          const full = m.startsWith("http") ? m : `${base}${m.replace(/^\//,"")}`;
          log(`[mods] import ${full}`);
          const mod = await import(full + `?v=${Date.now()}`);
          loaded.push({ url: full, mod });
          log(`[mods] OK ✅ ${full}`);
        } catch (e) {
          log(`[mods] FAIL ❌ ${m} :: ${e?.message || e}`);
          // continue; never break core
        }
      }

      return loaded;
    } catch (e) {
      log(`[mods] loader error ❌ ${e?.message || e}`);
      return [];
    }
  }

  return { load };
})();
