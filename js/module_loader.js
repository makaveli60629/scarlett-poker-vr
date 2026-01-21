// /js/module_loader.js — crash-proof optional module import + audit
// Put your real module paths in /js/modules.manifest.json (or window.SCARLETT_MODULES).
//
// This never throws to the boot path. It reports ok/missing/error so we can clean the folder safely.
async function fetchManifest(){
  // 1) runtime override
  if (Array.isArray(window.SCARLETT_MODULES) && window.SCARLETT_MODULES.length) return window.SCARLETT_MODULES;

  // 2) manifest file
  try {
    const res = await fetch("./js/modules.manifest.json", { cache: "no-store" });
    if (!res.ok) return defaultModules();
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.modules)) return data.modules;
  } catch (_) {}
  return defaultModules();
}

function defaultModules(){
  // Safe placeholders. Replace with your real list.
  return [
    { label: "scarlett1/index", path: "./js/scarlett1/index.js" },
    { label: "pip/jumbotron", path: "./js/modules/jumbotron.js" },
    { label: "audio", path: "./js/modules/audio.js" },
    { label: "bots", path: "./js/modules/bots.js" },
    { label: "cards", path: "./js/modules/cards.js" },
    { label: "chips", path: "./js/modules/chips.js" }
  ];
}

async function safeImport(path){
  // IMPORTANT: dynamic import must get a *static-ish* string to work with bundlers,
  // but in plain browser modules it’s fine.
  return import(path);
}

export async function auditModules({ diagWrite } = {}){
  const modules = await fetchManifest();
  const report = { ok: [], missing: [], error: [] };

  for (const m of modules){
    const label = m?.label || m?.path || "module";
    const path = m?.path;
    if (!path){
      report.missing.push({ label, path: null, reason: "no path" });
      diagWrite?.(`[audit] MISSING (no path): ${label}`);
      continue;
    }

    try{
      await safeImport(path);
      report.ok.push({ label, path });
      diagWrite?.(`[audit] OK: ${label} -> ${path}`);
    } catch (e){
      const msg = e?.message || String(e);
      // Try to classify "missing file" vs runtime error
      const missing = /failed to fetch|cannot find module|404/i.test(msg);
      if (missing){
        report.missing.push({ label, path, reason: msg });
        diagWrite?.(`[audit] MISSING: ${label} -> ${path} (${msg})`);
      } else {
        report.error.push({ label, path, reason: msg });
        diagWrite?.(`[audit] ERROR: ${label} -> ${path} (${msg})`);
      }
    }
  }
  return report;
}
