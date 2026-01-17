// /js/boot.js — Scarlett Boot Loader (FULL)
// BUILD: BOOT_FULL_v4_3_FINAL
// ONLY job: compute base + cachebust import scarlett1/index.js + show visible errors.

const BUILD = "BOOT_FULL_v4_3_FINAL";

const log = (...a) => console.log("[BOOT]", ...a);
const err = (...a) => console.error("[BOOT]", ...a);

function $(id) { return document.getElementById(id); }
function setStatus(s) {
  const el = $("status");
  if (el) el.textContent = s;
  console.log("[status]", s);
}

function computeBase() {
  const p = location.pathname || "/";
  if (p.endsWith("/")) return p;
  return p.substring(0, p.lastIndexOf("/") + 1);
}

(async function boot() {
  try {
    const base = computeBase();

    setStatus(
      `booting…\n` +
      `build=${BUILD}\n` +
      `base=${base}\n` +
      `secureContext=${window.isSecureContext}\n` +
      `navigator.xr=${!!navigator.xr}\n` +
      `ua=${navigator.userAgent}`
    );

    const url = `${base}js/scarlett1/index.js?v=${Date.now()}`;
    log("import", url);

    setStatus(
      `booting…\n` +
      `build=${BUILD}\n` +
      `importing scarlett1/index.js…`
    );

    await import(url);

    log("scarlett1 imported ✅");
  } catch (e) {
    err("BOOT FAIL", e);
    setStatus(
      `BOOT FAIL ❌\n` +
      `${e?.message || String(e)}\n\n` +
      `Open DevTools console for stack.`
    );
  }
})();
