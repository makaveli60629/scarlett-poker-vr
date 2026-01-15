// /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// - Always visible first
// - Loads boot2.js as MODULE (GitHub Pages safe)
// - Captures errors + promise rejections
// - True Hide (display:none) so no "ghost HUD" behind

(() => {
  const ID = "scarlettDiagHud";
  const state = {
    visible: true,
    logs: [],
    status: "Booting…",
    bootUrl: null,
    bootStartedAt: 0
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  function log(line) {
    const msg = `${stamp()} ${line}`;
    state.logs.push(msg);
    if (state.logs.length > 600) state.logs.shift();
    try { console.log(line); } catch {}
    renderLogs();
  }

  function setStatus(s) {
    state.status = s;
    renderStatus();
  }

  // expose for boot2.js
  window.__SCARLETT_DIAG_LOG__ = (s) => log(s);
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(s);

  window.addEventListener("error", (e) => {
    log(`WINDOW ERROR: ${e?.message || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const m = e?.reason?.message || e?.reason || e;
    log(`PROMISE REJECT: ${m}`);
  });

  // HUD UI
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position:fixed; left:14px; top:14px; z-index:999999;
    width:min(560px, calc(100vw - 28px));
    border-radius:18px;
    background:rgba(8,12,26,0.92);
    border:1px solid rgba(120,160,255,0.25);
    box-shadow:0 20px 70px rgba(0,0,0,0.55);
    color:#e7efff;
    padding:16px;
    backdrop-filter: blur(10px);
  `;

  hud.innerHTML = `
    <div style="font-size:30px;font-weight:900;letter-spacing:.3px;">Scarlett Diagnostics</div>
    <div style="margin-top:6px;font-size:16px;opacity:.9;">
      STATUS: <span id="sd_status" style="color:#8dffb0;font-weight:800;">Booting…</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
      <button id="sd_hide"  style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,.25);background:rgba(40,60,120,.45);color:#eaf2ff;font-weight:800;">Hide HUD</button>
      <button id="sd_copy"  style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,.25);background:rgba(40,60,120,.45);color:#eaf2ff;font-weight:800;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,.25);background:rgba(40,60,120,.35);color:#eaf2ff;font-weight:800;">Clear</button>
      <button id="sd_reload"style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,.25);background:rgba(40,60,120,.35);color:#eaf2ff;font-weight:800;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px; border-radius:14px;
      background:rgba(0,0,0,0.25);
      border:1px solid rgba(120,160,255,0.18);
      height:240px; overflow:auto; white-space:pre-wrap;
      font-size:13px; line-height:1.35;"></pre>
  `;

  document.body.appendChild(hud);

  const elStatus = hud.querySelector("#sd_status");
  const elLogs = hud.querySelector("#sd_logs");

  function renderStatus() { elStatus.textContent = state.status; }
  function renderLogs() {
    elLogs.textContent = state.logs.join("\n");
    elLogs.scrollTop = elLogs.scrollHeight;
  }

  // True Hide (no ghost)
  const showBtn = document.createElement("button");
  showBtn.textContent = "Show HUD";
  showBtn.style.cssText = `
    position:fixed; left:14px; top:14px; z-index:999999;
    padding:14px 18px; border-radius:14px;
    border:1px solid rgba(120,160,255,.25);
    background:rgba(40,60,120,.55); color:#eaf2ff; font-weight:900;
    display:none;
  `;
  showBtn.onclick = () => {
    hud.style.display = "";
    showBtn.style.display = "none";
    state.visible = true;
  };
  document.body.appendChild(showBtn);

  hud.querySelector("#sd_hide").onclick = () => {
    state.visible = false;
    hud.style.display = "none";
    showBtn.style.display = "";
  };

  hud.querySelector("#sd_copy").onclick = async () => {
    const text = state.logs.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      log("copied ✅");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        log("copied ✅ (fallback)");
      } catch (e) {
        log("copy failed ❌");
      }
    }
  };

  hud.querySelector("#sd_clear").onclick = () => {
    state.logs.length = 0;
    log("logs cleared");
  };

  hud.querySelector("#sd_reload").onclick = () => location.reload();

  // BOOT LOADER (module import)
  async function start() {
    const base = "/scarlett-poker-vr/";
    const bootUrl = `${base}js/scarlett1/boot2.js?v=${Date.now()}`;
    state.bootUrl = bootUrl;

    log(`href=${location.href}`);
    log(`path=${location.pathname}`);
    log(`base=${base}`);
    log(`secureContext=${window.isSecureContext}`);
    log(`ua=${navigator.userAgent}`);
    log(`navigator.xr=${!!navigator.xr}`);
    log(`loading boot(module): ${bootUrl}`);

    setStatus("Booting…");
    state.bootStartedAt = performance.now();

    try {
      // IMPORTANT: module import (fixes "boot loaded but not started")
      await import(bootUrl);
      // boot2 will set window.__SCARLETT_BOOT_STARTED__ when it begins
      setTimeout(() => {
        if (!window.__SCARLETT_BOOT_STARTED__) {
          log("boot not started yet… (module didn’t execute)");
          setStatus("Boot not running (module mismatch)");
        }
      }, 800);
    } catch (e) {
      log(`BOOT IMPORT FAILED ❌: ${e?.message || e}`);
      setStatus("BOOT FAILED ❌ (import error)");
    }
  }

  renderStatus();
  renderLogs();
  start();
})();
