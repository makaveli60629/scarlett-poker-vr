// /js/scarlett1/modules/dev/health_overlay_module.js
// HEALTH OVERLAY + CRASH GUARD (FULL) — Modular Forever
// - Always-on overlay that reports module health and last error
// - Captures window.onerror + unhandledrejection
// - Shows XR session state, FPS approx, and module list (from ctx._enabledModuleNames)

export function createHealthOverlayModule({
  title = "SCARLETT1 • HEALTH",
  showFPS = true,
  maxErrorChars = 650,
} = {}) {
  let panel = null;
  let lastErr = "none";
  let lastErrAt = 0;

  let fps = 0;
  let fAcc = 0;
  let fCount = 0;

  function nowSec() {
    return performance.now() / 1000;
  }

  function ensurePanel() {
    if (panel) return;

    panel = document.createElement("div");
    panel.setAttribute("data-hud", "1");
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.top = "12px";
    panel.style.zIndex = "999999";
    panel.style.width = "340px";
    panel.style.maxWidth = "92vw";
    panel.style.padding = "12px";
    panel.style.borderRadius = "14px";
    panel.style.border = "1px solid rgba(255,255,255,0.16)";
    panel.style.background = "rgba(0,0,0,0.60)";
    panel.style.color = "white";
    panel.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    panel.style.fontSize = "12px";
    panel.style.lineHeight = "1.25";
    panel.style.whiteSpace = "pre-wrap";
    panel.style.backdropFilter = "blur(8px)";
    panel.style.webkitBackdropFilter = "blur(8px)";

    const header = document.createElement("div");
    header.style.fontWeight = "800";
    header.style.letterSpacing = "0.08em";
    header.style.marginBottom = "8px";
    header.textContent = title;
    panel.appendChild(header);

    const body = document.createElement("div");
    body.id = "scarlett_health_body";
    panel.appendChild(body);

    // collapse toggle
    const toggle = document.createElement("button");
    toggle.textContent = "toggle";
    toggle.style.position = "absolute";
    toggle.style.right = "10px";
    toggle.style.top = "10px";
    toggle.style.padding = "6px 8px";
    toggle.style.borderRadius = "10px";
    toggle.style.border = "1px solid rgba(255,255,255,0.18)";
    toggle.style.background = "rgba(20,20,30,0.7)";
    toggle.style.color = "white";
    toggle.style.cursor = "pointer";
    toggle.style.fontSize = "11px";
    panel.appendChild(toggle);

    let collapsed = false;
    toggle.onclick = () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? "none" : "block";
      panel.style.opacity = collapsed ? "0.75" : "1";
    };

    document.body.appendChild(panel);
  }

  function clip(s) {
    s = String(s || "");
    if (s.length <= maxErrorChars) return s;
    return s.slice(0, maxErrorChars) + "…";
  }

  function hookErrors() {
    // Avoid double-hook
    if (window.__scarlettHealthHooked) return;
    window.__scarlettHealthHooked = true;

    window.addEventListener("error", (ev) => {
      const msg = ev?.message || "error";
      const file = ev?.filename || "";
      const line = ev?.lineno || "";
      const col = ev?.colno || "";
      const stack = ev?.error?.stack || "";
      lastErr = clip(`${msg}\n${file}:${line}:${col}\n${stack}`);
      lastErrAt = nowSec();
      console.log("[health] captured error:", lastErr);
    });

    window.addEventListener("unhandledrejection", (ev) => {
      const reason = ev?.reason;
      const msg = (reason?.message) ? reason.message : String(reason || "unhandledrejection");
      const stack = reason?.stack || "";
      lastErr = clip(`${msg}\n${stack}`);
      lastErrAt = nowSec();
      console.log("[health] captured rejection:", lastErr);
    });
  }

  function render(ctx) {
    ensurePanel();
    const body = panel.querySelector("#scarlett_health_body");
    if (!body) return;

    const xr = ctx.xrSession ? "ACTIVE" : "inactive";
    const mods = (ctx._enabledModuleNames || []).join(", ") || "unknown";

    const uptime = nowSec().toFixed(1);
    const errAge = lastErrAt ? (nowSec() - lastErrAt).toFixed(1) + "s ago" : "n/a";

    const lines = [];
    lines.push(`uptime: ${uptime}s`);
    lines.push(`xr: ${xr}`);
    if (showFPS) lines.push(`fps: ${fps.toFixed(1)}`);
    lines.push(`modules: ${mods}`);
    lines.push("");
    lines.push(`lastError: ${errAge}`);
    lines.push(lastErr);

    body.textContent = lines.join("\n");
  }

  return {
    name: "health_overlay",

    onEnable(ctx) {
      ensurePanel();
      hookErrors();
      console.log("[health_overlay] ready ✅");
    },

    update(ctx, { dt }) {
      // FPS estimate
      if (showFPS) {
        fAcc += dt;
        fCount++;
        if (fAcc >= 0.5) {
          fps = fCount / fAcc;
          fAcc = 0;
          fCount = 0;
        }
      }
      render(ctx);
    }
  };
}
