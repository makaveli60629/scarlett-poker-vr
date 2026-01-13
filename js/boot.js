// /js/boot.js — Scarlett Boot Loader (FULL) v2.0
// ✅ Detects base path (GitHub Pages vs local)
// ✅ Preflight fetch checks (shows 404 / status in HUD)
// ✅ Auto-detects entry file: js/index.js, js/main.js, js/app.js, etc.
// ✅ Then dynamically imports the first one that exists
// ✅ Clear error messages in HUD

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
    if (isGithubPages && parts.length >= 1) return `/${parts[0]}/`;
    return "/";
  }

  async function exists(url) {
    try {
      // use no-store so we see fresh deploy immediately
      const res = await fetch(url, { cache: "no-store" });
      return { ok: res.ok, status: res.status, url: res.url };
    } catch (e) {
      return { ok: false, status: 0, url, err: String(e?.message || e) };
    }
  }

  async function boot() {
    try {
      setStatus("booting…");

      const base = detectBasePath();
      const v = Date.now();
      window.SCARLETT_BASE = base;

      log("[HTML] loaded ✅ (waiting for /js/boot.js…)");
      log(`[BOOT] href=${location.href}`);
      log(`[BOOT] secureContext=${String(window.isSecureContext)}`);
      log(`[BOOT] ua=${navigator.userAgent}`);
      log(`[BOOT] base=${base}`);

      // Candidates (in order)
      const candidates = [
        `${base}js/index.js`,
        `${base}js/main.js`,
        `${base}js/app.js`,
        `${base}js/runtime.js`,
      ];

      setStatus("finding entry…");
      log(`[BOOT] probing entry candidates…`);

      let entry = null;

      for (const u of candidates) {
        const check = await exists(u);
        if (check.ok) {
          entry = `${u}?v=${v}`;
          log(`[BOOT] found ✅ ${u} (status ${check.status})`);
          break;
        } else {
          log(`[BOOT] missing ⚠️ ${u} (status ${check.status}${check.err ? ` err=${check.err}` : ""})`);
        }
      }

      if (!entry) {
        throw new Error(
          `No entry file found. Expected one of: ${candidates.map(x => x.replace(base,"")).join(", ")}`
        );
      }

      setStatus("loading entry…");
      log(`[BOOT] importing ${entry} …`);

      await import(entry);

      log("[BOOT] entry loaded ✅");
      setStatus("ready ✅");
    } catch (e) {
      const msg = e?.message || String(e);
      log(`[BOOT] import FAILED ❌ ${msg}`);
      setStatus("boot failed ❌");

      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "block";

      if (/Failed to fetch dynamically imported module/i.test(msg)) {
        log("[HINT] This is almost always a 404 or wrong path. Open /js/index.js in your browser to confirm it exists.");
      }
    }
  }

  boot();
})();
