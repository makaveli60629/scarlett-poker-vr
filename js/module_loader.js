export function createSafeModuleLoader({ log }) {
  const state = {
    modules: new Map(),
    statuses: new Map(),
    updates: [],
  };

  function setStatus(name, status, msg = "") {
    state.statuses.set(name, { status, msg });
    log?.(status === "fail" ? "error" : status === "warn" ? "warn" : "log",
      `[mod] ${name}: ${status.toUpperCase()}${msg ? " — " + msg : ""}`);
  }

  async function loadOne(entry, ctx) {
    const { name, url, required } = entry;
    try {
      const mod = await import(url);

      if (typeof mod.init === "function") {
        try { await mod.init(ctx); }
        catch (e) {
          const msg = (e?.stack || e?.message || String(e));
          setStatus(name, required ? "fail" : "warn", `init() crashed${required ? " (required)" : ""}: ${msg}`);
          return null;
        }
      }

      if (typeof mod.update === "function") {
        state.updates.push({ name, fn: mod.update });
      }

      state.modules.set(name, mod);
      setStatus(name, "ok", "loaded");
      return mod;

    } catch (e) {
      const msg = (e?.message || String(e));
      setStatus(name, required ? "fail" : "warn", `missing/broken${required ? " (required)" : ""}: ${msg}`);
      return null;
    }
  }

  async function loadAll(entries, ctx) {
    for (const entry of entries) await loadOne(entry, ctx);
    return getReport();
  }

  function updateAll(dt, ctx) {
    for (const u of state.updates) {
      try { u.fn(dt, ctx); }
      catch (e) { setStatus(u.name, "warn", `update() crashed: ${e?.message || e}`); }
    }
  }

  function getReport() {
    const report = [];
    for (const [name, s] of state.statuses.entries()) report.push({ name, ...s });
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
