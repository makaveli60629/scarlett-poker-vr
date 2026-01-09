// /js/safe_import.js — resilient dynamic importer for GitHub Pages
// - Adds ?v=BUILD to defeat cache after phone crashes / partial deploys
// - Logs clean errors so you can see missing files quickly

export function getBuildV() {
  return (window.__BUILD_V || Date.now().toString());
}

export function withV(url) {
  const v = encodeURIComponent(getBuildV());
  if (url.includes("?")) return `${url}&v=${v}`;
  return `${url}?v=${v}`;
}

export async function safeImport(path) {
  const url = withV(path);
  try {
    const mod = await import(url);
    return mod;
  } catch (e) {
    console.error("[safe_import] import failed:", path, e);
    // also push into your on-page log if present
    try {
      const ev = new CustomEvent("scarlett-log", { detail: `❌ import failed: ${path} :: ${e?.message || e}` });
      window.dispatchEvent(ev);
    } catch {}
    throw e;
  }
}
