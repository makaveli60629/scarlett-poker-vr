import { Core } from './core.js';

window.addEventListener('DOMContentLoaded', async () => {
    console.log('%c[BOOT] Initializing Scarlett Spine...', 'color: #00ffff');
    try {
        await Core.start();
    } catch (e) {
        console.error('[BOOT ERROR]', e);
    }
});


// /js/boot.js — Scarlett Boot Diagnostics (FULL, GitHub Pages safe)
(() => {
  const stamp = Date.now();

  const elLog = () => document.getElementById("bootLog");
  const elStatus = () => document.getElementById("bootStatus");

  const write = (m) => {
    console.log(m);
    const el = elLog();
    if (el) el.textContent += "\n" + m;
  };

  const setStatus = (m) => {
    const el = elStatus();
    if (el) el.textContent = m;
  };

  // Buttons (safe even if not present)
  const hook = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
  hook("btnHideBoot", () => { const b = document.getElementById("bootBox"); if (b) b.style.display = "none"; });
  hook("btnCopyBoot", async () => {
    const txt = elLog()?.textContent || "";
    try { await navigator.clipboard.writeText(txt); write("[hud] copied ✅"); } catch (e) { write("[hud] copy FAILED ❌ " + e.message); }
  });

  // --- base path (project page safe) ---
  // If the site is /scarlett-poker-vr/ then base = "/scarlett-poker-vr/"
  const path = location.pathname || "/";
  const base = path.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/";

  write(`[BOOT] href=${location.href}`);
  write(`[BOOT] secureContext=${!!window.isSecureContext}`);
  write(`[BOOT] ua=${navigator.userAgent}`);
  write(`[BOOT] base=${base}`);

  // Always import using absolute base so Quest never gets confused
  const entry = `${base}js/index.js?v=${stamp}`;
  write(`[BOOT] importing ${location.origin}${entry} …`);
  setStatus("Importing index.js…");

  import(entry).then(() => {
    write("[BOOT] index.js imported ✅");
    setStatus("Boot OK ✅");
  }).catch(async (e) => {
    write(`[BOOT] import FAILED ❌ ${e?.message || e}`);
    setStatus("Import failed ❌ (see BOOT log)");

    // Extra: prove whether the file fetches and what came back
    try {
      const r = await fetch(entry, { cache: "no-store" });
      write(`[BOOT] index.js fetch: ok=${r.ok} status=${r.status} ct=${r.headers.get("content-type") || ""}`);
      const t = await r.text();
      write(`[BOOT] index.js preview: ${t.slice(0, 180).replace(/\s+/g, " ")}`);
    } catch (ee) {
      write(`[BOOT] fetch failed ❌ ${ee?.message || ee}`);
    }
  });
})();
