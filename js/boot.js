// /js/boot.js — Scarlett Boot Loader (FULL) v1.1 PRIME
// ✅ Auto-detects GitHub Pages base
// ✅ Sets window.SCARLETT_BASE (important)
// ✅ Imports /js/index.js with cache-bust
// ✅ Logs to HUD

(() => {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];
  const log = (m) => {
    const line = `[${now()}] ${m}`;
    out.push(line);
    console.log(line);

    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-80).join("\n");

    if (typeof window.__HTML_LOG === "function") {
      try { window.__HTML_LOG(line); } catch {}
    }
  };

  const setStatus = (t) => {
    if (typeof window.__SET_BOOT_STATUS === "function") {
      try { window.__SET_BOOT_STATUS(t); } catch {}
    }
  };

  function detectBasePath() {
    const p = location.pathname || "/";
    const parts = p.split("/").filter(Boolean);
    const isGithubPages = /github\.io$/i.test(location.hostname);

    if (isGithubPages && parts.length >= 1) {
      return `/${parts[0]}/`;
    }
    return "/";
  }

  async function boot() {
    try {
      setStatus("booting…");

      const base = detectBasePath();
      window.SCARLETT_BASE = base; // ✅ CRITICAL

      const v = Date.now();

      log("[HTML] loaded ✅ (waiting for /js/boot.js…)");
      log(`[BOOT] href=${location.href}`);
      log(`[BOOT] secureContext=${String(window.isSecureContext)}`);
      log(`[BOOT] ua=${navigator.userAgent}`);
      log(`[BOOT] base=${base}`);

      const entry = `${base}js/index.js?v=${v}`;

      log(`[BOOT] importing ${entry} …`);
      setStatus("loading index.js…");

      await import(entry);

      log("[BOOT] index.js loaded ✅");
      setStatus("ready ✅");
    } catch (e) {
      const msg = e?.message || String(e);
      log(`[BOOT] index.js import FAILED ❌ ${msg}`);
      setStatus("boot failed ❌");

      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "block";

      if (/Invalid optional chain/i.test(msg)) {
        log("[HINT] You have a syntax error like `new obj?.Thing()` or optional-chaining after `new`.");
      }
      if (/Failed to resolve module specifier/i.test(msg)) {
        log("[HINT] A module imported a bare specifier like `import ... from 'three'`.");
      }
    }
  }

  boot();
})();
