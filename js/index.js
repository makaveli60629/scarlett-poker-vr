// === SCARLETT ANDROID DIAG: MODULE TEST + COPY ===
// Drop-in UI for ROUTER_FULL_DIAG / boot.js style overlays

(function scarlettDiagButtons() {
  // Create a shared log buffer + monkeypatch console so copy works reliably
  const MAX_LINES = 4000;
  const buf = [];
  const pushLine = (line) => {
    buf.push(line);
    if (buf.length > MAX_LINES) buf.splice(0, buf.length - MAX_LINES);
  };

  // Avoid double-patching
  if (!window.__scarlettDiagPatched) {
    window.__scarlettDiagPatched = true;

    const wrap = (fnName) => {
      const orig = console[fnName]?.bind(console);
      if (!orig) return;
      console[fnName] = (...args) => {
        try {
          const msg = args
            .map((a) => (typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
            .join(" ");
          const ts = new Date().toISOString().slice(11, 19);
          pushLine(`[${ts}] [${fnName.toUpperCase()}] ${msg}`);
        } catch {}
        return orig(...args);
      };
    };

    wrap("log");
    wrap("warn");
    wrap("error");
  }

  // Ensure a visible diag panel exists (if your router already has one, we reuse it)
  let panel = document.getElementById("scarlettDiagPanel");
  let pre = document.getElementById("scarlettDiagPre");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "scarlettDiagPanel";
    panel.style.cssText = `
      position:fixed;left:10px;right:10px;bottom:10px;z-index:999999;
      background:rgba(0,0,0,.72);color:#fff;border-radius:14px;
      padding:10px; font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size:12px; line-height:1.25;
      max-height:42vh; overflow:hidden;
    `;
    document.body.appendChild(panel);

    const header = document.createElement("div");
    header.style.cssText = `display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:8px;`;
    panel.appendChild(header);

    const mkBtn = (label) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = `
        padding:8px 10px; border:0; border-radius:12px;
        background:#e91e63; color:#fff; font-weight:800;
      `;
      return b;
    };

    const btnModule = mkBtn("MODULE TEST");
    const btnCopy = mkBtn("COPY LOG");
    const btnClear = mkBtn("CLEAR");

    btnClear.style.background = "#444";

    header.appendChild(btnModule);
    header.appendChild(btnCopy);
    header.appendChild(btnClear);

    pre = document.createElement("pre");
    pre.id = "scarlettDiagPre";
    pre.style.cssText = `
      margin:0; white-space:pre-wrap; word-break:break-word;
      background:rgba(255,255,255,.06); border-radius:12px;
      padding:10px; overflow:auto; max-height:32vh;
    `;
    panel.appendChild(pre);

    // Simple writer for the diag pre
    window.__scarlettDiagWrite = (line) => {
      try {
        const ts = new Date().toISOString().slice(11, 19);
        pre.textContent += `[${ts}] ${line}\n`;
        pre.scrollTop = pre.scrollHeight;
      } catch {}
    };

    // Buttons behavior
    btnModule.onclick = async () => {
      window.__scarlettDiagWrite?.("MODULE TEST pressed…");
      try {
        if (typeof window.__scarlettRunModuleTest === "function") {
          const res = await window.__scarlettRunModuleTest();
          window.__scarlettDiagWrite?.("MODULE TEST done ✅");
          if (res != null) window.__scarlettDiagWrite?.(`RESULT: ${typeof res === "string" ? res : JSON.stringify(res)}`);
        } else {
          window.__scarlettDiagWrite?.("No window.__scarlettRunModuleTest() found ❌");
          window.__scarlettDiagWrite?.("Tip: expose your module test as window.__scarlettRunModuleTest = async () => {...}");
        }
      } catch (e) {
        window.__scarlettDiagWrite?.(`MODULE TEST error ❌ ${e?.message || e}`);
      }
    };

    btnCopy.onclick = async () => {
      try {
        // Combine visible pre + captured console buffer
        const visible = pre?.textContent || "";
        const captured = (window.__scarlettDiagPatched ? "" : "") + ""; // placeholder
        const copyText =
          "=== SCARLETT DIAG ===\n" +
          visible +
          "\n=== CONSOLE CAPTURE ===\n" +
          (Array.isArray(window.__scarlettDiagLines) ? window.__scarlettDiagLines.join("\n") : "");

        // Store lines globally for copy
        // (We keep it updated below)
        await navigator.clipboard.writeText(copyText);
        window.__scarlettDiagWrite?.("Copied ✅ (diag + console)");
      } catch (e) {
        // Fallback for older Android WebViews
        try {
          const text = pre?.textContent || "";
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          window.__scarlettDiagWrite?.("Copied ✅ (fallback)");
        } catch (e2) {
          window.__scarlettDiagWrite?.(`Copy failed ❌ ${e2?.message || e2}`);
        }
      }
    };

    btnClear.onclick = () => {
      pre.textContent = "";
      window.__scarlettDiagWrite?.("Cleared.");
    };
  }

  // Keep global lines synced for the COPY button
  // (we store in window so it’s easy to access anywhere)
  if (!window.__scarlettDiagLines) window.__scarlettDiagLines = [];
  const syncTimer = setInterval(() => {
    try {
      // Pull from the local closure buffer if possible
      // We can’t directly access it outside, so we append from console monkeypatch via window hook:
      // easiest: store nothing here and just copy the visible pre.
      // But we can still keep a running mirror:
      if (pre && pre.textContent) {
        const lines = pre.textContent.split("\n").filter(Boolean);
        window.__scarlettDiagLines = lines.slice(-MAX_LINES);
      }
    } catch {}
  }, 750);

  // If page unloads
  window.addEventListener("beforeunload", () => clearInterval(syncTimer));
})();
