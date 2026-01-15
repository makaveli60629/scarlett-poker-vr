// /js/scarlett1/spine_modules.js — Scarlett 1.0 Module Loader (SAFE • PERMANENT)
// Loads root /modules.json and attempts optional addons without breaking spine.

export const SpineModules = (() => {
  const state = {
    loaded: new Map(),   // name -> { url, mod }
    failed: new Map(),   // name -> error
    list: null
  };

  function dlog(ctx, ...a) {
    try {
      const s = a.join(" ");
      if (ctx?.diag?.log) ctx.diag.log(s);
      else if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(s);
      else console.log("[mods]", s);
    } catch {}
  }

  async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`fetch failed ${r.status} ${url}`);
    return await r.json();
  }

  async function loadModulesJson(ctx) {
    // Prefer ROOT modules.json, fallback to js/scarlett1/modules.json if you ever add it.
    const base = "/scarlett-poker-vr/";
    const candidates = [
      `${base}modules.json?v=${Date.now()}`,
      `${base}js/scarlett1/modules.json?v=${Date.now()}`
    ];

    for (const u of candidates) {
      try {
        dlog(ctx, `loading modules.json: ${u}`);
        const j = await fetchJson(u);
        state.list = j;
        dlog(ctx, `modules.json OK ✅`);
        return j;
      } catch (e) {
        dlog(ctx, `modules.json miss: ${u}`);
      }
    }
    throw new Error("No modules.json found (root or /js/scarlett1/).");
  }

  async function tryImport(ctx, urls) {
    let lastErr = null;
    for (const url of urls) {
      try {
        // cache-bust per run
        const u = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
        dlog(ctx, `import ${u}`);
        const mod = await import(u);
        return { url: u, mod };
      } catch (e) {
        lastErr = e;
        dlog(ctx, `fail ${url}`);
      }
    }
    throw lastErr || new Error("import failed");
  }

  async function initAddon(ctx, name, mod, url) {
    // standard entry points:
    // - export function init(ctx)
    // - export default function(ctx) OR default object with init
    // - export function install(ctx)
    const api =
      (typeof mod?.init === "function" && mod.init) ||
      (typeof mod?.install === "function" && mod.install) ||
      (typeof mod?.default === "function" && mod.default) ||
      (typeof mod?.default?.init === "function" && mod.default.init) ||
      null;

    if (!api) {
      dlog(ctx, `${name}: loaded but no init() found (skipping)`);
      return;
    }

    dlog(ctx, `${name}: init…`);
    await api(ctx);
    dlog(ctx, `${name}: ready ✅ (${url})`);
  }

  async function loadAll(ctx) {
    try {
      const list = await loadModulesJson(ctx);
      const mods = Array.isArray(list?.modules) ? list.modules : [];

      // Only ADDONS are handled here. Core spine already loads via boot.
      const addons = mods.filter(m => m && m.type === "addon" && m.enabled);

      for (const m of addons) {
        const name = m.name || "addon";
        const paths = Array.isArray(m.paths) ? m.paths : [];
        if (!paths.length) continue;

        try {
          const { url, mod } = await tryImport(ctx, paths);
          state.loaded.set(name, { url, mod });
          await initAddon(ctx, name, mod, url);
        } catch (e) {
          state.failed.set(name, e);
          dlog(ctx, `${name}: FAILED (optional) ❌ ${e?.message || e}`);
          // optional means no crash
        }
      }

      dlog(ctx, `addons done ✅ loaded=${state.loaded.size} failed=${state.failed.size}`);
    } catch (e) {
      dlog(ctx, `module loader failed (non-fatal) ❌ ${e?.message || e}`);
    }
  }

  return { state, loadAll };
})();

export async function initModules(ctx) {
  return SpineModules.loadAll(ctx);
  }
