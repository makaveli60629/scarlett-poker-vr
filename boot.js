/* /boot.js
   SCARLETT ROOT BOOTLOADER (XR-safe, cache-proof, diag-first)
   Build: SCARLETT_BOOT_REPAIR_v1
*/
(() => {
  const BUILD = "SCARLETT_BOOT_REPAIR_v1";
  const now = Date.now();
  const qs = (k) => new URLSearchParams(location.search).get(k);

  // ---- Minimal diag writer (works even if HUD not loaded yet) ----
  const diagWrite = (msg) => {
    try {
      const s = String(msg);
      // If your HUD has a writer, use it.
      if (typeof window.__scarlettDiagWrite === "function") {
        window.__scarlettDiagWrite(s);
        return;
      }
      // Fallback: print to console and stash logs.
      window.__scarlettDiagLogs = window.__scarlettDiagLogs || [];
      window.__scarlettDiagLogs.push(`[${new Date().toLocaleTimeString()}] ${s}`);
      console.log(s);
    } catch (_) {}
  };

  // ---- Fingerprint and environment ----
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;
  window.SCARLETT.boot = { build: BUILD, ts: now };

  diagWrite("=== SCARLETT ADMIN DIAG REPORT ===");
  diagWrite(`BUILD=${BUILD}`);
  diagWrite(`HREF=${location.href}`);
  diagWrite(`secureContext=${String(window.isSecureContext)}`);
  diagWrite(`ua=${navigator.userAgent}`);
  diagWrite(`touch=${"ontouchstart" in window} maxTouchPoints=${navigator.maxTouchPoints || 0}`);

  // ---- Resolve which runtime to load ----
  // Priority:
  //  1) ?entry=/path/to/module.js
  //  2) window.SCARLETT_ENTRY (if set by index.html)
  //  3) default: /js/scarlett1/index.js
  const entry =
    qs("entry") ||
    window.SCARLETT_ENTRY ||
    "/js/scarlett1/index.js";

  const cacheBust =
    qs("v") || qs("cb") || `SCARLETT_HARD_${now}`;

  const entryURL = (() => {
    // If "entry" is absolute URL, keep it; else make it absolute path.
    try {
      const u = new URL(entry, location.href);
      u.searchParams.set("v", cacheBust);
      return u.toString();
    } catch (_) {
      return `${entry}?v=${encodeURIComponent(cacheBust)}`;
    }
  })();

  // ---- Soft preflight: show if WebXR exists ----
  const hasXR = !!navigator.xr;
  diagWrite(`navigator.xr=${String(hasXR)}`);

  // ---- Load runtime module ----
  diagWrite("--- PREFLIGHT: index.js ---");
  diagWrite(`import ${entryURL}`);

  // Use dynamic import (module)
  import(entryURL)
    .then((mod) => {
      window.SCARLETT.boot.loaded = true;
      window.SCARLETT.boot.entry = entryURL;
      diagWrite("[status] boot ok ✅");
      // Optional: allow module to expose "start" (not required).
      if (mod && typeof mod.start === "function") {
        try { mod.start(); } catch (e) { diagWrite(`[warn] start() error: ${e?.message || e}`); }
      }
    })
    .catch((err) => {
      window.SCARLETT.boot.loaded = false;
      window.SCARLETT.boot.entry = entryURL;
      diagWrite("");
      diagWrite("[status] BOOT FAILED ❌");
      diagWrite(String(err && (err.stack || err.message) ? (err.stack || err.message) : err));
      // Give a visible hint on-screen if HUD didn't mount.
      try {
        const el = document.createElement("pre");
        el.style.cssText =
          "position:fixed;left:8px;right:8px;top:8px;z-index:99999;" +
          "padding:10px;border-radius:10px;background:rgba(0,0,0,.75);" +
          "color:#fff;font:12px/1.4 monospace;white-space:pre-wrap;";
        el.textContent = `BOOT FAILED\n${String(err?.message || err)}\n\nEntry:\n${entryURL}`;
        document.body.appendChild(el);
      } catch (_) {}
    });
})();
