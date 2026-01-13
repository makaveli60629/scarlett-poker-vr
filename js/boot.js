// /js/boot.js — Scarlett Boot Loader v9.5 ULT (FULL)
// ✅ Base detect for GitHub Pages
// ✅ Preflight environment diagnostics
// ✅ Exposes window.SCARLETT_BASE + window.SCARLETT_DIAG

(() => {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

  const out = [];
  const log = (m) => {
    const line = `[${now()}] ${m}`;
    out.push(line);
    console.log(line);
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-220).join("\n");
    if (typeof window.__HTML_LOG === "function") { try { window.__HTML_LOG(line); } catch {} }
  };
  const setStatus = (t) => { if (typeof window.__SET_BOOT_STATUS === "function") { try { window.__SET_BOOT_STATUS(t); } catch {} } };

  function detectBasePath() {
    const p = location.pathname || "/";
    const parts = p.split("/").filter(Boolean);
    const isGithubPages = /github\.io$/i.test(location.hostname);
    if (isGithubPages && parts.length >= 1) return `/${parts[0]}/`;
    return "/";
  }

  function preflight() {
    const diag = {
      href: location.href,
      secureContext: !!window.isSecureContext,
      ua: navigator.userAgent,
      xr: !!navigator.xr,
      touch: ("ontouchstart" in window) || (navigator.maxTouchPoints > 0),
      dpr: window.devicePixelRatio || 1,
      ts: Date.now()
    };
    window.SCARLETT_DIAG = diag;
    log(`[BOOT] href=${diag.href}`);
    log(`[BOOT] secureContext=${diag.secureContext}`);
    log(`[BOOT] xr=${diag.xr} touch=${diag.touch} dpr=${diag.dpr}`);
    log(`[BOOT] ua=${diag.ua}`);
  }

  async function boot() {
    try {
      setStatus("booting…");
      preflight();

      const base = detectBasePath();
      const v = Date.now();
      window.SCARLETT_BASE = base;

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
      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "block";
    }
  }

  boot();
})();
