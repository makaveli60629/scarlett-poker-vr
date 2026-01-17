const hud = document.getElementById("hud");

function fmt(msg, cls="") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  hud.appendChild(line);
  hud.scrollTop = hud.scrollHeight;
}

export const Boot = {
  start: async ({ basePaths = ["./js/", "./"] } = {}) => {
    hud.textContent = "";
    const v = Date.now();
    fmt(`[BOOT] v=${v}`, "ok");

    const log = (m, level="ok") => {
      console.log(m);
      fmt(m, level);
    };

    const tryImport = async (name, relPaths) => {
      for (const rel of relPaths) {
        for (const base of basePaths) {
          const path = base + rel;
          try {
            log(`[Import] ${name}: ${path}`);
            const mod = await import(path + `?v=${v}`);
            log(`[OK] ${name}`, "ok");
            return { mod, path };
          } catch (e) {
            // continue trying other candidates
            log(`[TryFail] ${name}: ${path} → ${e.message}`, "warn");
          }
        }
      }
      log(`[ERROR] ${name}: could not load (checked candidates)`, "err");
      return { mod: null, path: null };
    };

    // Candidate names support BOTH Scarlett layouts:
    // - /js/main.js etc
    // - root main.js etc
    const main         = await tryImport("main",         ["main.js"]);
    const world        = await tryImport("world",        ["world.js"]);
    const table        = await tryImport("table",        ["table.js"]);
    const chair        = await tryImport("chair",        ["chair.js"]);
    const ui           = await tryImport("ui",           ["ui.js"]);
    const controls     = await tryImport("controls",     ["controls.js"]);
    const teleport     = await tryImport("teleport",     ["teleport.js"]);
    const interactions = await tryImport("interactions", ["interactions.js"]);

    if (!main.mod?.start) {
      log("❌ main.start() missing — cannot run.", "err");
      return;
    }

    // Shared context object that your Scarlett modules can use
    const ctx = {
      v,
      log,
      hud,
      basePaths,
      modules: {
        main: main.mod,
        world: world.mod,
        table: table.mod,
        chair: chair.mod,
        ui: ui.mod,
        controls: controls.mod,
        teleport: teleport.mod,
        interactions: interactions.mod
      }
    };

    log("▶ main.start()", "ok");
    try {
      await main.mod.start(ctx);
      log("✅ main.start() returned", "ok");
    } catch (e) {
      log(`[FATAL] main.start() crashed: ${e.message}`, "err");
      console.error(e);
    }
  }
};
