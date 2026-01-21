// /js/module_loader.js — crash-proof optional module import + audit (V26.1.1 FIX)
// FIX: manifest paths like "./js/..." were being resolved relative to this file ("/js/"),
// producing "/js/js/...". We now normalize to an absolute URL before importing.
async function fetchManifest(){
  if (Array.isArray(window.SCARLETT_MODULES) && window.SCARLETT_MODULES.length) return window.SCARLETT_MODULES;

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
  // Author paths as site-root relative (recommended): "/js/...."
  // You can also use "./js/...." and it will be normalized.
  return [
    { label: "scarlett1/index", path: "/js/scarlett1/index.js" },
    { label: "pip/jumbotron", path: "/js/modules/jumbotron.js" },
    { label: "audio", path: "/js/modules/audio.js" },
    { label: "bots", path: "/js/modules/bots.js" },
    { label: "cards", path: "/js/modules/cards.js" },
    { label: "chips", path: "/js/modules/chips.js" }
  ];
}

function normalizePath(path){
  if (!path) return null;

  // If already absolute URL, keep it.
  try { return (new URL(path)).href; } catch (_) {}

  let p = String(path).trim();

  // Common authoring patterns
  if (p.startsWith("./js/")) p = p.slice(1);      // "./js/x" -> "/js/x"
  if (p.startsWith("js/")) p = "/" + p;           // "js/x" -> "/js/x"

  // Resolve against page URL so it becomes absolute and avoids /js/js double-path
  return new URL(p, window.location.href).href;
}

async function safeImport(path){
  const url = normalizePath(path);
  return import(url);
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
      const missing = /failed to fetch|cannot find module|404|not found/i.test(msg);
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
