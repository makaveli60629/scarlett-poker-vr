// /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (FULL • PERMANENT)
// ✅ Always visible HUD (Hide/Show)
// ✅ Captures window.onerror + unhandledrejection
// ✅ Loads boot.js via dynamic import() so failures show real error text
// ✅ Auto-detects correct GitHub Pages base path

(() => {
  const ID = "scarlettDiagHud";
  const state = {
    visible: true,
    logs: [],
    status: "Booting…",
    bootUrl: null
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
    log(`STATUS: ${s}`);
  }

  // Expose hooks for other files (boot/world) to log into HUD safely
  window.__SCARLETT_DIAG_LOG__ = (s) => log(s);
  window.__SCARLETT_DIAG_STATUS__ = (s) => setStatus(s);

  // Capture runtime errors
  window.addEventListener("error", (e) => {
    const m = (e && (e.message || e.error?.message)) || "unknown error";
    log(`WINDOW ERROR ❌ ${m}`);
    if (e && e.error && e.error.stack) log(String(e.error.stack));
  });

  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    const m = (r && (r.message || String(r))) || "unknown rejection";
    log(`PROMISE REJECT ❌ ${m}`);
    if (r && r.stack) log(String(r.stack));
  });

  // HUD
  const hud = document.createElement("div");
  hud.id = ID;
  hud.style.cssText = `
    position:fixed; left:16px; top:16px; z-index:999999;
    width:min(560px, calc(100vw - 32px));
    background:rgba(10,14,30,0.92);
    border:1px solid rgba(120,160,255,0.25);
    border-radius:18px;
    color:#dbe6ff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    padding:16px;
  `;

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:900;letter-spacing:0.2px;">Scarlett Diagnostics</div>
    <div id="sd_status" style="margin-top:6px;opacity:0.88;">Booting…</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.18);background:rgba(40,60,120,0.40);color:#eaf2ff;font-weight:800;">Hide HUD</button>
      <button id="sd_copy" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.18);background:rgba(40,60,120,0.40);color:#eaf2ff;font-weight:800;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.18);background:rgba(40,60,120,0.25);color:#eaf2ff;font-weight:800;">Clear</button>
      <button id="sd_reload" style="padding:14px;border-radius:14px;border:1px solid rgba(120,160,255,0.18);background:rgba(40,60,120,0.25);color:#eaf2ff;font-weight:800;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background:rgba(0,0,0,0.25);
      border-radius:14px;
      border:1px solid rgba(120,160,255,0.18);
      height:240px; overflow:auto;
      white-space:pre-wrap;
      font-size:13px; line-height:1.35;
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

  // Hide / Show
  hud.querySelector("#sd_hide").onclick = () => {
    state.visible = !state.visible;
    hud.style.opacity = state.visible ? "1" : "0.04";
    hud.style.pointerEvents = state.visible ? "auto" : "none";

    if (!state.visible) {
      const show = document.createElement("button");
      show.id = "sd_show_btn";
      show.textContent = "Show HUD";
      show.style.cssText = `
        position:fixed; left:16px; top:16px; z-index:999999;
        padding:12px 14px; border-radius:12px;
        border:1px solid rgba(120,160,255,0.22);
        background:rgba(40,60,120,0.65);
        color:#eaf2ff; font-weight:900;
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

  // Copy
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

  // Clear / Reload
  hud.querySelector("#sd_clear").onclick = () => {
    state.logs.length = 0;
    renderLogs();
    log("logs cleared");
  };
  hud.querySelector("#sd_reload").onclick = () => location.reload();

  // ---- Base path detection (NO hardcode) ----
  function computeBase() {
    // GitHub Pages project: /scarlett-poker-vr/
    // Ensure trailing slash
    let p = location.pathname || "/";
    // If on /scarlett-poker-vr/index.html or /scarlett-poker-vr/
    // reduce to "/scarlett-poker-vr/"
    if (!p.endsWith("/")) {
      p = p.replace(/\/[^\/]*$/, "/");
    }
    return p; // includes project root with trailing slash
  }

  // ---- BOOT LOADER (dynamic import so we SEE the real error) ----
  async function loadBoot() {
    const base = computeBase();

    const bootUrl = `${base}js/scarlett1/boot.js?v=${Date.now()}`;
    state.bootUrl = bootUrl;

    log(`href=${location.href}`);
    log(`path=${location.pathname}`);
    log(`base=${base}`);
    log(`secureContext=${window.isSecureContext}`);
    log(`ua=${navigator.userAgent}`);
    log(`navigator.xr=${!!navigator.xr}`);
    log(`importing boot: ${bootUrl}`);

    setStatus("Booting…");

    // Clear boot flag so we can detect fresh execution
    window.__SCARLETT_BOOT_STARTED__ = false;

    try {
      // IMPORTANT: dynamic import gives us the REAL error
      await import(bootUrl);

      if (window.__SCARLETT_BOOT_STARTED__) {
        log("boot executed ✅");
        setStatus("Boot running ✅");
      } else {
        log("boot imported but flag not set ⚠️");
        setStatus("Boot imported but not started (boot.js didn't set flag)");
      }
    } catch (err) {
      const msg = (err && (err.message || String(err))) || "unknown error";
      log(`BOOT IMPORT FAILED ❌ ${msg}`);
      if (err && err.stack) log(String(err.stack));
      setStatus("BOOT FAILED ❌ (see log)");
    }
  }

  // Kick off
  renderStatus();
  renderLogs();
  loadBoot();
})();
