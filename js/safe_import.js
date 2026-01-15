// /js/scarlett1/safe_import.js — safe dynamic import helper
export async function safeImport(src, diag) {
  try {
    const mod = await import(src);
    diag?.log?.("[safeImport] ok:", src);
    return { ok:true, mod };
  } catch (e) {
    diag?.error?.("[safeImport] FAILED:", src, e?.message || e);
    return { ok:false, error:e };
  }
}
