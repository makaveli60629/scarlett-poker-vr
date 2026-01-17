const hud = document.getElementById("hud");

const add = (m) => {
  const d = document.createElement("div");
  d.textContent = m;
  hud.appendChild(d);
  hud.scrollTop = hud.scrollHeight;
  console.log(m);
};

function detectBasePrefix() {
  const p = window.location.pathname || "/";
  const idx = p.indexOf("/js/");
  if (idx !== -1) return p.slice(0, idx + 1);
  if (p.endsWith(".html")) return p.slice(0, p.lastIndexOf("/") + 1);
  return p.endsWith("/") ? p : (p + "/");
}

export const Boot = {
  start: async () => {
    hud.textContent = "";
    const v = Date.now();
    add(`[BOOT] v=${v}`);

    const prefix = detectBasePrefix();
    const absJS  = prefix + "js/";
    const absRoot = prefix;
    const basePaths = [absJS, absRoot, "./js/", "./"];

    add(`[PATH] prefix=${prefix}`);
    add(`[PATH] basePaths=${JSON.stringify(basePaths)}`);

    const tryImport = async (name, rel) => {
      for (const b of basePaths) {
        const p = b + rel;
        try {
          add(`[Import] ${name}: ${p}`);
          const m = await import(p + `?v=${v}`);
          add(`[OK] ${name}`);
          return m;
        } catch (e) {
          add(`[TryFail] ${name}: ${p} → ${e.message}`);
        }
      }
      add(`[ERROR] ${name}: could not load`);
      return null;
    };

    const mods = {
      main: await tryImport("main", "main.js"),
      world: await tryImport("world", "world.js"),
      table: await tryImport("table", "table.js"),
      chair: await tryImport("chair", "chair.js"),
      ui: await tryImport("ui", "ui.js"),
      controls: await tryImport("controls", "controls.js"),
      teleport: await tryImport("teleport", "teleport.js"),
      interactions: await tryImport("interactions", "interactions.js"),
      bots: await tryImport("bots", "bots.js"),
      apparel: await tryImport("apparel", "avatar_apparel.js"),
    };

    if (!mods.main?.start) {
      add("❌ main.start missing");
      return;
    }

    add("▶ main.start()");
    try {
      await mods.main.start({ modules: mods, log: add });
      add("✅ main.start() returned");
    } catch (e) {
      add(`[FATAL] main.start crashed: ${e.message}`);
      console.error(e);
    }
  }
};
