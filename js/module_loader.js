// /module_loader.js — Scarlett Permanent SafeModuleLoader v1.0
// Purpose: load optional modules WITHOUT ever breaking boot.
// - Handles missing files, syntax errors, runtime errors in init
// - Logs per-module status: ok / warn / fail
// - Supports init(ctx) + optional update(dt, ctx)

export function createSafeModuleLoader({ log }) {
  const state = {
    modules: new Map(),     // name -> module api
    statuses: new Map(),    // name -> { status, msg }
    updates: [],            // { name, fn }
  };

  function setStatus(name, status, msg = "") {
    state.statuses.set(name, { status, msg });
    log?.(status === "fail" ? "error" : status === "warn" ? "warn" : "log",
          `[mod] ${name}: ${status.toUpperCase()}${msg ? " — " + msg : ""}`);
  }

  async function loadOne(entry, ctx) {
    const name = entry.name;
    const url = entry.url;
    const required = !!entry.required;

    try {
      const mod = await import(url);

      // If module has init, run it (guarded)
      if (typeof mod.init === "function") {
        try {
          await mod.init(ctx);
        } catch (e) {
          const msg = (e?.stack || e?.message || String(e));
          if (required) {
            setStatus(name, "fail", `init() crashed (required): ${msg}`);
          } else {
            setStatus(name, "warn", `init() crashed: ${msg}`);
          }
          return null;
        }
      }

      // Collect update if present
      if (typeof mod.update === "function") {
        state.updates.push({ name, fn: mod.update });
      }

      state.modules.set(name, mod);
      setStatus(name, "ok", "loaded");
      return mod;

    } catch (e) {
      const msg = (e?.message || String(e));
      if (required) setStatus(name, "fail", `missing/broken (required): ${msg}`);
      else setStatus(name, "warn", `missing/broken: ${msg}`);
      return null;
    }
  }

  async function loadAll(entries, ctx) {
    for (const entry of entries) {
      await loadOne(entry, ctx);
    }
    return getReport();
  }

  function updateAll(dt, ctx) {
    for (const u of state.updates) {
      try {
        u.fn(dt, ctx);
      } catch (e) {
        setStatus(u.name, "warn", `update() crashed: ${e?.message || e}`);
      }
    }
  }

  function getReport() {
    const report = [];
    for (const [name, s] of state.statuses.entries()) {
      report.push({ name, ...s });
    }
    report.sort((a, b) => a.name.localeCompare(b.name));
    return report;
  }

  return {
    loadAll,
    updateAll,
    getReport,
    get: (name) => state.modules.get(name) || null
  };
}
