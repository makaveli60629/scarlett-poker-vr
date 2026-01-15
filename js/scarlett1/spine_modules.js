export function makeSafeModules(ctx) {
  const { ROOT, log } = ctx;
  const state = {
    list: [],
    updaters: [],
    okCount: 0,
    errCount: 0
  };

  async function loadList(relJson) {
    state.list = [];
    state.updaters = [];
    state.okCount = 0;
    state.errCount = 0;

    let data = null;
    try {
      const r = await fetch(relJson, { cache:"no-store" });
      data = await r.json();
    } catch (e) {
      log("modules.json missing/invalid (ok):", e?.message || e);
      return;
    }

    const modules = Array.isArray(data?.modules) ? data.modules : [];
    for (const m of modules) {
      const name = String(m?.name || "");
      const enabled = !!m?.enabled;
      if (!name) continue;

      const rec = { name, enabled, status: enabled ? "loading" : "disabled", error:"" };
      state.list.push(rec);

      if (!enabled) continue;

      try {
        const url = `${ROOT}${name}?v=${Date.now()}`; // name is like "world.js" or "poker_system.js"
        log("module import:", url);
        const mod = await import(url);

        // convention: init(ctx) optional
        if (typeof mod.init === "function") {
          const inst = await mod.init(ctx);
          if (inst && typeof inst.update === "function") state.updaters.push(inst.update);
        }

        rec.status = "ok";
        state.okCount++;
      } catch (e) {
        rec.status = "error";
        rec.error = e?.message || String(e);
        state.errCount++;
        log("module failed:", name, rec.error);
      }
    }
  }

  function update(dt) {
    for (const fn of state.updaters) {
      try { fn(dt); } catch (e) { log("module.update error:", e?.message || e); }
    }
  }

  return { ...state, loadList, update };
}
