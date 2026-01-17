const hud = document.getElementById("hud");

const add = (m, cls="ok") => {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = m;
  hud.appendChild(d);
  hud.scrollTop = hud.scrollHeight;
  console.log(m);
};

function detectBasePrefix() {
  const p = window.location.pathname || "/";
  const idx = p.indexOf("/js/");
  if (idx !== -1) return p.slice(0, idx + 1); // keep trailing "/"
  if (p.endsWith(".html")) return p.slice(0, p.lastIndexOf("/") + 1);
  return p.endsWith("/") ? p : (p + "/");
}

export const Boot = {
  start: async () => {
    hud.textContent = "";
    const v = Date.now();
    add(`[BOOT] v=${v}`, "ok");

    const prefix = detectBasePrefix();             // e.g. "/scarlett-poker-vr/"
    const absJS  = prefix + "js/";                 // e.g. "/scarlett-poker-vr/js/"
    const absRoot = prefix;                        // e.g. "/scarlett-poker-vr/"
    const basePaths = [absJS, absRoot, "./js/", "./"];

    add(`[PATH] prefix=${prefix}`, "ok");
    add(`[PATH] basePaths=${JSON.stringify(basePaths)}`, "ok");

    const tryImport = async (name, rel) => {
      for (const b of basePaths) {
        const p = b + rel;
        try {
          add(`[Import] ${name}: ${p}`);
          const m = await import(p + `?v=${v}`);
          add(`[OK] ${name}`, "ok");
          return m;
        } catch (e) {
          add(`[TryFail] ${name}: ${p} → ${e.message}`, "warn");
        }
      }
      add(`[ERROR] ${name}: could not load`, "err");
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
    };

    if (!mods.main?.start) {
      add("❌ main.start missing", "err");
      return;
    }

    add("▶ main.start()", "ok");
    try {
      await mods.main.start({ modules: mods, log: add });
      add("✅ main.start() returned", "ok");
    } catch (e) {
      add(`[FATAL] main.start crashed: ${e.message}`, "err");
      console.error(e);
    }
  }
};
