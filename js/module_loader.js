// /js/module_loader.js — crash-proof optional module import + audit (V26.1.2 GH-PAGES FIX)
//
// FIX: GitHub Pages *project* sites live under /<repo>/, so absolute paths like "/js/x.js"
// incorrectly resolve to https://<user>.github.io/js/x.js (missing "/<repo>/").
// We now resolve module paths against the *site base* (the directory of the current page).
//
// Also improves missing vs runtime-error classification by probing the URL with fetch().
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
  // Recommended for GH Pages project sites: use relative paths like "./js/..." (NOT "/js/...").
  return [
    { label: "scarlett1/index", path: "./js/scarlett1/index.js" },
    { label: "pip/jumbotron", path: "./js/modules/jumbotron.js" },
    { label: "audio", path: "./js/modules/audio.js" },
    { label: "bots", path: "./js/modules/bots.js" },
    { label: "cards", path: "./js/modules/cards.js" },
    { label: "chips", path: "./js/modules/chips.js" }
  ];
}

function siteBaseHref(){
  // Directory of current page (ends with "/")
  return new URL("./", window.location.href).href;
}

function normalizePath(path){
  if (!path) return null;

  // If already absolute URL, keep it.
  try { return (new URL(path)).href; } catch (_) {}

  let p = String(path).trim();

  // If author gave an origin-root path like "/js/x.js", rewrite it to site-base rooted.
  if (p.startsWith("/")) p = p.slice(1);

  // Resolve relative to site base (works for GH Pages project sites and root sites)
  return new URL(p, siteBaseHref()).href;
}

async function probe(url){
  try{
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    return { ok: r.ok, status: r.status };
  } catch (e){
    return { ok: false, status: 0, err: e?.message || String(e) };
  }
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

    const url = normalizePath(path);

    try{
      await import(url);
      report.ok.push({ label, path, url });
      diagWrite?.(`[audit] OK: ${label} -> ${path}`);
    } catch (e){
      const msg = e?.message || String(e);

      const p = await probe(url);
      if (!p.ok){
        report.missing.push({ label, path, url, reason: `fetch ${p.status || "fail"}; ${msg}` });
        diagWrite?.(`[audit] MISSING: ${label} -> ${path} (url=${url})`);
      } else {
        report.error.push({ label, path, url, reason: msg });
        diagWrite?.(`[audit] ERROR: ${label} -> ${path} (url=${url}) (${msg})`);
      }
    }
  }
  return report;
}
