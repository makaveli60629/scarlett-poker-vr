// /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (SELF-BOOT) v3.0
// ✅ Always prints logs immediately
// ✅ Loads boot2.js itself (so index.html can't break boot)
// ✅ Captures window errors + promise rejects
// ✅ Hide/Show, Copy, Clear, Reload

(() => {
  const ID = "scarlettDiagHud";

  const state = {
    visible: true,
    logs: [],
    status: "Booting...",
    bootUrl: null,
    bootStarted: false,
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

  // Expose hooks for other files
  window.__SCARLETT_DIAG_LOG = (s) => log(String(s));
  window.__SCARLETT_DIAG_STATUS = (s) => setStatus(String(s));

  // Build HUD
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
    <div style="font-size:34px;font-weight:900;letter-spacing:0.2px;">Scarlett Diagnostics</div>
    <div style="margin-top:6px;font-size:18px;opacity:0.9;">
      STATUS: <span id="sd_status" style="font-weight:800;color:#88ffb0;">Booting...</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
      <button id="sd_hide" style="padding:14px 16px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);background:rgba(40,60,120,0.40);color:#eaf2ff;font-weight:800;">Hide HUD</button>
      <button id="sd_copy" style="padding:14px 16px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);background:rgba(40,60,120,0.40);color:#eaf2ff;font-weight:800;">Copy Logs</button>
      <button id="sd_clear" style="padding:14px 16px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);background:rgba(40,60,120,0.30);color:#eaf2ff;font-weight:800;">Clear</button>
      <button id="sd_reload" style="padding:14px 16px;border-radius:14px;border:1px solid rgba(120,160,255,0.25);background:rgba(40,60,120,0.30);color:#eaf2ff;font-weight:800;">Reload</button>
    </div>

    <pre id="sd_logs" style="
      margin-top:14px; padding:12px;
      background:rgba(0,0,0,0.35);
      border:1px solid rgba(120,160,255,0.18);
      border-radius:14px;
      height:240px; overflow:auto;
      white-space:pre-wrap;
      font-size:13px; line-height:1.35;
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

    if (!state.visible) {
      const show = document.createElement("button");
      show.id = "sd_show_btn";
      show.textContent = "Show HUD";
      show.style.cssText = `
        position:fixed; left:16px; top:16px; z-index:999999;
        padding:12px 16px;border-radius:14px;
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

  // Capture errors
  window.addEventListener("error", (e) => {
    setStatus("BOOT FAILED ❌");
    log("WINDOW ERROR: " + (e?.message || e));
  });

  window.addEventListener("unhandledrejection", (e) => {
    setStatus("BOOT FAILED ❌");
    log("PROMISE REJECT: " + (e?.reason?.message || e?.reason || e));
  });

  // ALWAYS log environment immediately (this fixes your “No logs” problem)
  log("diag start ✅");
  log("href=" + location.href);
  log("path=" + location.pathname);
  log("base=" + (location.pathname.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/"));
  log("secureContext=" + String(window.isSecureContext));
  log("ua=" + navigator.userAgent);
  log("navigator.xr=" + String(!!navigator.xr));

  // SELF-BOOT: load boot2.js no matter what index.html does
  function computeBase() {
    // Works on GitHub pages repo path /scarlett-poker-vr/
    if (location.pathname.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
    return "/";
  }

  async function loadBoot2() {
    const base = computeBase();
    const url = `${base}js/scarlett1/boot2.js?v=${Date.now()}`;
    state.bootUrl = url;

    log("loading boot(module): " + url);
    setStatus("Booting...");

    try {
      state.bootStarted = true;
      window.__SCARLETT_BOOT_STARTED = true;

      await import(url);

      // If boot2 doesn’t update status, force it after a moment
      setTimeout(() => {
        if (state.status === "Booting...") {
          setStatus("Boot running… (waiting)");
          log("boot2 imported ✅ (waiting for world)");
        }
      }, 800);

    } catch (e) {
      setStatus("BOOT FAILED ❌");
      log("BOOT IMPORT ERROR: " + (e?.message || e));
    }
  }

  loadBoot2();
})();
