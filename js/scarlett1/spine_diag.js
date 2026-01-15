// js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// - Always visible HUD with Hide/Show + Copy Logs + Clear + Reload
// - Captures window.onerror + unhandledrejection
// - Loads boot via dynamic import so execution is real (not fake "loaded")

(() => {
  const ID = "ScarlettDiagHud";
  const state = {
    visible: true,
    logs: [],
    status: "Booting…",
    bootUrl: null,
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  function log(line) {
    const msg = `${stamp()} ${line}`;
    state.logs.push(msg);
    if (state.logs.length > 700) state.logs.shift();
    try { console.log(line); } catch {}
    renderLogs();
  }

  function setStatus(s) {
    state.status = s;
    renderStatus();
  }

  // Expose hooks
  window.__SCARLETT_DIAG_LOG__ = (s) => log(String(s));
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(String(s));

  // Capture errors
  window.addEventListener("error", (e) => {
    log(`WINDOW ERROR: ${e.message || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason;
    log(`PROMISE REJECT: ${r?.message || r || e}`);
  });

  // HUD UI
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position:fixed; left:16px; top:16px; z-index:999999;
    width:min(560px, calc(100vw - 32px));
    background:rgba(10,14,30,0.92);
    border:1px solid rgba(120,160,255,0.25);
    border-radius:18px;
    color:#dbe6ff;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    box-shadow:0 20px 60px rgba(0,0,0,0.45);
    padding:16px;
  `;

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:900;letter-spacing:0.3px;">Scarlett Diagnostics</div>
    <div style="margin-top:6px;opacity:0.85;">
      <span style="font-weight:800;">STATUS:</span>
      <span id="sd_status">Booting…</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.2);background:rgba(40,60,120,0.65);color:#eaf2ff;font-weight:900;">Hide HUD</button>
      <button id="sd_copy" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.2);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.2);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Clear</button>
      <button id="sd_reload" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.2);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:900;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background:rgba(0,0,0,0.25);
      border-radius:14px;
      border:1px solid rgba(120,160,255,0.18);
      height:260px; overflow:auto;
      font-size:13px; line-height:1.35;
      white-space:pre-wrap;
    "></pre>
  `;

  document.body.appendChild(hud);

  const elStatus = hud.querySelector("#sd_status");
  const elLogs = hud.querySelector("#sd_logs");

  function renderStatus() { elStatus.textContent = state.status; }
  function renderLogs() {
    elLogs.textContent = state.logs.join("\n");
    elLogs.scrollTop = elLogs.scrollHeight;
  }

  // Buttons
  hud.querySelector("#sd_hide").onclick = () => {
    state.visible = !state.visible;
    hud.style.opacity = state.visible ? "1" : "0.04";
    hud.style.pointerEvents = state.visible ? "auto" : "none";

    // Add tiny show button when hidden
    if (!state.visible) {
      if (!document.getElementById("sd_show_btn")) {
        const show = document.createElement("button");
        show.id = "sd_show_btn";
        show.textContent = "Show HUD";
        show.style.cssText = `
          position:fixed;left:16px;top:16px;z-index:999999;
          padding:12px 14px;border-radius:12px;
          border:1px solid rgba(120,160,255,0.22);
          background:rgba(40,60,120,0.65);
          color:#eaf2ff;font-weight:900;
        `;
        show.onclick = () => {
          state.visible = true;
          hud.style.opacity = "1";
          hud.style.pointerEvents = "auto";
          show.remove();
        };
        document.body.appendChild(show);
      }
    } else {
      const show = document.getElementById("sd_show_btn");
      if (show) show.remove();
    }
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
    renderLogs();
    log("logs cleared");
  };

  hud.querySelector("#sd_reload").onclick = () => location.reload();

  // Base resolver
  function getBase() {
    // Works for https://makaveli60629.github.io/scarlett-poker-vr/
    const p = location.pathname || "/";
    const seg = p.split("/").filter(Boolean);
    // seg[0] should be "scarlett-poker-vr"
    if (seg.length > 0) return `/${seg[0]}/`;
    return "/";
  }

  // Boot loader: REAL EXECUTION via dynamic import
  async function loadBoot() {
    const base = getBase();
    const bootUrl = `${base}js/scarlett1/boot2.js?v=${Date.now()}`;
    state.bootUrl = bootUrl;

    log(`href=${location.href}`);
    log(`path=${location.pathname}`);
    log(`base=${base}`);
    log(`secureContext=${!!window.isSecureContext}`);
    log(`ua=${navigator.userAgent}`);
    log(`navigator.xr=${!!navigator.xr}`);
    log(`loading boot: ${bootUrl}`);

    setStatus("Booting…");

    try {
      await import(bootUrl);
      log("boot executed ✅");
      setStatus("Boot executed ✅");

      // If world starts, it will update status again
    } catch (e) {
      log(`BOOT FAILED ❌ ${e?.message || e}`);
      setStatus("BOOT FAILED ❌ (import error)");
      console.error(e);
    }
  }

  renderStatus();
  renderLogs();
  loadBoot();
})();
