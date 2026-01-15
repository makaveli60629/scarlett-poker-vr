// /js/scarlett1/spine_modules.js — Scarlett 1.0 Safe Module Loader (FULL • PERMANENT)
export async function init(ctx = {}) {
  const log = ctx?.log || console.log;
  const diagLog = (s) => {
    try { window.__SCARLETT_DIAG_LOG__?.(String(s)); } catch {}
    try { log(s); } catch {}
  };

  const base = window.__SCARLETT_BASE__ || (location.pathname.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/");
  const urlMods = `${base}modules.json?v=${Date.now()}`;

  function normalizeList(json) {
    // supports:
    // { modules: [ "url", {id, enabled, urls:[...]}, ... ] }
    // { core:[...], addons:[...] } etc
    let list = [];
    if (Array.isArray(json?.modules)) list = json.modules;
    else {
      const maybe = [];
      if (Array.isArray(json?.core)) maybe.push(...json.core);
      if (Array.isArray(json?.addons)) maybe.push(...json.addons);
      if (maybe.length) list = maybe;
    }

    // normalize to objects: {id, enabled, urls:[...]}
    const out = [];
    for (const entry of list) {
      if (typeof entry === "string") {
        out.push({ id: entry, enabled: true, urls: [entry] });
        continue;
      }
      if (entry && typeof entry === "object") {
        const enabled = entry.enabled !== false;
        const urls = Array.isArray(entry.urls) ? entry.urls.slice() : (typeof entry.url === "string" ? [entry.url] : []);
        const id = entry.id || entry.name || (urls[0] || "module");
        if (urls.length) out.push({ id, enabled, urls });
      }
    }
    return out;
  }

  function resolve(u) {
    // allow absolute, root-relative, or relative
    if (!u) return "";
    if (u.startsWith("http")) return u;
    if (u.startsWith("/")) return u;
    return base + u.replace(/^\.\//, "");
  }

  async function importOne(u) {
    const full = resolve(u);
    const bust = full + (full.includes("?") ? "&" : "?") + "v=" + Date.now();
    diagLog(`[mods] import ${full}`);
    const mod = await import(bust);
    diagLog(`[mods] OK ✅ ${full}`);
    return mod;
  }

  function callInit(mod, id) {
    const fn =
      (typeof mod?.init === "function" && mod.init) ||
      (typeof mod?.default?.init === "function" && mod.default.init) ||
      (typeof mod?.install === "function" && mod.install) ||
      null;

    if (!fn) {
      diagLog(`[mods] ${id}: loaded but no init() found (skipping)`);
      return;
    }
    try {
      fn(ctx);
      diagLog(`[mods] ${id}: init() ✅`);
    } catch (e) {
      diagLog(`[mods] ${id}: init() failed ❌ ${e?.message || e}`);
    }
  }

  try {
    diagLog(`loading modules.json: ${urlMods}`);
    const res = await fetch(urlMods, { cache: "no-store" });
    const json = await res.json();
    diagLog(`modules.json OK ✅`);

    const list = normalizeList(json);
    let loaded = 0, failed = 0;

    for (const m of list) {
      if (!m.enabled) continue;
      const id = m.id || "module";
      for (const u of m.urls) {
        try {
          const mod = await importOne(u);
          loaded++;
          callInit(mod, id);
        } catch (e) {
          failed++;
          diagLog(`[mods] ${id}: failed ❌ ${e?.message || e}`);
        }
      }
    }

    diagLog(`addons/modules done ✅ loaded=${loaded} failed=${failed}`);
  } catch (e) {
    diagLog(`[mods] modules.json load failed ❌ ${e?.message || e}`);
  }
}
