/* /js/spine_diag.js — Scarlett Diagnostics HUD (Permanent) v1.0
   - Works even if Three/world fails
   - Captures console logs automatically
   - Provides buttons: Copy Logs, Reload, Clear, Show/Hide HUD
   - Exposes: window.SpineDiag.{log,warn,error,setStatus,show,hide,toggle,addButton}
*/
(() => {
  const state = {
    mounted: false,
    visible: true,
    status: "Booting...",
    lines: [],
    maxLines: 500,
    el: {
      root: null,
      status: null,
      log: null,
      btnRow: null,
      hideBtn: null
    }
  };

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function now() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function mountIfNeeded() {
    if (state.mounted) return;
    state.mounted = true;

    // Try to reuse existing HUD container if you already have one
    let root = document.querySelector("#scarlettDiag");
    if (!root) {
      root = document.createElement("div");
      root.id = "scarlettDiag";
      document.body.appendChild(root);
    }

    // Style (safe, self-contained)
    root.style.position = "fixed";
    root.style.left = "12px";
    root.style.top = "12px";
    root.style.right = "12px";
    root.style.maxWidth = "720px";
    root.style.zIndex = "999999";
    root.style.borderRadius = "16px";
    root.style.padding = "14px";
    root.style.background = "rgba(10, 16, 28, 0.92)";
    root.style.border = "1px solid rgba(120,160,255,0.35)";
    root.style.boxShadow = "0 10px 30px rgba(0,0,0,0.55)";
    root.style.color = "#eaf0ff";
    root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    root.style.backdropFilter = "blur(8px)";

    root.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:20px; font-weight:800; line-height:1.05;">Scarlett Diagnostics</div>
          <div id="scarlettDiagStatus" style="opacity:0.9; margin-top:4px; font-size:14px;">${esc(state.status)}</div>
        </div>
        <button id="scarlettDiagHideBtn"
          style="flex:0 0 auto; min-width:140px; padding:12px 14px; font-weight:800; border-radius:12px;
                 border:1px solid rgba(120,160,255,0.35); background:rgba(70,110,255,0.22); color:#eaf0ff;">
          Hide HUD
        </button>
      </div>

      <div id="scarlettDiagBtnRow" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:12px;"></div>

      <div style="margin-top:12px; padding:10px; border-radius:12px; border:1px solid rgba(120,160,255,0.18);
                  background:rgba(0,0,0,0.30);">
        <div style="font-size:12px; opacity:0.85; margin-bottom:8px;">
          Logs (auto-captured) — if the world is black, the error should be here.
        </div>
        <pre id="scarlettDiagLog" style="margin:0; white-space:pre-wrap; word-break:break-word;
             font-size:12px; line-height:1.35; max-height:42vh; overflow:auto;"></pre>
      </div>
    `;

    state.el.root = root;
    state.el.status = root.querySelector("#scarlettDiagStatus");
    state.el.log = root.querySelector("#scarlettDiagLog");
    state.el.btnRow = root.querySelector("#scarlettDiagBtnRow");
    state.el.hideBtn = root.querySelector("#scarlettDiagHideBtn");

    state.el.hideBtn.addEventListener("click", () => api.toggle());

    // Default buttons (always present)
    api.addButton("Copy Logs", async () => {
      const text = api.exportText();
      try {
        await navigator.clipboard.writeText(text);
        api.log("Copied logs to clipboard ✅");
      } catch (e) {
        // fallback prompt
        window.prompt("Copy logs:", text);
      }
    });

    api.addButton("Clear", () => {
      state.lines.length = 0;
      renderLog();
      api.log("Log cleared.");
    });

    api.addButton("Reload", () => {
      api.log("Reloading page...");
      location.reload();
    });

    // Initial render
    renderStatus();
    renderLog();
  }

  function renderStatus() {
    if (!state.el.status) return;
    state.el.status.textContent = state.status;
  }

  function renderLog() {
    if (!state.el.log) return;
    // Show most recent at bottom
    state.el.log.textContent = state.lines.join("\n");
    // Auto-scroll to bottom
    state.el.log.scrollTop = state.el.log.scrollHeight;
  }

  function pushLine(level, args) {
    mountIfNeeded();

    const parts = [];
    for (const a of args) {
      try {
        if (typeof a === "string") parts.push(a);
        else parts.push(JSON.stringify(a));
      } catch {
        parts.push(String(a));
      }
    }
    const line = `[${now()}] ${level}: ${parts.join(" ")}`;
    state.lines.push(line);
    if (state.lines.length > state.maxLines) {
      state.lines.splice(0, state.lines.length - state.maxLines);
    }
    renderLog();
  }

  // Console capture (critical!)
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  function installConsoleBridge() {
    if (console.__scarlettPatched) return;
    console.__scarlettPatched = true;

    console.log = (...a) => { orig.log(...a); pushLine("LOG", a); };
    console.warn = (...a) => { orig.warn(...a); pushLine("WARN", a); };
    console.error = (...a) => { orig.error(...a); pushLine("ERR", a); };

    window.addEventListener("error", (e) => {
      pushLine("ERR", [e.message || "window.error", e.filename, e.lineno, e.colno]);
    });

    window.addEventListener("unhandledrejection", (e) => {
      pushLine("ERR", ["unhandledrejection", String(e.reason)]);
    });
  }

  // Public API
  const api = {
    init() {
      mountIfNeeded();
      installConsoleBridge();
      api.log("Diagnostics ready ✅");
      api.log("UA:", navigator.userAgent);
      api.log("href:", location.href);
      api.log("secureContext:", !!window.isSecureContext);
      api.log("navigator.xr:", !!(navigator && navigator.xr));
    },
    setStatus(s) {
      state.status = String(s || "");
      mountIfNeeded();
      renderStatus();
    },
    log(...a) { pushLine("LOG", a); },
    warn(...a) { pushLine("WARN", a); },
    error(...a) { pushLine("ERR", a); },

    show() {
      mountIfNeeded();
      state.visible = true;
      state.el.root.style.display = "";
      state.el.hideBtn.textContent = "Hide HUD";
    },
    hide() {
      mountIfNeeded();
      state.visible = false;
      state.el.root.style.display = "none";
    },
    toggle() {
      mountIfNeeded();
      if (state.visible) {
        // Instead of fully hiding with no way back, create a tiny "Show HUD" pill
        state.visible = false;
        state.el.root.style.display = "none";

        let pill = document.querySelector("#scarlettDiagPill");
        if (!pill) {
          pill = document.createElement("button");
          pill.id = "scarlettDiagPill";
          pill.textContent = "Show HUD";
          pill.style.position = "fixed";
          pill.style.left = "12px";
          pill.style.top = "12px";
          pill.style.zIndex = "999999";
          pill.style.padding = "10px 12px";
          pill.style.borderRadius = "999px";
          pill.style.border = "1px solid rgba(120,160,255,0.35)";
          pill.style.background = "rgba(70,110,255,0.22)";
          pill.style.color = "#eaf0ff";
          pill.style.fontWeight = "800";
          document.body.appendChild(pill);
          pill.addEventListener("click", () => {
            pill.remove();
            api.show();
          });
        }
      } else {
        // If hidden by some other means, just show
        const pill = document.querySelector("#scarlettDiagPill");
        if (pill) pill.remove();
        api.show();
      }
    },

    addButton(label, onClick) {
      mountIfNeeded();
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.padding = "10px 12px";
      btn.style.borderRadius = "12px";
      btn.style.border = "1px solid rgba(120,160,255,0.25)";
      btn.style.background = "rgba(255,255,255,0.06)";
      btn.style.color = "#eaf0ff";
      btn.style.fontWeight = "800";
      btn.addEventListener("click", () => {
        try { onClick && onClick(); } catch (e) { api.error("Button error:", label, e); }
      });
      state.el.btnRow.appendChild(btn);
      return btn;
    },

    exportText() {
      return [
        "Scarlett Diagnostics Export",
        `href=${location.href}`,
        `ua=${navigator.userAgent}`,
        `secureContext=${!!window.isSecureContext}`,
        `navigator.xr=${!!(navigator && navigator.xr)}`,
        "---- LOGS ----",
        state.lines.join("\n")
      ].join("\n");
    }
  };

  // Expose global
  window.SpineDiag = api;

  // Auto-init ASAP
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => api.init());
  } else {
    api.init();
  }
})();
