// /js/boot.js — Scarlett Boot Loader (FULL) v1.2
// ✅ GitHub Pages repo-base safe
// ✅ Exposes window.SCARLETT_BASE
// ✅ Imports /js/index.js with cache-bust
// ✅ Strong error logs + hints

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
    if (el) el.textContent = out.slice(-120).join("\n");

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
    const baseTag = document.querySelector("base[href]");
    if (baseTag) {
      let href = baseTag.getAttribute("href") || "/";
      if (!href.endsWith("/")) href += "/";
      return href.startsWith("/") ? href : ("/" + href);
    }

    const p = location.pathname || "/";
    const parts = p.split("/").filter(Boolean);
    const isGithubPages = /github\.io$/i.test(location.hostname);

    // https://<user>.github.io/<repo>/*
    if (isGithubPages && parts.length >= 1) return `/${parts[0]}/`;
    return "/";
  }

  async function boot() {
    try {
      setStatus("booting…");

      const base = detectBasePath();
      const v = Date.now();

      window.SCARLETT_BASE = base;

      log(`[BOOT] href=${location.href}`);
      log(`[BOOT] secureContext=${String(window.isSecureContext)}`);
      log(`[BOOT] ua=${navigator.userAgent}`);
      log(`[BOOT] base=${base}`);

      const entry = `${base}js/index.js?v=${v}`;

      log(`[BOOT] importing ${entry} …`);
      setStatus("loading index.js…");

      await import(entry);

      log("[BOOT] index.js loaded ✅");
      setStatus("ready");
    } catch (e) {
      const msg = e?.message || String(e);
      log(`[BOOT] FAILED ❌ ${msg}`);
      setStatus("boot failed ❌");

      // Force HUD visible
      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "block";

      if (/Invalid optional chain/i.test(msg)) {
        log("[HINT] Optional chaining after `new` breaks parsing: `new obj?.Thing()` is invalid.");
        log("[HINT] Use: `const C=obj?.Thing; const inst=C?new C():null;`");
      }

      if (/Failed to resolve module specifier/i.test(msg)) {
        log("[HINT] A module imported a bare specifier like `import ... from 'three'`.");
        log("[HINT] Use full URLs (unpkg) or an importmap.");
      }

      if (/Cannot find module|404/i.test(msg)) {
        log("[HINT] GitHub Pages path issue: ensure ALL imports are relative like `./world.js`.");
        log("[HINT] Avoid absolute imports like `/js/world.js`.");
      }
    }
  }

  boot();
})();
