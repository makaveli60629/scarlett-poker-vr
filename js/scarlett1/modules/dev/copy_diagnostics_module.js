// /js/scarlett1/modules/dev/copy_diagnostics_module.js
// COPY DIAGNOSTICS MODULE (FULL) — Modular Forever
// - Adds a button that copies health + recent logs + errors to clipboard
// - Wraps console.log/warn/error to keep a ring buffer (Quest-safe)
// Requires (optional):
// - health_overlay_module (for last error display), but works without it.

export function createCopyDiagnosticsModule({
  title = "COPY DIAGNOSTICS",
  maxLines = 80,
  maxChars = 9000,
} = {}) {
  let btn = null;
  let hooked = false;

  const buf = []; // ring buffer lines

  function pushLine(s) {
    s = String(s ?? "");
    buf.push(s);
    while (buf.length > maxLines) buf.shift();
  }

  function clip(s) {
    s = String(s || "");
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + "…";
  }

  function hookConsole() {
    if (hooked) return;
    hooked = true;

    // Avoid double wrapping
    if (console.__scarlettWrapped) return;
    console.__scarlettWrapped = true;

    const orig = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    function fmt(args) {
      try {
        return args.map(a => {
          if (typeof a === "string") return a;
          if (a instanceof Error) return a.stack || a.message || String(a);
          return JSON.stringify(a);
        }).join(" ");
      } catch {
        return args.map(a => String(a)).join(" ");
      }
    }

    console.log = (...args) => {
      pushLine(`[log] ${fmt(args)}`);
      orig.log(...args);
    };
    console.warn = (...args) => {
      pushLine(`[warn] ${fmt(args)}`);
      orig.warn(...args);
    };
    console.error = (...args) => {
      pushLine(`[error] ${fmt(args)}`);
      orig.error(...args);
    };

    // Also capture window errors if health overlay not present
    window.addEventListener("error", (ev) => {
      const msg = ev?.message || "error";
      const file = ev?.filename || "";
      const line = ev?.lineno || "";
      pushLine(`[window.error] ${msg} @ ${file}:${line}`);
    });

    window.addEventListener("unhandledrejection", (ev) => {
      pushLine(`[unhandledrejection] ${String(ev?.reason || "unknown")}`);
    });
  }

  function ensureButton() {
    if (btn) return;

    btn = document.createElement("button");
    btn.setAttribute("data-hud", "1");
    btn.textContent = title;

    btn.style.position = "fixed";
    btn.style.left = "12px";
    btn.style.top = "56px";
    btn.style.zIndex = "999999";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "12px";
    btn.style.border = "1px solid rgba(255,255,255,0.16)";
    btn.style.background = "rgba(20,20,30,0.70)";
    btn.style.color = "white";
    btn.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    btn.style.fontSize = "13px";
    btn.style.cursor = "pointer";
    btn.style.backdropFilter = "blur(8px)";
    btn.style.webkitBackdropFilter = "blur(8px)";

    document.body.appendChild(btn);
  }

  async function copyText(text) {
    // Clipboard API first, fallback to textarea
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  function buildReport(ctx) {
    const ua = navigator.userAgent;
    const url = location.href;
    const xr = ctx.xrSession ? "ACTIVE" : "inactive";
    const mods = (ctx._enabledModuleNames || []).join(", ") || "unknown";

    // If health overlay captured last error, use that. Otherwise best effort.
    const lastErr =
      (window.__scarlettHealthLastError) ||
      "see log buffer";

    const lines = [];
    lines.push("=== SCARLETT DIAGNOSTICS ===");
    lines.push(`url: ${url}`);
    lines.push(`ua: ${ua}`);
    lines.push(`xr: ${xr}`);
    lines.push(`modules: ${mods}`);
    lines.push("");
    lines.push("=== LAST ERROR (if any) ===");
    lines.push(lastErr);
    lines.push("");
    lines.push("=== RECENT LOGS ===");
    lines.push(buf.join("\n"));

    return clip(lines.join("\n"));
  }

  return {
    name: "copy_diagnostics",

    onEnable(ctx) {
      hookConsole();
      ensureButton();

      // If health overlay exists, let it publish the error string for us
      // (Optional bridge; harmless if not present)
      if (!window.__scarlettHealthBridgeInstalled) {
        window.__scarlettHealthBridgeInstalled = true;

        window.addEventListener("error", (ev) => {
          const msg = ev?.message || "error";
          const file = ev?.filename || "";
          const line = ev?.lineno || "";
          const col = ev?.colno || "";
          const stack = ev?.error?.stack || "";
          window.__scarlettHealthLastError = `${msg}\n${file}:${line}:${col}\n${stack}`;
        });

        window.addEventListener("unhandledrejection", (ev) => {
          const r = ev?.reason;
          window.__scarlettHealthLastError =
            (r?.stack) ? r.stack : String(r || "unhandledrejection");
        });
      }

      btn.onclick = async () => {
        const report = buildReport(ctx);
        const ok = await copyText(report);
        btn.textContent = ok ? "COPIED ✅" : "COPY FAILED ❌";
        setTimeout(() => (btn.textContent = title), 900);
      };

      console.log("[copy_diagnostics] ready ✅");
    },
  };
}
