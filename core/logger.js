// /core/logger.js
export function createLogger({ title = "HUD" } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];

  ensureHUD(title);

  function push(m) {
    const line = `[${now()}] ${m}`;
    out.push(line);
    console.log(line);
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-60).join("\n");
  }

  push.copy = async () => {
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      push("[HUD] copied ✅");
    } catch (e) {
      push("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };

  return push;
}

function ensureHUD(titleText) {
  if (document.getElementById("hud-log")) return;

  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "10px";
  hud.style.bottom = "10px";
  hud.style.width = "min(520px, 92vw)";
  hud.style.maxHeight = "42vh";
  hud.style.background = "rgba(10,12,18,0.65)";
  hud.style.border = "1px solid rgba(255,255,255,0.12)";
  hud.style.borderRadius = "12px";
  hud.style.padding = "10px";
  hud.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  hud.style.fontSize = "12px";
  hud.style.color = "#e8ecff";
  hud.style.zIndex = "999999"; // always above everything
  hud.style.backdropFilter = "blur(6px)";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.alignItems = "center";
  row.style.marginBottom = "8px";

  const title = document.createElement("div");
  title.textContent = titleText;
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

  row.appendChild(title);
  row.appendChild(btn);

  const pre = document.createElement("pre");
  pre.id = "hud-log";
  pre.style.margin = "0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.lineHeight = "1.25";
  pre.style.maxHeight = "34vh";
  pre.style.overflow = "auto";

  btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent || "");
    } catch {}
  };

  hud.appendChild(row);
  hud.appendChild(pre);
  document.body.appendChild(hud);
}
