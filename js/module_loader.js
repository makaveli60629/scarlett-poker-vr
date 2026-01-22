async function fetchManifest(){
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
  return [
    { label: "scarlett1/index", path: "./js/scarlett1/index.js" },
    { label: "pip/jumbotron", path: "./js/modules/jumbotron.js" },
    { label: "audio", path: "./js/modules/audio.js" },
    { label: "bots", path: "./js/modules/bots.js" },
    { label: "cards", path: "./js/modules/cards.js" },
    { label: "chips", path: "./js/modules/chips.js" }
  ];
}

function siteBaseHref(){ return new URL("./", window.location.href).href; }
function normalizePath(path){
  if (!path) return null;
  try { return (new URL(path)).href; } catch (_) {}
  let p = String(path).trim();
  if (p.startsWith("/")) p = p.slice(1);
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
