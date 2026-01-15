// /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// ✅ Always visible overlay
// ✅ Hide HUD truly hides (display:none) + Show HUD button only
// ✅ Captures window.onerror + unhandledrejection
// ✅ Exposes window.__SCARLETT_DIAG_LOG__ and __SCARLETT_DIAG_STATUS__

(() => {
  const ID = "scarlettDiagHud";
  if (document.getElementById(ID)) return;

  const state = {
    visible: true,
    logs: [],
    status: "Booting..."
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  function render() {
    statusEl.textContent = state.status;
    logsEl.textContent = state.logs.join("\n");
    logsEl.scrollTop = logsEl.scrollHeight;
  }

  function log(line) {
    const msg = `${stamp()} ${line}`;
    state.logs.push(msg);
    if (state.logs.length > 600) state.logs.shift();
    try { console.log(line); } catch {}
    render();
  }

  function setStatus(s) {
    state.status = s;
    render();
  }

  // expose
  window.__SCARLETT_DIAG_LOG__ = (s) => log(String(s));
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(String(s));

  // capture real errors
  window.addEventListener("error", (e) => {
    log(`WINDOW ERROR: ${e.message || e.error || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    log(`PROMISE REJECT: ${(e.reason && (e.reason.message || e.reason)) || e}`);
  });

  // HUD
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position: fixed; left: 16px; top: 16px; z-index: 999999;
    width: min(560px, calc(100vw - 32px));
    background: rgba(10,14,30,0.92);
    border: 1px solid rgba(120,160,255,0.25);
    border-radius: 18px;
    color: #dbe6ff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    padding: 16px;
  `;

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:900;letter-spacing:0.2px;">Scarlett Diagnostics</div>
    <div style="margin-top:6px;opacity:0.9;">
      <span style="opacity:0.8;">STATUS:</span>
      <span id="sd_status" style="font-weight:800;color:#b9ffcc;">Booting...</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.55);color:#eaf2ff;font-weight:900;">Hide HUD</button>
      <button id="sd_copy" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Clear</button>
      <button id="sd_reload" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background: rgba(0,0,0,0.25);
      border-radius: 14px;
      border: 1px solid rgba(120,160,255,0.18);
      height: 240px; overflow:auto; white-space:pre-wrap;
      font-size: 13px; line-height: 1.35;
    "></pre>
  `;

  document.body.appendChild(hud);

  const statusEl = hud.querySelector("#sd_status");
  const logsEl = hud.querySelector("#sd_logs");

  // show button (only appears when hidden)
  const showBtn = document.createElement("button");
  showBtn.id = "sd_show_btn";
  showBtn.textContent = "Show HUD";
  showBtn.style.cssText = `
    position: fixed; left: 16px; top: 16px; z-index: 1000000;
    padding: 12px 16px; border-radius: 14px;
    border: 1px solid rgba(120,160,255,0.22);
    background: rgba(40,60,120,0.65);
    color: #eaf2ff; font-weight: 900;
    display: none;
  `;
  document.body.appendChild(showBtn);

  hud.querySelector("#sd_hide").onclick = () => {
    // REAL hide
    state.visible = false;
    hud.style.display = "none";
    showBtn.style.display = "block";
  };

  showBtn.onclick = () => {
    state.visible = true;
    showBtn.style.display = "none";
    hud.style.display = "block";
  };

  hud.querySelector("#sd_copy").onclick = async () => {
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

  hud.querySelector("#sd_clear").onclick = () => {
    state.logs.length = 0;
    render();
    log("logs cleared");
  };

  hud.querySelector("#sd_reload").onclick = () => location.reload();

  render();
})();
