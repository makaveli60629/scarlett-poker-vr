// /js/boot.js
// ROUTER_FULL_DIAG_v4_PERMA_PANEL
// - Always creates Android/Quest diagnostics overlay
// - Module Test button NEVER breaks (stub defined immediately)
// - Preflight fetches index.js + world.js and imports the chosen build

(() => {
  const BUILD = "ROUTER_FULL_DIAG_v4_PERMA_PANEL";
  const log = (...a) => console.log("[router]", ...a);
  const warn = (...a) => console.warn("[router]", ...a);
  const err = (...a) => console.error("[router]", ...a);

  // === PERMA: Module Test API MUST EXIST (even before scarlett loads) ===
  window.__scarlettRunModuleTest =
    window.__scarlettRunModuleTest ||
    (async () => ({
      ok: false,
      time: new Date().toISOString(),
      reason: "Scarlett not booted yet (world/orchestrator not attached).",
      hint: "If this persists after load, scarlett1/index.js isn't active or world.js failed.",
    }));

  // === Perma DIAG Overlay ===
  const DIAG = (() => {
    const panel = document.getElementById("scarlettDiagPanel") || (() => {
      const d = document.createElement("div");
      d.id = "scarlettDiagPanel";
      d.style.cssText = `
        position:fixed;left:10px;right:10px;bottom:10px;z-index:999999;
        background:rgba(0,0,0,.75);color:#fff;border-radius:14px;
        padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;
        font-size:12px;line-height:1.25;
        max-height:44vh; overflow:hidden;
      `;
      document.body.appendChild(d);
      return d;
    })();

    if (!panel.__scarlettInit) {
      panel.__scarlettInit = true;

      panel.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <button id="d_modtest" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
          <button id="d_copy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY</button>
          <button id="d_hide" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">HIDE</button>
          <button id="d_show" style="display:none;padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">SHOW</button>
        </div>
        <pre id="d_pre" style="margin:0;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;overflow:auto;max-height:32vh"></pre>
      `;

      const pre = panel.querySelector("#d_pre");
      const btnModule = panel.querySelector("#d_modtest");
      const btnCopy = panel.querySelector("#d_copy");
      const btnHide = panel.querySelector("#d_hide");
      const btnShow = panel.querySelector("#d_show");

      const write = (line) => {
        const ts = new Date().toISOString().slice(11, 19);
        pre.textContent += `[${ts}] ${line}\n`;
        pre.scrollTop = pre.scrollHeight;
      };

      // expose write so other scripts can log
      window.__scarlettDiagWrite = write;

      btnHide.onclick = () => {
        panel.style.display = "none";
        btnShow.style.display = "inline-block";
        window.__scarlettDiagHidden = true;
      };

      btnShow.onclick = () => {
        panel.style.display = "block";
        btnShow.style.display = "none";
        window.__scarlettDiagHidden = false;
      };

      // Emergency triple-tap to show diag again
      let taps = 0;
      window.addEventListener("touchstart", () => {
        if (!window.__scarlettDiagHidden) return;
        taps++;
        setTimeout(() => (taps = 0), 800);
        if (taps >= 3) {
          panel.style.display = "block";
          btnShow.style.display = "none";
          window.__scarlettDiagHidden = false;
          taps = 0;
        }
      }, { passive: true });

      // MODULE TEST handler (robust)
      btnModule.onclick = async () => {
        write("MODULE TEST pressed…");
        try {
          if (typeof window.__scarlettRunModuleTest === "function") {
            const rep = await window.__scarlettRunModuleTest();
            write("MODULE TEST done ✅");
            write(JSON.stringify(rep, null, 2));
            return;
          }

          const W = window.__scarlettWorld;
          if (W && typeof W.runAllModuleTests === "function") {
            const rep = await W.runAllModuleTests();
            write("MODULE TEST done ✅ (fallback)");
            write(JSON.stringify(rep, null, 2));
            return;
          }

          write("MODULE TEST unavailable ❌ (no API attached)");
        } catch (e) {
          write(`MODULE TEST error ❌ ${e?.message || e}`);
        }
      };

      btnCopy.onclick = async () => {
        try {
          const text = `=== SCARLETT DIAG ===\n${pre.textContent}\n`;
          await navigator.clipboard.writeText(text);
          write("Copied ✅");
        } catch (e) {
          write(`Copy failed ❌ ${e?.message || e}`);
        }
      };

      write(`booting…`);
      write(`build=${BUILD}`);
    }

    return {
      write: (s) => window.__scarlettDiagWrite?.(String(s)),
    };
  })();

  // === Preflight environment ===
  DIAG.write(`[env] href=${location.href}`);
  DIAG.write(`[env] secureContext=${window.isSecureContext}`);
  DIAG.write(`[env] navigator.xr=${!!navigator.xr}`);
  DIAG.write(`[env] ua=${navigator.userAgent}`);
  log(`build=${BUILD}`);

  // === Helpers ===
  async function fetchHead(url, bytes = 260) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const ct = r.headers.get("content-type") || "";
      const ok = r.ok;
      const text = await r.text();
      return { ok, status: r.status, ct, bytes: text.length, head: text.slice(0, bytes) };
    } catch (e) {
      return { ok: false, status: 0, ct: "", bytes: 0, head: `fetch error: ${e?.message || e}` };
    }
  }

  // === Choose build (Scarlett1) ===
  const cacheproof = `ROUTER_CACHEPROOF_${Date.now()}`;
  const indexUrl = `${location.origin}${location.pathname.replace(/\/$/, "")}/js/scarlett1/index.js?v=${cacheproof}`
    .replace(/\/scarlett-poker-vr\/scarlett-poker-vr\//g, "/scarlett-poker-vr/"); // just in case

  const worldUrl = `${location.origin}${location.pathname.replace(/\/$/, "")}/js/scarlett1/world.js?v=${cacheproof}`
    .replace(/\/scarlett-poker-vr\/scarlett-poker-vr\//g, "/scarlett-poker-vr/");

  // In your repo the base is usually /scarlett-poker-vr/ — keep it simple:
  const base = (document.querySelector("base")?.href || location.href);
  DIAG.write(`[env] base=${base}`);

  (async () => {
    DIAG.write(`--- PREFLIGHT: index.js ---`);
    const h1 = await fetchHead(indexUrl);
    DIAG.write(`[fetch] GET ${indexUrl}`);
    DIAG.write(`[fetch] status=${h1.status} ok=${h1.ok}`);
    DIAG.write(`[fetch] ct=${h1.ct}`);
    DIAG.write(`[fetch] bytes=${h1.bytes}`);
    DIAG.write(`[fetch] head:\n${h1.head}`);

    DIAG.write(`--- PREFLIGHT: world.js ---`);
    const h2 = await fetchHead(worldUrl);
    DIAG.write(`[fetch] GET ${worldUrl}`);
    DIAG.write(`[fetch] status=${h2.status} ok=${h2.ok}`);
    DIAG.write(`[fetch] ct=${h2.ct}`);
    DIAG.write(`[fetch] bytes=${h2.bytes}`);
    DIAG.write(`[fetch] head:\n${h2.head}`);

    try {
      // Import scarlett1/index.js (it self-boots)
      // Use relative import so GitHub pages base works.
      const rel = `./scarlett1/index.js?v=${cacheproof}`;
      DIAG.write(`[router] importing: ${rel}`);
      await import(rel);
      DIAG.write(`[router] import OK ✅`);

      // index.js self boots; router doesn't require start()
      DIAG.write(`[router] done ✅`);
    } catch (e) {
      err("import failed", e);
      DIAG.write(`[router] import FAILED ❌ ${e?.message || e}`);
    }
  })();
})();
