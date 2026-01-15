// js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// FIX: Hide HUD now uses display:none (no more ghost HUD in background)
// Also: Keeps Copy Logs / Reload / Clear + captures window errors.

(() => {
  const ID = "scarlettDiagHud";
  const state = {
    visible: true,
    logs: [],
    status: "Booting…",
    bootUrl: null,
    bootScriptEl: null
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  function renderStatus() {
    if (!els.status) return;
    els.status.textContent = state.status;
  }
  function renderLogs() {
    if (!els.logs) return;
    els.logs.textContent = state.logs.join("\n");
    els.logs.scrollTop = els.logs.scrollHeight;
  }

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

  // Expose hooks used by boot files
  window.__SCARLETT_DIAG_LOG__ = (s) => log(s);
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(s);

  // Capture real errors
  window.addEventListener("error", (e) => {
    log(`WINDOW ERROR: ${e.message || e.error || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    log(`PROMISE REJECT: ${r?.message || r || e}`);
  });

  // Build HUD
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position:fixed; left:16px; top:16px; z-index:999999;
    width:min(640px, calc(100vw - 32px));
    background:rgba(6,10,18,0.92);
    border:1px solid rgba(120,160,255,0.22);
    border-radius:18px;
    color:#dbe6ff;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    box-shadow:0 20px 60px rgba(0,0,0,0.55);
    padding:16px;
  `;

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:900;letter-spacing:0.2px;">Scarlett Diagnostics</div>
    <div style="margin-top:8px;font-size:14px;opacity:0.95;">
      STATUS: <span id="sd_status" style="font-weight:800;color:#b9ffcf;">${state.status}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);
        background:rgba(40,60,120,0.65);color:#eaf2ff;font-weight:900;">Hide HUD</button>

      <button id="sd_copy" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);
        background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Copy Logs</button>

      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);
        background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Clear</button>

      <button id="sd_reload" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);
        background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background:rgba(0,0,0,0.35);
      border:1px solid rgba(120,160,255,0.16);
      border-radius:14px;
      height:260px; overflow:auto; white-space:pre-wrap;
      font-size:13px; line-height:1.35;"></pre>
  `;

  document.body.appendChild(hud);

  // Small "Show HUD" button (ONLY appears when hidden)
  const showBtn = document.createElement("button");
  showBtn.id = "sd_show_btn";
  showBtn.textContent = "Show HUD";
  showBtn.style.cssText = `
    position:fixed; left:16px; top:16px; z-index:999999;
    padding:12px 16px; border-radius:14px;
    border:1px solid rgba(120,160,255,0.25);
    background:rgba(40,60,120,0.75);
    color:#eaf2ff; font-weight:900;
    display:none;
  `;
  document.body.appendChild(showBtn);

  const els = {
    status: hud.querySelector("#sd_status"),
    logs: hud.querySelector("#sd_logs"),
    hide: hud.querySelector("#sd_hide"),
    copy: hud.querySelector("#sd_copy"),
    clear: hud.querySelector("#sd_clear"),
    reload: hud.querySelector("#sd_reload"),
  };

  els.hide.onclick = () => {
    state.visible = false;
    hud.style.display = "none";        // ✅ REAL HIDE (no ghost panel)
    showBtn.style.display = "block";   // ✅ show small button only
  };

  showBtn.onclick = () => {
    state.visible = true;
    showBtn.style.display = "none";
    hud.style.display = "block";
  };

  els.copy.onclick = async () => {
    const text = state.logs.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      log("copied ✅");
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      log("copied ✅ (fallback)");
    }
  };

  els.clear.onclick = () => {
    state.logs.length = 0;
    renderLogs();
    log("logs cleared");
  };

  els.reload.onclick = () => location.reload();

  // Initial render
  renderStatus();
  renderLogs();

  // Export simple helper
  window.__SCARLETT_DIAG__ = { log, setStatus };

})();
