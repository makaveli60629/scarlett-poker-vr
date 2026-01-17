// /js/boot.js — Scarlett Boot Loader (FULL)
// BUILD: BOOT_FULL_v4_3_SAFE
// Purpose: reliable base-path + cachebust + visible errors on mobile/Quest

const BUILD = "BOOT_FULL_v4_3_SAFE";

const log = (...a) => console.log("[BOOT]", ...a);
const err = (...a) => console.error("[BOOT]", ...a);

function $(id) { return document.getElementById(id); }
function setStatus(s) {
  const el = $("status");
  if (el) el.textContent = s;
  console.log("[status]", s);
}

// Compute base path for GitHub Pages project sites:
// /scarlett-poker-vr/ or /scarlett-poker-vr/index.html
function computeBase() {
  const p = location.pathname || "/";
  if (p.endsWith("/")) return p;
  return p.substring(0, p.lastIndexOf("/") + 1);
}

(async function boot() {
  try {
    const base = computeBase();
    const secureContext = window.isSecureContext;
    const ua = navigator.userAgent;
    const hasXR = !!navigator.xr;

    log("booting…", { BUILD, href: location.href, base, secureContext, hasXR });
    setStatus(
      `booting…\n` +
      `build=${BUILD}\n` +
      `base=${base}\n` +
      `secureContext=${secureContext}\n` +
      `navigator.xr=${hasXR}`
    );

    // 🔥 Load Scarlett1 entry with cache-bust
    const url = `${base}js/scarlett1/index.js?v=${Date.now()}`;
    log("import", url);
    setStatus(
      `booting…\n` +
      `build=${BUILD}\n` +
      `importing scarlett1/index.js…`
    );

    await import(url);

    // If Scarlett1 takes over, it will update status itself.
    log("scarlett1 imported ✅");
  } catch (e) {
    err("BOOT FAIL", e);
    setStatus(
      `BOOT FAIL ❌\n` +
      `${e?.message || String(e)}\n\n` +
      `Tip: open DevTools console to see the full stack.`
    );
  }
})();
