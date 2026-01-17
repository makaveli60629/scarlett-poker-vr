// /js/boot.js
// SCARLETT_BOOT_FULL_v1_AUTHORITATIVE
// - Always shows DIAG overlay on mobile/quest
// - Always defines window.__scarlettRunModuleTest (stub) so button never says "not found"
// - Imports ./scarlett1/index.js (the real engine)

(() => {
  const BUILD = "SCARLETT_BOOT_FULL_v1_AUTHORITATIVE";
  const log = (...a) => console.log("[boot]", ...a);

  // --- Always define module test stub (so DIAG never says "not found") ---
  window.__scarlettRunModuleTest =
    window.__scarlettRunModuleTest ||
    (async () => ({
      ok: false,
      time: new Date().toISOString(),
      activeBoot: BUILD,
      reason: "Scarlett engine not attached yet.",
      hint: "If this persists, scarlett1/index.js failed to import or crashed.",
    }));

  // --- DIAG overlay (mobile/quest friendly) ---
  const isMobile = /Android|Oculus|Quest|Mobile/i.test(navigator.userAgent);

  const panel = document.getElementById("scarlettDiagPanel") || (() => {
    const d = document.createElement("div");
    d.id = "scarlettDiagPanel";
    d.style.cssText = `
      position:fixed;left:10px;right:10px;bottom:10px;z-index:999999;
      background:rgba(0,0,0,.75);color:#fff;border-radius:14px;
      padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;
      font-size:12px;line-height:1.25;
      max-height:44vh; overflow:hidden;
      ${isMobile ? "" : "max-width:520px;"}
    `;
    document.body.appendChild(d);
    return d;
  })();

  if (!panel.__init) {
    panel.__init = true;
    panel.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
        <button id="d_mod" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
        <button id="d_copy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY LOG</button>
        <button id="d_clear" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">CLEAR</button>
        <button id="d_hide" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">HIDE</button>
      </div>
      <pre id="d_pre" style="margin:0;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;overflow:auto;max-height:32vh"></pre>
    `;
  }

  const pre = panel.querySelector("#d_pre");
  const write = (s) => {
    const ts = new Date().toISOString().slice(11, 19);
    pre.textContent += `[${ts}] ${s}\n`;
    pre.scrollTop = pre.scrollHeight;
  };
  window.__scarlettDiagWrite = write;

  panel.querySelector("#d_clear").onclick = () => (pre.textContent = "");
  panel.querySelector("#d_hide").onclick = () => (panel.style.display = "none");

  panel.querySelector("#d_copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(`=== SCARLETT DIAG ===\n${pre.textContent}\n`);
      write("Copied ✅");
    } catch (e) {
      write(`Copy failed ❌ ${e?.message || e}`);
    }
  };

  panel.querySelector("#d_mod").onclick = async () => {
    write("MODULE TEST pressed…");
    try {
      const rep = await window.__scarlettRunModuleTest();
      write("MODULE TEST done ✅");
      write(JSON.stringify(rep, null, 2));
    } catch (e) {
      write(`MODULE TEST error ❌ ${e?.message || e}`);
    }
  };

  write(`booting… build=${BUILD}`);
  write(`href=${location.href}`);
  write(`secureContext=${window.isSecureContext}`);
  write(`xr=${!!navigator.xr}`);
  write(`ua=${navigator.userAgent}`);

  // --- Import the real engine (cache-busted) ---
  (async () => {
    try {
      const url = `./scarlett1/index.js?v=${Date.now()}`;
      write(`importing ${url}`);
      await import(url);
      write(`engine import OK ✅`);
    } catch (e) {
      write(`engine import FAILED ❌ ${e?.message || e}`);
      log("engine import failed", e);
    }
  })();
})();
