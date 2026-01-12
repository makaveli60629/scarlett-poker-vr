// /js/boot.js — Scarlett Boot Loader (FULL) v1.0
// ✅ Auto-detects GitHub Pages base (/scarlett-poker-vr/) vs local (/)
// ✅ Writes to HUD log if available
// ✅ Imports /js/index.js with cache-bust + clear error messages
// ✅ Avoids fragile optional chaining patterns / "new ?.foo" mistakes

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

    // Your index.html provides this (and index.js also writes to #hud-log)
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-60).join("\n");

    // Optional extra hook (from the index.html I gave you)
    if (typeof window.__HTML_LOG === "function") {
      try { window.__HTML_LOG(line); } catch {}
    }
  };

  const setStatus = (t) => {
    if (typeof window.__SET_BOOT_STATUS === "function") {
      try { window.__SET_BOOT_STATUS(t); } catch {}
    }
  };

  // Detect base path:
  // If hosted at https://...github.io/<repo>/ then base is "/<repo>/"
  // If hosted at https://...github.io/ then base is "/"
  function detectBasePath() {
    const p = location.pathname || "/";
    // pathname like "/scarlett-poker-vr/" or "/scarlett-poker-vr/index.html"
    const parts = p.split("/").filter(Boolean);

    // If first segment exists and we're on github.io, that segment is usually repo name
    const isGithubPages = /github\.io$/i.test(location.hostname);

    if (isGithubPages && parts.length >= 1) {
      // base = "/<repo>/"
      return `/${parts[0]}/`;
    }

    // local or custom domain: assume root
    return "/";
  }

  async function boot() {
    try {
      setStatus("booting…");

      const base = detectBasePath(); // e.g. "/scarlett-poker-vr/" or "/"
      const v = Date.now();

      log("[HTML] loaded ✅ (waiting for /js/boot.js…)");
      log(`[BOOT] href=${location.href}`);
      log(`[BOOT] secureContext=${String(window.isSecureContext)}`);
      log(`[BOOT] ua=${navigator.userAgent}`);
      log(`[BOOT] base=${base}`);

      // Entry file (your main runtime)
      // If you rename later, only change this one line.
      const entry = `${base}js/index.js?v=${v}`;

      log(`[BOOT] importing ${entry} …`);
      setStatus("loading index.js…");

      // Import entry
      await import(entry);

      log("[BOOT] index.js loaded ✅");
      setStatus("ready ✅");
    } catch (e) {
      const msg = e?.message || String(e);
      log(`[BOOT] index.js import FAILED ❌ ${msg}`);
      setStatus("boot failed ❌");

      // Make sure HUD is visible so you can copy logs on Android
      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "block";

      // Extra hint for common syntax issue you hit:
      if (/Invalid optional chain/i.test(msg)) {
        log("[HINT] You have a syntax error like `new obj?.Thing()` or optional-chaining after `new`.");
        log("[HINT] Fix by doing: `const C = obj?.Thing; const inst = C ? new C() : null;`");
      }

      // Extra hint for module path issue:
      if (/Failed to resolve module specifier/i.test(msg)) {
        log("[HINT] A module is importing a bare specifier like `import ... from 'three'`.");
        log("[HINT] On GitHub Pages, use a full URL (unpkg) or an importmap.");
      }
    }
  }

  boot();
})();
