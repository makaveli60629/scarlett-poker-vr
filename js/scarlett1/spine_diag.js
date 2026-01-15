// /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// ✅ Always visible, always works
// ✅ Loads boot.js as type="module" (FIXES "boot loaded but not started")
// ✅ Captures window.onerror + unhandledrejection to HUD
// ✅ Hide/Show HUD + Copy Logs + Reload + Clear

(() => {
  const ID = "scarlettDiagHud";
  const state = {
    visible: true,
    logs: [],
    status: "Booting…",
    bootUrl: null,
    bootScriptEl: null,
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  function log(line) {
    const msg = `${stamp()} ${line}`;
    state.logs.push(msg);
    if (state.logs.length > 500) state.logs.shift();
    if (console && console.log) console.log(line);
    renderLogs();
  }

  function setStatus(s) {
    state.status = s;
    renderStatus();
  }

  // Expose hooks used by boot.js
  window.__SCARLETT_DIAG_LOG__ = (s) => log(s);
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(s);

  // Capture real errors (these are what you’re missing right now)
  window.addEventListener("error", (e) => {
    log(`WINDOW ERROR: ${e?.message || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    log(`PROMISE REJECT: ${e?.reason?.message || e?.reason || e}`);
  });

  // Build HUD
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position: fixed; left: 16px; top: 16px; z-index: 999999;
    width: min(560px, calc(100vw - 32px));
    background: rgba(10,14,30,0.92);
    border: 1px solid rgba(120,160,255,0.25);
    border-radius: 18px;
    color: #d8e6ff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    padding: 16px;
  `;

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:800;letter-spacing:0.2px;">Scarlett Diagnostics</div>
    <div id="sd_status" style="margin-top:6px;opacity:0.85;">Booting…</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:700;">Hide HUD</button>
      <button id="sd_copy" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:700;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:700;">Clear</button>
      <button id="sd_reload" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.22);background:rgba(40,60,120,0.35);color:#eaf2ff;font-weight:700;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background:rgba(0,0,0,0.25);
      border-radius:14px;
      border:1px solid rgba(120,160,255,0.18);
      height: 240px; overflow:auto; white-space:pre-wrap;
      font-size: 13px; line-height: 1.35;
    "></pre>
  `;

  document.body.appendChild(hud);

  const elStatus = hud.querySelector("#sd_status");
  const elLogs = hud.querySelector("#sd_logs");

  function renderStatus() {
    elStatus.textContent = state.status;
  }
  function renderLogs() {
    elLogs.textContent = state.logs.join("\n");
    elLogs.scrollTop = elLogs.scrollHeight;
  }

  // Buttons
  hud.querySelector("#sd_hide").onclick = () => {
    state.visible = !state.visible;
    hud.style.opacity = state.visible ? "1" : "0.04";
    hud.style.pointerEvents = state.visible ? "auto" : "none";

    // Make a tiny "Show" button when hidden
    if (!state.visible) {
      const show = document.createElement("button");
      show.id = "sd_show_btn";
      show.textContent = "Show HUD";
      show.style.cssText = `
        position:fixed;left:16px;top:16px;z-index:999999;
        padding:12px 14px;border-radius:12px;
        border:1px solid rgba(120,160,255,0.22);
        background:rgba(40,60,120,0.65);
        color:#eaf2ff;font-weight:800;
      `;
      show.onclick = () => {
        state.visible = true;
        hud.style.opacity = "1";
        hud.style.pointerEvents = "auto";
        show.remove();
      };
      document.body.appendChild(show);
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

  // ---- BOOT LOADER (THE FIX) ----
  // load boot.js as a MODULE so it executes reliably
  function loadBoot() {
    const base = "/scarlett-poker-vr/";
    const bootUrl = `${base}js/scarlett1/boot.js?v=${Date.now()}`;
    state.bootUrl = bootUrl;

    log(`href=${location.href}`);
    log(`path=${location.pathname}`);
    log(`base=${base}`);
    log(`secureContext=${window.isSecureContext}`);
    log(`ua=${navigator.userAgent}`);
    log(`navigator.xr=${!!navigator.xr}`);
    log(`loading boot: ${bootUrl}`);

    setStatus("Booting…");

    // Remove previous boot script if any
    if (state.bootScriptEl) {
      state.bootScriptEl.remove();
      state.bootScriptEl = null;
    }

    const s = document.createElement("script");
    s.type = "module";              // ✅ THIS IS THE FIX
    s.src = bootUrl;
    s.onload = () => {
      log("boot loaded ✅");
      // Watchdog: if boot doesn’t set its started flag, it didn’t execute
      setTimeout(() => {
        if (!window.__SCARLETT_BOOT_STARTED__) {
          log("boot not started yet… (boot did not execute)");
          setStatus("Boot not running (module execution failed)");
          log("TIP: this means boot.js threw a syntax/runtime error. Check logs above (WINDOW ERROR / PROMISE REJECT).");
        }
      }, 1200);
    };
    s.onerror = () => {
      log("boot load FAILED ❌");
      setStatus("BOOT FAILED ❌ (boot load error)");
    };

    document.head.appendChild(s);
    state.bootScriptEl = s;
  }

  // Start
  renderStatus();
  renderLogs();
  loadBoot();
})();
