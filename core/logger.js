// /core/logger.js
export function createLogger({ maxLines = 80 } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];
  const ensureHUD = () => {
    if (document.getElementById("hud-log")) return;

    const hud = document.createElement("div");
    hud.style.position = "fixed";
    hud.style.left = "10px";
    hud.style.bottom = "10px";
    hud.style.width = "min(560px, 92vw)";
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
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

    const title = document.createElement("div");
    title.textContent = "Scarlett VR Poker — HUD";
    title.style.fontWeight = "700";
    title.style.flex = "1";

    const btn = document.createElement("button");
    btn.textContent = "Copy Log";
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "10px";
    btn.style.border = "1px solid rgba(255,255,255,0.18)";
    btn.style.background = "rgba(127,231,255,0.12)";
    btn.style.color = "#e8ecff";
    btn.style.cursor = "pointer";

    const pre = document.createElement("pre");
    pre.id = "hud-log";
    pre.style.margin = "0";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.lineHeight = "1.25";
    pre.style.maxHeight = "33vh";
    pre.style.overflow = "auto";

    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(out.join("\n"));
        log("[HUD] copied ✅");
      } catch (e) {
        log("[HUD] copy failed ❌ " + (e?.message || e));
      }
    };

    row.appendChild(title);
    row.appendChild(btn);
    hud.appendChild(row);
    hud.appendChild(pre);
    document.body.appendChild(hud);
  };

  function log(msg) {
    ensureHUD();
    const line = `[${now()}] ${msg}`;
    out.push(line);
    while (out.length > maxLines) out.shift();
    console.log(line);
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.join("\n");
  }

  log.getLines = () => out.slice();
  return log;
}
