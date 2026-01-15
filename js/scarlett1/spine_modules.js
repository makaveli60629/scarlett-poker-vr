// /js/scarlett1/spine_modules.js — Scarlett Module Loader (FULL • SAFE)
// Loads /modules.json and initializes modules that expose init(ctx) or default init(ctx)
// Never breaks XR; Android modules only run when NOT in XR.
export function init(ctx) {}
// or
export function initModule(ctx) {}
// or
export default function init(ctx) {}
export async function initModules(ctx) {
  const log = ctx?.log || ((...a) => console.log("[mods]", ...a));
  const fail = ctx?.fail || ((...a) => console.warn("[mods]", ...a));

  const base = ctx?.base || "/scarlett-poker-vr/";
  const modulesUrl = `${base}modules.json?v=${Date.now()}`;

  log("loading modules.json:", modulesUrl);

  let json;
  try {
    const res = await fetch(modulesUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`modules.json HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    fail("modules.json failed:", e?.message || e);
    return { loaded: 0, failed: 1 };
  }

  const list = Array.isArray(json?.modules) ? json.modules : [];
  log("modules.json OK ✅ count=", list.length);

  let loaded = 0, failedCount = 0;

  for (const entry of list) {
    const url = (typeof entry === "string") ? entry : entry?.url;
    if (!url || typeof url !== "string") {
      fail("skip invalid module entry:", entry);
      failedCount++;
      continue;
    }

    // Avoid double-loading this loader itself
    if (url.includes("/spine_modules.js")) continue;

    try {
      const modUrl = url.includes("?") ? url : `${url}?v=${Date.now()}`;
      log("import", modUrl);
      const mod = await import(modUrl);

      // If module exposes init(ctx), call it
      const initFn =
        (typeof mod.init === "function") ? mod.init :
        (typeof mod.default === "function") ? mod.default :
        null;

      if (initFn) {
        await initFn(ctx);
        log("OK ✅", url);
      } else {
        log("loaded (no init) — skip", url);
      }

      loaded++;
    } catch (e) {
      fail("module failed ❌", url, e?.message || e);
      failedCount++;
    }
  }

  return { loaded, failed: failedCount };
}
