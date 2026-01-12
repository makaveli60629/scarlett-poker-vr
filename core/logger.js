// /core/logger.js — Scarlett Logger v2 (FULL)
// HUD log + small diagnostics overlay (FPS / pos / rot / mode) + Copy Log

export function createLogger({ maxLines = 120 } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];
  function log(m) {
    const line = `[${now()}] ${m}`;
    out.push(line);
    console.log(line);
    const pre = document.getElementById("hud-log");
    if (pre) pre.textContent = out.slice(-maxLines).join("\n");
  }

  log.copy = async () => {
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      log("[HUD] copied ✅");
    } catch (e) {
      log("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };

  // HUD container
  (function ensureHUD() {
    if (document.getElementById("hud")) return;

    const hud = document.createElement("div");
    hud.id = "hud";
    hud.style.position = "fixed";
    hud.style.left = "10px";
    hud.style.bottom = "10px";
    hud.style.width = "min(560px, 94vw)";
    hud.style.maxHeight = "42vh";
    hud.style.background = "rgba(10,12,18,0.70)";
    hud.style.border = "1px solid rgba(255,255,255,0.12)";
    hud.style.borderRadius = "12px";
    hud.style.padding = "10px";
    hud.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    hud.style.fontSize = "12px";
    hud.style.color = "#e8ecff";
    hud.style.zIndex = "9999";
    hud.style.backdropFilter = "blur(6px)";

    const row = document.createElement("div");
    row.className = "row";
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

    const title = document.createElement("div");
    title.textContent = "Scarlett VR Poker — HUD";
    title.style.fontWeight = "700";
    title.style.flex = "1";

    const copy = document.createElement("button");
    copy.textContent = "Copy Log";
    copy.style.padding = "6px 10px";
    copy.style.borderRadius = "10px";
    copy.style.border = "1px solid rgba(255,255,255,0.18)";
    copy.style.background = "rgba(127,231,255,0.12)";
    copy.style.color = "#e8ecff";
    copy.style.cursor = "pointer";
    copy.onclick = () => log.copy();

    const toggle = document.createElement("button");
    toggle.textContent = "Hide HUD";
    toggle.style.padding = "6px 10px";
    toggle.style.borderRadius = "10px";
    toggle.style.border = "1px solid rgba(255,255,255,0.18)";
    toggle.style.background = "rgba(255,45,122,0.10)";
    toggle.style.color = "#e8ecff";
    toggle.style.cursor = "pointer";
    toggle.onclick = () => {
      const pre = document.getElementById("hud-log");
      const diag = document.getElementById("hud-diag");
      const hidden = pre.style.display === "none";
      pre.style.display = hidden ? "" : "none";
      diag.style.display = hidden ? "" : "none";
      toggle.textContent = hidden ? "Hide HUD" : "Show HUD";
    };

    row.appendChild(title);
    row.appendChild(copy);
    row.appendChild(toggle);

    const diag = document.createElement("div");
    diag.id = "hud-diag";
    diag.style.padding = "8px";
    diag.style.marginBottom = "8px";
    diag.style.borderRadius = "10px";
    diag.style.border = "1px solid rgba(255,255,255,0.10)";
    diag.style.background = "rgba(0,0,0,0.25)";
    diag.textContent = "diag: (waiting…)";

    const pre = document.createElement("pre");
    pre.id = "hud-log";
    pre.style.margin = "0";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.lineHeight = "1.25";
    pre.style.maxHeight = "28vh";
    pre.style.overflow = "auto";

    hud.appendChild(row);
    hud.appendChild(diag);
    hud.appendChild(pre);
    document.body.appendChild(hud);
  })();

  // diagnostics updater hook
  let fps = 0, acc = 0, frames = 0, last = performance.now();
  log.diag = (ctx, dt) => {
    frames++;
    acc += dt;
    const t = performance.now();
    if (t - last > 500) {
      fps = Math.round(frames / (acc || 1e-6));
      frames = 0; acc = 0; last = t;
    }
    const d = document.getElementById("hud-diag");
    if (!d || !ctx) return;
    const p = ctx.player?.position;
    const rY = ctx.player?.rotation?.y ?? 0;
    const mode = ctx.__controls?.isXR ? "XR" : "FLAT";
    d.textContent =
      `mode=${mode} fps=${fps}\n` +
      `player=(${(p?.x ?? 0).toFixed(2)}, ${(p?.y ?? 0).toFixed(2)}, ${(p?.z ?? 0).toFixed(2)}) yaw=${rY.toFixed(2)}\n` +
      `room=${ctx.world?.room || "lobby"} build=${ctx.BUILD || ""}`;
  };

  return log;
}
