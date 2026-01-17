// /js/boot.js
// ROUTER_FULL_DIAG_v5_ONE_TRUE_CHAIN
// Authoritative boot for ALL platforms.
// - Permanent diag overlay with MODULE TEST / COPY / CLEAR
// - Defines __scarlettRunModuleTest stub immediately (never "not found")
// - Imports ./scarlett1/index.js (Scarlett engine self-boots)

(() => {
  const BUILD = "ROUTER_FULL_DIAG_v5_ONE_TRUE_CHAIN";
  const log = (...a) => console.log("[router]", ...a);
  const err = (...a) => console.error("[router]", ...a);

  // === Hard stamp so you always know which boot actually ran ===
  window.__scarlettActiveBoot = BUILD;

  // === PERMA: module test API MUST exist (even before scarlett loads) ===
  window.__scarlettRunModuleTest = window.__scarlettRunModuleTest || (async () => ({
    ok: false,
    time: new Date().toISOString(),
    activeBoot: window.__scarlettActiveBoot,
    reason: "Scarlett not booted yet (world/orchestrator not attached).",
    hint: "If this persists, /js/scarlett1/index.js did not import or world.js failed.",
  }));

  // === DIAG overlay (always) ===
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

  panel.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
      <button id="d_modtest" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
      <button id="d_copy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY LOG</button>
      <button id="d_clear" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">CLEAR</button>
    </div>
    <pre id="d_pre" style="margin:0;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;overflow:auto;max-height:32vh"></pre>
  `;

  const pre = panel.querySelector("#d_pre");
  const write = (s) => {
    const ts = new Date().toISOString().slice(11, 19);
    pre.textContent += `[${ts}] ${s}\n`;
    pre.scrollTop = pre.scrollHeight;
  };
  window.__scarlettDiagWrite = write;

  write(`booting…`);
  write(`ACTIVE BOOT = ${BUILD}`);
  write(`href=${location.href}`);
  write(`secureContext=${window.isSecureContext}`);
  write(`navigator.xr=${!!navigator.xr}`);
  write(`ua=${navigator.userAgent}`);

  // Buttons
  panel.querySelector("#d_clear").onclick = () => { pre.textContent = ""; };

  panel.querySelector("#d_copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(`=== SCARLETT DIAG ===\n${pre.textContent}\n`);
      write("Copied ✅");
    } catch (e) {
      write(`Copy failed ❌ ${e?.message || e}`);
    }
  };

  panel.querySelector("#d_modtest").onclick = async () => {
    write("MODULE TEST pressed…");
    try {
      // Primary
      if (typeof window.__scarlettRunModuleTest === "function") {
        const rep = await window.__scarlettRunModuleTest();
        write("MODULE TEST done ✅");
        write(JSON.stringify(rep, null, 2));
        return;
      }
      // Fallback
      const W = window.__scarlettWorld;
      if (W && typeof W.runAllModuleTests === "function") {
        const rep = await W.runAllModuleTests();
        write("MODULE TEST done ✅ (fallback)");
        write(JSON.stringify(rep, null, 2));
        return;
      }
      write("MODULE TEST unavailable ❌");
    } catch (e) {
      write(`MODULE TEST error ❌ ${e?.message || e}`);
    }
  };

  // === Import Scarlett engine (authoritative) ===
  (async () => {
    try {
      const cacheproof = `BOOT_${Date.now()}`;
      const rel = `./scarlett1/index.js?v=${cacheproof}`;
      write(`[router] importing ${rel}`);
      await import(rel);
      write("[router] import OK ✅");
      write("[router] done ✅");
      log("import OK", rel);
    } catch (e) {
      err("import failed", e);
      write(`[router] import FAILED ❌ ${e?.message || e}`);
    }
  })();
})();
